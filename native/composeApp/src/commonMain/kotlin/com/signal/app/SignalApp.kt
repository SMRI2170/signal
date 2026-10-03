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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
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
import kotlinx.coroutines.launch

private enum class Screen { LANDING, HOME, FACTS, ADD_FACT, RESULT, HISTORY, AUTH }

/** Shared iOS / Android application. It intentionally contains no API secret. */
@Composable
fun SignalApp(
  gateway: JudgeGateway = LocalJudgeGateway,
  accountRepository: SignalAccountRepository? = null,
) {
  var screen by remember { mutableStateOf(Screen.LANDING) }
  var facts by remember { mutableStateOf(List(3) { "" }) }
  var validations by remember { mutableStateOf<List<FactValidation>>(emptyList()) }
  var analysis by remember { mutableStateOf<SignalAnalysis?>(null) }
  var formMessage by remember { mutableStateOf<String?>(null) }
  var isAnalyzing by remember { mutableStateOf(false) }
  var relationshipName by remember { mutableStateOf("アプリの人") }
  var resultRelationshipId by remember { mutableStateOf<String?>(null) }
  var authEmail by remember { mutableStateOf("") }
  var newFact by remember { mutableStateOf("") }
  var addFactMessage by remember { mutableStateOf<String?>(null) }
  var isUpdating by remember { mutableStateOf(false) }
  val coroutineScope = rememberCoroutineScope()
  val accountState = accountRepository?.state?.collectAsState()?.value ?: AccountState.SignedOut()
  val restoredRelationship = accountRepository?.relationship?.collectAsState()?.value
  val relationships = accountRepository?.relationships?.collectAsState()?.value.orEmpty()
  val reanalysisDraft = accountRepository?.reanalysisDraft?.collectAsState()?.value
  val accountMessage = accountRepository?.message?.collectAsState()?.value

  LaunchedEffect(accountState) {
    if (accountState is AccountState.SignedIn && screen == Screen.LANDING) screen = Screen.HOME
    if (accountState is AccountState.ReauthenticationRequired && screen == Screen.ADD_FACT) screen = Screen.AUTH
  }

  LaunchedEffect(restoredRelationship?.id, restoredRelationship?.snapshots?.lastOrNull()?.createdAt) {
    restoredRelationship?.let { restored ->
      val latest = restored.snapshots.lastOrNull() ?: return@let
      facts = restored.facts.ifEmpty { List(3) { "" } }
      relationshipName = restored.displayName
      resultRelationshipId = restored.id
      analysis = SignalAnalysis(
        scores = latest.scores,
        statusLabel = when {
          latest.scores.signalLevel >= 70 -> "GOOD SIGNAL"
          latest.scores.signalLevel >= 45 -> "SIGNAL CHECK"
          else -> "LOW SIGNAL"
        },
        factCount = restored.facts.size,
      )
      if (screen == Screen.AUTH || screen == Screen.ADD_FACT) screen = Screen.RESULT
    }
  }

  LaunchedEffect(reanalysisDraft?.relationshipId, restoredRelationship?.id) {
    newFact = reanalysisDraft
      ?.takeIf { it.relationshipId == restoredRelationship?.id }
      ?.text
      .orEmpty()
  }

  SignalTheme {
    when (screen) {
      Screen.LANDING -> LandingScreen(onStart = { screen = Screen.FACTS })
      Screen.HOME -> CartridgeHomeScreen(
        relationships = relationships,
        message = accountMessage,
        onOpen = { relationshipId ->
          coroutineScope.launch {
            if (accountRepository?.selectRelationship(relationshipId) == true) screen = Screen.RESULT
          }
        },
        onNew = {
          facts = List(3) { "" }
          analysis = null
          relationshipName = "アプリの人"
          resultRelationshipId = null
          screen = Screen.FACTS
        },
        onLogout = accountRepository?.let { repository ->
          {
            coroutineScope.launch {
              repository.signOut()
              screen = Screen.LANDING
            }
          }
        },
      )
      Screen.FACTS -> FactScreen(
        facts = facts,
        validations = validations,
        message = formMessage,
        isAnalyzing = isAnalyzing,
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
              isAnalyzing = true
              formMessage = null
              coroutineScope.launch {
                try {
                  val checked = gateway.validate(cleaned)
                  validations = checked
                  if (checked.any { it.status != FactStatus.OBSERVABLE }) {
                    formMessage = "解釈を含むFactがあります。実際に起きたことへ書き換えてください。"
                  } else {
                    analysis = gateway.analyze(cleaned)
                    resultRelationshipId = null
                    screen = Screen.RESULT
                  }
                } catch (error: JudgeGatewayException) {
                  formMessage = error.userMessageJa
                } catch (_: Throwable) {
                  formMessage = "分析を開始できませんでした。入力内容は保持されています。"
                } finally {
                  isAnalyzing = false
                }
              }
            }
          }
        },
      )
      Screen.RESULT -> analysis?.let { currentAnalysis ->
        ResultScreen(
          analysis = currentAnalysis,
          accountState = accountState,
          accountMessage = accountMessage,
          isSaved = resultRelationshipId != null && resultRelationshipId == restoredRelationship?.id,
          onHome = if (accountState is AccountState.SignedIn) ({ screen = Screen.HOME }) else null,
          onSave = {
            val repository = accountRepository
            if (repository == null) {
              formMessage = "このPreviewではクラウド保存を利用できません。"
            } else {
              coroutineScope.launch {
                repository.stageGuestResult(facts, relationshipName)
                if (accountState !is AccountState.SignedIn) screen = Screen.AUTH
              }
            }
          },
          onLogout = accountRepository?.let { repository ->
            { coroutineScope.launch { repository.signOut() } }
          },
          onAddFact = {
            if (resultRelationshipId != null && restoredRelationship != null && accountState is AccountState.SignedIn) {
              addFactMessage = null
              screen = Screen.ADD_FACT
            } else {
              screen = Screen.FACTS
            }
          },
          onHistory = { screen = Screen.HISTORY },
        )
      } ?: LandingScreen(onStart = { screen = Screen.FACTS })
      Screen.ADD_FACT -> {
        val relationship = restoredRelationship
        if (relationship == null) {
          LandingScreen(onStart = { screen = Screen.FACTS })
        } else {
          AddFactScreen(
            relationshipName = relationship.displayName,
            value = newFact,
            message = addFactMessage ?: accountMessage,
            isUpdating = isUpdating,
            onValueChange = { value ->
              newFact = value.take(300)
              addFactMessage = null
              accountRepository.let { repository ->
                coroutineScope.launch { repository.saveReanalysisDraft(relationship.id, newFact) }
              }
            },
            onBack = { screen = Screen.RESULT },
            onSubmit = {
              val inputError = factInputError(newFact)
              when {
                newFact.isBlank() -> addFactMessage = "起きたことを1つ入力してください。"
                inputError != null -> addFactMessage = inputError
                else -> {
                  isUpdating = true
                  coroutineScope.launch {
                    val saved = accountRepository.appendFact(relationship.id, newFact)
                    isUpdating = false
                    if (saved) {
                      newFact = ""
                      screen = Screen.RESULT
                    }
                  }
                }
              }
            },
          )
        }
      }
      Screen.HISTORY -> analysis?.let { currentAnalysis ->
        HistoryScreen(
          analysis = currentAnalysis,
          snapshots = if (resultRelationshipId == restoredRelationship?.id) restoredRelationship?.snapshots.orEmpty() else emptyList(),
          onBack = { screen = Screen.RESULT },
        )
      } ?: LandingScreen(onStart = { screen = Screen.FACTS })
      Screen.AUTH -> AuthScreen(
        email = authEmail,
        relationshipName = relationshipName,
        state = accountState,
        message = accountMessage,
        onEmailChange = { authEmail = it.take(120) },
        onRelationshipNameChange = { relationshipName = it.take(80) },
        onBack = { screen = Screen.RESULT },
        onMagicLink = {
          accountRepository?.let { repository ->
            coroutineScope.launch {
              if (resultRelationshipId == null) repository.stageGuestResult(facts, relationshipName)
              repository.sendMagicLink(authEmail)
            }
          }
        },
        onGoogle = {
          accountRepository?.let { repository ->
            coroutineScope.launch {
              if (resultRelationshipId == null) repository.stageGuestResult(facts, relationshipName)
              repository.signInWithGoogle()
            }
          }
        },
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
  isAnalyzing: Boolean,
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
        if (isAnalyzing) "CRUSH.SYS 接続中..." else "この内容でSIGNALを見る  →",
        SignalColors.Pink,
        SignalColors.Purple,
        onAnalyze,
        modifier = Modifier.fillMaxWidth(),
        enabled = !isAnalyzing,
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
private fun CartridgeHomeScreen(
  relationships: List<RelationshipSummary>,
  message: String?,
  onOpen: (String) -> Unit,
  onNew: () -> Unit,
  onLogout: (() -> Unit)?,
) {
  DotField(colors = listOf(SignalColors.Cyan, SignalColors.Purple, SignalColors.Pink)) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .windowInsetsPadding(WindowInsets.safeDrawing)
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 20.dp),
    ) {
      TopMark()
      Spacer(Modifier.height(38.dp))
      StatusChip("MY CRUSH DEVICE")
      Spacer(Modifier.height(10.dp))
      Text(
        "続きを見たい恋を、\n選んでね。",
        color = SignalColors.White,
        fontWeight = FontWeight.Black,
        fontSize = 40.sp,
        lineHeight = 41.sp,
        letterSpacing = (-4).sp,
        style = blackOffsetShadow(3.dp),
      )
      Spacer(Modifier.height(12.dp))
      Text(
        "保存したSIGNAL CARTRIDGE。新しい出来事があったら、ここから1件だけFactを足せます。",
        color = SignalColors.White,
        fontWeight = FontWeight.Bold,
        fontSize = 13.sp,
        lineHeight = 20.sp,
      )
      Spacer(Modifier.height(22.dp))
      if (relationships.isEmpty()) {
        Column(
          Modifier
            .fillMaxWidth()
            .clip(SignalShapes.Panel)
            .background(SignalColors.White.copy(alpha = .9f))
            .border(3.dp, SignalColors.Ink, SignalShapes.Panel)
            .padding(18.dp),
        ) {
          Text("NO CARTRIDGE", color = SignalColors.Ink, fontWeight = FontWeight.Black, fontSize = 11.sp, letterSpacing = 1.sp)
          Spacer(Modifier.height(7.dp))
          Text("まだ保存した記録はありません。最初の3つのFactからSIGNALを作ろう。", color = SignalColors.Ink, fontWeight = FontWeight.Bold, fontSize = 14.sp, lineHeight = 21.sp)
        }
      } else {
        relationships.forEachIndexed { index, relationship ->
          CartridgeCard(relationship, index, onOpen)
          Spacer(Modifier.height(13.dp))
        }
      }
      message?.let {
        Text(
          it,
          color = SignalColors.Ink,
          fontWeight = FontWeight.Black,
          fontSize = 12.sp,
          lineHeight = 18.sp,
          modifier = Modifier
            .fillMaxWidth()
            .clip(SignalShapes.Control)
            .background(SignalColors.Yellow)
            .border(2.dp, SignalColors.Ink, SignalShapes.Control)
            .padding(11.dp),
        )
        Spacer(Modifier.height(13.dp))
      }
      GlossyButton(
        "+ NEW SIGNAL",
        SignalColors.Lime,
        SignalColors.Cyan,
        onNew,
        modifier = Modifier.fillMaxWidth(),
      )
      if (onLogout != null) {
        Spacer(Modifier.height(18.dp))
        Text(
          "LOG OUT",
          color = SignalColors.White,
          fontWeight = FontWeight.Black,
          fontSize = 11.sp,
          textAlign = TextAlign.Center,
          modifier = Modifier.fillMaxWidth().clickable(onClick = onLogout),
        )
      }
      Spacer(Modifier.height(34.dp))
    }
  }
}

