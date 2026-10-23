package com.signal.app

import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.flow.first
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class OnDeviceJudgeGatewayTest {
  @Test
  fun parsesJapaneseThreeFactResultAndReusesOneInferenceForValidateAndAnalyze() = runTest {
    var calls = 0
    val gateway = OnDeviceJudgeGateway(OnDeviceTextInference {
      calls += 1
      validOutput
    })
    val facts = listOf("相手から食事に誘われた", "返信が来なかった", "自分から次の予定を提案した")

    val validations = gateway.validate(facts)
    val result = gateway.analyze(facts)

    assertEquals(listOf(FactStatus.OBSERVABLE, FactStatus.UNCLEAR, FactStatus.INTERPRETATION), validations.map { it.status })
    assertEquals(3, result.factCount)
    assertEquals(61, result.scores.signalLevel)
    assertEquals(1, calls)
  }

  @Test
  fun rejectsMalformedOrOutOfRangeModelResults() = runTest {
    val diagnostics = mutableListOf<OnDeviceJudgeDiagnostic>()
    val invalidGateway = OnDeviceJudgeGateway(
      inference = OnDeviceTextInference { "not json" },
      diagnostics = OnDeviceJudgeDiagnostics { diagnostics += it },
    )

    val error = assertFailsWith<JudgeGatewayException> {
      invalidGateway.validate(listOf("a", "b", "c"))
    }

    assertEquals("ON_DEVICE_RESPONSE_DECODE_FAILED", error.code)
    assertEquals(listOf("success", "invalid_json"), diagnostics.map { it.outcome })
    assertEquals(8, diagnostics.first().responseChars)
  }

  @Test
  fun classifiesSchemaFailureSeparatelyFromDecodeFailure() = runTest {
    val invalidSchema = validOutput.replace("\"index\":2", "\"index\":9")
    val gateway = OnDeviceJudgeGateway(OnDeviceTextInference { invalidSchema })

    val error = assertFailsWith<JudgeGatewayException> {
      gateway.validate(listOf("a", "b", "c"))
    }

    assertEquals("ON_DEVICE_RESPONSE_SCHEMA_INVALID", error.code)
  }

  @Test
  fun refusesToPretendTheServerIsAvailableWhenInferenceFails() = runTest {
    val offlineGateway = OnDeviceJudgeGateway(OnDeviceTextInference {
      error("model missing")
    })

    val error = assertFailsWith<JudgeGatewayException> {
      offlineGateway.validate(listOf("a", "b", "c"))
    }

    assertEquals("ON_DEVICE_INFERENCE_FAILED", error.code)
  }

  @Test
  fun modelManagerExposesMissingDownloadReadyAndFailureStates() = runTest {
    val manager = BridgedOnDeviceModelManager(object : OnDeviceModelManagerBridge {
      override fun inspect(completion: (String?) -> Unit) = completion("MISSING")
      override fun download(progress: (String?) -> Unit, completion: (String?) -> Unit) {
        progress("64")
        completion(null)
      }
    })

    manager.refresh()
    assertEquals(OnDeviceModelStage.MISSING, manager.status.first().stage)
    manager.download()
    assertEquals(OnDeviceModelStage.READY, manager.status.first().stage)

    val failedManager = BridgedOnDeviceModelManager(object : OnDeviceModelManagerBridge {
      override fun inspect(completion: (String?) -> Unit) = completion("MISSING")
      override fun download(progress: (String?) -> Unit, completion: (String?) -> Unit) = completion("MODEL_DOWNLOAD_FAILED")
    })
    failedManager.download()
    assertEquals(OnDeviceModelStage.FAILED, failedManager.status.first().stage)
  }

  private companion object {
    val validOutput = """
      {"validations":[
        {"index":0,"status":"OBSERVABLE","reasonJa":"相手が誘った出来事です。","rewriteExampleJa":null},
        {"index":1,"status":"UNCLEAR","reasonJa":"背景が不足しています。","rewriteExampleJa":"いつ誰が返信しなかったかを書いてください。"},
        {"index":2,"status":"INTERPRETATION","reasonJa":"主語が曖昧です。","rewriteExampleJa":null}
      ],"scores":{"signalLevel":61,"desireToMeet":54,"initiative":45,"evidenceSufficiency":50}}
    """.trimIndent()
  }
}
