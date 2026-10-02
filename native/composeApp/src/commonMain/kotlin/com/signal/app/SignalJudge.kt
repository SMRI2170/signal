package com.signal.app

enum class FactStatus { OBSERVABLE, INTERPRETATION, UNCLEAR }

data class FactValidation(
  val text: String,
  val status: FactStatus,
  val reasonJa: String,
  val rewriteExampleJa: String? = null,
)

data class SignalScores(
  val signalLevel: Int,
  val desireToMeet: Int,
  val initiative: Int,
  val evidenceSufficiency: Int,
)

data class SignalAnalysis(
  val scores: SignalScores,
  val statusLabel: String,
  val factCount: Int,
)

/**
 * This interface is intentionally client-key-free. The production implementation
 * calls SIGNAL's own server, which is the only place a Judge provider key lives.
 */
interface JudgeGateway {
  fun validate(facts: List<String>): List<FactValidation>
  fun analyze(facts: List<String>): SignalAnalysis
}

object LocalJudgeGateway : JudgeGateway {
  private val interpretationPatterns = listOf(
    "気がする", "好き", "脈あり", "いい感じ", "興味がある", "絶対", "嫌われ", "冷たい",
  )
  private val unclearPatterns = listOf("なんかあった", "いろいろあった", "よくわからない")
  private val positivePatterns = listOf("誘われ", "空いている", "会い", "会う", "連絡", "LINE", "メッセージ")
  private val strongPositivePatterns = listOf("二人で", "二人きり", "次の", "次回", "また会")
  private val negativePatterns = listOf("延期", "キャンセル", "返信がない", "既読無視", "断ら")

  override fun validate(facts: List<String>): List<FactValidation> = facts.map { raw ->
    val fact = normalizeFact(raw)
    when {
      interpretationPatterns.any(fact::contains) -> FactValidation(
        text = fact,
        status = FactStatus.INTERPRETATION,
        reasonJa = "相手の気持ちや意図についての解釈が含まれています。",
        rewriteExampleJa = "相手が実際に言ったこと、したこと、回数や日時を書いてみてください。",
      )
      unclearPatterns.any { fact == it } -> FactValidation(
        text = fact,
        status = FactStatus.UNCLEAR,
        reasonJa = "出来事の内容を判断するには情報が不足しています。",
        rewriteExampleJa = "誰が、いつ、何をしたかが分かる形で書いてみてください。",
      )
      else -> FactValidation(
        text = fact,
        status = FactStatus.OBSERVABLE,
        reasonJa = "観測可能な出来事として使用できます。",
      )
    }
  }

  override fun analyze(facts: List<String>): SignalAnalysis {
    val effects = facts.map(::factEffect)
    val totalEffect = effects.sum()
    val meetingEvidence = facts.count { fact -> listOf("誘われ", "空いている", "会い", "会う", "二人").any(fact::contains) }
    val initiatedByOther = facts.count { it.contains("相手から") || it.contains("相手が") }
    val scores = SignalScores(
      signalLevel = clamp(48 + totalEffect),
      desireToMeet = clamp(45 + meetingEvidence * 12 + totalEffect / 2),
      initiative = clamp(42 + initiatedByOther * 10 + totalEffect / 3),
      evidenceSufficiency = clamp(facts.size * 20),
    )
    return SignalAnalysis(
      scores = scores,
      statusLabel = if (scores.signalLevel >= 70) "GOOD SIGNAL" else "SIGNAL CHECK",
      factCount = facts.size,
    )
  }

  private fun factEffect(fact: String): Int = when {
    strongPositivePatterns.any(fact::contains) -> 12
    positivePatterns.any(fact::contains) -> 7
    negativePatterns.any(fact::contains) -> -10
    else -> 0
  }
}

fun normalizeFact(value: String): String = value.trim().replace(Regex("\\s+"), " ")

fun factInputError(value: String): String? = when (normalizeFact(value).length) {
  0 -> null
  in 1..9 -> "10文字以上で入力してください。"
  in 10..300 -> null
  else -> "300文字以内で入力してください。"
}

private fun clamp(value: Int): Int = value.coerceIn(0, 100)
