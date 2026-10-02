package com.signal.app

import androidx.compose.ui.window.ComposeUIViewController

fun MainViewController(apiBaseUrl: String?) = ComposeUIViewController {
  SignalApp(gateway = createJudgeGateway(apiBaseUrl))
}
