package com.signal.app

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.signal.app.ui.component.AddFactButton
import com.signal.app.ui.component.FactTicket
import com.signal.app.ui.component.GlassPill
import com.signal.app.ui.component.GlossyButton
import com.signal.app.ui.component.RealityCheckSlip
import com.signal.app.ui.component.SignalReceipt
import com.signal.app.ui.component.SignalTape
import com.signal.app.ui.component.StatusChip
import com.signal.app.ui.component.TopMark
import com.signal.app.ui.material.DotField
import com.signal.app.ui.material.PixelTerminal
import com.signal.app.ui.sticker.Butterfly
import com.signal.app.ui.sticker.ChromeHeart
import com.signal.app.ui.sticker.PixelSpark
import com.signal.app.ui.sticker.ScannerOrb
import com.signal.app.ui.theme.SignalColors
import com.signal.app.ui.theme.SignalShapes
import com.signal.app.ui.theme.SignalTheme
import com.signal.app.ui.theme.blackOffsetShadow

private enum class Screen { LANDING, FACTS, RESULT, HISTORY }

/** Shared iOS / Android application. It intentionally contains no API secret. */
@Composable
fun SignalApp(gateway: JudgeGateway = LocalJudgeGateway) {
  var screen by remember { mutableStateOf(Screen.LANDING) }
  var facts by remember { mutableStateOf(List(3) { "" }) }
  var validations by remember { mutableStateOf<List<FactValidation>>(emptyList()) }
  var analysis by remember { mutableStateOf<SignalAnalysis?>(null) }
  var formMessage by remember { mutableStateOf<String?>(null) }

  SignalTheme {
    when (screen) {
      Screen.LANDING -> LandingScreen(onStart = { screen = Screen.FACTS })
      Screen.FACTS -> FactScreen(
        facts = facts,
        validations = validations,
        message = formMessage,
        onBack = { screen = Screen.LANDING },
        onChange = { index, value ->
          facts = facts.mapIndexed { itemIndex, fact -> if (itemIndex == index) value else fact }
          validations = emptyList()
          formMessage = null
        },
        onAdd = {
          if (facts.size < 10) facts = facts + ""
        },
        onRemove = { index ->
          if (facts.size > 3) facts = facts.filterIndexed { itemIndex, _ -> itemIndex != index }
        },
        onAnalyze = {
          val cleaned = facts.map(::normalizeFact).filter(String::isNotEmpty)
          val inputErrors = cleaned.map(::factInputError).filterNotNull()
          when {
            cleaned.size < 3 -> formMessage = "最低3つのFactを追加してください。"
            inputErrors.isNotEmpty() -> formMessage = "短すぎるFactがあります。出来事をもう少し具体的に書いてください。"
            cleaned.size != cleaned.distinct().size -> formMessage = "同じFactが重複しています。"
            else -> {
              val checked = gateway.validate(cleaned)
              validations = checked
              if (checked.any { it.status != FactStatus.OBSERVABLE }) {
                formMessage = "解釈を含むFactがあります。実際に起きたことへ書き換えてください。"
              } else {
                analysis = gateway.analyze(cleaned)
                screen = Screen.RESULT
              }
            }
          }
        },
      )
      Screen.RESULT -> ResultScreen(
        analysis = analysis ?: gateway.analyze(emptyList()),
        onAddFact = { screen = Screen.FACTS },
        onHistory = { screen = Screen.HISTORY },
      )
      Screen.HISTORY -> HistoryScreen(
        analysis = analysis ?: gateway.analyze(emptyList()),
        onBack = { screen = Screen.RESULT },
      )
    }
  }
}