@Composable
private fun CartridgeCard(
  relationship: RelationshipSummary,
  index: Int,
  onOpen: (String) -> Unit,
) {
  val accent = if (index % 2 == 0) SignalColors.Pink else SignalColors.Cyan
  Column(
    Modifier
      .fillMaxWidth()
      .clip(SignalShapes.Panel)
      .background(SignalColors.White.copy(alpha = .94f))
      .border(3.dp, SignalColors.Ink, SignalShapes.Panel)
      .clickable { onOpen(relationship.id) }
      .padding(16.dp),
  ) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
      Text("SIGNAL CARTRIDGE ${index + 1}", color = SignalColors.Muted, fontWeight = FontWeight.Black, fontSize = 10.sp, letterSpacing = 1.sp)
      Text(relationship.updatedAt.toSignalDate(), color = SignalColors.Muted, fontWeight = FontWeight.Bold, fontSize = 10.sp)
    }
    Spacer(Modifier.height(6.dp))
    Row(
      Modifier.fillMaxWidth(),
      horizontalArrangement = Arrangement.SpaceBetween,
      verticalAlignment = Alignment.Bottom,
    ) {
      Text(relationship.displayName, color = SignalColors.Ink, fontWeight = FontWeight.Black, fontSize = 22.sp)
      Text(
        relationship.signalLevel?.let { "$it / 100" } ?: "NO DATA",
        color = accent,
        fontWeight = FontWeight.Black,
        fontSize = 18.sp,
      )
    }
    Spacer(Modifier.height(8.dp))
    Text("OPEN CARTRIDGE  →", color = SignalColors.Ink, fontWeight = FontWeight.Black, fontSize = 11.sp)
  }
}

