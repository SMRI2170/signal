package com.signal.app.ui.sticker

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.signal.app.ui.theme.SignalColors

@Composable
fun PixelSpark(
  modifier: Modifier = Modifier,
  size: Dp = 28.dp,
) {
  Canvas(modifier.size(size)) {
    val path = Path().apply {
      moveTo(this@Canvas.size.width * .5f, 1.dp.toPx())
      lineTo(this@Canvas.size.width * .62f, this@Canvas.size.height * .38f)
      lineTo(this@Canvas.size.width - 1.dp.toPx(), this@Canvas.size.height * .5f)
      lineTo(this@Canvas.size.width * .62f, this@Canvas.size.height * .62f)
      lineTo(this@Canvas.size.width * .5f, this@Canvas.size.height - 1.dp.toPx())
      lineTo(this@Canvas.size.width * .38f, this@Canvas.size.height * .62f)
      lineTo(1.dp.toPx(), this@Canvas.size.height * .5f)
      lineTo(this@Canvas.size.width * .38f, this@Canvas.size.height * .38f)
      close()
    }
    drawPath(path, SignalColors.White, style = Stroke(width = 6.dp.toPx()))
    drawPath(path, SignalColors.Ink, style = Stroke(width = 3.dp.toPx()))
    drawPath(path, SignalColors.Yellow, style = Fill)
    drawPath(path, SignalColors.Ink, style = Stroke(width = 1.5.dp.toPx()))
  }
}
