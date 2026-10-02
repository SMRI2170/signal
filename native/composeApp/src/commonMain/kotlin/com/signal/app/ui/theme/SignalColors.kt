package com.signal.app.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

object SignalColors {
  val Ink = Color(0xFF15121B)
  val Pink = Color(0xFFFF66D8)
  val Purple = Color(0xFFA76CFF)
  val Cyan = Color(0xFF75E9FF)
  val Lime = Color(0xFFB9FF83)
  val Yellow = Color(0xFFFFE66D)
  val Paper = Color(0xFFFFF7FD)
  val White = Color(0xFFFFFFFF)
  val Muted = Color(0xFF625C6B)
}

object SignalBrushes {
  val Chrome = Brush.linearGradient(
    listOf(
      SignalColors.White,
      SignalColors.Cyan,
      SignalColors.Purple,
      SignalColors.Pink,
      SignalColors.White,
    ),
  )

  val Gel = Brush.linearGradient(
    listOf(
      SignalColors.White,
      SignalColors.White.copy(alpha = .86f),
      SignalColors.Cyan.copy(alpha = .58f),
    ),
  )
}
