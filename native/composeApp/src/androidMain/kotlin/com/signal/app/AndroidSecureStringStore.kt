package com.signal.app

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class AndroidSecureStringStore(context: Context) : SecureStringStore {
  private val preferences = context.applicationContext.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

  override suspend fun read(key: String): String? = synchronized(this) {
    val encoded = preferences.getString(key, null) ?: return@synchronized null
    runCatching { decrypt(encoded) }
      .getOrElse {
        preferences.edit().remove(key).apply()
        null
      }
  }

  override suspend fun write(key: String, value: String) = synchronized(this) {
    preferences.edit().putString(key, encrypt(value)).commit()
    Unit
  }

  override suspend fun delete(key: String) = synchronized(this) {
    preferences.edit().remove(key).commit()
    Unit
  }

  private fun encrypt(value: String): String {
    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
    val iv = Base64.encodeToString(cipher.iv, Base64.NO_WRAP)
    val ciphertext = Base64.encodeToString(cipher.doFinal(value.encodeToByteArray()), Base64.NO_WRAP)
    return "$iv:$ciphertext"
  }

  private fun decrypt(value: String): String {
    val parts = value.split(':', limit = 2)
    require(parts.size == 2)
    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(
      Cipher.DECRYPT_MODE,
      getOrCreateKey(),
      GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)),
    )
    return cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)).decodeToString()
  }

  private fun getOrCreateKey(): SecretKey {
    val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
    return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
      init(
        KeyGenParameterSpec.Builder(
          KEY_ALIAS,
          KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
          .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
          .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
          .setRandomizedEncryptionRequired(true)
          .build(),
      )
      generateKey()
    }
  }

  private companion object {
    const val PREFERENCES_NAME = "signal_secure_auth"
    const val KEY_ALIAS = "signal.auth.storage.key"
    const val TRANSFORMATION = "AES/GCM/NoPadding"
  }
}
