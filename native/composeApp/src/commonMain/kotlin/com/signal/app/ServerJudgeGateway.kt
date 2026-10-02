package com.signal.app

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.CancellationException
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlin.random.Random

class JudgeGatewayException(
  val code: String,
  val userMessageJa: String,
  val retryable: Boolean,
  val requestId: String? = null,
  cause: Throwable? = null,
) : Exception(userMessageJa, cause)

data class GatewayFailureDiagnostic(
  val code: String,
  val retryable: Boolean,
  val requestId: String?,
)

fun interface GatewayDiagnostics {
  fun onFailure(diagnostic: GatewayFailureDiagnostic)

  companion object {
    val SafeConsole = GatewayDiagnostics { diagnostic ->
      println(
        "SIGNAL_GATEWAY_FAILURE code=${diagnostic.code} retryable=${diagnostic.retryable} requestId=${diagnostic.requestId ?: "none"}",
      )
    }
  }
}

fun createSignalHttpClient(): HttpClient = HttpClient {
  install(ContentNegotiation) {
    json(
      Json {
        ignoreUnknownKeys = true
        explicitNulls = false
      },
    )
  }
  install(HttpTimeout) {
    connectTimeoutMillis = 10_000
    requestTimeoutMillis = 30_000
    socketTimeoutMillis = 30_000
  }
  expectSuccess = false
}

fun createJudgeGateway(
  apiBaseUrl: String?,
  diagnostics: GatewayDiagnostics = GatewayDiagnostics.SafeConsole,
): JudgeGateway =
  apiBaseUrl
    ?.trim()
    ?.trimEnd('/')
    ?.takeIf(String::isNotEmpty)
    ?.let { ServerJudgeGateway(it, diagnostics = diagnostics) }
    ?: LocalJudgeGateway

class ServerJudgeGateway(
  apiBaseUrl: String,
  private val client: HttpClient = createSignalHttpClient(),
  private val diagnostics: GatewayDiagnostics = GatewayDiagnostics.SafeConsole,
) : JudgeGateway {
  private val baseUrl = apiBaseUrl.trimEnd('/')

  override suspend fun validate(facts: List<String>): List<FactValidation> {
    val inputs = facts.map { FactInputDto(clientFactId = newClientFactId(), text = it) }
    val response = post<List<FactValidationDto>>(
      path = "/api/facts/validate",
      payload = FactsRequestDto(inputs),
    )
    val factsById = inputs.associate { it.clientFactId to it.text }
    return response.map { result ->
      FactValidation(
        text = factsById[result.clientFactId]
          ?: throw report(
            JudgeGatewayException(
              code = "INVALID_RESPONSE",
              userMessageJa = "分析結果を読み込めませんでした。もう一度お試しください。",
              retryable = true,
            ),
          ),
        status = result.status.toDomain(),
        reasonJa = result.reasonJa,
        rewriteExampleJa = result.rewriteExampleJa,
      )
    }
  }

  override suspend fun analyze(facts: List<String>): SignalAnalysis {
    val inputs = facts.map { FactInputDto(clientFactId = newClientFactId(), text = it) }
    val response = post<AnalysisResultDto>(
      path = "/api/analyses/preview",
      payload = FactsRequestDto(inputs),
    )
    return SignalAnalysis(
      scores = SignalScores(
        signalLevel = response.scores.romanticInterest,
        desireToMeet = response.scores.desireToMeet,
        initiative = response.scores.initiative,
        evidenceSufficiency = response.scores.evidenceSufficiency,
      ),
      statusLabel = when {
        response.scores.romanticInterest >= 70 -> "GOOD SIGNAL"
        response.scores.romanticInterest >= 45 -> "SIGNAL CHECK"
        else -> "LOW SIGNAL"
      },
      factCount = facts.size,
    )
  }

  private suspend inline fun <reified Response : Any> post(path: String, payload: FactsRequestDto): Response {
    try {
      val response = client.post("$baseUrl$path") {
        contentType(ContentType.Application.Json)
        setBody(payload)
      }
      if (!response.status.isSuccess()) {
        val apiError = runCatching { response.body<ApiErrorEnvelopeDto>() }.getOrNull()?.error
        throw JudgeGatewayException(
          code = apiError?.code ?: "HTTP_${response.status.value}",
          userMessageJa = apiError?.message ?: "通信に失敗しました。少し待ってからもう一度お試しください。",
          retryable = apiError?.retryable ?: (response.status.value >= 500),
          requestId = apiError?.requestId,
        )
      }
      return response.body()
    } catch (error: CancellationException) {
      throw error
    } catch (error: JudgeGatewayException) {
      diagnostics.onFailure(
        GatewayFailureDiagnostic(
          code = error.code,
          retryable = error.retryable,
          requestId = error.requestId,
        ),
      )
      throw error
    } catch (error: SerializationException) {
      throw report(
        JudgeGatewayException(
          code = "INVALID_RESPONSE",
          userMessageJa = "分析結果を読み込めませんでした。もう一度お試しください。",
          retryable = true,
          cause = error,
        ),
      )
    } catch (error: Throwable) {
      throw report(
        JudgeGatewayException(
          code = "NETWORK_ERROR",
          userMessageJa = "通信を確認して、もう一度お試しください。入力内容は消えません。",
          retryable = true,
          cause = error,
        ),
      )
    }
  }

  private fun report(error: JudgeGatewayException): JudgeGatewayException {
    diagnostics.onFailure(
      GatewayFailureDiagnostic(
        code = error.code,
        retryable = error.retryable,
        requestId = error.requestId,
      ),
    )
    return error
  }
}

@Serializable
private data class FactsRequestDto(val facts: List<FactInputDto>)

@Serializable
private data class FactInputDto(
  val clientFactId: String,
  val text: String,
)

@Serializable
private data class FactValidationDto(
  val clientFactId: String,
  val status: FactStatusDto,
  val reasonJa: String,
  val rewriteExampleJa: String? = null,
  val translatedFactEn: String? = null,
)

@Serializable
private enum class FactStatusDto {
  @SerialName("observable") OBSERVABLE,
  @SerialName("interpretation") INTERPRETATION,
  @SerialName("unclear") UNCLEAR,
}

private fun FactStatusDto.toDomain(): FactStatus = when (this) {
  FactStatusDto.OBSERVABLE -> FactStatus.OBSERVABLE
  FactStatusDto.INTERPRETATION -> FactStatus.INTERPRETATION
  FactStatusDto.UNCLEAR -> FactStatus.UNCLEAR
}

@Serializable
private data class AnalysisResultDto(
  val scores: ScoresDto,
  val impact: ImpactDto? = null,
  val modelVersion: String,
  val rubricVersion: String,
)

@Serializable
private data class ScoresDto(
  val romanticInterest: Int,
  val desireToMeet: Int,
  val initiative: Int,
  val evidenceSufficiency: Int,
)

@Serializable
private data class ImpactDto(
  val category: String,
  val factIds: List<String>,
)

@Serializable
private data class ApiErrorEnvelopeDto(val error: ApiErrorDto)

@Serializable
private data class ApiErrorDto(
  val code: String,
  val message: String,
  val requestId: String? = null,
  val retryable: Boolean = false,
)

private fun newClientFactId(): String {
  val hex = "0123456789abcdef"
  val raw = CharArray(32) { hex[Random.nextInt(hex.length)] }
  raw[12] = '4'
  raw[16] = hex[8 + Random.nextInt(4)]
  val value = raw.concatToString()
  return "${value.substring(0, 8)}-${value.substring(8, 12)}-${value.substring(12, 16)}-${value.substring(16, 20)}-${value.substring(20)}"
}
