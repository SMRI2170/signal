package com.signal.app

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size

private val Ink = Color(0xFF15121B)
private val Pink = Color(0xFFFF66D8)
private val Purple = Color(0xFFA76CFF)
private val Cyan = Color(0xFF75E9FF)
private val Lime = Color(0xFFB9FF83)
private val Yellow = Color(0xFFFFE66D)
private val Paper = Color(0xFFFFF7FD)
private val White = Color(0xFFFFFFFF)
private val Muted = Color(0xFF625C6B)
private val CardShape = RoundedCornerShape(20.dp)
private val PillShape = RoundedCornerShape(999.dp)

private enum class Screen { LANDING, FACTS, RESULT, HISTORY }

/** Shared iOS / Android application. It intentionally contains no API secret. */
@Composable
fun SignalApp(gateway: JudgeGateway = LocalJudgeGateway) {
  var screen by remember { mutableStateOf(Screen.LANDING) }
  var facts by remember { mutableStateOf(List(3) { "" }) }
  var validations by remember { mutableStateOf<List<FactValidation>>(emptyList()) }
  var analysis by remember { mutableStateOf<SignalAnalysis?>(null) }
  var formMessage by remember { mutableStateOf<String?>(null) }

  MaterialTheme {
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
  SignalBackground(colors = listOf(Pink, Purple, Cyan)) {
    Box(Modifier.fillMaxSize()) {
      ChromeOrb(Modifier.align(Alignment.TopCenter).padding(top = 31.dp).offset(x = 47.dp), 58.dp)
      HeartSticker(Modifier.align(Alignment.TopEnd).padding(top = 113.dp).offset(x = 10.dp), 82.dp, 12f)
      ButterflySticker(Modifier.align(Alignment.TopStart).padding(top = 94.dp).offset(x = (-7).dp))
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
        MiniTerminal("CRUSH.SYS", "FACT MODE: ON")
        Spacer(Modifier.height(14.dp))
        StickerLabel("REALITY CHECK FOR YOUR CRUSH")
        Spacer(Modifier.height(27.dp))
        Text(
          text = "SIGNAL",
          color = White,
          fontSize = 30.sp,
          fontWeight = FontWeight.Black,
          letterSpacing = (-2).sp,
          style = blackOffsetShadow(2.dp),
        )
        Text(
          text = "彼って、\n脈あり？",
          color = White,
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
          color = Ink,
          fontSize = 13.sp,
          fontWeight = FontWeight.Bold,
          lineHeight = 20.sp,
          textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(25.dp))
        GlossyButton("CHECK IT  ↗", Lime, Cyan, onStart)
        Spacer(Modifier.height(18.dp))
        Text(
          text = "マッチングアプリで出会った、交際前の関係を記録するために。",
          color = Ink,
          fontSize = 11.sp,
          fontWeight = FontWeight.SemiBold,
          textAlign = TextAlign.Center,
          modifier = Modifier
            .clip(PillShape)
            .background(White.copy(alpha = .28f))
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
  SignalBackground(colors = listOf(Paper, Purple.copy(alpha = .65f), Cyan.copy(alpha = .62f))) {
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
        Text("SIGNAL", color = Ink, fontWeight = FontWeight.Black, fontSize = 21.sp, letterSpacing = (-2).sp)
        Text("× CLOSE", color = Ink, fontWeight = FontWeight.Black, fontSize = 12.sp, modifier = Modifier.noRippleClick(onBack))
      }
      Spacer(Modifier.height(42.dp))
      StickerLabel("♡ WHAT HAPPENED? ★")
      Spacer(Modifier.height(9.dp))
      Text("最近あったこと、\nそのまま教えて。", color = Ink, fontWeight = FontWeight.Black, fontSize = 38.sp, lineHeight = 40.sp, letterSpacing = (-4).sp)
      Spacer(Modifier.height(12.dp))
      Text("気持ちや推測じゃなくて、相手の発言・行動・回数を入力してね。", color = Muted, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 21.sp)
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
      if (facts.size < 10) {
        Text(
          text = "+  ADD FACT",
          color = Ink,
          fontWeight = FontWeight.Black,
          fontSize = 14.sp,
          modifier = Modifier
            .clip(PillShape)
            .background(Brush.verticalGradient(listOf(White, Yellow, Pink)))
            .border(2.dp, Ink, PillShape)
            .noRippleClick(onAdd)
            .padding(horizontal = 16.dp, vertical = 11.dp),
        )
      }
      if (message != null) {
        Spacer(Modifier.height(16.dp))
        ValidationSummary(message, validations)
      }
      Spacer(Modifier.height(22.dp))
      GlossyButton("この内容でSIGNALを見る  →", Pink, Purple, onAnalyze, modifier = Modifier.fillMaxWidth())
      val filled = facts.count { normalizeFact(it).isNotEmpty() }
      Spacer(Modifier.height(10.dp))
      Text(
        text = if (filled >= 3) "3つのFactがそろいました。" else "あと${3 - filled}つでSIGNALを見られます",
        color = Muted,
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
private fun FactTicket(index: Int, value: String, showRemove: Boolean, error: String?, onValueChange: (String) -> Unit, onRemove: () -> Unit) {
  val shape = RoundedCornerShape(topStart = 19.dp, topEnd = 15.dp, bottomEnd = 23.dp, bottomStart = 17.dp)
  Box {
    Box(Modifier.matchParentSize().offset(5.dp, 6.dp).clip(shape).background(Ink))
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .clip(shape)
        .background(Brush.linearGradient(listOf(White, White.copy(alpha = .8f), Cyan.copy(alpha = .55f))))
        .border(3.dp, Ink, shape)
        .padding(14.dp),
    ) {
      Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text("FACT ${(index + 1).toString().padStart(2, '0')}", color = White, fontWeight = FontWeight.Black, fontSize = 10.sp, letterSpacing = 1.sp, modifier = Modifier.clip(PillShape).background(Brush.verticalGradient(listOf(White, Purple, Pink))).border(1.dp, Ink, PillShape).padding(horizontal = 7.dp, vertical = 4.dp))
        if (showRemove) Text("削除", color = Pink, fontWeight = FontWeight.Black, fontSize = 12.sp, modifier = Modifier.noRippleClick(onRemove)) else Text("FACT ONLY", color = Muted, fontWeight = FontWeight.Black, fontSize = 9.sp)
      }
      Spacer(Modifier.height(8.dp))
      OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = Modifier.fillMaxWidth().heightIn(min = 94.dp),
        placeholder = { Text("例：相手から来週空いているか聞かれた", color = Muted.copy(alpha = .7f), fontSize = 13.sp) },
        textStyle = TextStyle(color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold, lineHeight = 22.sp),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Default),
        minLines = 3,
        maxLines = 5,
        shape = RoundedCornerShape(11.dp),
        colors = OutlinedTextFieldDefaults.colors(
          focusedBorderColor = Purple,
          unfocusedBorderColor = Ink,
          focusedContainerColor = White.copy(alpha = .66f),
          unfocusedContainerColor = White.copy(alpha = .60f),
          cursorColor = Purple,
        ),
      )
      Spacer(Modifier.height(6.dp))
      Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(error ?: "解釈ではなく、見たこと・聞いたことだけ。", color = if (error == null) Muted else Pink, fontWeight = FontWeight.Bold, fontSize = 10.sp)
        Text("${value.length} / 300", color = Muted, fontWeight = FontWeight.Bold, fontSize = 10.sp)
      }
    }
  }
}

@Composable
private fun ValidationSummary(message: String, validations: List<FactValidation>) {
  val hasProblem = validations.any { it.status != FactStatus.OBSERVABLE }
  Column(
    modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(if (hasProblem) Pink.copy(alpha = .36f) else Lime).border(2.dp, Ink, RoundedCornerShape(14.dp)).padding(12.dp),
    verticalArrangement = Arrangement.spacedBy(6.dp),
  ) {
    Text(if (hasProblem) "MAKE IT CLEARER" else "FACT OK", color = Ink, fontWeight = FontWeight.Black, fontSize = 11.sp, letterSpacing = 1.sp)
    Text(message, color = Ink, fontWeight = FontWeight.Bold, fontSize = 12.sp, lineHeight = 18.sp)
    validations.filter { it.status != FactStatus.OBSERVABLE }.forEach { validation ->
      Text("× ${validation.text}\n${validation.rewriteExampleJa.orEmpty()}", color = Ink, fontSize = 11.sp, lineHeight = 17.sp)
    }
  }
}

@Composable
private fun ResultScreen(analysis: SignalAnalysis, onAddFact: () -> Unit, onHistory: () -> Unit) {
  SignalBackground(colors = listOf(Purple, Pink, Cyan)) {
    Box(Modifier.fillMaxSize()) {
      HeartSticker(Modifier.align(Alignment.TopEnd).padding(top = 59.dp).offset(x = 17.dp), 76.dp, 10f)
      Column(
        modifier = Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp),
      ) {
        TopMark()
        Spacer(Modifier.height(49.dp))
        StickerLabel("SIGNAL LEVEL")
        Spacer(Modifier.height(9.dp))
        Text("恋のSIGNALを、\n数字で見よう。", color = White, fontWeight = FontWeight.Black, fontSize = 39.sp, lineHeight = 40.sp, letterSpacing = (-4).sp, style = blackOffsetShadow(3.dp))
        Spacer(Modifier.height(25.dp))
        ScannerCard(analysis)
        Spacer(Modifier.height(24.dp))
        GlossyButton("+ FACTを追加", Lime, Cyan, onAddFact, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(14.dp))
        Text("YOUR SIGNAL HISTORY  ↗", color = White, fontWeight = FontWeight.Black, fontSize = 12.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().noRippleClick(onHistory))
        Spacer(Modifier.height(34.dp))
      }
    }
  }
}

