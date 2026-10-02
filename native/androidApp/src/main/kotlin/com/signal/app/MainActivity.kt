package com.signal.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.remember

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      val gateway = remember { createJudgeGateway(BuildConfig.SIGNAL_API_BASE_URL) }
      SignalApp(gateway = gateway)
    }
  }
}
