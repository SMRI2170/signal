plugins {
  kotlin("multiplatform") version "2.4.20" apply false
  kotlin("plugin.compose") version "2.4.20" apply false
  kotlin("plugin.serialization") version "2.4.20" apply false
  id("com.android.application") version "9.3.1" apply false
  id("com.android.test") version "9.3.1" apply false
  id("com.android.kotlin.multiplatform.library") version "9.3.1" apply false
  id("org.jetbrains.compose") version "1.12.1" apply false
  id("androidx.baselineprofile") version "1.5.0" apply false
}
