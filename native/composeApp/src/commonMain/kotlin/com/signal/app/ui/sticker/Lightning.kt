package com.signal.app.ui.sticker

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.signal.app.ui.theme.SignalColors

@Composable
fun Lightning(
  modifier: Modifier = Modifier,
  rotation: Float = 8f,
) {
  Canvas(modifier.size(28.dp, 38.dp).rotate(rotation)) {
    val path = Path().apply {
      moveTo(size.width * .56f, 1.dp.toPx())
      lineTo(size.width * .12f, size.height * .55f)
      lineTo(size.width * .44f, size.height * .55f)
      lineTo(size.width * .30f, size.height - 1.dp.toPx())
      lineTo(size.width * .90f, size.height * .39f)
      lineTo(size.width * .58f, size.height * .39f)
      close()
    }
    drawPath(path, SignalColors.White, style = Stroke(width = 7.dp.toPx()))
    drawPath(path, SignalColors.Ink, style = Stroke(width = 4.dp.toPx()))
    drawPath(path, SignalColors.Lime, style = Fill)
    drawPath(path, SignalColors.Ink, style = Stroke(width = 1.5.dp.toPx()))
  }
}
