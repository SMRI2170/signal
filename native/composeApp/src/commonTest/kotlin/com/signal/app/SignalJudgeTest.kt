package com.signal.app

import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SignalJudgeTest {
  @Test
  fun normalizesWhitespaceAndRejectsShortFacts() {
    assertEquals("相手から 食事に誘われた", normalizeFact("  相手から\n 食事に誘われた  "))
    assertEquals("10文字以上で入力してください。", factInputError("短い"))
  }

  @Test
  fun separatesObservableFactsFromInterpretations() = runTest {
    val validations = LocalJudgeGateway.validate(
      listOf("相手から来週空いているか聞かれた", "相手は絶対に自分のことが好き"), jevConsent = true,
    )

    assertEquals(listOf(FactStatus.OBSERVABLE, FactStatus.INTERPRETATION), validations.map { it.status })
  }

  @Test
  fun producesBoundedSignalScores() = runTest {
    val analysis = LocalJudgeGateway.analyze(
      listOf("相手から食事に誘われた", "相手から来週空いているか聞かれた", "二人で3時間話した"), jevConsent = true,
    )

    assertTrue(analysis.scores.signalLevel > 48)
    assertEquals(60, analysis.scores.evidenceSufficiency)
    assertTrue(listOf(
      analysis.scores.signalLevel,
      analysis.scores.desireToMeet,
      analysis.scores.initiative,
      analysis.scores.evidenceSufficiency,
    ).all { it in 0..100 })
  }
}
