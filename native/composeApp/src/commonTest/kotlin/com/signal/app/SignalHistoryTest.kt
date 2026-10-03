package com.signal.app

import kotlin.test.Test
import kotlin.test.assertEquals

class SignalHistoryTest {
  @Test
  fun calculatesSnapshotDeltasInRecordedOrder() {
    val snapshots = listOf(38, 42, 41, 54, 73).mapIndexed { index, score ->
      SavedSnapshot(
        scores = SignalScores(score, score, score, score),
        createdAt = "2026-10-0${index + 1}T00:00:00Z",
      )
    }

    assertEquals(listOf(null, 4, -1, 13, 19), snapshotDeltas(snapshots))
  }

  @Test
  fun formatsIsoDateWithoutDependingOnDeviceLocale() {
    assertEquals("10/3", "2026-10-03T12:34:56Z".toSignalDate())
    assertEquals("TODAY", "TODAY".toSignalDate())
    assertEquals("--/--", "unknown".toSignalDate())
  }
}
