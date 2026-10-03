package com.signal.app

import io.github.jan.supabase.auth.CodeVerifierCache
import io.github.jan.supabase.auth.SessionManager
import io.github.jan.supabase.auth.exception.NoSessionFoundException
import io.github.jan.supabase.auth.user.UserSession
import kotlinx.serialization.json.Json

interface SecureStringStore {
  suspend fun read(key: String): String?
  suspend fun write(key: String, value: String)
  suspend fun delete(key: String)
}

internal class SecureSessionManager(
  private val store: SecureStringStore,
  private val json: Json,
) : SessionManager {
  override suspend fun saveSession(session: UserSession) {
    store.write(SESSION_KEY, json.encodeToString(UserSession.serializer(), session))
  }

  override suspend fun loadSession(): UserSession {
    val stored = store.read(SESSION_KEY) ?: throw NoSessionFoundException()
    return runCatching { json.decodeFromString(UserSession.serializer(), stored) }
      .getOrElse {
        store.delete(SESSION_KEY)
        throw NoSessionFoundException()
      }
  }

  override suspend fun deleteSession() {
    store.delete(SESSION_KEY)
  }

  private companion object {
    const val SESSION_KEY = "supabase_session"
  }
}

internal class SecureCodeVerifierCache(private val store: SecureStringStore) : CodeVerifierCache {
  override suspend fun saveCodeVerifier(codeVerifier: String) {
    store.write(CODE_VERIFIER_KEY, codeVerifier)
  }

  override suspend fun loadCodeVerifier(): String? = store.read(CODE_VERIFIER_KEY)

  override suspend fun deleteCodeVerifier() {
    store.delete(CODE_VERIFIER_KEY)
  }

  private companion object {
    const val CODE_VERIFIER_KEY = "pkce_code_verifier"
  }
}