@Composable
private fun AddFactScreen(
  relationshipName: String,
  value: String,
  message: String?,
  isUpdating: Boolean,
  onValueChange: (String) -> Unit,
  onBack: () -> Unit,
  onSubmit: () -> Unit,
) {
  DotField(colors = listOf(SignalColors.Paper, SignalColors.Cyan, SignalColors.Purple)) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .windowInsetsPadding(WindowInsets.safeDrawing)
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 18.dp),
    ) {
      Row(
        Modifier.fillMaxWidth().padding(top = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
      ) {
        Text("SIGNAL", color = SignalColors.Ink, fontWeight = FontWeight.Black, fontSize = 21.sp, letterSpacing = (-2).sp)
        Text("‹ BACK", color = SignalColors.Ink, fontWeight = FontWeight.Black, fontSize = 12.sp, modifier = Modifier.clickable(onClick = onBack))
      }
      Spacer(Modifier.height(40.dp))
      StatusChip("NEW FACT TICKET")
      Spacer(Modifier.height(9.dp))
      Text(
        "$relationshipName に、\n何があった？",
        color = SignalColors.Ink,
        fontWeight = FontWeight.Black,
        fontSize = 38.sp,
        lineHeight = 40.sp,
        letterSpacing = (-4).sp,
      )
      Spacer(Modifier.height(12.dp))
      Text("新しい出来事を1件だけ追加。保存後、SIGNALの変化を履歴に残します。", color = SignalColors.Muted, fontWeight = FontWeight.Bold, fontSize = 14.sp, lineHeight = 21.sp)
      Spacer(Modifier.height(20.dp))
      FactTicket(
        index = 0,
        value = value,
        showRemove = false,
        error = factInputError(value),
        onValueChange = onValueChange,
        onRemove = {},
      )
      message?.let {
        Spacer(Modifier.height(15.dp))
        RealityCheckSlip(message = it, problems = emptyList())
      }
      Spacer(Modifier.height(22.dp))
      GlossyButton(
        if (isUpdating) "SIGNALを更新中..." else "FACTを追加して再分析  →",
        SignalColors.Pink,
        SignalColors.Purple,
        onSubmit,
        modifier = Modifier.fillMaxWidth(),
        enabled = !isUpdating,
      )
      Spacer(Modifier.height(10.dp))
      Text(
        "入力途中でも端末に保存されます。通信に失敗しても消えません。",
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
  accountState: AccountState,
  accountMessage: String?,
  isSaved: Boolean,
  onSave: () -> Unit,
  onHome: (() -> Unit)?,
  onLogout: (() -> Unit)?,
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
          if (isSaved) "MY CRUSH DEVICE  ↗" else "この記録を残す  ↗",
          SignalColors.Yellow,
          SignalColors.Pink,
          if (isSaved) onHome ?: {} else onSave,
          modifier = Modifier.fillMaxWidth(),
        )
        Text(
          if (isSaved) "FactとSIGNALの履歴を保存済み。次回もここから続けられます。"
          else "保存する時だけログイン。Fact・スコア・記録名をクラウドへ保存します。",
          color = SignalColors.White,
          fontSize = 11.sp,
          fontWeight = FontWeight.Bold,
          lineHeight = 17.sp,
          textAlign = TextAlign.Center,
          modifier = Modifier.fillMaxWidth().padding(top = 9.dp),
        )
        accountMessage?.let { message ->
          Text(
            message,
            color = SignalColors.Ink,
            fontSize = 12.sp,
            fontWeight = FontWeight.Black,
            lineHeight = 17.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier
              .fillMaxWidth()
              .padding(top = 10.dp)
              .clip(SignalShapes.Control)
              .background(SignalColors.White.copy(alpha = .82f))
              .border(2.dp, SignalColors.Ink, SignalShapes.Control)
              .padding(10.dp),
          )
        }
        Spacer(Modifier.height(16.dp))
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
        if (accountState is AccountState.SignedIn && onLogout != null) {
          Spacer(Modifier.height(18.dp))
          Text(
            "LOG OUT",
            color = SignalColors.White,
            fontWeight = FontWeight.Black,
            fontSize = 11.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().clickable(onClick = onLogout),
          )
        }
        Spacer(Modifier.height(34.dp))
      }
    }
  }
}

