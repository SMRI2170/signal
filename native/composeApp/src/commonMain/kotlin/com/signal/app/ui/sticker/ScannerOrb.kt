package com.signal.app.ui.sticker

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.signal.app.ui.theme.SignalColors

@Composable
fun ScannerOrb(
  modifier: Modifier = Modifier,
  size: Dp = 62.dp,
  rotation: Float = 12f,
) {
  Canvas(modifier.size(size).rotate(rotation)) {
    val center = Offset(this.size.width / 2f, this.size.height / 2f)
    val shadowX = 4.dp.toPx()
    val shadowY = 5.dp.toPx()
    withTransform({ translate(shadowX, shadowY) }) {
      drawCircle(SignalColors.Ink, radius = this@Canvas.size.minDimension * .42f, center = center)
    }
    drawCircle(SignalColors.White, radius = this.size.minDimension * .48f, center = center)
    drawCircle(SignalColors.Ink, radius = this.size.minDimension * .43f, center = center)
    drawCircle(
      brush = Brush.radialGradient(
        listOf(SignalColors.White, SignalColors.Cyan, SignalColors.Purple, SignalColors.Pink),
        center = Offset(this.size.width * .34f, this.size.height * .27f),
        radius = this.size.minDimension * .58f,
      ),
      radius = this.size.minDimension * .38f,
      center = center,
    )
    val heartSize = this.size.minDimension * .31f
    val heart = heartPath(
      center.x - heartSize / 2f,
      center.y - heartSize / 2f,
      heartSize,
      heartSize,
    )
    drawPath(heart, SignalColors.Ink, style = Stroke(width = 2.dp.toPx()))
    drawPath(heart, SignalColors.White, style = Fill)
    drawPath(heart, SignalColors.Ink, style = Stroke(width = 1.5.dp.toPx()))
  }
}
