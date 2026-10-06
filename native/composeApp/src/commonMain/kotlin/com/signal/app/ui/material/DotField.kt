package com.signal.app.ui.material

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.dp
import com.signal.app.ui.theme.SignalColors
import com.signal.app.ui.theme.LocalSignalSkin
import com.signal.app.ui.theme.SkinDotShape
import com.signal.app.ui.theme.tokens

@Composable
fun DotField(
  colors: List<Color>,
  modifier: Modifier = Modifier,
  content: @Composable () -> Unit,
) {
  val skin = LocalSignalSkin.current
  val tokens = skin.tokens()
  val tintedColors = colors.map { base ->
    Color(
      red = base.red + (tokens.gradientTint.red - base.red) * tokens.gradientTintAmount,
      green = base.green + (tokens.gradientTint.green - base.green) * tokens.gradientTintAmount,
      blue = base.blue + (tokens.gradientTint.blue - base.blue) * tokens.gradientTintAmount,
      alpha = base.alpha,
    )
  }
  Box(
    modifier
      .fillMaxSize()
      .background(Brush.linearGradient(tintedColors))
      .drawWithCache {
        val fieldSize = size
        val step = tokens.dotSpacingDp.dp.toPx()
        val radius = tokens.dotRadiusDp.dp.toPx()
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
            val dotColor = SignalColors.White.copy(alpha = .18f + .36f * verticalFade)
            when (tokens.dotShape) {
              SkinDotShape.CIRCLE -> drawCircle(color = dotColor, radius = radius, center = point)
              SkinDotShape.SQUARE -> drawRect(dotColor, topLeft = point, size = androidx.compose.ui.geometry.Size(radius * 1.7f, radius * 1.7f))
              SkinDotShape.HALO -> drawCircle(color = dotColor, radius = radius, center = point, style = androidx.compose.ui.graphics.drawscope.Stroke(width = .65.dp.toPx()))
            }
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
