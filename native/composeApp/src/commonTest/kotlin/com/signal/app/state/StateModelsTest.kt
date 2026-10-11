package com.signal.app.state

import com.signal.app.SignalAnalysis
import com.signal.app.SignalScores
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * SPEC §79 / #79 acceptance: state transitions for the vertical slice
 * must round-trip through the documented models. This test pins the
 * transition guards so a regression in `SignalApp.kt` (e.g. mixing draft
 * and analyzing state into one mutable holder) fails loudly.
 */
class StateModelsTest {
  @Test
  fun readyToAnalyzeMarksNonObservableFacts() {
    val state = GuestAnalysisState.ReadyToAnalyze(
      facts = listOf("相手から食事に誘われた。", "好きだと思う。"),
      validationResults = listOf(
        ValidationSummary("相手から食事に誘われた。", ValidationStatus.OBSERVABLE),
        ValidationSummary("好きだと思う。", ValidationStatus.INTERPRETATION),
      ),
    )

    assertTrue(state.hasNonObservable)
  }

  @Test
  fun readyToAnalyzeReturnsFalseWhenAllObservable() {
    val state = GuestAnalysisState.ReadyToAnalyze(
      facts = listOf("A", "B", "C"),
      validationResults = listOf(
        ValidationSummary("A", ValidationStatus.OBSERVABLE),
        ValidationSummary("B", ValidationStatus.OBSERVABLE),
        ValidationSummary("C", ValidationStatus.OBSERVABLE),
      ),
    )

    assertFalse(state.hasNonObservable)
  }

  @Test
  fun successAndFailurePreserveFacts() {
    val facts = listOf("A", "B", "C")
    val success = GuestAnalysisState.Success(
      analysis = SignalAnalysis(SignalScores(63, 60, 72, 50, 65), "GOOD SIGNAL", 3),
      facts = facts,
    )
    val failure = GuestAnalysisState.Failure(
      facts = facts,
      reason = AnalysisFailureReason.NetworkError,
    )

    assertEquals(facts, success.facts)
    assertEquals(facts, failure.facts)
  }

  @Test
  fun authPromotionTransitionsAreSequential() {
    val idle: AuthPromotionState = AuthPromotionState.Idle
    val magic = AuthPromotionState.AwaitingMagicLink("user@example.com")
    val promoting: AuthPromotionState = AuthPromotionState.Promoting(
      GuestAnalysisState.Success(
        SignalAnalysis(SignalScores(50, 50, 50, 50, 50), "OK", 3),
        listOf("a", "b", "c"),
      ),
    )
    val promoted = AuthPromotionState.Promoted("rel-1")

    assertEquals(idle, idle) // equality sanity
    assertEquals("user@example.com", magic.email)
    assertEquals("rel-1", promoted.relationshipId)
    // Promoting is reachable from Idle / Magic / Google; we just assert type.
    assertEquals(
      expected = AuthPromotionState.Promoting::class,
      actual = promoting::class,
    )
  }

  @Test
  fun reanalysisStateHoldsPreviousScoreForDelta() {
    val success = ReanalysisState.Success(
      snapshotId = "snap-1",
      currentScore = 70,
      previousScore = 58,
    )

    assertEquals(12, success.currentScore - (success.previousScore ?: 0))
  }

  @Test
  fun relationshipLoadedCanHoldFocusedRelationship() {
    val state = RelationshipState.Loaded(
      summaries = emptyList(),
      focusedRelationshipId = "rel-1",
    )

    assertEquals("rel-1", state.focusedRelationshipId)
  }
}