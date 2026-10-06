package com.signal.app

import android.animation.ValueAnimator
import android.os.Build
import android.provider.Settings
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

@Composable
actual fun isReducedMotionEnabled(): Boolean {
  val context = LocalContext.current
  return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
    !ValueAnimator.areAnimatorsEnabled()
  } else {
    Settings.Global.getFloat(
      context.contentResolver,
      Settings.Global.ANIMATOR_DURATION_SCALE,
      1f,
    ) == 0f
  }
}
