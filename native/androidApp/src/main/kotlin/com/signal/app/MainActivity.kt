package com.signal.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.remember

class MainActivity : ComponentActivity() {
  private lateinit var accountRepository: SignalAccountRepository

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    accountRepository = createSignalAccountRepository(
      supabaseUrl = BuildConfig.SIGNAL_SUPABASE_URL,
      publishableKey = BuildConfig.SIGNAL_SUPABASE_PUBLISHABLE_KEY,
      apiBaseUrl = BuildConfig.SIGNAL_API_BASE_URL,
      store = AndroidSecureStringStore(applicationContext),
    )
    intent?.dataString?.let(accountRepository::receiveDeepLink)
    setContent {
      val gateway = remember { createJudgeGateway(BuildConfig.SIGNAL_API_BASE_URL) }
      SignalApp(
        gateway = gateway,
        accountRepository = accountRepository,
      )
    }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    intent.dataString?.let(accountRepository::receiveDeepLink)
  }
}