@Composable
private fun ScannerCard(analysis: SignalAnalysis) {
  val score = analysis.scores.signalLevel
  val shape = RoundedCornerShape(topStart = 24.dp, topEnd = 19.dp, bottomEnd = 26.dp, bottomStart = 21.dp)
  Box {
    Box(Modifier.matchParentSize().offset(8.dp, 8.dp).clip(shape).background(Ink))
    Column(
      modifier = Modifier.fillMaxWidth().clip(shape).background(Brush.linearGradient(listOf(White, White.copy(alpha = .82f), Cyan.copy(alpha = .58f)))).border(3.dp, Ink, shape).padding(18.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
    ) {
      MiniTerminal("♥ SIGNAL SCANNER ♥", "LIVE")
      Spacer(Modifier.height(16.dp))
      Text("★ ${analysis.statusLabel} ★", color = Ink, fontWeight = FontWeight.Black, fontSize = 10.sp, modifier = Modifier.clip(PillShape).background(Lime).border(2.dp, Ink, PillShape).padding(horizontal = 9.dp, vertical = 5.dp))
      Spacer(Modifier.height(15.dp))
      Text("SIGNAL LEVEL", color = Ink, fontWeight = FontWeight.Black, fontSize = 11.sp, letterSpacing = 1.sp)
      Row(verticalAlignment = Alignment.Bottom) {
        Text(score.toString(), color = Ink, fontSize = 86.sp, lineHeight = 78.sp, fontWeight = FontWeight.Black, letterSpacing = (-9).sp, style = chromeNumberShadow())
        Text("/ 100", color = Ink, fontSize = 22.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(start = 9.dp, bottom = 8.dp))
      }
      SegmentedMeter(score)
      Spacer(Modifier.height(12.dp))
      Text("♥  ♥  ♥  ♥  ♡", color = Pink, fontSize = 25.sp, letterSpacing = 1.sp, style = blackOffsetShadow(1.dp))
      Spacer(Modifier.height(13.dp))
      Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(White.copy(alpha = .62f)).border(1.dp, Ink, RoundedCornerShape(8.dp)).padding(horizontal = 8.dp, vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text("↑ +${(score - 62).coerceAtLeast(1)}", color = Ink, fontWeight = FontWeight.Black, fontSize = 18.sp)
        Text("LAST SCAN\nJUST NOW", color = Muted, fontWeight = FontWeight.Black, fontSize = 8.sp, lineHeight = 10.sp, textAlign = TextAlign.End)
      }
      Spacer(Modifier.height(13.dp))
      MetricRow("会いたいサイン", analysis.scores.desireToMeet, Pink)
      MetricRow("相手からの積極性", analysis.scores.initiative, Cyan)
      MetricRow("判断材料", analysis.scores.evidenceSufficiency, Yellow)
      Spacer(Modifier.height(11.dp))
      Text("これは確率ではなく、入力した事実から見えるSIGNALスコアです。", color = Muted, fontWeight = FontWeight.SemiBold, fontSize = 10.sp, lineHeight = 15.sp, textAlign = TextAlign.Center)
    }
  }
}

@Composable
private fun MetricRow(label: String, score: Int, color: Color) {
  Row(
    modifier = Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 2.dp),
    verticalAlignment = Alignment.CenterVertically,
  ) {
    Text(label, color = Ink, fontWeight = FontWeight.Bold, fontSize = 12.sp, modifier = Modifier.width(130.dp))
    Box(Modifier.weight(1f).height(11.dp).clip(PillShape).background(White.copy(alpha = .78f)).border(1.dp, Ink, PillShape)) {
      Box(Modifier.fillMaxWidth(score / 100f).height(11.dp).background(color))
    }
    Text(score.toString(), color = Ink, fontWeight = FontWeight.Black, fontSize = 17.sp, textAlign = TextAlign.End, modifier = Modifier.width(34.dp))
  }
}

