package com.signal.app

import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.remember
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
  private var accountRepository: SignalAccountRepository? = null
  private var onDeviceTextInference: AndroidOnDeviceTextInference? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    if (BuildConfig.SIGNAL_ON_DEVICE_AI && !BuildConfig.SIGNAL_BENCHMARK_MODE) {
      onDeviceTextInference = AndroidOnDeviceTextInference(applicationContext).also { inference ->
        lifecycleScope.launch(Dispatchers.Default) { inference.prepare() }
      }
    }
    if (!BuildConfig.SIGNAL_BENCHMARK_MODE) {
      accountRepository = createSignalAccountRepository(
        supabaseUrl = BuildConfig.SIGNAL_SUPABASE_URL,
        publishableKey = BuildConfig.SIGNAL_SUPABASE_PUBLISHABLE_KEY,
        apiBaseUrl = BuildConfig.SIGNAL_API_BASE_URL,
        store = AndroidSecureStringStore(applicationContext),
      )
    }
    intent?.dataString?.let { accountRepository?.receiveDeepLink(it) }
    setContent {
      val gateway = remember {
        when {
          BuildConfig.SIGNAL_BENCHMARK_MODE -> LocalJudgeGateway
          BuildConfig.SIGNAL_ON_DEVICE_AI -> OnDeviceJudgeGateway(
            onDeviceTextInference ?: AndroidOnDeviceTextInference(applicationContext),
          )
          else -> createJudgeGateway(BuildConfig.SIGNAL_API_BASE_URL)
        }
      }
      SignalApp(
        gateway = gateway,
        accountRepository = accountRepository,
        onRevealCompositionsMeasured = if (BuildConfig.SIGNAL_BENCHMARK_MODE) {
          { count -> Log.d("SIGNAL_PERF", "factToReceiptRecompositions=$count") }
        } else {
          null
        },
      )
    }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    intent.dataString?.let { accountRepository?.receiveDeepLink(it) }
  }
}