@Composable
private fun AuthScreen(
  email: String,
  relationshipName: String,
  state: AccountState,
  message: String?,
  onEmailChange: (String) -> Unit,
  onRelationshipNameChange: (String) -> Unit,
  onBack: () -> Unit,
  onMagicLink: () -> Unit,
  onGoogle: () -> Unit,
) {
  DotField(colors = listOf(SignalColors.Pink, SignalColors.Purple, SignalColors.Cyan)) {
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
      Spacer(Modifier.height(38.dp))
      StatusChip("SAVE YOUR SIGNAL")
      Spacer(Modifier.height(10.dp))
      Text(
        "この恋の記録を、\n次回へつなげよう。",
        color = SignalColors.White,
        fontWeight = FontWeight.Black,
        fontSize = 39.sp,
        lineHeight = 40.sp,
        letterSpacing = (-4).sp,
        style = blackOffsetShadow(3.dp),
      )
      Spacer(Modifier.height(18.dp))
      Column(
        Modifier
          .fillMaxWidth()
          .clip(SignalShapes.Panel)
          .background(SignalColors.White.copy(alpha = .9f))
          .border(3.dp, SignalColors.Ink, SignalShapes.Panel)
          .padding(16.dp),
      ) {
        Text("CLOUD SAVE", color = SignalColors.Ink, fontWeight = FontWeight.Black, fontSize = 11.sp, letterSpacing = 1.sp)
        Spacer(Modifier.height(7.dp))
        Text(
          "保存するもの：入力したFact、SIGNALスコア、記録名。メールアドレスはログインと本人確認に使います。",
          color = SignalColors.Ink,
          fontWeight = FontWeight.Bold,
          fontSize = 13.sp,
          lineHeight = 20.sp,
        )
      }
      Spacer(Modifier.height(16.dp))
      SignalTextField(
        value = relationshipName,
        onValueChange = onRelationshipNameChange,
        label = "この記録の名前",
        placeholder = "アプリの人",
      )
      Spacer(Modifier.height(12.dp))
      SignalTextField(
        value = email,
        onValueChange = onEmailChange,
        label = "メールアドレス",
        placeholder = "you@example.com",
      )
      Spacer(Modifier.height(15.dp))
      GlossyButton(
        if (state is AccountState.AwaitingMagicLink) "メールを確認してね  ♡" else "MAGIC LINKを送る  ↗",
        SignalColors.Lime,
        SignalColors.Cyan,
        onMagicLink,
        modifier = Modifier.fillMaxWidth(),
      )
      Spacer(Modifier.height(12.dp))
      GlossyButton(
        "GOOGLEで続ける",
        SignalColors.White,
        SignalColors.Purple,
        onGoogle,
        modifier = Modifier.fillMaxWidth(),
      )
      val statusMessage = when (state) {
        AccountState.Initializing -> "保存済みのログイン状態を確認しています…"
        is AccountState.SignedOut -> state.messageJa
        is AccountState.AwaitingMagicLink -> "${state.email} に送信しました。メールのリンクから戻ってきてください。"
        is AccountState.SignedIn -> "ログインしました。記録を保存しています…"
        is AccountState.ReauthenticationRequired -> state.messageJa
      }
      (message ?: statusMessage)?.let { copy ->
        Spacer(Modifier.height(14.dp))
        Text(
          copy,
          color = SignalColors.Ink,
          fontWeight = FontWeight.Black,
          fontSize = 12.sp,
          lineHeight = 18.sp,
          modifier = Modifier
            .fillMaxWidth()
            .clip(SignalShapes.Control)
            .background(SignalColors.Yellow)
            .border(2.dp, SignalColors.Ink, SignalShapes.Control)
            .padding(11.dp),
        )
      }
      Spacer(Modifier.height(34.dp))
    }
  }
}

