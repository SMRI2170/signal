package com.signal.app.ui.component

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.signal.app.isReducedMotionEnabled
import com.signal.app.ui.material.ChromeBezel
import com.signal.app.ui.material.GelPanel
import com.signal.app.ui.material.PixelTerminal
import com.signal.app.ui.sticker.ScannerOrb
import com.signal.app.ui.theme.SignalColors
import com.signal.app.ui.theme.SignalMotion

@Composable
fun FactToReceiptReveal(
  fact: String,
  score: Int,
  factCount: Int,
  measureCompositionCount: Boolean = false,
  onFinished: (Int) -> Unit,
) {
  val reducedMotion = isReducedMotionEnabled()
  val currentOnFinished by rememberUpdatedState(onFinished)
  val compositionCounter = remember { RevealCompositionCounter() }
  var hasStarted by remember { mutableStateOf(false) }
  if (measureCompositionCount) {
    SideEffect { compositionCounter.count += 1 }
  }
  // Progress is read in layer lambdas below so animation frames update transforms without recomposing the screen tree.
  val progress: State<Float> = animateFloatAsState(
    targetValue = if (hasStarted) 1f else 0f,
    animationSpec = tween(
      durationMillis = if (reducedMotion) SignalMotion.ResultRevealMillis else SignalMotion.ScanSequenceMaxMillis,
      easing = FastOutSlowInEasing,
    ),
    finishedListener = { value ->
      if (value == 1f) {
        currentOnFinished(if (measureCompositionCount) compositionCounter.count else 0)
      }
    },
    label = "factToReceiptReveal",
  )
  LaunchedEffect(Unit) { hasStarted = true }

  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(
        Brush.verticalGradient(
          listOf(SignalColors.Ink.copy(alpha = .97f), SignalColors.Purple.copy(alpha = .98f), SignalColors.Ink),
        ),
      )
      .clickable(
        interactionSource = remember { MutableInteractionSource() },
        indication = null,
        onClick = {},
      ),
  ) {
    PixelTerminal(
      "CRUSH.SYS",
      "SIGNAL SCANNER",
      modifier = Modifier.align(Alignment.TopCenter).padding(top = 48.dp),
    )
    ScannerOrb(
      modifier = Modifier
        .align(Alignment.Center)
        .graphicsLayer {
          val value = progress.value
          val scale = if (reducedMotion) 1f else .78f + .22f * value
          scaleX = scale
          scaleY = scale
          alpha = if (reducedMotion) 1f else .74f + .26f * value
        },
      size = 102.dp,
      rotation = 0f,
    )
    FactTicketArtifact(
      fact = fact,
      progress = progress,
      reducedMotion = reducedMotion,
      modifier = Modifier.align(Alignment.BottomCenter).padding(horizontal = 24.dp, vertical = 96.dp),
    )
    ReceiptArtifact(
      score = score,
      factCount = factCount,
      progress = progress,
      reducedMotion = reducedMotion,
      modifier = Modifier.align(Alignment.Center).padding(horizontal = 28.dp),
    )
  }
}

private class RevealCompositionCounter {
  var count: Int = 0
}

@Composable
private fun FactTicketArtifact(
  fact: String,
  progress: State<Float>,
  reducedMotion: Boolean,
  modifier: Modifier = Modifier,
) {
  Column(
    modifier = modifier
      .fillMaxWidth()
      .widthIn(max = 320.dp)
      .clip(RoundedCornerShape(12.dp))
      .background(SignalColors.White)
      .border(2.dp, SignalColors.Ink, RoundedCornerShape(12.dp))
      .padding(horizontal = 15.dp, vertical = 12.dp)
      .graphicsLayer {
        val value = progress.value
        val ticketProgress = (value / .68f).coerceIn(0f, 1f)
        alpha = 1f - ticketProgress
        if (!reducedMotion) {
          translationY = -150.dp.toPx() * ticketProgress
          scaleX = 1f - .16f * ticketProgress
          scaleY = 1f - .16f * ticketProgress
        }
      },
  ) {
    Text("FACT TICKET", color = SignalColors.Purple, fontSize = 10.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
    Spacer(Modifier.height(5.dp))
    Text(
      fact,
      color = SignalColors.Ink,
      fontSize = 13.sp,
      lineHeight = 18.sp,
      fontWeight = FontWeight.Bold,
      maxLines = 2,
      overflow = TextOverflow.Ellipsis,
    )
  }
}

@Composable
private fun ReceiptArtifact(
  score: Int,
  factCount: Int,
  progress: State<Float>,
  reducedMotion: Boolean,
  modifier: Modifier = Modifier,
) {
  ChromeBezel(
    modifier = modifier
      .fillMaxWidth()
      .widthIn(max = 300.dp)
      .graphicsLayer {
        val value = progress.value
        val receiptProgress = ((value - .56f) / .44f).coerceIn(0f, 1f)
        alpha = receiptProgress
        if (!reducedMotion) {
          val scale = .9f + .1f * receiptProgress
          scaleX = scale
          scaleY = scale
          translationY = 24.dp.toPx() * (1f - receiptProgress)
        }
      },
  ) {
    GelPanel {
      Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 17.dp, vertical = 14.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
      ) {
        Text("SIGNAL RECEIPT", color = SignalColors.Ink, fontSize = 11.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
        Spacer(Modifier.height(2.dp))
        Text("SIGNAL LEVEL", color = SignalColors.Muted, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.Center) {
          Text(
            score.toString(),
            color = SignalColors.Ink,
            fontSize = 64.sp,
            lineHeight = 60.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = (-6).sp,
          )
          Text("/ 100", color = SignalColors.Ink, fontSize = 17.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(start = 7.dp, bottom = 5.dp))
        }
        Text(
          "${factCount.coerceAtLeast(0)}件のFactから算出 · 確率ではありません",
          color = SignalColors.Muted,
          fontSize = 10.sp,
          fontWeight = FontWeight.Bold,
          textAlign = TextAlign.Center,
        )
      }
    }
  }
}
