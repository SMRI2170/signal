package com.signal.app.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.signal.app.ui.material.ChromeBezel
import com.signal.app.ui.material.GelPanel
import com.signal.app.ui.material.PixelTerminal
import com.signal.app.ui.sticker.SignalHeartMeter
import com.signal.app.ui.theme.SignalColors
import com.signal.app.ui.theme.SignalShapes
import com.signal.app.ui.theme.chromeNumberShadow

/**
 * SIGNAL RECEIPT — 5-level information hierarchy.
 *
 *   Level 1 — Current SIGNAL LEVEL value
 *   Level 2 — Evidence Quality (■■■□□ bullets + tier label)
 *   Level 3 — Sub-metrics (会いたいサイン / 相手からの積極性)
 *   Level 4 — Delta vs previous Snapshot (no fake delta on first scan)
 *   Level 5 — Next-action CTA + disclaimer
 *
 * The receipt is driven by a real `SignalAnalysis` (or `SavedSnapshot`) and
 * refuses to render demo values when the caller is not in the demo state.
 */
@Composable
fun SignalReceipt(
  score: Int,
  statusLabel: String,
  desireToMeet: Int,
  initiative: Int,
  evidenceSufficiency: Int,
  factCount: Int = 0,
  delta: Int? = null,
  receiptState: String = "LIVE",
  evidenceTierLabel: String = evidenceTierLabel(evidenceSufficiency),
  evidenceTierFilled: Int = evidenceTierFilled(evidenceSufficiency),
  translationSkipped: Boolean = false,
  modifier: Modifier = Modifier,
) {
  ChromeBezel(modifier) {
    GelPanel {
      Column(
        modifier = Modifier.fillMaxWidth().padding(14.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
      ) {
        // Level 1: current value.
        PixelTerminal("SIGNAL RECEIPT", receiptState)
        Spacer(Modifier.height(16.dp))
        StatusChip(statusLabel, background = SignalColors.Lime)
        Spacer(Modifier.height(15.dp))
        Text("SIGNAL LEVEL", color = SignalColors.Ink, fontWeight = FontWeight.Black, fontSize = 11.sp, letterSpacing = 1.sp)
        Row(verticalAlignment = Alignment.Bottom) {
          Text(
            score.toString(),
            color = SignalColors.Ink,
            fontSize = 86.sp,
            lineHeight = 78.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = (-9).sp,
            style = chromeNumberShadow(),
          )
          Text(
            "/ 100",
            color = SignalColors.Ink,
            fontSize = 22.sp,
            fontWeight = FontWeight.Black,
            modifier = Modifier.padding(start = 9.dp, bottom = 8.dp),
          )
        }
        SignalMeter(score)
        Spacer(Modifier.height(12.dp))
        SignalHeartMeter(score)
        // Level 2: evidence quality (bullets + label).
        EvidenceQualityRow(filled = evidenceTierFilled, label = evidenceTierLabel)
        // Level 4: delta vs previous Snapshot. First scan → no fake delta.
        Spacer(Modifier.height(13.dp))
        Row(
          Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(SignalColors.White.copy(alpha = .62f))
            .border(1.dp, SignalColors.Ink, RoundedCornerShape(8.dp))
            .padding(horizontal = 8.dp, vertical = 6.dp),
          horizontalArrangement = Arrangement.SpaceBetween,
        ) {
          Text(
            delta?.let { if (it > 0) "↑ +$it" else if (it < 0) "↓ $it" else "= 0" } ?: "FIRST",
            color = SignalColors.Ink,
            fontWeight = FontWeight.Black,
            fontSize = 18.sp,
          )
          Text(
            if (delta == null) "${factCount.coerceAtLeast(0)} FACTS\nFIRST SCAN" else "SINCE\nLAST SCAN",
            color = SignalColors.Muted,
            fontWeight = FontWeight.Black,
            fontSize = 8.sp,
            lineHeight = 10.sp,
            textAlign = TextAlign.End,
          )
        }
        // Level 3: sub-metrics (excluding 判断材料 which moved to Level 2).
        Spacer(Modifier.height(13.dp))
        MetricRow("会いたいサイン", desireToMeet, SignalColors.Pink)
        MetricRow("相手からの積極性", initiative, SignalColors.Cyan)
        // Translation banner (Level 5 / before disclaimer).
        if (translationSkipped) {
          TranslationBanner()
        }
        // Level 5: next-action hint + disclaimer.
        Spacer(Modifier.height(11.dp))
        Text(
          "これは確率ではなく、入力した事実から見えるSIGNALスコアです。相手の実際の感情を特定するものではありません。",
          color = SignalColors.Muted,
          fontWeight = FontWeight.SemiBold,
          fontSize = 10.sp,
          lineHeight = 15.sp,
          textAlign = TextAlign.Center,
        )
      }
    }
  }
}

@Composable
private fun TranslationBanner() {
  Spacer(Modifier.height(11.dp))
  Box(
    Modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(8.dp))
      .background(SignalColors.Yellow.copy(alpha = .82f))
      .border(2.dp, SignalColors.Ink, RoundedCornerShape(8.dp))
      .padding(horizontal = 12.dp, vertical = 8.dp),
  ) {
    Text(
      "翻訳を介さず日本語原文のまま判定しています。判定の安定性は参考値です。",
      color = SignalColors.Ink,
      fontWeight = FontWeight.Bold,
      fontSize = 11.sp,
      lineHeight = 16.sp,
      textAlign = TextAlign.Center,
    )
  }
}

