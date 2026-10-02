package com.signal.app

import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.MockRequestHandleScope
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.HttpRequestData
import io.ktor.client.request.HttpResponseData
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.OutgoingContent
import io.ktor.http.content.TextContent
import io.ktor.http.headersOf
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class ServerJudgeGatewayTest {
  @Test
  fun mapsValidationResponseToOriginalFacts() = runTest {
    val client = mockClient { request ->
      assertEquals("/api/facts/validate", request.url.encodedPath)
      val clientFactId = Regex("[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}")
        .find(request.bodyText())
        ?.value
        ?: error("Request does not contain an RFC 4122 clientFactId")
      respondJson(
        """
        [
          {
            "clientFactId": "$clientFactId",
            "status": "observable",
            "reasonJa": "観測できます。",
            "rewriteExampleJa": null,
            "translatedFactEn": null
          }
        ]
        """.trimIndent(),
      )
    }
    val validation = ServerJudgeGateway("https://signal.example", client)
      .validate(listOf("相手から来週空いているか聞かれた"))
      .single()

    assertEquals(FactStatus.OBSERVABLE, validation.status)
    assertEquals("観測できます。", validation.reasonJa)
    assertTrue(validation.text.isNotBlank())
    client.close()
  }

  @Test
  fun mapsPreviewAnalysisWithoutTreatingScoreAsProbability() = runTest {
    val client = mockClient { request ->
      assertEquals("/api/analyses/preview", request.url.encodedPath)
      respondJson(
        """
        {
          "scores": {
            "romanticInterest": 73,
            "desireToMeet": 81,
            "initiative": 68,
            "evidenceSufficiency": 57
          },
          "impact": null,
          "modelVersion": "test-model",
          "rubricVersion": "test-rubric"
        }
        """.trimIndent(),
      )
    }

    val analysis = ServerJudgeGateway("https://signal.example", client).analyze(
      listOf("相手から予定を聞かれた", "帰宅後に相手から連絡が来た", "次の店を相手が提案した"),
    )

    assertEquals(73, analysis.scores.signalLevel)
    assertEquals(81, analysis.scores.desireToMeet)
    assertEquals("GOOD SIGNAL", analysis.statusLabel)
    assertEquals(3, analysis.factCount)
    client.close()
  }

  @Test
  fun preservesTypedApiErrorAndRequestId() = runTest {
    val client = mockClient {
      respondJson(
        content = """{"error":{"code":"RATE_LIMITED","message":"少し待ってください。","requestId":"request-123","retryable":false}}""",
        status = HttpStatusCode.TooManyRequests,
      )
    }

    val error = assertFailsWith<JudgeGatewayException> {
      ServerJudgeGateway("https://signal.example", client).analyze(
        listOf("十分に長いFactその一", "十分に長いFactその二", "十分に長いFactその三"),
      )
    }

    assertEquals("RATE_LIMITED", error.code)
    assertEquals("request-123", error.requestId)
    assertEquals(false, error.retryable)
    client.close()
  }

  private fun mockClient(handler: suspend MockRequestHandleScope.(HttpRequestData) -> HttpResponseData): HttpClient =
    HttpClient(MockEngine(handler)) {
      install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true; explicitNulls = false })
      }
      expectSuccess = false
    }

  private fun MockRequestHandleScope.respondJson(
    content: String,
    status: HttpStatusCode = HttpStatusCode.OK,
  ) = respond(
    content = content,
    status = status,
    headers = headersOf(HttpHeaders.ContentType, ContentType.Application.Json.toString()),
  )

  private fun HttpRequestData.bodyText(): String = when (val content = body) {
    is TextContent -> content.text
    is OutgoingContent.ByteArrayContent -> content.bytes().decodeToString()
    else -> error("Unexpected request body type: ${content::class.simpleName}")
  }
}
