package com.signal.app.ui.sticker

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
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
fun ChromeHeart(
  modifier: Modifier = Modifier,
  size: Dp = 76.dp,
  rotation: Float = 0f,
) {
  Canvas(modifier.size(size).rotate(rotation)) {
    val inset = 10.dp.toPx()
    val shadowX = 4.dp.toPx()
    val shadowY = 5.dp.toPx()
    val path = heartPath(inset, inset, this.size.width - inset * 2, this.size.height - inset * 2)
    withTransform({ translate(shadowX, shadowY) }) {
      drawPath(path, SignalColors.Ink, style = Fill)
    }
    drawPath(path, SignalColors.White, style = Stroke(width = 10.dp.toPx()))
    drawPath(path, SignalColors.Ink, style = Stroke(width = 6.dp.toPx()))
    drawPath(
      path = path,
      brush = Brush.linearGradient(
        listOf(
          SignalColors.White,
          SignalColors.Cyan,
          SignalColors.Purple,
          SignalColors.Pink,
          SignalColors.White,
        ),
        start = Offset.Zero,
        end = Offset(this.size.width, this.size.height),
      ),
      style = Fill,
    )
    drawCircle(
      color = SignalColors.White.copy(alpha = .78f),
      radius = this.size.width * .08f,
      center = Offset(this.size.width * .36f, this.size.height * .31f),
    )
  }
}

@Composable
fun SignalHeartMeter(
  value: Int,
  modifier: Modifier = Modifier,
) {
  val filled = ((value.coerceIn(0, 100) + 19) / 20).coerceIn(0, 5)
  Row(modifier) {
    repeat(5) { index ->
      Canvas(Modifier.size(23.dp)) {
        val path = heartPath(3.dp.toPx(), 3.dp.toPx(), size.width - 6.dp.toPx(), size.height - 6.dp.toPx())
        drawPath(path, SignalColors.Ink, style = Stroke(width = 2.dp.toPx()))
        drawPath(path, if (index < filled) SignalColors.Pink else SignalColors.Paper, style = Fill)
        drawPath(path, SignalColors.Ink, style = Stroke(width = 1.5.dp.toPx()))
      }
      if (index < 4) Spacer(Modifier.width(3.dp))
    }
  }
}
