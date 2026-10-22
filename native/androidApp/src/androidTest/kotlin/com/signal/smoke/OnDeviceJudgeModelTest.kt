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
      val gateway = OnDeviceJudgeGateway(AndroidOnDeviceTextInference(context))
      val startedAt = SystemClock.elapsedRealtime()
      val validations = gateway.validate(facts)
      val analysis = gateway.analyze(facts)
      val elapsedMs = SystemClock.elapsedRealtime() - startedAt

      assertEquals(3, validations.size)
      assertEquals(3, analysis.factCount)
      listOf(
        analysis.scores.signalLevel,
        analysis.scores.desireToMeet,
        analysis.scores.initiative,
        analysis.scores.evidenceSufficiency,
      ).forEach { assertTrue("Expected a bounded score", it in 0..100) }

      val labels = validations.joinToString(",") { it.status.name }
      val observableCount = validations.count { it.status == FactStatus.OBSERVABLE }
      Log.i(
        "SIGNAL_MODEL_EVAL",
        "valid_json=true facts=${validations.size} observable=$observableCount " +
          "labels=$labels elapsed_ms=$elapsedMs pss_kib=${DebugMemory.currentPssKb()}",
      )
    }
  }

  private object DebugMemory {
    fun currentPssKb(): Long = android.os.Debug.getPss()
  }
}
