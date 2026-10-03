package com.signal.app

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.FlowType
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.Google
import io.github.jan.supabase.auth.providers.builtin.OTP
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.createSupabaseClient
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.Url
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

sealed interface AccountState {
  data object Initializing : AccountState
  data class SignedOut(val messageJa: String? = null) : AccountState
  data class AwaitingMagicLink(val email: String) : AccountState
  data class SignedIn(val email: String?) : AccountState
  data class ReauthenticationRequired(val messageJa: String) : AccountState
}

data class SavedRelationship(
  val id: String,
  val displayName: String,
  val facts: List<String>,
  val snapshots: List<SavedSnapshot>,
)

data class SavedSnapshot(
  val scores: SignalScores,
  val createdAt: String,
)

@Serializable
private data class PendingGuestDraft(
  val displayName: String,
  val facts: List<String>,
  val idempotencyKey: String,
)

class SignalAccountRepository internal constructor(
  private val supabase: SupabaseClient,
  private val apiBaseUrl: String,
  private val store: SecureStringStore,
  private val client: HttpClient = createSignalHttpClient(),
  private val json: Json = Json { ignoreUnknownKeys = true; explicitNulls = false },
) {
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
  private val promotionMutex = Mutex()
  private val _state = MutableStateFlow<AccountState>(AccountState.Initializing)
  private val _relationship = MutableStateFlow<SavedRelationship?>(null)
  private val _message = MutableStateFlow<String?>(null)

  val state: StateFlow<AccountState> = _state.asStateFlow()
  val relationship: StateFlow<SavedRelationship?> = _relationship.asStateFlow()
  val message: StateFlow<String?> = _message.asStateFlow()

  init {
    scope.launch {
      supabase.auth.sessionStatus.collectLatest { status ->
        when (status) {
          SessionStatus.Initializing -> _state.value = AccountState.Initializing
          is SessionStatus.NotAuthenticated -> {
            _state.value = AccountState.SignedOut()
            if (status.isSignOut) _relationship.value = null
          }
          is SessionStatus.RefreshFailure -> {
            _state.value = AccountState.ReauthenticationRequired(
              "ログインの有効期限が切れました。入力内容を保持したまま、もう一度ログインしてください。",
            )
          }
          is SessionStatus.Authenticated -> {
            _state.value = AccountState.SignedIn(status.session.user?.email)
            promotePendingDraft()
            restoreLastRelationship()
          }
        }
      }
    }
  }

  suspend fun stageGuestResult(facts: List<String>, displayName: String) {
    val normalized = facts.map(::normalizeFact).filter(String::isNotEmpty)
    require(normalized.size in 3..10)
    val previous = readPendingDraft()
    val draft = PendingGuestDraft(
      displayName = displayName.trim().ifBlank { "アプリの人" }.take(80),
      facts = normalized,
      idempotencyKey = previous?.takeIf { it.facts == normalized }?.idempotencyKey ?: newSignalUuid(),
    )
    store.write(PENDING_DRAFT_KEY, json.encodeToString(PendingGuestDraft.serializer(), draft))
    if (_state.value is AccountState.SignedIn) {
      promotePendingDraft()
      restoreLastRelationship()
    }
  }

  suspend fun sendMagicLink(email: String) {
    val normalized = email.trim()
    if (!EMAIL_PATTERN.matches(normalized)) {
      _state.value = AccountState.SignedOut("メールアドレスを確認してください。")
      return
    }
    runCatching {
      supabase.auth.signInWith(OTP, redirectUrl = AUTH_REDIRECT_URL) {
        this.email = normalized
        createUser = true
      }
    }.onSuccess {
      _state.value = AccountState.AwaitingMagicLink(normalized)
      _message.value = "メールを送信しました。リンクを開くと、この記録を保存します。"
    }.onFailure {
      _state.value = AccountState.SignedOut("メールを送信できませんでした。通信を確認して再試行してください。")
    }
  }

  suspend fun signInWithGoogle() {
    runCatching { supabase.auth.signInWith(Google, redirectUrl = AUTH_REDIRECT_URL) }
      .onFailure {
        _state.value = AccountState.SignedOut("Googleログインを開始できませんでした。もう一度お試しください。")
      }
  }

  suspend fun handleDeepLink(url: String) {
    val parsed = runCatching { Url(url) }.getOrNull() ?: return
    if (parsed.protocol.name != AUTH_SCHEME || parsed.host != AUTH_HOST) return
    parsed.parameters["error_description"]?.let { description ->
      _state.value = AccountState.SignedOut("ログインを完了できませんでした。$description")
      return
    }
    val code = parsed.parameters["code"] ?: return
    runCatching { supabase.auth.exchangeCodeForSession(code) }
      .onFailure {
        _state.value = AccountState.ReauthenticationRequired(
          "ログインリンクの有効期限が切れています。Factは端末に残っています。もう一度メールを送ってください。",
        )
      }
  }

  fun receiveDeepLink(url: String) {
    scope.launch { handleDeepLink(url) }
  }

  suspend fun signOut() {
    try {
      supabase.auth.signOut()
    } finally {
      supabase.auth.clearSession()
      store.delete(LAST_RELATIONSHIP_KEY)
      store.delete(PENDING_DRAFT_KEY)
      _relationship.value = null
      _state.value = AccountState.SignedOut("ログアウトしました。")
    }
  }

  fun clearMessage() {
    _message.value = null
  }

  private suspend fun promotePendingDraft() {
    promotionMutex.withLock {
      val draft = readPendingDraft() ?: return@withLock
      val token = supabase.auth.currentAccessTokenOrNull() ?: return@withLock
      _message.value = "記録を安全に保存しています…"
      val response = runCatching {
        client.post("$apiBaseUrl/api/relationships") {
          contentType(ContentType.Application.Json)
          header(HttpHeaders.Authorization, "Bearer $token")
          setBody(
            SaveRelationshipRequest(
              displayName = draft.displayName,
              facts = draft.facts.map { FactRequest(clientFactId = newSignalUuid(), text = it) },
              idempotencyKey = draft.idempotencyKey,
            ),
          )
        }
      }.getOrElse {
        _message.value = "保存できませんでした。Factは端末に残っています。通信を確認して再試行してください。"
        return@withLock
      }
      if (response.status.value == 401) {
        supabase.auth.clearSession()
        _state.value = AccountState.ReauthenticationRequired(
          "ログインの有効期限が切れました。Factは端末に残っています。もう一度ログインしてください。",
        )
        return@withLock
      }
      if (!response.status.isSuccess()) {
        val error = runCatching { response.body<AccountApiErrorEnvelope>().error.message }.getOrNull()
        _message.value = error ?: "保存できませんでした。Factは端末に残っています。"
        return@withLock
      }
      val saved = runCatching { response.body<SaveRelationshipResponse>() }.getOrNull()
      if (saved == null) {
        _message.value = "保存結果を確認できませんでした。再試行してください。"
        return@withLock
      }
      store.write(LAST_RELATIONSHIP_KEY, saved.relationshipId)
      store.delete(PENDING_DRAFT_KEY)
      _message.value = "保存しました。次回もこの記録から続けられます。"
    }
  }

  private suspend fun restoreLastRelationship() {
    val token = supabase.auth.currentAccessTokenOrNull() ?: return
    val storedId = store.read(LAST_RELATIONSHIP_KEY)
    val restored = requestRelationship(token, storedId)
      ?: if (storedId != null) requestRelationship(token, null) else null
    if (restored == null) {
      if (storedId != null) store.delete(LAST_RELATIONSHIP_KEY)
      return
    }
    store.write(LAST_RELATIONSHIP_KEY, restored.id)
    _relationship.value = restored.toDomain()
  }

  private suspend fun requestRelationship(token: String, id: String?): RelationshipResponse? {
    val path = id?.let { "/api/relationships/$it" } ?: "/api/relationships"
    val response = runCatching {
      client.get("$apiBaseUrl$path") { header(HttpHeaders.Authorization, "Bearer $token") }
    }.getOrNull() ?: return null
    if (response.status.value == 401) {
      supabase.auth.clearSession()
      _state.value = AccountState.ReauthenticationRequired(
        "ログインの有効期限が切れました。もう一度ログインしてください。",
      )
      return null
    }
    if (!response.status.isSuccess()) return null
    return runCatching { response.body<RelationshipResponse>() }.getOrNull()
  }

  private suspend fun readPendingDraft(): PendingGuestDraft? {
    val stored = store.read(PENDING_DRAFT_KEY) ?: return null
    return runCatching { json.decodeFromString(PendingGuestDraft.serializer(), stored) }
      .getOrElse {
        store.delete(PENDING_DRAFT_KEY)
        null
      }
  }

  private fun RelationshipResponse.toDomain() = SavedRelationship(
    id = id,
    displayName = displayName,
    facts = facts.map(FactResponse::text),
    snapshots = snapshots.map { snapshot ->
      SavedSnapshot(
        scores = SignalScores(
          signalLevel = snapshot.signalLevel,
          desireToMeet = snapshot.desireToMeet,
          initiative = snapshot.initiative,
          evidenceSufficiency = snapshot.evidenceSufficiency,
        ),
        createdAt = snapshot.createdAt,
      )
    },
  )

  private companion object {
    const val PENDING_DRAFT_KEY = "pending_guest_draft"
    const val LAST_RELATIONSHIP_KEY = "last_relationship_id"
    const val AUTH_SCHEME = "com.signal.app"
    const val AUTH_HOST = "login-callback"
    const val AUTH_REDIRECT_URL = "$AUTH_SCHEME://$AUTH_HOST"
    val EMAIL_PATTERN = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")
  }
}