@Composable
private fun SignalTextField(
  value: String,
  onValueChange: (String) -> Unit,
  label: String,
  placeholder: String,
) {
  Column(Modifier.fillMaxWidth()) {
    Text(label, color = SignalColors.Ink, fontWeight = FontWeight.Black, fontSize = 11.sp)
    Spacer(Modifier.height(5.dp))
    OutlinedTextField(
      value = value,
      onValueChange = onValueChange,
      placeholder = { Text(placeholder, color = SignalColors.Muted) },
      singleLine = true,
      shape = SignalShapes.Control,
      colors = OutlinedTextFieldDefaults.colors(
        focusedContainerColor = SignalColors.White,
        unfocusedContainerColor = SignalColors.White.copy(alpha = .9f),
        focusedBorderColor = SignalColors.Ink,
        unfocusedBorderColor = SignalColors.Ink,
        cursorColor = SignalColors.Purple,
      ),
      modifier = Modifier.fillMaxWidth(),
    )
  }
}

@Composable
private fun HistoryScreen(
  analysis: SignalAnalysis,
  snapshots: List<SavedSnapshot>,
  onBack: () -> Unit,
) {
  val timeline = snapshots.ifEmpty {
    listOf(SavedSnapshot(scores = analysis.scores, createdAt = "TODAY"))
  }
  val deltas = snapshotDeltas(timeline)
  val graphStart = (timeline.size - 5).coerceAtLeast(0)
  val graphItems = timeline.drop(graphStart)
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
      SignalTape(
        scores = graphItems.map { it.scores.signalLevel },
        dates = graphItems.map { it.createdAt.toSignalDate() },
        deltas = deltas.drop(graphStart),
      )
      Spacer(Modifier.height(16.dp))
      timeline.indices.reversed().forEach { index ->
        val snapshot = timeline[index]
        val delta = deltas[index]
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .clip(SignalShapes.Control)
            .background(SignalColors.White.copy(alpha = .88f))
            .border(2.dp, SignalColors.Ink, SignalShapes.Control)
            .padding(horizontal = 13.dp, vertical = 11.dp),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically,
        ) {
          Column {
            Text("SNAPSHOT ${(index + 1).toString().padStart(2, '0')}", color = SignalColors.Muted, fontWeight = FontWeight.Black, fontSize = 9.sp, letterSpacing = 1.sp)
            Text(snapshot.createdAt.toSignalDate(), color = SignalColors.Ink, fontWeight = FontWeight.Black, fontSize = 13.sp)
          }
          Row(verticalAlignment = Alignment.Bottom) {
            Text("${snapshot.scores.signalLevel} / 100", color = SignalColors.Purple, fontWeight = FontWeight.Black, fontSize = 17.sp)
            if (delta != null) {
              val deltaText = if (delta > 0) "+$delta" else delta.toString()
              Text("  $deltaText", color = if (delta >= 0) SignalColors.Pink else SignalColors.Muted, fontWeight = FontWeight.Black, fontSize = 12.sp)
            }
          }
        }
        Spacer(Modifier.height(9.dp))
      }
      Spacer(Modifier.height(23.dp))
      RealityTip()
      Spacer(Modifier.height(34.dp))
    }
  }
}

internal fun snapshotDeltas(snapshots: List<SavedSnapshot>): List<Int?> = snapshots.mapIndexed { index, snapshot ->
  if (index == 0) null else snapshot.scores.signalLevel - snapshots[index - 1].scores.signalLevel
}

internal fun String.toSignalDate(): String {
  if (this == "TODAY") return this
  val date = take(10)
  if (date.length != 10 || date[4] != '-' || date[7] != '-') return "--/--"
  return "${date.substring(5, 7).trimStart('0')}/${date.substring(8, 10).trimStart('0')}"
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
