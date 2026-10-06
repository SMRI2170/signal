plugins {
  id("com.android.test")
  id("androidx.baselineprofile")
}

android {
  namespace = "com.signal.benchmark"
  compileSdk = 37
  targetProjectPath = ":androidApp"

  defaultConfig {
    minSdk = 28
    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
  }
}

baselineProfile {
  useConnectedDevices = true
}

dependencies {
  implementation("androidx.benchmark:benchmark-macro-junit4:1.5.0")
  implementation("androidx.test.ext:junit:1.3.0")
  implementation("androidx.test:runner:1.7.0")
  implementation("androidx.test.uiautomator:uiautomator:2.4.0")
}
