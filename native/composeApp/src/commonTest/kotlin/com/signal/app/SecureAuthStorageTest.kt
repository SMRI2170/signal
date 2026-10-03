package com.signal.app

import io.github.jan.supabase.auth.exception.NoSessionFoundException
import io.github.jan.supabase.auth.user.UserSession
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

class SecureAuthStorageTest {
  private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

  @Test
  fun sessionRoundTripsThroughSecureStore() = runTest {
    val store = FakeSecureStringStore()
    val manager = SecureSessionManager(store, json)
    val session = UserSession(
      accessToken = "access-token",
      refreshToken = "refresh-token",
      expiresIn = 3_600,
      tokenType = "bearer",
    )

    manager.saveSession(session)

    assertEquals(session, manager.loadSession())
  }

  @Test
  fun corruptSessionIsRemovedInsteadOfReused() = runTest {
    val store = FakeSecureStringStore(mutableMapOf("supabase_session" to "not-json"))
    val manager = SecureSessionManager(store, json)

    assertFailsWith<NoSessionFoundException> { manager.loadSession() }
    assertNull(store.read("supabase_session"))
  }

  @Test
  fun pkceVerifierCanBeSavedLoadedAndDeleted() = runTest {
    val store = FakeSecureStringStore()
    val cache = SecureCodeVerifierCache(store)

    cache.saveCodeVerifier("verifier")
    assertEquals("verifier", cache.loadCodeVerifier())
    cache.deleteCodeVerifier()
    assertNull(cache.loadCodeVerifier())
  }
}

private class FakeSecureStringStore(
  private val values: MutableMap<String, String> = mutableMapOf(),
) : SecureStringStore {
  override suspend fun read(key: String): String? = values[key]

  override suspend fun write(key: String, value: String) {
    values[key] = value
  }

  override suspend fun delete(key: String) {
    values.remove(key)
  }
}
