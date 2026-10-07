package com.signal.smoke

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import androidx.test.uiautomator.onElement
import androidx.test.uiautomator.textAsString
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Debug-build smoke tests for the SIGNAL Android app.
 *
 * These tests live in :androidApp (not :macrobenchmark) so they can execute via
 * `:androidApp:connectedDebugAndroidTest` on a freshly cleared app process.
 * Keeping them out of the macrobenchmark module avoids the `ActivityRecordInputSink`
 * state that `MacrobenchmarkRule.startActivityAndWait()` leaves behind, which was
 * causing the previous swiftshader CI emulator runs to report "Active window root
 * not found" for 30+ seconds before failing with
 * "Expected the LANDING entry button ('CHECK IT  ↗') to render".
 */
@RunWith(AndroidJUnit4::class)
class SignalUiSmokeTest {
  @Test
  fun landingToResultKeepsTheFactFlowUsable() {
    val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
    device.pressHome()
    device.waitForIdle()
    device.executeShellCommand("pm clear com.signal.app")
    device.executeShellCommand("am start -n com.signal.app/com.signal.app.MainActivity")
    device.completeFactFlow(checkFactLogs = true)
  }

  @Test
  fun factTextDoesNotAppearInAppLogsAfterForcedCrash() {
    val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
    device.pressHome()
    device.waitForIdle()
    device.executeShellCommand("pm clear com.signal.app")
    device.executeShellCommand("am start -n com.signal.app/com.signal.app.MainActivity")
    // Cold AVD boot can leave the first frame blank; wait for the entry button
    // with scrolling, then click it.
    val landed = run {
      val deadline = System.currentTimeMillis() + 30_000
      while (System.currentTimeMillis() < deadline) {
        if (device.hasObject(By.text("CHECK IT  ↗"))) return@run true
        device.swipe(
          device.displayWidth / 2,
          device.displayHeight * 4 / 5,
          device.displayWidth / 2,
          device.displayHeight / 4,
          16,
        )
        device.waitForIdle()
      }
      false
    }
    check(landed) { "Expected the LANDING entry button ('CHECK IT  ↗') to render" }
    device.onElement { textAsString() == "CHECK IT  ↗" }.parent.click()
    check(
      device.wait(Until.hasObject(By.clazz("android.widget.EditText")), 10_000),
    ) { "Expected an EditText field on the FACTS screen" }
    device.onElement { className == "android.widget.EditText" }
      .text = "PRIVATE_FACT_SENTINEL_DO_NOT_LOG_83B6"

    val appPid = device.executeShellCommand("pidof com.signal.app").trim()
    check(appPid.matches(Regex("[0-9]+"))) { "Expected one running SIGNAL process before crash" }
    device.executeShellCommand("am crash com.signal.app")
    device.waitForIdle()
    val logcat = device.executeShellCommand("logcat -d --pid=$appPid -t 2000")
    check("PRIVATE_FACT_SENTINEL_DO_NOT_LOG_83B6" !in logcat) {
      "Fact content appeared in SIGNAL process logs after a forced crash"
    }
  }
}
