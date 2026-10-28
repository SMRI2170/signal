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
  onDeviceModelManagerBridge: OnDeviceModelManagerBridge? = null,
) = ComposeUIViewController {
  SignalApp(
    gateway = createJudgeGateway(apiBaseUrl),
    onDeviceGateway = onDeviceInferenceBridge?.let(::createOnDeviceJudgeGateway),
    onDeviceModelManager = onDeviceModelManagerBridge?.let(::BridgedOnDeviceModelManager),
    accountRepository = accountRepository,
  )
}