@Composable
private fun HistoryScreen(analysis: SignalAnalysis, onBack: () -> Unit) {
  val scores = listOf(38, 42, 41, 54, analysis.scores.signalLevel)
  SignalBackground(colors = listOf(Cyan, Lime, Yellow)) {
    Column(
      modifier = Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp),
    ) {
      Row(Modifier.fillMaxWidth().padding(top = 10.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text("SIGNAL", color = Ink, fontWeight = FontWeight.Black, fontSize = 21.sp, letterSpacing = (-2).sp)
        Text("‹ BACK", color = Ink, fontWeight = FontWeight.Black, fontSize = 12.sp, modifier = Modifier.noRippleClick(onBack))
      }
      Spacer(Modifier.height(43.dp))
      StickerLabel("YOUR SIGNAL HISTORY")
      Spacer(Modifier.height(9.dp))
      Text("恋のSIGNALは、\n1回じゃ分からない。", color = Ink, fontWeight = FontWeight.Black, fontSize = 39.sp, lineHeight = 40.sp, letterSpacing = (-4).sp)
      Spacer(Modifier.height(14.dp))
      Text("デートやLINEで何かあったら、事実を追加。SIGNALがどう変わったか、記録していきます。", color = Ink, fontWeight = FontWeight.Bold, fontSize = 14.sp, lineHeight = 21.sp)
      Spacer(Modifier.height(22.dp))
      HistoryCard(scores)
      Spacer(Modifier.height(23.dp))
      RealityTip()
      Spacer(Modifier.height(34.dp))
    }
  }
}