@Composable
private fun LandingScreen(onStart: () -> Unit) {
  DotField(colors = listOf(SignalColors.Pink, SignalColors.Purple, SignalColors.Cyan)) {
    Box(Modifier.fillMaxSize()) {
      ScannerOrb(
        Modifier.align(Alignment.TopCenter).padding(top = 31.dp).offset(x = 47.dp),
        size = 60.dp,
      )
      ChromeHeart(
        Modifier.align(Alignment.TopEnd).padding(top = 113.dp).offset(x = 13.dp),
        size = 86.dp,
        rotation = 12f,
      )
      Butterfly(Modifier.align(Alignment.TopStart).padding(top = 94.dp).offset(x = (-8).dp))
      Column(
        modifier = Modifier
          .fillMaxSize()
          .windowInsetsPadding(WindowInsets.safeDrawing)
          .padding(horizontal = 20.dp)
          .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
      ) {
        TopMark()
        Spacer(Modifier.height(68.dp))
        PixelTerminal("CRUSH.SYS", "FACT MODE: ON")
        Spacer(Modifier.height(14.dp))
        StatusChip("REALITY CHECK FOR YOUR CRUSH")
        Spacer(Modifier.height(27.dp))
        Text(
          text = "SIGNAL",
          color = SignalColors.White,
          fontSize = 30.sp,
          fontWeight = FontWeight.Black,
          letterSpacing = (-2).sp,
          style = blackOffsetShadow(2.dp),
        )
        Text(
          text = "彼って、\n脈あり？",
          color = SignalColors.White,
          fontSize = 62.sp,
          lineHeight = 53.sp,
          fontWeight = FontWeight.Black,
          letterSpacing = (-7).sp,
          textAlign = TextAlign.Center,
          style = blackOffsetShadow(5.dp),
        )
        Spacer(Modifier.height(26.dp))
        GlassPill("起きたことだけ、教えて。")
        Spacer(Modifier.height(14.dp))
        Text(
          text = "「いい感じだった」じゃなく、起きたことだけ。\n相手の行動を記録して、恋のSIGNALを数字で追おう。",
          color = SignalColors.Ink,
          fontSize = 13.sp,
          fontWeight = FontWeight.Bold,
          lineHeight = 20.sp,
          textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(25.dp))
        GlossyButton("CHECK IT  ↗", SignalColors.Lime, SignalColors.Cyan, onStart)
        Spacer(Modifier.height(18.dp))
        Text(
          text = "マッチングアプリで出会った、交際前の関係を記録するために。",
          color = SignalColors.Ink,
          fontSize = 11.sp,
          fontWeight = FontWeight.SemiBold,
          textAlign = TextAlign.Center,
          modifier = Modifier
            .clip(SignalShapes.Control)
            .background(SignalColors.White.copy(alpha = .28f))
            .padding(horizontal = 12.dp, vertical = 5.dp),
        )
        Spacer(Modifier.height(42.dp))
      }
    }
  }
}

@Composable
private fun FactScreen(
  facts: List<String>,
  validations: List<FactValidation>,
  message: String?,
  onBack: () -> Unit,
  onChange: (Int, String) -> Unit,
  onAdd: () -> Unit,
  onRemove: (Int) -> Unit,
  onAnalyze: () -> Unit,
) {
  DotField(
    colors = listOf(
      SignalColors.Paper,
      SignalColors.Purple.copy(alpha = .65f),
      SignalColors.Cyan.copy(alpha = .62f),
    ),
  ) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .windowInsetsPadding(WindowInsets.safeDrawing)
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 18.dp),
    ) {
      Row(
        modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
      ) {
        Text("SIGNAL", color = SignalColors.Ink, fontWeight = FontWeight.Black, fontSize = 21.sp, letterSpacing = (-2).sp)
        Text("× CLOSE", color = SignalColors.Ink, fontWeight = FontWeight.Black, fontSize = 12.sp, modifier = Modifier.clickable(onClick = onBack))
      }
      Spacer(Modifier.height(42.dp))
      StatusChip("WHAT HAPPENED?")
      Spacer(Modifier.height(9.dp))
      Text(
        "最近あったこと、\nそのまま教えて。",
        color = SignalColors.Ink,
        fontWeight = FontWeight.Black,
        fontSize = 38.sp,
        lineHeight = 40.sp,
        letterSpacing = (-4).sp,
      )
      Spacer(Modifier.height(12.dp))
      Text(
        "気持ちや推測じゃなくて、相手の発言・行動・回数を入力してね。",
        color = SignalColors.Muted,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 21.sp,
      )
      Spacer(Modifier.height(20.dp))
      facts.forEachIndexed { index, fact ->
        FactTicket(
          index = index,
          value = fact,
          showRemove = facts.size > 3,
          error = factInputError(fact),
          onValueChange = { onChange(index, it) },
          onRemove = { onRemove(index) },
        )
        Spacer(Modifier.height(13.dp))
      }
      if (facts.size < 10) AddFactButton(onClick = onAdd)
      if (message != null) {
        Spacer(Modifier.height(16.dp))
        RealityCheckSlip(
          message = message,
          problems = validations
            .filter { it.status != FactStatus.OBSERVABLE }
            .map { it.text to it.rewriteExampleJa.orEmpty() },
        )
      }
      Spacer(Modifier.height(22.dp))
      GlossyButton(
        "この内容でSIGNALを見る  →",
        SignalColors.Pink,
        SignalColors.Purple,
        onAnalyze,
        modifier = Modifier.fillMaxWidth(),
      )
      val filled = facts.count { normalizeFact(it).isNotEmpty() }
      Spacer(Modifier.height(10.dp))
      Text(
        text = if (filled >= 3) "3つのFactがそろいました。" else "あと${3 - filled}つでSIGNALを見られます",
        color = SignalColors.Muted,
        fontWeight = FontWeight.Bold,
        fontSize = 11.sp,
        textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth(),
      )
      Spacer(Modifier.height(22.dp))
      RealityTip()
      Spacer(Modifier.height(34.dp))
    }
  }
}

