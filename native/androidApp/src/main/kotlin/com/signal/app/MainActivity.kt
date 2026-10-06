package com.signal.app

import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.remember

class MainActivity : ComponentActivity() {
  private var accountRepository: SignalAccountRepository? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
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
        if (BuildConfig.SIGNAL_BENCHMARK_MODE) LocalJudgeGateway
        else createJudgeGateway(BuildConfig.SIGNAL_API_BASE_URL)
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
