package com.signal.benchmark

import androidx.benchmark.macro.CompilationMode
import androidx.benchmark.macro.FrameTimingMetric
import androidx.benchmark.macro.StartupMode
import androidx.benchmark.macro.StartupTimingMetric
import androidx.benchmark.macro.junit4.BaselineProfileRule
import androidx.benchmark.macro.junit4.MacrobenchmarkRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.uiautomator.By
import androidx.test.uiautomator.Until
import androidx.test.uiautomator.onElement
import androidx.test.uiautomator.textAsString
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

private const val TARGET_PACKAGE = "com.signal.app"

@RunWith(AndroidJUnit4::class)
class SignalMacrobenchmark {
  @get:Rule
  val benchmarkRule = MacrobenchmarkRule()

  @Test
  fun coldStartup() = benchmarkRule.measureRepeated(
    packageName = TARGET_PACKAGE,
    metrics = listOf(StartupTimingMetric()),
    compilationMode = CompilationMode.None(),
    startupMode = StartupMode.COLD,
    iterations = 5,
  ) {
    startActivityAndWait()
  }

  @Test
  fun resultFlowFrameTiming() = benchmarkRule.measureRepeated(
    packageName = TARGET_PACKAGE,
    metrics = listOf(FrameTimingMetric()),
    compilationMode = CompilationMode.Partial(),
    startupMode = StartupMode.COLD,
    iterations = 5,
  ) {
    startActivityAndWait()
    device.completeFactFlow()
  }
}

@RunWith(AndroidJUnit4::class)
class SignalBaselineProfile {
  @get:Rule
  val baselineProfileRule = BaselineProfileRule()

  @Test
  fun startupAndFirstFactScreen() = baselineProfileRule.collect(
    packageName = TARGET_PACKAGE,
    includeInStartupProfile = true,
  ) {
    startActivityAndWait()
    // Wait for the Compose LANDING screen to render before searching for the entry
    // button. A cold AVD boot can leave the first frame blank for several seconds.
    check(
      device.wait(Until.hasObject(By.text("CHECK IT  ↗")), 10_000),
    ) { "Expected the LANDING entry button ('CHECK IT  ↗') to render" }
    device.onElement { textAsString() == "CHECK IT  ↗" }.parent.click()
    check(
      device.wait(Until.hasObject(By.text("WHAT HAPPENED?")), 10_000),
    ) { "Expected the FACTS screen header 'WHAT HAPPENED?' after clicking CHECK IT" }
  }
}
