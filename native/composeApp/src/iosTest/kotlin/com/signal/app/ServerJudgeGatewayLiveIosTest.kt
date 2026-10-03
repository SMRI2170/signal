package com.signal.app

import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.toKString
import kotlinx.coroutines.test.runTest
import platform.posix.getenv
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ServerJudgeGatewayLiveIosTest {
  @OptIn(ExperimentalForeignApi::class)
  @Test
  fun validatesAndAnalyzesThroughThePublicApiWhenEnabled() = runTest {
    if (getenv("SIGNAL_LIVE_E2E")?.toKString() != "1") return@runTest
    val apiBaseUrl = getenv("SIGNAL_API_BASE_URL")?.toKString()
      ?: error("SIGNAL_API_BASE_URL is required when SIGNAL_LIVE_E2E=1")
    val facts = listOf(
      "昨日の帰宅後、相手からLINEが届いた。",
      "相手から次に会える日を質問された。",
      "相手が翌週の食事場所を二つ提案した。",
    )
    val gateway = ServerJudgeGateway(apiBaseUrl)

    val validations = gateway.validate(facts)
    assertEquals(facts, validations.map(FactValidation::text))
    assertTrue(validations.all { it.status == FactStatus.OBSERVABLE })

    val analysis = gateway.analyze(facts)
    assertEquals(facts.size, analysis.factCount)
    assertTrue(analysis.scores.signalLevel in 0..100)
    assertTrue(analysis.scores.desireToMeet in 0..100)
    assertTrue(analysis.scores.initiative in 0..100)
    assertTrue(analysis.scores.evidenceSufficiency in 0..100)
  }
}
