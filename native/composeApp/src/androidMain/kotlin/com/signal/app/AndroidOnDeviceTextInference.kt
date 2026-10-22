package com.signal.app

import android.content.Context
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.ConversationConfig
import com.google.ai.edge.litertlm.Content
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.SamplerConfig
import com.google.ai.edge.litertlm.ThinkingConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.File

/** Android LiteRT-LM adapter. Model bytes are provisioned separately and never put in Git. */
class AndroidOnDeviceTextInference(context: Context) : OnDeviceTextInference {
  private val appContext = context.applicationContext
  private val modelFile = File(appContext.filesDir, MODEL_RELATIVE_PATH)
  private val cacheDirectory = File(appContext.cacheDir, "litert-lm")
  private val mutex = Mutex()
  private var engine: Engine? = null
  private var initializationFailure: Throwable? = null

  suspend fun prepare() = mutex.withLock {
    withContext(Dispatchers.Default) {
      if (!modelFile.isFile || modelFile.length() != MODEL_BYTES) return@withContext
      try {
        engine ?: createEngine().also { engine = it }
      } catch (error: Throwable) {
        initializationFailure = error
      }
    }
  }

  override suspend fun generate(prompt: String): String = mutex.withLock {
    withContext(Dispatchers.Default) {
      if (!modelFile.isFile || modelFile.length() != MODEL_BYTES) {
        throw JudgeGatewayException(
          code = "ON_DEVICE_MODEL_NOT_READY",
          userMessageJa = "端末内AIモデルが未設定です。モデルを取得してから再試行してください。Factは端末内に保持されています。",
          retryable = false,
        )
      }
      initializationFailure?.let { throw it }
      val loadedEngine = engine ?: createEngine().also { engine = it }
      val conversation = loadedEngine.createConversation(
        ConversationConfig(
          samplerConfig = SamplerConfig(topK = 1, topP = 1.0, temperature = 0.0),
          maxOutputToken = MAX_OUTPUT_TOKENS,
          thinkingConfig = ThinkingConfig(enableThinking = false, thinkingTokenBudget = 0),
        ),
      )
      try {
        conversation.sendMessage(prompt).contents.contents
          .filterIsInstance<Content.Text>()
          .joinToString(separator = "") { it.text }
      } finally {
        conversation.close()
      }
    }
  }

  private fun createEngine(): Engine {
    cacheDirectory.mkdirs()
    return Engine(
      EngineConfig(
        modelPath = modelFile.absolutePath,
        backend = Backend.CPU(),
        cacheDir = cacheDirectory.absolutePath,
        maxNumTokens = MAX_CONTEXT_TOKENS,
      ),
    ).also { it.initialize() }
  }

  companion object {
    const val MODEL_RELATIVE_PATH = "ondevice/qwen3_0.6b_nothink_q4_block32_ekv1280.litertlm"
    const val MODEL_BYTES = 347_251_840L
    const val MAX_CONTEXT_TOKENS = 1_280
    const val MAX_OUTPUT_TOKENS = 384
  }
}
