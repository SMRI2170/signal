import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
  kotlin("multiplatform")
  kotlin("plugin.compose")
  kotlin("plugin.serialization")
  id("com.android.kotlin.multiplatform.library")
  id("org.jetbrains.compose")
}

val ktorVersion = "3.6.0"

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
      implementation("org.jetbrains.compose.ui:ui-tooling-preview:1.12.1")
      implementation("io.ktor:ktor-client-core:$ktorVersion")
      implementation("io.ktor:ktor-client-content-negotiation:$ktorVersion")
      implementation("io.ktor:ktor-serialization-kotlinx-json:$ktorVersion")
      implementation("io.github.jan-tennert.supabase:auth-kt:3.8.0")
    }
    commonTest.dependencies {
      implementation(kotlin("test"))
      implementation("io.ktor:ktor-client-mock:$ktorVersion")
      implementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
    }
    androidMain.dependencies {
      implementation("io.ktor:ktor-client-okhttp:$ktorVersion")
    }
    iosMain.dependencies {
      implementation("io.ktor:ktor-client-darwin:$ktorVersion")
      implementation("com.russhwolf:multiplatform-settings:1.3.0")
    }
  }
}