@Composable
private fun HistoryCard(scores: List<Int>) {
  val shape = RoundedCornerShape(topStart = 22.dp, topEnd = 18.dp, bottomEnd = 25.dp, bottomStart = 20.dp)
  Box {
    Box(Modifier.matchParentSize().offset(7.dp, 7.dp).clip(shape).background(Ink))
    Column(Modifier.fillMaxWidth().clip(shape).background(Brush.linearGradient(listOf(White, White.copy(alpha = .68f), Purple.copy(alpha = .28f)))).border(3.dp, Ink, shape).padding(16.dp)) {
      Text("SIGNAL TAPE", color = Ink, fontWeight = FontWeight.Black, fontSize = 10.sp, letterSpacing = 1.sp)
      Canvas(Modifier.fillMaxWidth().height(142.dp).padding(top = 15.dp)) {
        val left = 6.dp.toPx()
        val top = 12.dp.toPx()
        val graphWidth = size.width - left * 2
        val graphHeight = size.height - top * 2
        repeat(3) { row ->
          val y = top + graphHeight * row / 2f
          drawLine(Color(0x3325121B), Offset(left, y), Offset(left + graphWidth, y), strokeWidth = 1.dp.toPx())
        }
        val points = scores.mapIndexed { index, value ->
          Offset(left + graphWidth * index / (scores.size - 1), top + graphHeight * (1f - value / 100f))
        }
        points.zipWithNext().forEach { (from, to) -> drawLine(Purple, from, to, strokeWidth = 7.dp.toPx()) }
        points.forEachIndexed { index, point ->
          drawCircle(if (index == points.lastIndex) Pink else Yellow, radius = if (index == points.lastIndex) 8.dp.toPx() else 6.dp.toPx(), center = point, style = Stroke(width = 3.dp.toPx(), miter = 2f))
          drawCircle(if (index == points.lastIndex) Pink else Yellow, radius = if (index == points.lastIndex) 5.dp.toPx() else 3.dp.toPx(), center = point)
        }
      }
      Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        listOf("9/21", "9/24", "9/28", "10/1", "TODAY").forEachIndexed { index, date ->
          Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(date, color = Muted, fontWeight = FontWeight.Bold, fontSize = 9.sp)
            Text(if (index == scores.lastIndex) "${scores[index]} ↑" else scores[index].toString(), color = if (index == scores.lastIndex) Pink else Ink, fontWeight = FontWeight.Black, fontSize = 13.sp)
          }
        }
      }
    }
  }
}

