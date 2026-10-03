package com.signal.app

import android.content.ComponentName
import android.content.Intent
import androidx.benchmark.macro.junit4.BaselineProfileRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class BaselineProfileGenerator {
  @get:Rule
  val baselineProfileRule = BaselineProfileRule()

  @Test
  fun generate() = baselineProfileRule.collect(
    packageName = PACKAGE_NAME,
    includeInStartupProfile = true,
  ) {
    pressHome()
    startActivityAndWait(signalResultIntent())
    device.swipe(
      device.displayWidth / 2,
      device.displayHeight * 3 / 4,
      device.displayWidth / 2,
      device.displayHeight / 4,
      12,
    )
    device.waitForIdle()
  }
}

internal const val PACKAGE_NAME = "com.signal.app"

internal fun signalResultIntent() = Intent(Intent.ACTION_MAIN).apply {
  component = ComponentName(PACKAGE_NAME, "$PACKAGE_NAME.MainActivity")
  addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
  putExtra("com.signal.app.BENCHMARK_RESULT", true)
}
