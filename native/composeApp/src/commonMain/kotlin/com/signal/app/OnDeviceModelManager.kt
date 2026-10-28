package com.signal.app

import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.coroutines.resume

enum class OnDeviceModelStage { CHECKING, MISSING, DOWNLOADING, READY, FAILED }

data class OnDeviceModelStatus(
  val stage: OnDeviceModelStage,
  val progressPercent: Int = 0,
  val messageJa: String? = null,
)

interface OnDeviceModelManager {
  val status: StateFlow<OnDeviceModelStatus>
  suspend fun refresh()
  fun download()
}

/** Swift implementation boundary for URLSession and app-private storage. */
interface OnDeviceModelManagerBridge {
  fun inspect(completion: (String?) -> Unit)
  fun download(progress: (String?) -> Unit, completion: (String?) -> Unit)
}

class BridgedOnDeviceModelManager(
  private val bridge: OnDeviceModelManagerBridge,
) : OnDeviceModelManager {
  private val mutableStatus = MutableStateFlow(OnDeviceModelStatus(OnDeviceModelStage.CHECKING))
  override val status: StateFlow<OnDeviceModelStatus> = mutableStatus.asStateFlow()

  override suspend fun refresh() {
    mutableStatus.value = OnDeviceModelStatus(OnDeviceModelStage.CHECKING)
    suspendCancellableCoroutine { continuation ->
      bridge.inspect { result ->
        val ready = result == "READY"
        mutableStatus.value = OnDeviceModelStatus(
          if (ready) OnDeviceModelStage.READY else OnDeviceModelStage.MISSING,
        )
        if (continuation.isActive) continuation.resume(Unit)
      }
    }
  }

  override fun download() {
    if (mutableStatus.value.stage == OnDeviceModelStage.DOWNLOADING) return
    mutableStatus.value = OnDeviceModelStatus(OnDeviceModelStage.DOWNLOADING)
    bridge.download(
      progress = { percent ->
        mutableStatus.value = OnDeviceModelStatus(
          OnDeviceModelStage.DOWNLOADING,
          percent?.toIntOrNull()?.coerceIn(0, 100) ?: 0,
        )
      },
      completion = { error ->
        mutableStatus.value = if (error == null) {
          OnDeviceModelStatus(OnDeviceModelStage.READY)
        } else {
          OnDeviceModelStatus(
            OnDeviceModelStage.FAILED,
            messageJa = "モデルを取得できませんでした。通信環境と端末の空き容量を確認して再試行してください。",
          )
        }
      },
    )
  }
}
