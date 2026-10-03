package com.signal.app

import androidx.compose.ui.window.ComposeUIViewController

fun createIosSignalAccountRepository(
  supabaseUrl: String,
  publishableKey: String,
  apiBaseUrl: String,
) = createSignalAccountRepository(
  supabaseUrl = supabaseUrl,
  publishableKey = publishableKey,
  apiBaseUrl = apiBaseUrl,
  store = IosSecureStringStore(),
)

fun MainViewController(
  apiBaseUrl: String?,
  accountRepository: SignalAccountRepository,
) = ComposeUIViewController {
  SignalApp(
    gateway = createJudgeGateway(apiBaseUrl),
    accountRepository = accountRepository,
  )
}
