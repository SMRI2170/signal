import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
  kotlin("multiplatform")
  kotlin("plugin.compose")
  id("com.android.kotlin.multiplatform.library")
  id("org.jetbrains.compose")
}

kotlin {
  android {
    namespace = "com.signal.shared"
    compileSdk = 37
    minSdk = 24
    withHostTestBuilder {}.configure {}
    compilerOptions {
      jvmTarget.set(JvmTarget.JVM_17)
    }
    androidResources {
      enable = true
    }
  }

  listOf(iosArm64(), iosSimulatorArm64()).forEach { target ->
    target.binaries.framework {
      baseName = "SignalShared"
      isStatic = true
    }
  }

  sourceSets {
    commonMain.dependencies {
      implementation(compose.runtime)
      implementation(compose.foundation)
      implementation(compose.material3)
      implementation(compose.ui)
      implementation(compose.components.resources)
    }
    commonTest.dependencies {
      implementation(kotlin("test"))
    }
  }
}
