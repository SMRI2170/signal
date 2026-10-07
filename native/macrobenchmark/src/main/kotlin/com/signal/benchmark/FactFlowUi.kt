package com.signal.benchmark

import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import androidx.test.uiautomator.onElement
import androidx.test.uiautomator.onElements
import androidx.test.uiautomator.textAsString
import java.io.File

private const val FACT_FIELD_CLASS = "android.widget.EditText"
private val sampleFacts = listOf(
  "They asked whether I was free next week",
  "They sent me a message after the date",
  "They suggested meeting again on Saturday",
)

private fun UiDevice.diagnose(reason: String) {
  runCatching {
    val dir = File("/sdcard/Pictures/baseline-profiles").apply { mkdirs() }
    executeShellCommand("uiautomator dump ${File(dir, "ui-dump.xml").absolutePath}")
    executeShellCommand("screencap -p ${File(dir, "screen.png").absolutePath}")
    val pid = executeShellCommand("pidof com.signal.app").trim()
    if (pid.isNotEmpty()) {
      executeShellCommand("logcat -d --pid=$pid -t 400 > ${File(dir, "logcat.txt").absolutePath}")
    }
  }
  System.err.println("[SignalBench] diagnose: $reason")
}

internal fun UiDevice.completeFactFlow(checkFactLogs: Boolean = false) {
  // Compose LANDING screen may take a few seconds to render on a cold emulator
  // boot. Give it up to 30s, scrolling to surface the entry button if it is
  // below the viewport. The LANDING layout has a tall verticalScroll column
  // with the entry button at the bottom, so we may need to scroll even when
  // the app has already rendered the rest of the page.
  val landed = run {
    val deadline = System.currentTimeMillis() + 30_000
    while (System.currentTimeMillis() < deadline) {
      if (hasObject(By.text("CHECK IT  ↗"))) return@run true
      swipe(displayWidth / 2, displayHeight * 4 / 5, displayWidth / 2, displayHeight / 4, 16)
      waitForIdle()
    }
    false
  }
  if (!landed) {
    diagnose("LANDING entry button 'CHECK IT  ↗' not rendered within 30s")
  }
  check(landed) { "Expected the LANDING entry button ('CHECK IT  ↗') to render" }
  onElement { textAsString() == "CHECK IT  ↗" }.parent.click()

  // Wait for the FACTS screen to be ready before reading EditText nodes.
  check(
    wait(Until.hasObject(By.res("android:id/content")), 5_000) ||
      onElements { className == FACT_FIELD_CLASS }.isNotEmpty(),
  ) { "Expected the FACTS screen to render with EditText fields" }

  var factFields = onElements { className == FACT_FIELD_CLASS }
    .sortedBy { it.visibleBounds.top }
  check(factFields.size >= 2) { "Expected at least two visible Fact fields; found ${factFields.size}" }
  factFields[0].text = sampleFacts[0]
  factFields[1].text = sampleFacts[1]
  executeShellCommand("input keyevent KEYCODE_ESCAPE")
  waitForIdle()

  // The third field is below the first viewport on compact Android screens. A second
  // swipe is needed to fully expose it after the first two fields receive text.
  swipe(displayWidth / 2, displayHeight * 3 / 4, displayWidth / 2, displayHeight / 3, 16)
  waitForIdle()
  swipe(displayWidth / 2, displayHeight * 3 / 4, displayWidth / 2, displayHeight / 3, 16)
  waitForIdle()
  factFields = onElements { className == FACT_FIELD_CLASS }
    .sortedBy { it.visibleBounds.top }
  check(factFields.isNotEmpty()) { "Expected a visible Fact field after scrolling" }
  factFields.last().text = sampleFacts[2]
  executeShellCommand("input keyevent KEYCODE_ESCAPE")
  waitForIdle()

  swipe(displayWidth / 2, displayHeight * 3 / 4, displayWidth / 2, displayHeight / 4, 16)
  check(
    wait(Until.hasObject(By.text("この内容でSIGNALを見る  →")), 5_000),
  ) { "Expected the analyze button ('この内容でSIGNALを見る  →') after entering three Facts" }
  onElement { textAsString() == "この内容でSIGNALを見る  →" }.parent.click()
  if (wait(Until.hasObject(By.text("FACT TICKET")), 500)) {
    check(wait(Until.gone(By.text("FACT TICKET")), 2_000)) {
      "Expected the Fact-to-Receipt reveal animation to finish"
    }
  }
  check(wait(Until.hasObject(By.text("SIGNAL LEVEL")), 5_000)) {
    "Expected analysis to reach the SIGNAL result screen"
  }

  if (checkFactLogs) {
    val appPid = executeShellCommand("pidof com.signal.app").trim()
    check(appPid.matches(Regex("[0-9]+"))) { "Expected one running SIGNAL process; found '$appPid'" }
    val logcat = executeShellCommand("logcat -d --pid=$appPid -t 2000")
    check(sampleFacts.none(logcat::contains)) { "Fact content appeared in Android logs" }
    val compositionCounts = Regex("factToReceiptRecompositions=([0-9]+)")
      .findAll(logcat)
      .map { it.groupValues[1].toInt() }
      .toList()
    check(compositionCounts.isNotEmpty()) { "Expected a measured Fact-to-Receipt recomposition count" }
    check(compositionCounts.last() <= 8) {
      "Fact-to-Receipt reveal recomposed ${compositionCounts.last()} times; expected at most 8"
    }
  }
}
