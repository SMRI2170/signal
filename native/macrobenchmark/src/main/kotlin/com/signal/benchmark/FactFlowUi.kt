package com.signal.benchmark

import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import androidx.test.uiautomator.onElement
import androidx.test.uiautomator.onElements
import androidx.test.uiautomator.textAsString

private const val FACT_FIELD_CLASS = "android.widget.EditText"
private val sampleFacts = listOf(
  "They asked whether I was free next week",
  "They sent me a message after the date",
  "They suggested meeting again on Saturday",
)

internal fun UiDevice.completeFactFlow(checkFactLogs: Boolean = false) {
  var attempts = 0
  while (!wait(Until.hasObject(By.text("CHECK IT  ↗")), 250) && attempts < 4) {
    swipe(displayWidth / 2, displayHeight * 4 / 5, displayWidth / 2, displayHeight / 4, 16)
    waitForIdle()
    attempts += 1
  }
  check(wait(Until.hasObject(By.text("CHECK IT  ↗")), 500)) { "Expected the Fact entry button after scrolling" }
  onElement { textAsString() == "CHECK IT  ↗" }.parent.click()

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
