package com.signal.app.ui.material

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.signal.app.ui.theme.SignalColors
import com.signal.app.ui.theme.SignalShapes

@Composable
fun PixelTerminal(
  left: String,
  right: String,
  modifier: Modifier = Modifier,
) {
  Row(
    modifier = modifier
      .clip(SignalShapes.Compact)
      .background(SignalColors.Ink)
      .border(2.dp, SignalColors.Ink, SignalShapes.Compact)
      .padding(horizontal = 8.dp, vertical = 5.dp),
    horizontalArrangement = Arrangement.spacedBy(7.dp),
    verticalAlignment = Alignment.CenterVertically,
  ) {
    Text(left, color = SignalColors.White, fontWeight = FontWeight.Black, fontSize = 8.sp, letterSpacing = .7.sp)
    Canvas(Modifier.size(6.dp)) { drawCircle(SignalColors.Lime) }
    Text(right, color = SignalColors.Lime, fontWeight = FontWeight.Black, fontSize = 8.sp, letterSpacing = .7.sp)
  }
}
