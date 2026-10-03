pluginManagement {
  repositories {
    google()
    mavenCentral()
    gradlePluginPortal()
    maven("https://redirector.kotlinlang.org/maven/compose-dev")
  }
}

dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
  repositories {
    google()
    mavenCentral()
    maven("https://redirector.kotlinlang.org/maven/compose-dev")
  }
}

rootProject.name = "signal-native"
include(":composeApp")
include(":androidApp")
include(":baselineprofile")
