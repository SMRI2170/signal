package com.signal.app.ui.material

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import com.signal.app.ui.theme.SignalBrushes
import com.signal.app.ui.theme.SignalShapes

@Composable
fun GelPanel(
  modifier: Modifier = Modifier,
  content: @Composable BoxScope.() -> Unit,
) {
  Box(
    modifier
      .fillMaxWidth()
      .clip(SignalShapes.Panel)
      .background(SignalBrushes.Gel),
    content = content,
  )
}
