package com.signal.benchmark

import androidx.benchmark.macro.CompilationMode
import androidx.benchmark.macro.FrameTimingMetric
import androidx.benchmark.macro.StartupMode
import androidx.benchmark.macro.StartupTimingMetric
import androidx.benchmark.macro.junit4.BaselineProfileRule
import androidx.benchmark.macro.junit4.MacrobenchmarkRule
import androidx.test.ext.junit.runners.AndroidJUnit4
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
    device.onElement { textAsString() == "CHECK IT  ↗" }.click()
    device.onElement { textAsString() == "WHAT HAPPENED?" }
  }
}
