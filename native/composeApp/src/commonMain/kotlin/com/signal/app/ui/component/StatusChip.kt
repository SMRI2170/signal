package com.signal.app.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.signal.app.ui.sticker.Lightning
import com.signal.app.ui.sticker.PixelSpark
import com.signal.app.ui.theme.SignalColors
import com.signal.app.ui.theme.SignalShapes
import com.signal.app.ui.theme.SignalTypography

@Composable
fun StatusChip(
  text: String,
  background: Color = SignalColors.White.copy(alpha = .82f),
  modifier: Modifier = Modifier,
) {
  Text(
    text,
    color = SignalColors.Ink,
    style = SignalTypography.Label,
    modifier = modifier
      .clip(SignalShapes.Control)
      .background(background)
      .border(2.dp, SignalColors.Ink, SignalShapes.Control)
      .padding(horizontal = 10.dp, vertical = 6.dp),
  )
}

@Composable
fun TopMark(modifier: Modifier = Modifier) {
  Row(
    modifier = modifier.fillMaxWidth().padding(top = 10.dp),
    horizontalArrangement = Arrangement.SpaceBetween,
    verticalAlignment = Alignment.CenterVertically,
  ) {
    Text("SIGNAL", color = SignalColors.Ink, style = SignalTypography.Brand)
    Row(
      modifier = Modifier
        .clip(SignalShapes.Control)
        .background(SignalColors.Lime)
        .border(2.dp, SignalColors.Ink, SignalShapes.Control)
        .padding(horizontal = 8.dp, vertical = 4.dp),
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
      PixelSpark(size = 13.dp)
      Text("BETA", color = SignalColors.Ink, fontWeight = FontWeight.Black, fontSize = 10.sp)
    }
  }
}

@Composable
fun GlassPill(text: String, modifier: Modifier = Modifier) {
  Text(
    text,
    color = SignalColors.Ink,
    fontSize = 18.sp,
    fontWeight = FontWeight.Black,
    textAlign = TextAlign.Center,
    modifier = modifier
      .clip(SignalShapes.Control)
      .background(SignalColors.White.copy(alpha = .62f))
      .border(2.dp, SignalColors.Ink, SignalShapes.Control)
      .padding(horizontal = 16.dp, vertical = 7.dp),
  )
}

@Composable
fun AddFactButton(onClick: () -> Unit, modifier: Modifier = Modifier) {
  Row(
    modifier = modifier
      .clip(SignalShapes.Control)
      .background(
        Brush.verticalGradient(
          listOf(SignalColors.White, SignalColors.Yellow, SignalColors.Pink),
        ),
      )
      .border(2.dp, SignalColors.Ink, SignalShapes.Control)
      .clickable(onClick = onClick)
      .padding(horizontal = 13.dp, vertical = 8.dp),
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.spacedBy(6.dp),
  ) {
    Lightning()
    Text("ADD FACT", color = SignalColors.Ink, fontWeight = FontWeight.Black, fontSize = 14.sp)
  }
}
