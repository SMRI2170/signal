package com.signal.app.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.signal.app.ui.theme.SignalColors

@Composable
fun RealityCheckSlip(
  message: String,
  problems: List<Pair<String, String>>,
  modifier: Modifier = Modifier,
) {
  val hasProblem = problems.isNotEmpty()
  val shape = RoundedCornerShape(14.dp)
  Row(
    modifier = modifier
      .fillMaxWidth()
      .clip(shape)
      .background(SignalColors.Paper)
      .border(2.dp, SignalColors.Ink, shape),
  ) {
    androidx.compose.foundation.layout.Box(
      Modifier
        .width(5.dp)
        .fillMaxHeight()
        .background(if (hasProblem) SignalColors.Purple else SignalColors.Lime),
    )
    Column(
      modifier = Modifier.padding(12.dp),
      verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
      Text(
        if (hasProblem) "MAKE IT CLEARER" else "FACT OK",
        color = SignalColors.Ink,
        fontWeight = FontWeight.Black,
        fontSize = 11.sp,
        letterSpacing = 1.sp,
      )
      Text(message, color = SignalColors.Ink, fontWeight = FontWeight.Bold, fontSize = 12.sp, lineHeight = 18.sp)
      problems.forEach { (fact, example) ->
        Text("× $fact\n$example", color = SignalColors.Ink, fontSize = 11.sp, lineHeight = 17.sp)
      }
    }
  }
}
