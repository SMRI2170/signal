package com.signal.app.ui.theme

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

object SignalTypography {
  val Brand = TextStyle(
    fontSize = 21.sp,
    fontWeight = FontWeight.Black,
    letterSpacing = (-2).sp,
  )
  val Label = TextStyle(
    fontSize = 10.sp,
    fontWeight = FontWeight.Black,
    letterSpacing = 1.sp,
  )
  val Body = TextStyle(
    fontSize = 14.sp,
    lineHeight = 21.sp,
    fontWeight = FontWeight.SemiBold,
  )
}

fun blackOffsetShadow(offset: Dp): TextStyle = TextStyle(
  shadow = Shadow(SignalColors.Ink, Offset(offset.value, offset.value), 0f),
)

fun chromeNumberShadow(): TextStyle = TextStyle(
  shadow = Shadow(SignalColors.White, Offset(2f, 3f), 0f),
)

val SignalScoreShadow = chromeNumberShadow()
val SignalHeroShadow = blackOffsetShadow(3.dp)