@Composable
private fun EvidenceQualityRow(filled: Int, label: String) {
  Spacer(Modifier.height(13.dp))
  Row(
    Modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(8.dp))
      .background(SignalColors.White.copy(alpha = .74f))
      .border(1.dp, SignalColors.Ink, RoundedCornerShape(8.dp))
      .padding(horizontal = 10.dp, vertical = 6.dp),
    verticalAlignment = Alignment.CenterVertically,
  ) {
    Text(
      "判断材料",
      color = SignalColors.Ink,
      fontWeight = FontWeight.Black,
      fontSize = 11.sp,
      letterSpacing = 1.sp,
      modifier = Modifier.width(78.dp),
    )
    Text(
      "■".repeat(filled.coerceIn(0, 5)) + "□".repeat((5 - filled).coerceAtLeast(0)),
      color = SignalColors.Ink,
      fontWeight = FontWeight.Black,
      fontSize = 14.sp,
      letterSpacing = 2.sp,
    )
    Spacer(Modifier.width(8.dp))
    Text(label, color = SignalColors.Muted, fontWeight = FontWeight.SemiBold, fontSize = 11.sp)
  }
}

/**
 * Tier derivation mirrors `src/lib/judge/signal-level.ts`. Kept inline
 * so the Native module does not have to depend on the Web TS module.
 */
internal fun evidenceTierLabel(evidenceSufficiency: Int): String = when {
  evidenceSufficiency >= 60 -> "十分な材料"
  evidenceSufficiency >= 40 -> "まだ限定的"
  else -> "判断材料がまだ足りない"
}

internal fun evidenceTierFilled(evidenceSufficiency: Int): Int = when {
  evidenceSufficiency >= 60 -> 5
  evidenceSufficiency >= 40 -> 3
  else -> 1
}

@Composable
private fun MetricRow(label: String, score: Int, color: Color) {
  Row(
    modifier = Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 2.dp),
    verticalAlignment = Alignment.CenterVertically,
  ) {
    Text(label, color = SignalColors.Ink, fontWeight = FontWeight.Bold, fontSize = 12.sp, modifier = Modifier.width(130.dp))
    Box(
      Modifier
        .weight(1f)
        .height(11.dp)
        .clip(SignalShapes.Control)
        .background(SignalColors.White.copy(alpha = .78f))
        .border(1.dp, SignalColors.Ink, SignalShapes.Control),
    ) {
      Box(Modifier.fillMaxWidth(score / 100f).height(11.dp).background(color))
    }
    Text(score.toString(), color = SignalColors.Ink, fontWeight = FontWeight.Black, fontSize = 17.sp, textAlign = TextAlign.End, modifier = Modifier.width(34.dp))
  }
}

@Composable
private fun SignalMeter(value: Int) {
  Box(
    Modifier
      .fillMaxWidth()
      .height(15.dp)
      .clip(RoundedCornerShape(4.dp))
      .background(SignalColors.White.copy(alpha = .74f))
      .border(2.dp, SignalColors.Ink, RoundedCornerShape(4.dp)),
  ) {
    Box(
      Modifier
        .fillMaxWidth(value.coerceIn(0, 100) / 100f)
        .height(15.dp)
        .background(
          Brush.horizontalGradient(
            listOf(SignalColors.Pink, SignalColors.Purple, SignalColors.Cyan, SignalColors.Lime),
          ),
        ),
    )
  }
}
