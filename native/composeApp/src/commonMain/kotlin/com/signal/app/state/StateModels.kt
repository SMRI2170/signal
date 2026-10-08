package com.signal.app.state

import com.signal.app.SignalAnalysis

/**
 * State models for the Native vertical slice (SPEC §79). These types are
 * extracted from the monolithic `Signal` state and grouped by flow so each
 * transition (process death, retry, back, auth callback) can be tested in
 * isolation without spinning up the entire UI.
 *
 *   GuestAnalysisState  — Fact input → Jev validation → receipt
 *   AuthPromotionState  — guest Result → auth → save to Relationship
 *   RelationshipState   — Home / read SavedRelationship
 *   ReanalysisState     — add Fact → reanalysis → new Snapshot
 */

sealed interface GuestAnalysisState {
  data object Drafting : GuestAnalysisState

  data class Validating(val facts: List<String>) : GuestAnalysisState

  data class ReadyToAnalyze(val facts: List<String>, val validationResults: List<ValidationSummary>) : GuestAnalysisState {
    val hasNonObservable: Boolean get() = validationResults.any { it.status != ValidationStatus.OBSERVABLE }
  }

  data class Analyzing(val facts: List<String>, val startedAtEpochMillis: Long) : GuestAnalysisState

  data class Success(val analysis: SignalAnalysis, val facts: List<String>) : GuestAnalysisState

  data class Failure(val facts: List<String>, val reason: AnalysisFailureReason) : GuestAnalysisState
}

enum class ValidationStatus { OBSERVABLE, INTERPRETATION, UNCLEAR }

data class ValidationSummary(val text: String, val status: ValidationStatus)

enum class AnalysisFailureReason {
  ConsentMissing,
  NetworkError,
  JudgeUnavailable,
  InvalidResponse,
  Cancelled,
}

sealed interface AuthPromotionState {
  data object Idle : AuthPromotionState

  data class AwaitingMagicLink(val email: String) : AuthPromotionState

  data class AwaitingGoogleSignIn(val startedAtEpochMillis: Long) : AuthPromotionState

  data class Promoting(val guestDraft: GuestAnalysisState.Success) : AuthPromotionState

  data class Promoted(val relationshipId: String) : AuthPromotionState

  data class Failed(val guestDraft: GuestAnalysisState.Success, val reason: AnalysisFailureReason) : AuthPromotionState
}

sealed interface RelationshipState {
  data object Empty : RelationshipState

  data class Loaded(
    val summaries: List<com.signal.app.RelationshipSummary>,
    val focusedRelationshipId: String? = null,
  ) : RelationshipState

  data class Error(val reason: String) : RelationshipState
}

sealed interface ReanalysisState {
  data object Idle : ReanalysisState

  data class ValidatingNewFact(val factText: String) : ReanalysisState

  data class Reanalyzing(val factText: String, val relationshipId: String) : ReanalysisState

  data class Success(val snapshotId: String, val currentScore: Int, val previousScore: Int?) : ReanalysisState

  data class Failure(val factText: String, val reason: AnalysisFailureReason) : ReanalysisState
}