@Composable
private fun RealityTip() {
  Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Yellow).border(3.dp, Ink, RoundedCornerShape(16.dp)).padding(16.dp)) {
    Text("★ REALITY CHECK ★", color = Ink, fontWeight = FontWeight.Black, fontSize = 10.sp, letterSpacing = 1.sp)
    Spacer(Modifier.height(6.dp))
    Text("「最近冷たい」じゃなくて、「今週は3日返信がなかった」みたいに書くと、もっと正確に見えるよ。", color = Ink, fontWeight = FontWeight.Bold, fontSize = 13.sp, lineHeight = 20.sp)
  }
}

@Composable
private fun SignalBackground(colors: List<Color>, content: @Composable () -> Unit) {
  Box(Modifier.fillMaxSize().background(Brush.linearGradient(colors))) {
    Canvas(Modifier.fillMaxSize()) {
      val step = 22.dp.toPx()
      for (x in 0..size.width.toInt() step step.toInt()) {
        for (y in 0..size.height.toInt() step step.toInt()) {
          drawCircle(White.copy(alpha = .55f), radius = 1.3.dp.toPx(), center = Offset(x.toFloat(), y.toFloat()))
        }
      }
      drawCircle(White.copy(alpha = .28f), radius = size.width * .56f, center = Offset(size.width * .12f, size.height * .13f))
    }
    content()
  }
}

@Composable
private fun TopMark() {
  Row(
    modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
    horizontalArrangement = Arrangement.SpaceBetween,
    verticalAlignment = Alignment.CenterVertically,
  ) {
    Text("SIGNAL", color = Ink, fontWeight = FontWeight.Black, fontSize = 21.sp, letterSpacing = (-2).sp)
    Text("BETA ♡", color = Ink, fontWeight = FontWeight.Black, fontSize = 10.sp, modifier = Modifier.clip(PillShape).background(Lime).border(2.dp, Ink, PillShape).padding(horizontal = 8.dp, vertical = 5.dp))
  }
}

@Composable
private fun MiniTerminal(left: String, right: String) {
  Row(
    modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(Ink).border(2.dp, Ink, RoundedCornerShape(8.dp)).padding(horizontal = 8.dp, vertical = 5.dp),
    horizontalArrangement = Arrangement.spacedBy(7.dp),
  ) {
    Text(left, color = White, fontWeight = FontWeight.Black, fontSize = 8.sp, letterSpacing = .7.sp)
    Text("●", color = Lime, fontSize = 8.sp)
    Text(right, color = Lime, fontWeight = FontWeight.Black, fontSize = 8.sp, letterSpacing = .7.sp)
  }
}

