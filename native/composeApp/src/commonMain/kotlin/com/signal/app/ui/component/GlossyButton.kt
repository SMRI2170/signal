package com.signal.app.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.signal.app.ui.theme.SignalColors
import com.signal.app.ui.theme.SignalShapes

@Composable
fun GlossyButton(
  label: String,
  core: Color,
  tail: Color,
  onClick: () -> Unit,
  modifier: Modifier = Modifier,
) {
  Box(modifier) {
    Box(
      Modifier
        .matchParentSize()
        .offset(5.dp, 5.dp)
        .clip(SignalShapes.Control)
        .background(SignalColors.Ink),
    )
    Button(
      onClick = onClick,
      modifier = Modifier
        .fillMaxWidth()
        .height(54.dp)
        .border(3.dp, SignalColors.Ink, SignalShapes.Control),
      shape = SignalShapes.Control,
      colors = ButtonDefaults.buttonColors(containerColor = core, contentColor = SignalColors.Ink),
      contentPadding = PaddingValues(0.dp),
    ) {
      Box(
        Modifier
          .fillMaxSize()
          .clip(SignalShapes.Control)
          .background(Brush.verticalGradient(listOf(SignalColors.White, core, tail))),
        contentAlignment = Alignment.Center,
      ) {
        Text(
          label,
          color = SignalColors.Ink,
          fontWeight = FontWeight.Black,
          fontSize = 15.sp,
          letterSpacing = .3.sp,
        )
      }
    }
  }
}
