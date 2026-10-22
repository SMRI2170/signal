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
  onDeviceInferenceBridge: OnDeviceInferenceBridge? = null,
) = ComposeUIViewController {
  SignalApp(
    gateway = onDeviceInferenceBridge?.let(::createOnDeviceJudgeGateway) ?: createJudgeGateway(apiBaseUrl),
    accountRepository = accountRepository,
  )
}
