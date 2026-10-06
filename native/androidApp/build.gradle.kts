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
val androidVersionCode = providers.gradleProperty("SIGNAL_ANDROID_VERSION_CODE")
  .orElse(providers.environmentVariable("SIGNAL_ANDROID_VERSION_CODE"))
  .orElse("1")
  .get()
  .toIntOrNull()
  ?.takeIf { it > 0 }
  ?: throw GradleException("SIGNAL_ANDROID_VERSION_CODE must be a positive integer")
val androidVersionName = providers.gradleProperty("SIGNAL_ANDROID_VERSION_NAME")
  .orElse(providers.environmentVariable("SIGNAL_ANDROID_VERSION_NAME"))
  .orElse("0.1.0")
  .get()
val signalBenchmarkMode = providers.gradleProperty("SIGNAL_BENCHMARK_MODE")
  .orElse(providers.environmentVariable("SIGNAL_BENCHMARK_MODE"))
  .orElse("false")
  .get()
  .toBooleanStrictOrNull()
  ?: throw GradleException("SIGNAL_BENCHMARK_MODE must be true or false")
val releaseSigningValues = listOf(
  providers.gradleProperty("SIGNAL_ANDROID_KEYSTORE_PATH")
    .orElse(providers.environmentVariable("SIGNAL_ANDROID_KEYSTORE_PATH")).orNull,
  providers.gradleProperty("SIGNAL_ANDROID_STORE_PASSWORD")
    .orElse(providers.environmentVariable("SIGNAL_ANDROID_STORE_PASSWORD")).orNull,
  providers.gradleProperty("SIGNAL_ANDROID_KEY_ALIAS")
    .orElse(providers.environmentVariable("SIGNAL_ANDROID_KEY_ALIAS")).orNull,
  providers.gradleProperty("SIGNAL_ANDROID_KEY_PASSWORD")
    .orElse(providers.environmentVariable("SIGNAL_ANDROID_KEY_PASSWORD")).orNull,
)
val releaseSigningConfigured = releaseSigningValues.count { !it.isNullOrBlank() }
if (releaseSigningConfigured != 0 && releaseSigningConfigured != releaseSigningValues.size) {
  throw GradleException("Provide all four SIGNAL_ANDROID_KEYSTORE_PATH / STORE_PASSWORD / KEY_ALIAS / KEY_PASSWORD values")
}
val releaseSigningConfigName = if (releaseSigningConfigured == releaseSigningValues.size) "release" else null

dependencies {
  implementation(project(":composeApp"))
  implementation("androidx.activity:activity-compose:1.12.4")
  implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.10.0")
  implementation("androidx.profileinstaller:profileinstaller:1.4.1")
  implementation(compose.runtime)
  baselineProfile(project(":macrobenchmark"))
}

android {
  namespace = "com.signal.app"
  compileSdk = 37

  defaultConfig {
    applicationId = "com.signal.app"
    minSdk = 24
    targetSdk = 37
    versionCode = androidVersionCode
    versionName = androidVersionName
    buildConfigField("String", "SIGNAL_API_BASE_URL", "\"$signalApiBaseUrl\"")
    buildConfigField("String", "SIGNAL_SUPABASE_URL", "\"$signalSupabaseUrl\"")
    buildConfigField("String", "SIGNAL_SUPABASE_PUBLISHABLE_KEY", "\"$signalSupabasePublishableKey\"")
    buildConfigField("boolean", "SIGNAL_BENCHMARK_MODE", signalBenchmarkMode.toString())
  }

  buildFeatures {
    compose = true
    buildConfig = true
  }

  signingConfigs {
    if (releaseSigningConfigName != null) {
      create(releaseSigningConfigName) {
        storeFile = file(releaseSigningValues[0]!!)
        storePassword = releaseSigningValues[1]
        keyAlias = releaseSigningValues[2]
        keyPassword = releaseSigningValues[3]
      }
    }
  }

  buildTypes {
    getByName("release") {
      isMinifyEnabled = true
      isShrinkResources = true
      isProfileable = true
      proguardFiles(
        getDefaultProguardFile("proguard-android-optimize.txt"),
        "proguard-rules.pro",
      )
      signingConfig = signingConfigs.getByName(releaseSigningConfigName ?: "debug")
    }
  }
}

val validateReleaseApiEndpoint = tasks.register("validateReleaseApiEndpoint") {
  doLast {
    val localEndpoint = Regex("(?i)^https?://(localhost|127\\.0\\.0\\.1|10\\.0\\.2\\.2)(:|/|$)")
    if (!signalApiBaseUrl.startsWith("https://", ignoreCase = true) || localEndpoint.containsMatchIn(signalApiBaseUrl)) {
      throw GradleException("Release builds require a non-local HTTPS SIGNAL_API_BASE_URL; the configured value is withheld.")
    }
  }
}

tasks.configureEach {
  if (name == "preReleaseBuild") {
    dependsOn(validateReleaseApiEndpoint)
  }
}
