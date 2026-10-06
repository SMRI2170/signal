package com.signal.app

import androidx.benchmark.macro.CompilationMode
import androidx.benchmark.macro.FrameTimingMetric
import androidx.benchmark.macro.StartupMode
import androidx.benchmark.macro.StartupTimingMetric
import androidx.benchmark.macro.junit4.MacrobenchmarkRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class SignalPerformanceBenchmark {
  @get:Rule
  val benchmarkRule = MacrobenchmarkRule()

  @Test
  fun coldStartToSignalReceipt() = benchmarkRule.measureRepeated(
    packageName = PACKAGE_NAME,
    metrics = listOf(StartupTimingMetric()),
    compilationMode = CompilationMode.Partial(),
    startupMode = StartupMode.COLD,
    iterations = 5,
  ) {
    pressHome()
    startActivityAndWait(signalResultIntent())
  }

  @Test
  fun signalReceiptFrames() = benchmarkRule.measureRepeated(
    packageName = PACKAGE_NAME,
    metrics = listOf(FrameTimingMetric()),
    compilationMode = CompilationMode.Partial(),
    iterations = 5,
    setupBlock = {
      pressHome()
      killProcess()
    },
  ) {
    startActivityAndWait(signalResultIntent())
    device.waitForIdle()
  }
}