@Composable
private fun ResultScreen(
  analysis: SignalAnalysis,
  onAddFact: () -> Unit,
  onHistory: () -> Unit,
) {
  DotField(colors = listOf(SignalColors.Purple, SignalColors.Pink, SignalColors.Cyan)) {
    Box(Modifier.fillMaxSize()) {
      ChromeHeart(
        Modifier.align(Alignment.TopEnd).padding(top = 59.dp).offset(x = 17.dp),
        size = 80.dp,
        rotation = 10f,
      )
      Column(
        modifier = Modifier
          .fillMaxSize()
          .windowInsetsPadding(WindowInsets.safeDrawing)
          .verticalScroll(rememberScrollState())
          .padding(horizontal = 20.dp),
      ) {
        TopMark()
        Spacer(Modifier.height(49.dp))
        StatusChip("SIGNAL LEVEL")
        Spacer(Modifier.height(9.dp))
        Text(
          "恋のSIGNALを、\n数字で見よう。",
          color = SignalColors.White,
          fontWeight = FontWeight.Black,
          fontSize = 39.sp,
          lineHeight = 40.sp,
          letterSpacing = (-4).sp,
          style = blackOffsetShadow(3.dp),
        )
        Spacer(Modifier.height(25.dp))
        SignalReceipt(
          score = analysis.scores.signalLevel,
          statusLabel = analysis.statusLabel,
          desireToMeet = analysis.scores.desireToMeet,
          initiative = analysis.scores.initiative,
          evidenceSufficiency = analysis.scores.evidenceSufficiency,
        )
        Spacer(Modifier.height(24.dp))
        GlossyButton(
          "+ FACTを追加",
          SignalColors.Lime,
          SignalColors.Cyan,
          onAddFact,
          modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(14.dp))
        Text(
          "YOUR SIGNAL HISTORY  ↗",
          color = SignalColors.White,
          fontWeight = FontWeight.Black,
          fontSize = 12.sp,
          textAlign = TextAlign.Center,
          modifier = Modifier.fillMaxWidth().clickable(onClick = onHistory),
        )
        Spacer(Modifier.height(34.dp))
      }
    }
  }
}

@Composable
private fun HistoryScreen(analysis: SignalAnalysis, onBack: () -> Unit) {
  val scores = listOf(38, 42, 41, 54, analysis.scores.signalLevel)
  val dates = listOf("9/21", "9/24", "9/28", "10/1", "TODAY")
  DotField(colors = listOf(SignalColors.Cyan, SignalColors.Lime, SignalColors.Yellow)) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .windowInsetsPadding(WindowInsets.safeDrawing)
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 20.dp),
    ) {
      Row(
        Modifier.fillMaxWidth().padding(top = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
      ) {
        Text("SIGNAL", color = SignalColors.Ink, fontWeight = FontWeight.Black, fontSize = 21.sp, letterSpacing = (-2).sp)
        Text("‹ BACK", color = SignalColors.Ink, fontWeight = FontWeight.Black, fontSize = 12.sp, modifier = Modifier.clickable(onClick = onBack))
      }
      Spacer(Modifier.height(43.dp))
      StatusChip("YOUR SIGNAL HISTORY")
      Spacer(Modifier.height(9.dp))
      Text(
        "恋のSIGNALは、\n1回じゃ分からない。",
        color = SignalColors.Ink,
        fontWeight = FontWeight.Black,
        fontSize = 39.sp,
        lineHeight = 40.sp,
        letterSpacing = (-4).sp,
      )
      Spacer(Modifier.height(14.dp))
      Text(
        "デートやLINEで何かあったら、事実を追加。SIGNALがどう変わったか、記録していきます。",
        color = SignalColors.Ink,
        fontWeight = FontWeight.Bold,
        fontSize = 14.sp,
        lineHeight = 21.sp,
      )
      Spacer(Modifier.height(22.dp))
      SignalTape(scores = scores, dates = dates)
      Spacer(Modifier.height(23.dp))
      RealityTip()
      Spacer(Modifier.height(34.dp))
    }
  }
}

@Composable
private fun RealityTip() {
  val shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp)
  Column(
    Modifier
      .fillMaxWidth()
      .clip(shape)
      .background(SignalColors.Yellow)
      .border(3.dp, SignalColors.Ink, shape)
      .padding(16.dp),
  ) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
      PixelSpark(size = 18.dp)
      Text("REALITY CHECK", color = SignalColors.Ink, fontWeight = FontWeight.Black, fontSize = 10.sp, letterSpacing = 1.sp)
    }
    Spacer(Modifier.height(6.dp))
    Text(
      "「最近冷たい」じゃなくて、「今週は3日返信がなかった」みたいに書くと、もっと正確に見えるよ。",
      color = SignalColors.Ink,
      fontWeight = FontWeight.Bold,
      fontSize = 13.sp,
      lineHeight = 20.sp,
    )
  }
}
