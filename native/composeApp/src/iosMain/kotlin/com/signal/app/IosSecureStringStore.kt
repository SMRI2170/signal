package com.signal.app

import com.russhwolf.settings.ExperimentalSettingsImplementation
import com.russhwolf.settings.KeychainSettings

@OptIn(ExperimentalSettingsImplementation::class)
class IosSecureStringStore : SecureStringStore {
  private val keychain = KeychainSettings(service = "com.signal.app.auth")

  override suspend fun read(key: String): String? = keychain.getStringOrNull(key)

  override suspend fun write(key: String, value: String) {
    keychain.putString(key, value)
  }

  override suspend fun delete(key: String) {
    keychain.remove(key)
  }
}
