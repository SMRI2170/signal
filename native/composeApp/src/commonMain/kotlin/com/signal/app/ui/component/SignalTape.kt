package com.signal.app.ui.component

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.signal.app.ui.material.StickerPaper
import com.signal.app.ui.theme.SignalColors

@Composable
fun SignalTape(
  scores: List<Int>,
  dates: List<String>,
  deltas: List<Int?> = List(scores.size) { null },
  modifier: Modifier = Modifier,
) {
  require(scores.size == dates.size) { "scores and dates must have equal size" }
  require(scores.size == deltas.size) { "scores and deltas must have equal size" }
  StickerPaper(modifier) {
    Text("SIGNAL TAPE", color = SignalColors.Ink, fontWeight = FontWeight.Black, fontSize = 10.sp, letterSpacing = 1.sp)
    Canvas(Modifier.fillMaxWidth().height(142.dp).padding(top = 15.dp)) {
      val left = 6.dp.toPx()
      val top = 12.dp.toPx()
      val graphWidth = size.width - left * 2
      val graphHeight = size.height - top * 2
      repeat(3) { row ->
        val y = top + graphHeight * row / 2f
        drawLine(SignalColors.Ink.copy(alpha = .18f), Offset(left, y), Offset(left + graphWidth, y), strokeWidth = 1.dp.toPx())
      }
      val denominator = (scores.size - 1).coerceAtLeast(1)
      val points = scores.mapIndexed { index, value ->
        Offset(left + graphWidth * index / denominator, top + graphHeight * (1f - value.coerceIn(0, 100) / 100f))
      }
      points.zipWithNext().forEach { (from, to) -> drawLine(SignalColors.Purple, from, to, strokeWidth = 7.dp.toPx()) }
      points.forEachIndexed { index, point ->
        val color = if (index == points.lastIndex) SignalColors.Pink else if (index == 0) SignalColors.Yellow else SignalColors.Cyan
        val outerRadius = if (index == points.lastIndex) 8.dp.toPx() else 6.dp.toPx()
        drawCircle(SignalColors.Ink, radius = outerRadius, center = point, style = Stroke(width = 3.dp.toPx()))
        drawCircle(color, radius = outerRadius - 2.dp.toPx(), center = point)
      }
    }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
      dates.forEachIndexed { index, date ->
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
          Text(date, color = SignalColors.Muted, fontWeight = FontWeight.Bold, fontSize = 9.sp)
          Text(
            deltas[index]?.let { delta ->
              val prefix = if (delta > 0) "+" else ""
              "${scores[index]}  $prefix$delta"
            } ?: scores[index].toString(),
            color = if (index == scores.lastIndex) SignalColors.Pink else SignalColors.Ink,
            fontWeight = FontWeight.Black,
            fontSize = 13.sp,
          )
        }
      }
    }
  }
}
