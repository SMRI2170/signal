package com.signal.app.ui.material

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.dp
import com.signal.app.ui.theme.SignalColors
import com.signal.app.ui.theme.SignalShapes
import com.signal.app.ui.theme.SignalShadows

@Composable
fun StickerPaper(
  modifier: Modifier = Modifier,
  shape: Shape = SignalShapes.Ticket,
  content: @Composable ColumnScope.() -> Unit,
) {
  Box(modifier) {
    Box(
      Modifier
        .matchParentSize()
        .offset(SignalShadows.SmallX, SignalShadows.SmallY)
        .clip(shape)
        .background(SignalColors.Ink),
    )
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .clip(shape)
        .background(
          Brush.linearGradient(
            listOf(
              SignalColors.White,
              SignalColors.White.copy(alpha = .90f),
              SignalColors.Cyan.copy(alpha = .30f),
            ),
          ),
        )
        .border(3.dp, SignalColors.Ink, shape)
        .padding(14.dp),
      content = content,
    )
  }
}
