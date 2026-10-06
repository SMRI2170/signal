plugins {
  id("com.android.test")
  id("androidx.baselineprofile")
}

android {
  namespace = "com.signal.app.baselineprofile"
  compileSdk = 37
  targetProjectPath = ":androidApp"

  defaultConfig {
    minSdk = 28
    targetSdk = 37
    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    testInstrumentationRunnerArguments["androidx.benchmark.suppressErrors"] = "EMULATOR"
    testInstrumentationRunnerArguments["androidx.benchmark.output.enable"] = "true"
  }

}

baselineProfile {
  useConnectedDevices = true
}

dependencies {
  implementation("androidx.test.ext:junit:1.3.0")
  implementation("androidx.test.uiautomator:uiautomator:2.4.0")
  implementation("androidx.benchmark:benchmark-macro-junit4:1.5.0")
}
