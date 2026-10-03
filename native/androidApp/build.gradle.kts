plugins {
  id("com.android.application")
  kotlin("plugin.compose")
  id("org.jetbrains.compose")
  id("androidx.baselineprofile")
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
val signalVersionCode = providers
  .gradleProperty("SIGNAL_VERSION_CODE")
  .orElse(providers.environmentVariable("SIGNAL_VERSION_CODE"))
  .orElse("2")
  .get()
  .toInt()
val signalVersionName = providers
  .gradleProperty("SIGNAL_VERSION_NAME")
  .orElse(providers.environmentVariable("SIGNAL_VERSION_NAME"))
  .orElse("0.2.0-beta.1")
  .get()
val releaseStoreFile = providers.environmentVariable("SIGNAL_ANDROID_KEYSTORE_FILE").orNull
val releaseStorePassword = providers.environmentVariable("SIGNAL_ANDROID_KEYSTORE_PASSWORD").orNull
val releaseKeyAlias = providers.environmentVariable("SIGNAL_ANDROID_KEY_ALIAS").orNull
val releaseKeyPassword = providers.environmentVariable("SIGNAL_ANDROID_KEY_PASSWORD").orNull

dependencies {
  implementation(project(":composeApp"))
  implementation("androidx.activity:activity-compose:1.12.4")
  implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.10.0")
  implementation("androidx.profileinstaller:profileinstaller:1.4.1")
  implementation(compose.runtime)
  baselineProfile(project(":baselineprofile"))
}

android {
  namespace = "com.signal.app"
  compileSdk = 37

  defaultConfig {
    applicationId = "com.signal.app"
    minSdk = 24
    targetSdk = 37
    versionCode = signalVersionCode
    versionName = signalVersionName
    buildConfigField("String", "SIGNAL_API_BASE_URL", "\"$signalApiBaseUrl\"")
    buildConfigField("String", "SIGNAL_SUPABASE_URL", "\"$signalSupabaseUrl\"")
    buildConfigField("String", "SIGNAL_SUPABASE_PUBLISHABLE_KEY", "\"$signalSupabasePublishableKey\"")
    buildConfigField("boolean", "SIGNAL_BENCHMARK_MODE", "false")
  }

  signingConfigs {
    if (
      releaseStoreFile != null &&
      releaseStorePassword != null &&
      releaseKeyAlias != null &&
      releaseKeyPassword != null
    ) {
      create("release") {
        storeFile = file(releaseStoreFile)
        storePassword = releaseStorePassword
        keyAlias = releaseKeyAlias
        keyPassword = releaseKeyPassword
        enableV1Signing = true
        enableV2Signing = true
        enableV3Signing = true
        enableV4Signing = true
      }
    }
  }

  buildTypes {
    getByName("debug") {
      applicationIdSuffix = ".debug"
      versionNameSuffix = "-debug"
    }
    getByName("release") {
      isMinifyEnabled = true
      isShrinkResources = true
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
      signingConfigs.findByName("release")?.let { signingConfig = it }
    }
    create("benchmark") {
      initWith(getByName("release"))
      matchingFallbacks += listOf("release")
      isDebuggable = false
      signingConfig = signingConfigs.getByName("debug")
      buildConfigField("boolean", "SIGNAL_BENCHMARK_MODE", "true")
    }
  }

  buildFeatures {
    compose = true
    buildConfig = true
  }
}

baselineProfile {
  automaticGenerationDuringBuild = false
  saveInSrc = true
}
