package com.signal.benchmark

import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.onElement
import androidx.test.uiautomator.textAsString
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class SignalUiSmokeTest {
  @Test
  fun landingToResultKeepsTheFactFlowUsable() {
    val device = androidx.test.uiautomator.UiDevice.getInstance(
      androidx.test.platform.app.InstrumentationRegistry.getInstrumentation(),
    )
    device.pressHome()
    device.waitForIdle()
    device.executeShellCommand("pm clear com.signal.app")
    device.executeShellCommand("am start -n com.signal.app/com.signal.app.MainActivity")
    device.completeFactFlow(checkFactLogs = true)
  }

  @Test
  fun factTextDoesNotAppearInAppLogsAfterForcedCrash() {
    val device = UiDevice.getInstance(
      androidx.test.platform.app.InstrumentationRegistry.getInstrumentation(),
    )
    device.pressHome()
    device.waitForIdle()
    device.executeShellCommand("pm clear com.signal.app")
    device.executeShellCommand("am start -n com.signal.app/com.signal.app.MainActivity")
    device.onElement { textAsString() == "CHECK IT  ↗" }.click()
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