@Composable
private fun StickerLabel(text: String) {
  Text(text, color = Ink, fontSize = 10.sp, fontWeight = FontWeight.Black, letterSpacing = 1.1.sp, modifier = Modifier.clip(PillShape).background(White.copy(alpha = .82f)).border(2.dp, Ink, PillShape).padding(horizontal = 10.dp, vertical = 6.dp))
}

@Composable
private fun GlassPill(text: String) {
  Text(text, color = Ink, fontSize = 18.sp, fontWeight = FontWeight.Black, textAlign = TextAlign.Center, modifier = Modifier.clip(PillShape).background(White.copy(alpha = .62f)).border(2.dp, Ink, PillShape).padding(horizontal = 16.dp, vertical = 7.dp))
}

@Composable
private fun GlossyButton(label: String, core: Color, tail: Color, onClick: () -> Unit, modifier: Modifier = Modifier) {
  Box(modifier) {
    Box(Modifier.matchParentSize().offset(5.dp, 5.dp).clip(PillShape).background(Ink))
    Button(
      onClick = onClick,
      modifier = Modifier.fillMaxWidth().height(54.dp).border(3.dp, Ink, PillShape),
      shape = PillShape,
      colors = ButtonDefaults.buttonColors(containerColor = core, contentColor = Ink),
      contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp),
    ) {
      Box(Modifier.fillMaxSize().clip(PillShape).background(Brush.verticalGradient(listOf(White, core, tail))), contentAlignment = Alignment.Center) {
        Text(label, color = Ink, fontWeight = FontWeight.Black, fontSize = 15.sp, letterSpacing = .3.sp)
      }
    }
  }
}

@Composable
private fun SegmentedMeter(value: Int) {
  Box(Modifier.fillMaxWidth().height(15.dp).clip(RoundedCornerShape(4.dp)).background(White.copy(alpha = .74f)).border(2.dp, Ink, RoundedCornerShape(4.dp))) {
    Box(Modifier.fillMaxWidth(value / 100f).height(15.dp).background(Brush.horizontalGradient(listOf(Pink, Purple, Cyan, Lime))))
  }
}

@Composable
private fun ChromeOrb(modifier: Modifier, size: Dp) {
  Box(modifier.size(size).rotate(13f).shadow(5.dp, CircleShape, clip = false).clip(CircleShape).background(Brush.radialGradient(listOf(White, Cyan, Purple, Pink))).border(3.dp, Ink, CircleShape), contentAlignment = Alignment.Center) {
    Box(Modifier.size(size * .55f).clip(CircleShape).background(Pink).border(2.dp, Ink, CircleShape), contentAlignment = Alignment.Center) {
      Text("♥", color = White, fontSize = 22.sp, fontWeight = FontWeight.Black, style = blackOffsetShadow(1.dp))
    }
  }
}

@Composable
private fun HeartSticker(modifier: Modifier, size: Dp, rotation: Float) {
  Text("♥", color = Pink, fontWeight = FontWeight.Black, fontSize = (size.value * .84f).sp, style = TextStyle(shadow = Shadow(Ink, Offset(4f, 5f), 0f)), modifier = modifier.size(size).rotate(rotation).clip(CircleShape).background(White.copy(alpha = .7f)).border(3.dp, Ink, CircleShape).padding(2.dp), textAlign = TextAlign.Center)
}

@Composable
private fun ButterflySticker(modifier: Modifier) {
  Text("✦", color = Yellow, fontWeight = FontWeight.Black, fontSize = 48.sp, style = blackOffsetShadow(3.dp), modifier = modifier.rotate(-16f))
}

private fun blackOffsetShadow(offset: Dp): TextStyle = TextStyle(shadow = Shadow(Ink, Offset(offset.value, offset.value), 0f))
private fun chromeNumberShadow(): TextStyle = TextStyle(shadow = Shadow(White, Offset(2f, 3f), 0f))

private fun Modifier.noRippleClick(onClick: () -> Unit): Modifier = clickable(onClick = onClick)
