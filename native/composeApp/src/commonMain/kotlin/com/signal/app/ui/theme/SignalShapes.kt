package com.signal.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.dp

object SignalShapes {
  val Ticket = RoundedCornerShape(
    topStart = 19.dp,
    topEnd = 15.dp,
    bottomEnd = 23.dp,
    bottomStart = 17.dp,
  )
  val Panel = RoundedCornerShape(
    topStart = 24.dp,
    topEnd = 19.dp,
    bottomEnd = 26.dp,
    bottomStart = 21.dp,
  )
  val Control = RoundedCornerShape(999.dp)
  val Compact = RoundedCornerShape(8.dp)
}

object SignalStrokes {
  val Hairline = 1.dp
  val Control = 2.dp
  val Hero = 3.dp
}

object SignalShadows {
  val SmallX = 3.dp
  val SmallY = 4.dp
  val LargeX = 6.dp
  val LargeY = 7.dp
}
