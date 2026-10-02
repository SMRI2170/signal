package com.signal.app.ui.material

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.signal.app.ui.theme.SignalBrushes
import com.signal.app.ui.theme.SignalColors
import com.signal.app.ui.theme.SignalShapes
import com.signal.app.ui.theme.SignalShadows

@Composable
fun ChromeBezel(
  modifier: Modifier = Modifier,
  content: @Composable BoxScope.() -> Unit,
) {
  val shape = SignalShapes.Panel
  Box(modifier) {
    Box(
      Modifier
        .matchParentSize()
        .offset(SignalShadows.LargeX, SignalShadows.LargeY)
        .clip(shape)
        .background(SignalColors.Ink),
    )
    Box(
      Modifier
        .fillMaxWidth()
        .clip(shape)
        .background(SignalBrushes.Chrome)
        .border(BorderStroke(3.dp, SignalColors.Ink), shape)
        .padding(4.dp),
    ) {
      content()
    }
  }
}
