package com.signal.app.ui.theme

import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

enum class SignalSkin(val storageValue: String, val label: String) {
  BUBBLE_PINK("bubble-pink", "Bubble Pink"),
  CYBER_CRUSH("cyber-crush", "Cyber Crush"),
  ANGEL_SIGNAL("angel-signal", "Angel Signal");

  companion object {
    fun fromStorage(value: String?): SignalSkin = entries.firstOrNull { it.storageValue == value } ?: BUBBLE_PINK
  }
}

data class SignalSkinTokens(
  val gradientTint: Color,
  val gradientTintAmount: Float,
  val dotSpacingDp: Float,
  val dotRadiusDp: Float,
  val dotShape: SkinDotShape,
  val accent: Color,
)

enum class SkinDotShape { CIRCLE, SQUARE, HALO }

fun SignalSkin.tokens(): SignalSkinTokens = when (this) {
  SignalSkin.BUBBLE_PINK -> SignalSkinTokens(
    gradientTint = Color(0xFFFF66D8), gradientTintAmount = .025f,
    dotSpacingDp = 22f, dotRadiusDp = 1.3f, dotShape = SkinDotShape.CIRCLE,
    accent = Color(0xFFFF66D8),
  )
  SignalSkin.CYBER_CRUSH -> SignalSkinTokens(
    gradientTint = Color(0xFFA76CFF), gradientTintAmount = .11f,
    dotSpacingDp = 16f, dotRadiusDp = 1f, dotShape = SkinDotShape.SQUARE,
    accent = Color(0xFFA76CFF),
  )
  SignalSkin.ANGEL_SIGNAL -> SignalSkinTokens(
    gradientTint = Color(0xFF75E9FF), gradientTintAmount = .08f,
    dotSpacingDp = 29f, dotRadiusDp = 1.6f, dotShape = SkinDotShape.HALO,
    accent = Color(0xFF75E9FF),
  )
}

val LocalSignalSkin = staticCompositionLocalOf { SignalSkin.BUBBLE_PINK }
