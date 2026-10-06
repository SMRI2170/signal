package com.signal.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider

@Composable
fun SignalTheme(skin: SignalSkin = SignalSkin.BUBBLE_PINK, content: @Composable () -> Unit) {
  val tokens = skin.tokens()
  CompositionLocalProvider(LocalSignalSkin provides skin) {
    MaterialTheme(
      colorScheme = lightColorScheme(
        primary = tokens.accent,
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
      ),
      content = content,
    )
  }
}
