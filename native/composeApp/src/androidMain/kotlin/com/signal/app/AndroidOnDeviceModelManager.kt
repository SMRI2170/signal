package com.signal.app

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/** Downloads the pinned model to private app storage, verifies it, then atomically installs it. */
class AndroidOnDeviceModelManager(context: Context) : OnDeviceModelManager {
  private val appContext = context.applicationContext
  private val modelFile = File(appContext.filesDir, AndroidOnDeviceTextInference.MODEL_RELATIVE_PATH)
  private val partialFile = File(modelFile.parentFile, "${modelFile.name}.partial")
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
  private val mutableStatus = MutableStateFlow(OnDeviceModelStatus(OnDeviceModelStage.CHECKING))
  override val status: StateFlow<OnDeviceModelStatus> = mutableStatus.asStateFlow()

  override suspend fun refresh() = withContext(Dispatchers.IO) {
    mutableStatus.value = OnDeviceModelStatus(OnDeviceModelStage.CHECKING)
    mutableStatus.value = OnDeviceModelStatus(
      if (isValidModel(modelFile)) OnDeviceModelStage.READY else OnDeviceModelStage.MISSING,
    )
  }

  override fun download() {
    if (mutableStatus.value.stage == OnDeviceModelStage.DOWNLOADING) return
    scope.launch {
      mutableStatus.value = OnDeviceModelStatus(OnDeviceModelStage.DOWNLOADING)
      try {
        downloadAndInstall()
        mutableStatus.value = OnDeviceModelStatus(OnDeviceModelStage.READY)
      } catch (error: CancellationException) {
        partialFile.delete()
        throw error
      } catch (_: Throwable) {
        partialFile.delete()
        mutableStatus.value = OnDeviceModelStatus(
          OnDeviceModelStage.FAILED,
          messageJa = "モデルを取得できませんでした。通信環境と端末の空き容量を確認して再試行してください。",
        )
      }
    }
  }

  private suspend fun downloadAndInstall() = withContext(Dispatchers.IO) {
    if (modelFile.exists() && isValidModel(modelFile)) return@withContext
    modelFile.parentFile?.mkdirs() ?: error("Cannot create model directory")
    require(modelFile.parentFile!!.usableSpace >= MODEL_BYTES + 64L * 1024 * 1024) {
      "Insufficient free storage for model download."
    }

    val connection = (URL(MODEL_URL).openConnection() as HttpURLConnection).apply {
      connectTimeout = 20_000
      readTimeout = 60_000
      instanceFollowRedirects = true
      setRequestProperty("User-Agent", "SIGNAL-Android/OnDeviceModel")
    }
    try {
      connection.connect()
      require(connection.responseCode in 200..299) { "Model host returned HTTP ${connection.responseCode}." }
      val advertisedLength = connection.contentLengthLong
      require(advertisedLength <= 0L || advertisedLength == MODEL_BYTES) { "Unexpected model size." }
      val digest = MessageDigest.getInstance("SHA-256")
      var copied = 0L
      connection.inputStream.buffered().use { input ->
        FileOutputStream(partialFile).buffered().use { output ->
          val buffer = ByteArray(1024 * 1024)
          while (true) {
            coroutineContext.ensureActive()
            val count = input.read(buffer)
            if (count < 0) break
            output.write(buffer, 0, count)
            digest.update(buffer, 0, count)
            copied += count
            mutableStatus.value = OnDeviceModelStatus(
              OnDeviceModelStage.DOWNLOADING,
              ((copied * 100) / MODEL_BYTES).toInt().coerceIn(0, 99),
            )
          }
        }
      }
      require(copied == MODEL_BYTES) { "Incomplete model download." }
      require(digest.digest().joinToString("") { "%02x".format(it) } == MODEL_SHA256) {
        "Model SHA-256 mismatch."
      }
      if (modelFile.exists()) require(modelFile.delete()) { "Cannot replace invalid model." }
      require(partialFile.renameTo(modelFile)) { "Cannot atomically install the model." }
    } finally {
      connection.disconnect()
    }
  }

  private fun isValidModel(file: File): Boolean {
    if (!file.isFile || file.length() != MODEL_BYTES) return false
    val digest = MessageDigest.getInstance("SHA-256")
    file.inputStream().buffered().use { input ->
      val buffer = ByteArray(1024 * 1024)
      while (true) {
        val count = input.read(buffer)
        if (count < 0) break
        digest.update(buffer, 0, count)
      }
    }
    return digest.digest().joinToString("") { "%02x".format(it) } == MODEL_SHA256
  }

  companion object {
    @Volatile
    private var instance: AndroidOnDeviceModelManager? = null

    /** Keep an active download and its progress across Activity recreation. */
    fun getInstance(context: Context): AndroidOnDeviceModelManager =
      instance ?: synchronized(this) {
        instance ?: AndroidOnDeviceModelManager(context.applicationContext).also { instance = it }
      }

    private const val MODEL_BYTES = 347_251_840L
    private const val MODEL_SHA256 = "2df6821ec12702dafd33915e7a1a1adc7c4b053f3672fd9555dfaf3a114c4139"
    private const val MODEL_NAME = "qwen3_0.6b_nothink_q4_block32_ekv1280.litertlm"
    private const val MODEL_URL = "https://huggingface.co/litert-community/Qwen3-0.6B-int4/resolve/6aa2daf8aba4aa456797fb8040b36a3948bcfda7/$MODEL_NAME"
  }
}
