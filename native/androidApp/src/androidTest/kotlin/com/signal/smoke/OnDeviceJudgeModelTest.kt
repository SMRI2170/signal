package com.signal.smoke

import android.os.SystemClock
import android.util.Log
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.signal.app.AndroidOnDeviceTextInference
import com.signal.app.FactStatus
import com.signal.app.OnDeviceJudgeGateway
import java.io.File
import kotlinx.coroutines.runBlocking
import org.junit.Assume.assumeTrue
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/** Device-only smoke evaluation. It logs model metadata and labels, never Fact text or response text. */
@RunWith(AndroidJUnit4::class)
class OnDeviceJudgeModelTest {
  @Test
  fun qwenReturnsParseableThreeFactAnalysisWithoutNetwork() {
    runBlocking {
      val context = InstrumentationRegistry.getInstrumentation().targetContext
      val model = File(context.filesDir, AndroidOnDeviceTextInference.MODEL_RELATIVE_PATH)
      assumeTrue("Provision the pinned Qwen model before this device-only test", model.isFile)

      val facts = listOf(
        "あきは土曜日にゆうへLINEを送ると言った。",
        "あきは土曜日にゆうへLINEを送った。",
        "ゆうは土曜日にLINEへ返信しなかった。",
      )
      val runCount = InstrumentationRegistry.getArguments()
        .getString("iterations")
        ?.toIntOrNull()
        ?.coerceIn(1, MAX_WARM_RUNS)
        ?: MAX_WARM_RUNS
      val inference = AndroidOnDeviceTextInference(context)
      val modelPrepareStartedAt = SystemClock.elapsedRealtime()
      inference.prepare()
      val modelPrepareMs = SystemClock.elapsedRealtime() - modelPrepareStartedAt
      val gateway = OnDeviceJudgeGateway(inference)
      val durationsMs = mutableListOf<Long>()
      val scoreVectors = mutableListOf<List<Int>>()
      val labelVectors = mutableListOf<List<String>>()
      var sampledPssKb = 0L
      repeat(runCount) { runIndex ->
        val startedAt = SystemClock.elapsedRealtime()
        val validations = gateway.validate(facts)
        val analysis = gateway.analyze(facts)
        durationsMs += SystemClock.elapsedRealtime() - startedAt

        assertEquals(3, validations.size)
        assertEquals(3, analysis.factCount)
        val scores = listOf(
          analysis.scores.signalLevel,
          analysis.scores.desireToMeet,
          analysis.scores.initiative,
          analysis.scores.evidenceSufficiency,
        )
        scores.forEach { assertTrue("Expected a bounded score", it in 0..100) }
        scoreVectors += scores
        val labels = validations.map { it.status.name }
        labelVectors += labels
        sampledPssKb = maxOf(sampledPssKb, DebugMemory.currentPssKb())
        Log.i(
          "SIGNAL_MODEL_EVAL_SAMPLE",
          "run=${runIndex + 1} elapsed_ms=${durationsMs.last()} labels=${labels.joinToString(",")} " +
            "scores_stable=${scores == scoreVectors.first()} sampled_pss_kib=${sampledPssKb}",
        )
      }

      val firstLabels = labelVectors.first()
      val sortedWarmDurations = durationsMs.sorted()
      val expectedLabelMatches = labelVectors.count { labels -> labels.all { it == FactStatus.OBSERVABLE.name } }
      val stableLabels = labelVectors.count { it == firstLabels }
      val stableScores = scoreVectors.count { it == scoreVectors.first() }
      Log.i(
        "SIGNAL_MODEL_EVAL",
        "valid_json=true facts=3 model_prepare_ms=$modelPrepareMs warm_runs=${sortedWarmDurations.size} " +
          "warm_p50_ms=${percentile(sortedWarmDurations, 50)} warm_p95_ms=${percentile(sortedWarmDurations, 95)} " +
          "all_observable=$expectedLabelMatches/${labelVectors.size} stable_labels=$stableLabels/${labelVectors.size} " +
          "stable_scores=$stableScores/${scoreVectors.size} sampled_pss_kib=$sampledPssKb",
      )
    }
  }

  private object DebugMemory {
    fun currentPssKb(): Long = android.os.Debug.getPss()
  }

  private fun percentile(sortedValues: List<Long>, percentile: Int): Long {
    val index = ((sortedValues.size * percentile + 99) / 100 - 1).coerceIn(0, sortedValues.lastIndex)
    return sortedValues[index]
  }

  private companion object {
    const val MAX_WARM_RUNS = 30
  }
}
