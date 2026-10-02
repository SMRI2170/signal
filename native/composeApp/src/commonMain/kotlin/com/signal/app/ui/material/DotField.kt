package com.signal.app.ui.material

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.signal.app.ui.theme.SignalColors

@Composable
fun DotField(
  colors: List<Color>,
  modifier: Modifier = Modifier,
  content: @Composable () -> Unit,
) {
  Box(
    modifier
      .fillMaxSize()
      .background(Brush.linearGradient(colors))
      .drawWithCache {
        val fieldSize = size
        val step = 22.dp.toPx()
        val radius = 1.3.dp.toPx()
        val positions = buildList {
          var x = 0f
          while (x <= fieldSize.width) {
            var y = 0f
            while (y <= fieldSize.height) {
              add(Offset(x, y))
              y += step
            }
            x += step
          }
        }
        onDrawBehind {
          positions.forEach { point ->
            val verticalFade = (1f - point.y / size.height).coerceIn(.18f, 1f)
            drawCircle(
              color = SignalColors.White.copy(alpha = .18f + .36f * verticalFade),
              radius = radius,
              center = point,
            )
          }
          drawCircle(
            color = SignalColors.White.copy(alpha = .25f),
            radius = size.width * .56f,
            center = Offset(size.width * .12f, size.height * .13f),
          )
        }
      },
  ) {
    content()
  }
}
