package com.signal.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val SignalColorScheme = lightColorScheme(
  primary = SignalColors.Purple,
  onPrimary = SignalColors.Ink,
  secondary = SignalColors.Pink,
  onSecondary = SignalColors.Ink,
  tertiary = SignalColors.Cyan,
  background = SignalColors.Paper,
  onBackground = SignalColors.Ink,
  surface = SignalColors.White,
  onSurface = SignalColors.Ink,
  error = SignalColors.Purple,
  onError = SignalColors.White,
)

@Composable
fun SignalTheme(content: @Composable () -> Unit) {
  MaterialTheme(
    colorScheme = SignalColorScheme,
    content = content,
  )
}
