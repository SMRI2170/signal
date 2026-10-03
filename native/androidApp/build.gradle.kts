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
val signalSupabaseUrl = "https://deufcadognkhymqxrejo.supabase.co"
val signalSupabasePublishableKey = "sb_publishable_RBON1FbtOwYjqWxoiywYkg_WAz5-AFh"

dependencies {
  implementation(project(":composeApp"))
  implementation("androidx.activity:activity-compose:1.12.4")
  implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.10.0")
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
    buildConfigField("String", "SIGNAL_SUPABASE_URL", "\"$signalSupabaseUrl\"")
    buildConfigField("String", "SIGNAL_SUPABASE_PUBLISHABLE_KEY", "\"$signalSupabasePublishableKey\"")
  }

  buildFeatures {
    compose = true
    buildConfig = true
  }
}
