plugins {
  id("com.android.application")
  kotlin("plugin.compose")
  id("org.jetbrains.compose")
}

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
  }

  buildFeatures {
    compose = true
  }
}