fun createSignalAccountRepository(
  supabaseUrl: String,
  publishableKey: String,
  apiBaseUrl: String,
  store: SecureStringStore,
): SignalAccountRepository {
  val json = Json { ignoreUnknownKeys = true; explicitNulls = false }
  val supabase = createSupabaseClient(supabaseUrl, publishableKey) {
    install(Auth) {
      scheme = "com.signal.app"
      host = "login-callback"
      flowType = FlowType.PKCE
      sessionManager = SecureSessionManager(store, json)
      codeVerifierCache = SecureCodeVerifierCache(store)
      alwaysAutoRefresh = true
      autoLoadFromStorage = true
      autoSaveToStorage = true
    }
  }
  return SignalAccountRepository(
    supabase = supabase,
    apiBaseUrl = apiBaseUrl.trimEnd('/'),
    store = store,
    json = json,
  )
}

@Serializable
private data class SaveRelationshipRequest(
  val displayName: String,
  val facts: List<FactRequest>,
  val idempotencyKey: String,
)

@Serializable
private data class FactRequest(val clientFactId: String, val text: String)

@Serializable
private data class SaveRelationshipResponse(val relationshipId: String)

@Serializable
private data class RelationshipResponse(
  val id: String,
  val displayName: String,
  val facts: List<FactResponse>,
  val snapshots: List<SnapshotResponse>,
)

@Serializable
private data class FactResponse(val text: String, val createdAt: String)

@Serializable
private data class SnapshotResponse(
  val signalLevel: Int,
  val desireToMeet: Int,
  val initiative: Int,
  val evidenceSufficiency: Int,
  val createdAt: String,
)

@Serializable
private data class AccountApiErrorEnvelope(val error: AccountApiError)

@Serializable
private data class AccountApiError(
  val code: String,
  val message: String,
  val requestId: String? = null,
  val retryable: Boolean = false,
)
