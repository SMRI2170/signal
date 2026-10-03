plugins {
  id("com.android.application")
  kotlin("plugin.compose")
  id("org.jetbrains.compose")
}

val signalApiBaseUrl = providers
  .gradleProperty("SIGNAL_API_BASE_URL")
  .orElse(providers.environmentVariable("SIGNAL_API_BASE_URL"))
  .orElse("https://deufcadognkhymqxrejo.supabase.co/functions/v1/signal-api")
  .get()
  .replace("\\", "\\\\")
  .replace("\"", "\\\"")

dependencies {
  implementation(project(":composeApp"))
  implementation("androidx.activity:activity-compose:1.12.4")
  implementation(compose.runtime)
}

android {
  namespace = "com.signal.app"
  compileSdk = 37

  defaultConfig {
    applicationId = "com.signal.app"
    minSdk = 24
    targetSdk = 37
    versionCode = 1
    versionName = "0.1.0"
    buildConfigField("String", "SIGNAL_API_BASE_URL", "\"$signalApiBaseUrl\"")
  }

  buildFeatures {
    compose = true
    buildConfig = true
  }
}
