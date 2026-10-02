package com.signal.app.ui.catalog

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.signal.app.ui.component.FactTicket
import com.signal.app.ui.component.GlossyButton
import com.signal.app.ui.component.RealityCheckSlip
import com.signal.app.ui.component.SignalReceipt
import com.signal.app.ui.component.SignalTape
import com.signal.app.ui.component.StatusChip
import com.signal.app.ui.material.DotField
import com.signal.app.ui.material.PixelTerminal
import com.signal.app.ui.sticker.Butterfly
import com.signal.app.ui.sticker.ChromeHeart
import com.signal.app.ui.sticker.Lightning
import com.signal.app.ui.sticker.PixelSpark
import com.signal.app.ui.sticker.ScannerOrb
import com.signal.app.ui.theme.SignalColors
import com.signal.app.ui.theme.SignalTheme

@Preview(widthDp = 360, heightDp = 1200)
@Composable
private fun Y2kCatalog360Preview() = Y2kComponentCatalog()

@Preview(widthDp = 390, heightDp = 1200)
@Composable
private fun Y2kCatalog390Preview() = Y2kComponentCatalog()

@Preview(widthDp = 430, heightDp = 1200)
@Composable
private fun Y2kCatalog430Preview() = Y2kComponentCatalog()

@Composable
fun Y2kComponentCatalog() {
  SignalTheme {
    DotField(colors = listOf(SignalColors.Paper, SignalColors.Purple, SignalColors.Cyan)) {
      Column(
        modifier = Modifier
          .fillMaxSize()
          .verticalScroll(rememberScrollState())
          .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
      ) {
        Text("SIGNAL UI / Y2K MATERIALS", color = SignalColors.Ink, fontSize = 22.sp, fontWeight = FontWeight.Black)
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceEvenly,
          verticalAlignment = Alignment.CenterVertically,
        ) {
          ScannerOrb(size = 62.dp)
          ChromeHeart(size = 72.dp, rotation = 7f)
          Butterfly()
        }
        Row(
          horizontalArrangement = Arrangement.spacedBy(14.dp),
          verticalAlignment = Alignment.CenterVertically,
        ) {
          PixelSpark()
          Lightning()
          PixelTerminal("CRUSH.SYS", "READY")
        }
        StatusChip("REALITY CHECK")
        FactTicket(
          index = 0,
          value = "相手から次の予定を聞かれた",
          showRemove = false,
          error = null,
          onValueChange = {},
          onRemove = {},
        )
        RealityCheckSlip(
          message = "解釈を、実際に起きた出来事へ書き換えてください。",
          problems = listOf("なんとなく冷たかった" to "例：今週は3日返信がなかった"),
        )
        SignalReceipt(
          score = 73,
          statusLabel = "FIRST SIGNAL",
          desireToMeet = 81,
          initiative = 68,
          evidenceSufficiency = 57,
        )
        SignalTape(
          scores = listOf(38, 42, 41, 54, 73),
          dates = listOf("9/21", "9/24", "9/28", "10/1", "TODAY"),
        )
        GlossyButton(
          label = "CHECK IT  ↗",
          core = SignalColors.Lime,
          tail = SignalColors.Cyan,
          onClick = {},
          modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(24.dp))
      }
    }
  }
}
