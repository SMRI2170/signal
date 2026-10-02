package com.signal.app.ui.sticker

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.signal.app.ui.theme.SignalColors

@Composable
fun Butterfly(
  modifier: Modifier = Modifier,
  rotation: Float = -14f,
) {
  Canvas(modifier.size(62.dp).rotate(rotation)) {
    val whiteStroke = Stroke(width = 8.dp.toPx())
    val inkStroke = Stroke(width = 4.dp.toPx())
    val wingSize = Size(size.width * .38f, size.height * .40f)
    val lowerSize = Size(size.width * .31f, size.height * .29f)
    val leftTop = Offset(size.width * .06f, size.height * .08f)
    val rightTop = Offset(size.width * .56f, size.height * .08f)
    val leftBottom = Offset(size.width * .14f, size.height * .51f)
    val rightBottom = Offset(size.width * .55f, size.height * .51f)

    listOf(leftTop to wingSize, rightTop to wingSize, leftBottom to lowerSize, rightBottom to lowerSize).forEach { (topLeft, ovalSize) ->
      drawOval(SignalColors.White, topLeft, ovalSize, style = whiteStroke)
      drawOval(SignalColors.Ink, topLeft, ovalSize, style = inkStroke)
      drawOval(
        color = if (topLeft.x < size.width / 2f) SignalColors.Pink else SignalColors.Cyan,
        topLeft = topLeft,
        size = ovalSize,
      )
      drawOval(SignalColors.Ink, topLeft, ovalSize, style = Stroke(width = 2.dp.toPx()))
    }
    drawLine(
      SignalColors.Ink,
      start = Offset(size.width * .50f, size.height * .21f),
      end = Offset(size.width * .50f, size.height * .76f),
      strokeWidth = 5.dp.toPx(),
    )
    drawCircle(SignalColors.Yellow, radius = 4.dp.toPx(), center = Offset(size.width * .50f, size.height * .20f))
  }
}
