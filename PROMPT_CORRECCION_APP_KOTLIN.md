# 🚀 PROMPT DE CORRECCIÓN INTEGRAL - APP KOTLIN SisBanda

## 📋 CONTEXTO DEL PROYECTO

Tu aplicación Kotlin es un cliente móvil para un sistema de gestión de banda de música (SisBanda) que se comunica con un backend Django. El backend está completamente auditado y funcional, con los siguientes endpoints principales:

- **Autenticación:** `POST /api/token/` (login), `POST /api/token/refresh/` (renovar token)
- **Descuentos:** `POST /api/descuentos/registrar_app/`, `GET /api/descuentos/`
- **Adelantos:** `POST /api/adelantos/registrar_app/`, `GET /api/adelantos/`
- **Músicos:** `GET /api/musicos/`, `GET /api/musicos/reporte/`
- **Eventos:** `GET /api/eventos/`, `POST /api/eventos/`

**Arquitectura Actual de la App:**
```
com.example.bandagestion/
├── data/
│   ├── local/          (Room Database)
│   ├── remote/         (Retrofit Services)
│   ├── repository/     (Data layer)
│   └── utils/          (SessionManager, Interceptors)
├── ui/
│   ├── screens/        (Jetpack Compose)
│   ├── viewmodels/     (ViewModel logic)
│   └── components/     (Reusable UI)
└── models/             (Data classes)
```

---

## 🔴 PROBLEMAS CRÍTICOS IDENTIFICADOS

### PROBLEMA 1: URL Hardcodeada (192.168.3.179)
**Ubicación:** Probablemente en `RetrofitClient.kt` o `data/remote/`
**Impacto:** La app SOLO funciona en tu red local. No funciona en producción ni con otro IP.
**Síntomas:** Error de conexión si cambias de red o despliegas a servidor remoto.

### PROBLEMA 2: TokenRefreshInterceptor Usa runBlocking()
**Ubicación:** `data/utils/TokenRefreshInterceptor.kt`
**Impacto:** La app se congela (freeze) cuando intenta renovar el token expirado.
**Síntomas:** Error 401 → app no responde → usuario ve pantalla en blanco.

### PROBLEMA 3: Falta Endpoint /token/refresh/
**Ubicación:** `data/remote/AuthApiService.kt`
**Impacto:** No puede renovar tokens automáticamente. Token caduca → 401 → app rota.
**Síntomas:** Después de ~200 días de no reiniciar app, falla autenticación.

### PROBLEMA 4: Tokens en Texto Plano
**Ubicación:** `data/utils/SessionManager.kt`
**Impacto:** Tokens pueden ser interceptados por malware o atacantes.
**Síntomas:** Cualquier app maliciosa en el teléfono puede leer los tokens JWT.

### PROBLEMA 5: Falta Validación de Permisos en UI
**Ubicación:** Todas las screens (`ui/screens/*.kt`)
**Impacto:** Usuarios pueden ver/intentar acceder a funciones que su rol no permite.
**Síntomas:** Jefe de Sección ve botón de "Registrar Adelanto" (que no debería poder hacer).

### PROBLEMA 6: Manejo de Errores Genérico
**Ubicación:** `ui/viewmodels/*.kt`
**Impacto:** No distingues entre error 401 (token expirado), 403 (permiso denegado), 500 (servidor roto).
**Síntomas:** Usuario ve "Error" sin saber si es su culpa o del servidor.

### PROBLEMA 7: Falta Validación de Datos Antes de Enviar
**Ubicación:** `ui/screens/` (formularios de Descuentos, Adelantos, etc.)
**Impacto:** Envías datos inválidos a Django (monto negativo, fecha futura, motivo vacío).
**Síntomas:** Requests fallan después de 30 segundos de espera innecesaria.

### PROBLEMA 8: Sin Retry Logic
**Ubicación:** `RetrofitClient.kt`
**Impacto:** Si la red se cae 1 segundo, la petición falla inmediatamente sin reintentar.
**Síntomas:** Usuario está con WiFi lento o 4G que sube/baja, la app falla constantemente.

---

## ✅ SOLUCIONES DETALLADAS

### SOLUCIÓN 1: Configuración Dinámica de URL con BuildConfig

**Archivo:** `build.gradle.kts` (Module: app)

```kotlin
android {
    // ... configuración existente ...
    
    buildTypes {
        debug {
            buildConfigField("String", "API_BASE_URL", 
                "\"http://192.168.3.179:8000/api/\"")
            buildConfigField("String", "API_TIMEOUT_SECONDS", "10")
            buildConfigField("String", "LOG_LEVEL", "\"DEBUG\"")
        }
        release {
            buildConfigField("String", "API_BASE_URL", 
                "\"https://api.tudominio.com/api/\"")
            buildConfigField("String", "API_TIMEOUT_SECONDS", "15")
            buildConfigField("String", "LOG_LEVEL", "\"ERROR\"")
        }
    }
    
    flavorDimensions += "environment"
    productFlavors {
        create("dev") {
            dimension = "environment"
            buildConfigField("String", "API_BASE_URL", 
                "\"http://192.168.3.179:8000/api/\"")
        }
        create("staging") {
            dimension = "environment"
            buildConfigField("String", "API_BASE_URL", 
                "\"https://staging-api.tudominio.com/api/\"")
        }
        create("prod") {
            dimension = "environment"
            buildConfigField("String", "API_BASE_URL", 
                "\"https://api.tudominio.com/api/\"")
        }
    }
}
```

**Archivo:** `data/remote/RetrofitClient.kt`

```kotlin
package com.example.bandagestion.data.remote

import android.content.Context
import com.example.bandagestion.BuildConfig
import com.example.bandagestion.data.utils.AuthInterceptor
import com.example.bandagestion.data.utils.TokenRefreshInterceptor
import com.example.bandagestion.data.utils.RetryInterceptor
import com.example.bandagestion.data.utils.SessionManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {
    private var retrofit: Retrofit? = null
    
    fun getInstance(context: Context): Retrofit {
        if (retrofit == null) {
            retrofit = Retrofit.Builder()
                .baseUrl(BuildConfig.API_BASE_URL)
                .client(getHttpClient(context))
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }
        return retrofit!!
    }
    
    private fun getHttpClient(context: Context): OkHttpClient {
        val sessionManager = SessionManager(context)
        
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = when (BuildConfig.LOG_LEVEL) {
                "DEBUG" -> HttpLoggingInterceptor.Level.BODY
                "INFO" -> HttpLoggingInterceptor.Level.BASIC
                else -> HttpLoggingInterceptor.Level.NONE
            }
        }
        
        return OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .addInterceptor(RetryInterceptor()) // ← Reintenta automáticamente
            .addInterceptor(AuthInterceptor(sessionManager)) // ← Agrega token
            .addNetworkInterceptor(TokenRefreshInterceptor(sessionManager)) // ← Red-level interceptor
            .connectTimeout(
                BuildConfig.API_TIMEOUT_SECONDS.toLong(), 
                TimeUnit.SECONDS
            )
            .readTimeout(
                BuildConfig.API_TIMEOUT_SECONDS.toLong(), 
                TimeUnit.SECONDS
            )
            .writeTimeout(
                BuildConfig.API_TIMEOUT_SECONDS.toLong(), 
                TimeUnit.SECONDS
            )
            .build()
    }
    
    fun resetInstance() {
        retrofit = null
    }
}
```

---

### SOLUCIÓN 2: TokenRefreshInterceptor Correcto (Sin runBlocking)

**Archivo:** `data/utils/TokenRefreshInterceptor.kt`

```kotlin
package com.example.bandagestion.data.utils

import android.util.Log
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

/**
 * Interceptor que renueva automáticamente el access token cuando expira (401).
 * Nota: Este debe ser un NetworkInterceptor, no Application Interceptor.
 * Se coloca con addNetworkInterceptor(), no addInterceptor().
 */
class TokenRefreshInterceptor(
    private val sessionManager: SessionManager
) : Interceptor {
    
    companion object {
        private const val TAG = "TokenRefreshInterceptor"
        private const val MAX_RETRY = 1
    }
    
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        
        // Proceder con la petición original
        var response = chain.proceed(request)
        
        // Si recibimos 401, intentar refrescar el token
        var retryCount = 0
        while (response.code == 401 && retryCount < MAX_RETRY) {
            synchronized(this) {
                retryCount++
                Log.d(TAG, "Token expirado (401). Intento $retryCount de refrescar...")
                
                val refreshToken = sessionManager.getRefreshToken()
                
                if (refreshToken == null) {
                    Log.e(TAG, "No hay refresh token disponible. Limpiando sesión.")
                    sessionManager.clearTokens()
                    return response
                }
                
                try {
                    // SINCRÓNICO: Refrescar el token dentro del interceptor de red
                    val newTokens = refreshTokenSynchronously(refreshToken)
                    
                    if (newTokens != null) {
                        Log.d(TAG, "Token renovado exitosamente")
                        sessionManager.saveTokens(newTokens)
                        
                        // Cerrar respuesta anterior
                        response.close()
                        
                        // Reintentar petición original con nuevo token
                        val newRequest = request.newBuilder()
                            .header("Authorization", "Bearer ${newTokens.access}")
                            .build()
                        
                        response = chain.proceed(newRequest)
                    } else {
                        Log.e(TAG, "Fallo al refrescar token")
                        sessionManager.clearTokens()
                        return response
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Excepción al refrescar token", e)
                    sessionManager.clearTokens()
                    return response
                }
            }
        }
        
        return response
    }
    
    /**
     * Realiza petición SINCRÓNICA al servidor para refrescar el token.
     * Se ejecuta en el thread del interceptor de red (seguro).
     */
    private fun refreshTokenSynchronously(refreshToken: String): TokenResponse? {
        return try {
            val retrofit = Retrofit.Builder()
                .baseUrl(BuildConfig.API_BASE_URL)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            
            val service = retrofit.create(AuthApiService::class.java)
            val refreshRequest = RefreshRequest(refresh = refreshToken)
            
            val call = service.refreshTokenSync(refreshRequest)
            val response = call.execute()
            
            if (response.isSuccessful) {
                response.body()
            } else {
                Log.e(TAG, "Error al refrescar: ${response.code()} - ${response.errorBody()?.string()}")
                null
            }
        } catch (e: IOException) {
            Log.e(TAG, "Error de red al refrescar token", e)
            null
        } catch (e: Exception) {
            Log.e(TAG, "Error inesperado al refrescar token", e)
            null
        }
    }
}

// Necesario para llamadas sincrónicas
data class RefreshRequest(val refresh: String)
```

---

### SOLUCIÓN 3: AuthApiService Completo con Ambos Métodos

**Archivo:** `data/remote/AuthApiService.kt`

```kotlin
package com.example.bandagestion.data.remote

import retrofit2.Call
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApiService {
    
    /**
     * Login - Obtener tokens JWT iniciales
     * POST /api/token/
     */
    @POST("token/")
    suspend fun login(@Body request: LoginRequest): Response<TokenResponse>
    
    /**
     * Refrescar token - ASINCRÓNICO (para ViewModel)
     * POST /api/token/refresh/
     */
    @POST("token/refresh/")
    suspend fun refreshToken(@Body request: RefreshRequest): Response<TokenResponse>
    
    /**
     * Refrescar token - SINCRÓNICO (para Interceptor de red)
     * POST /api/token/refresh/
     * IMPORTANTE: Este método devuelve Call<>, no suspend fun
     */
    @POST("token/refresh/")
    fun refreshTokenSync(@Body request: RefreshRequest): Call<TokenResponse>
}

// Data Classes para peticiones y respuestas
data class LoginRequest(
    val username: String,
    val password: String
)

data class RefreshRequest(
    val refresh: String
)

data class TokenResponse(
    val access: String,
    val refresh: String,
    val user: UserInfo? = null
)

data class UserInfo(
    val id: Int,
    val username: String,
    val rol: String,
    val nombres: String,
    val apellidos: String
)
```

---

### SOLUCIÓN 4: SessionManager con Encriptación

**Archivo:** `data/utils/SessionManager.kt`

Primero, agregar dependencia en `build.gradle.kts`:
```kotlin
dependencies {
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
}
```

```kotlin
package com.example.bandagestion.data.utils

import android.content.Context
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.example.bandagestion.data.remote.TokenResponse
import java.util.*

/**
 * Gestor seguro de sesiones y tokens JWT.
 * Encripta los tokens usando AES-256-GCM en SharedPreferences.
 */
class SessionManager(context: Context) {
    
    companion object {
        private const val TAG = "SessionManager"
        private const val PREF_NAME = "auth_tokens"
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_ROL = "user_rol"
        private const val KEY_USERNAME = "username"
        private const val KEY_TOKEN_TIME = "token_time"
        private const val TOKEN_EXPIRY_DAYS = 200L
    }
    
    private val encryptedPreferences: EncryptedSharedPreferences
    
    init {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        
        encryptedPreferences = EncryptedSharedPreferences.create(
            context,
            PREF_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }
    
    /**
     * Guardar tokens y datos del usuario de forma segura (encriptada).
     */
    fun saveTokens(response: TokenResponse, userId: Int? = null, userName: String? = null, userRol: String? = null) {
        try {
            encryptedPreferences.edit().apply {
                putString(KEY_ACCESS_TOKEN, response.access)
                putString(KEY_REFRESH_TOKEN, response.refresh)
                putLong(KEY_TOKEN_TIME, System.currentTimeMillis())
                
                userId?.let { putInt(KEY_USER_ID, it) }
                userName?.let { putString(KEY_USERNAME, it) }
                userRol?.let { putString(KEY_USER_ROL, it) }
                
                apply()
                Log.d(TAG, "Tokens guardados de forma segura")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al guardar tokens", e)
        }
    }
    
    /**
     * Obtener el access token actual (encriptado).
     */
    fun getAccessToken(): String? {
        return try {
            encryptedPreferences.getString(KEY_ACCESS_TOKEN, null)
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener access token", e)
            null
        }
    }
    
    /**
     * Obtener el refresh token (para renovación).
     */
    fun getRefreshToken(): String? {
        return try {
            encryptedPreferences.getString(KEY_REFRESH_TOKEN, null)
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener refresh token", e)
            null
        }
    }
    
    /**
     * Obtener el rol del usuario autenticado.
     */
    fun getUserRol(): String? {
        return try {
            encryptedPreferences.getString(KEY_USER_ROL, null)
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener rol", e)
            null
        }
    }
    
    /**
     * Obtener el ID del usuario autenticado.
     */
    fun getUserId(): Int? {
        return try {
            val id = encryptedPreferences.getInt(KEY_USER_ID, -1)
            if (id == -1) null else id
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener user ID", e)
            null
        }
    }
    
    /**
     * Verificar si el token está próximo a expirar.
     * Token expira en ~200 días. Refrescar si faltan menos de 7 días.
     */
    fun isTokenExpiringSoon(): Boolean {
        return try {
            val tokenTime = encryptedPreferences.getLong(KEY_TOKEN_TIME, 0L)
            val now = System.currentTimeMillis()
            val elapsed = now - tokenTime
            val sixDaysMs = 6 * 24 * 60 * 60 * 1000L
            elapsed > sixDaysMs
        } catch (e: Exception) {
            Log.e(TAG, "Error al verificar expiración", e)
            false
        }
    }
    
    /**
     * Limpiar todos los tokens (logout).
     */
    fun clearTokens() {
        try {
            encryptedPreferences.edit().clear().apply()
            Log.d(TAG, "Tokens y sesión eliminados")
        } catch (e: Exception) {
            Log.e(TAG, "Error al limpiar tokens", e)
        }
    }
    
    /**
     * Verificar si hay sesión activa.
     */
    fun isLoggedIn(): Boolean {
        return getAccessToken() != null && getRefreshToken() != null
    }
}
```

---

### SOLUCIÓN 5: AuthInterceptor Mejorado

**Archivo:** `data/utils/AuthInterceptor.kt`

```kotlin
package com.example.bandagestion.data.utils

import android.util.Log
import okhttp3.Interceptor
import okhttp3.Response

/**
 * Interceptor que añade el token JWT a TODAS las peticiones.
 * Este es un Application Interceptor (addInterceptor), no Network Interceptor.
 */
class AuthInterceptor(private val sessionManager: SessionManager) : Interceptor {
    
    companion object {
        private const val TAG = "AuthInterceptor"
        private const val HEADER_AUTHORIZATION = "Authorization"
        private const val TOKEN_PREFIX = "Bearer "
    }
    
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        
        // No agregar token a endpoints de autenticación
        if (originalRequest.url.encodedPath.contains("token")) {
            return chain.proceed(originalRequest)
        }
        
        val accessToken = sessionManager.getAccessToken()
        
        return if (accessToken != null) {
            val authenticatedRequest = originalRequest.newBuilder()
                .header(HEADER_AUTHORIZATION, TOKEN_PREFIX + accessToken)
                .build()
            
            Log.d(TAG, "Token agregado a petición: ${originalRequest.url}")
            chain.proceed(authenticatedRequest)
        } else {
            Log.w(TAG, "No hay token disponible para: ${originalRequest.url}")
            chain.proceed(originalRequest)
        }
    }
}
```

---

### SOLUCIÓN 6: RetryInterceptor con Exponential Backoff

**Archivo:** `data/utils/RetryInterceptor.kt`

```kotlin
package com.example.bandagestion.data.utils

import android.util.Log
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

/**
 * Interceptor que reintenta automáticamente peticiones fallidas.
 * Usa exponential backoff: 1s, 2s, 4s, 8s...
 * Se coloca ANTES de los otros interceptores (addInterceptor).
 */
class RetryInterceptor : Interceptor {
    
    companion object {
        private const val TAG = "RetryInterceptor"
        private const val MAX_RETRIES = 3
        private const val INITIAL_DELAY_MS = 1000L // 1 segundo
    }
    
    override fun intercept(chain: Interceptor.Chain): Response {
        var request = chain.request()
        var lastException: IOException? = null
        var response: Response? = null
        
        for (attempt in 1..MAX_RETRIES) {
            try {
                response = chain.proceed(request)
                
                // Si es exitoso o error del cliente (4xx), devolver
                if (response.isSuccessful || (response.code in 400..499 && response.code != 408)) {
                    Log.d(TAG, "Intento $attempt: EXITOSO (${response.code})")
                    return response
                }
                
                // Si es error de servidor (5xx), timeout (408) o rate limit (429), reintentar
                if (response.code in listOf(408, 429) || response.code in 500..599) {
                    Log.w(TAG, "Intento $attempt: Error ${response.code}. Reintentando...")
                    response.close()
                    
                    if (attempt < MAX_RETRIES) {
                        val delayMs = INITIAL_DELAY_MS * (1L shl (attempt - 1))
                        Log.d(TAG, "Esperando ${delayMs}ms antes de reintentar...")
                        Thread.sleep(delayMs)
                    }
                } else {
                    Log.d(TAG, "Intento $attempt: Error ${response.code} (no reintentable)")
                    return response
                }
                
            } catch (e: IOException) {
                lastException = e
                Log.w(TAG, "Intento $attempt: Excepción - ${e.message}")
                
                if (attempt < MAX_RETRIES) {
                    val delayMs = INITIAL_DELAY_MS * (1L shl (attempt - 1))
                    Log.d(TAG, "Esperando ${delayMs}ms antes de reintentar...")
                    Thread.sleep(delayMs)
                }
            }
        }
        
        // Si llegamos aquí, todos los intentos fallaron
        return response ?: throw lastException ?: IOException("Max retries reached")
    }
}
```

---

### SOLUCIÓN 7: ErrorHandler Completo

**Archivo:** `utils/ErrorHandler.kt`

```kotlin
package com.example.bandagestion.utils

import android.util.Log
import retrofit2.HttpException
import java.io.IOException
import java.net.SocketTimeoutException

/**
 * Clasificación de errores de API para manejo consistente en toda la app.
 */
sealed class ApiError(open val message: String) {
    data class Unauthorized(
        override val message: String = "Tu sesión ha expirado. Por favor, inicia sesión de nuevo."
    ) : ApiError(message)
    
    data class Forbidden(
        override val message: String = "No tienes permisos para realizar esta acción."
    ) : ApiError(message)
    
    data class NotFound(
        override val message: String = "El recurso solicitado no existe."
    ) : ApiError(message)
    
    data class ValidationError(
        override val message: String = "Los datos ingresados no son válidos.",
        val details: Map<String, String> = emptyMap()
    ) : ApiError(message)
    
    data class ServerError(
        override val message: String = "Error del servidor. Intenta más tarde."
    ) : ApiError(message)
    
    data class NetworkError(
        override val message: String = "No hay conexión a internet. Verifica tu conexión."
    ) : ApiError(message)
    
    data class TimeoutError(
        override val message: String = "La petición tardó demasiado. Intenta de nuevo."
    ) : ApiError(message)
    
    data class UnknownError(
        override val message: String = "Ocurrió un error inesperado. Intenta de nuevo."
    ) : ApiError(message)
}

/**
 * Convertir excepciones a ApiError clasificados.
 */
fun handleException(exception: Exception): ApiError {
    return when (exception) {
        is HttpException -> handleHttpException(exception)
        is SocketTimeoutException -> ApiError.TimeoutError()
        is IOException -> ApiError.NetworkError()
        else -> {
            Log.e("ErrorHandler", "Unknown exception", exception)
            ApiError.UnknownError(exception.message ?: "Error desconocido")
        }
    }
}

/**
 * Manejar específicamente errores HTTP.
 */
private fun handleHttpException(exception: HttpException): ApiError {
    return when (exception.code()) {
        401 -> ApiError.Unauthorized()
        403 -> ApiError.Forbidden()
        404 -> ApiError.NotFound()
        400 -> {
            try {
                val errorBody = exception.response()?.errorBody()?.string() ?: "{}"
                // Parsear JSON de error si es posible
                ApiError.ValidationError(
                    message = "Error en los datos: ${exception.response()?.message()}"
                )
            } catch (e: Exception) {
                ApiError.ValidationError()
            }
        }
        408 -> ApiError.TimeoutError()
        429 -> ApiError.ServerError("Demasiadas peticiones. Intenta más tarde.")
        in 500..599 -> ApiError.ServerError(
            "Error del servidor (${exception.code()}). Intenta más tarde."
        )
        else -> ApiError.UnknownError("Error HTTP ${exception.code()}: ${exception.message()}")
    }
}

/**
 * Extensión para convertir excepciones a errores clasificados.
 */
inline fun <T> tryCatch(block: suspend () -> T): Result<T> {
    return try {
        Result.success(block)
    } catch (e: Exception) {
        Result.failure(handleException(e))
    }
}

/**
 * Tipo de resultado que contiene éxito o error.
 */
sealed class Result<T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error<T>(val error: ApiError) : Result<T>()
    
    fun getOrNull(): T? = when (this) {
        is Success -> data
        is Error -> null
    }
}
```

---

### SOLUCIÓN 8: PermissionChecker para Validación de Roles

**Archivo:** `utils/PermissionChecker.kt`

```kotlin
package com.example.bandagestion.utils

/**
 * Verificar permisos basados en roles de usuario.
 * Roles disponibles: PRESIDENTE, DIRECTOR, SUBDIRECTOR, JEFE_SECCION, MUSICO
 */
object PermissionChecker {
    
    enum class UserRole(val displayName: String) {
        PRESIDENTE("Presidente"),
        DIRECTOR("Director"),
        SUBDIRECTOR("Subdirector"),
        JEFE_SECCION("Jefe de Sección"),
        MUSICO("Músico")
    }
    
    // ========== DESCUENTOS ==========
    fun canRegisterDescuentos(userRole: String?): Boolean {
        return userRole in listOf("DIRECTOR", "SUBDIRECTOR", "PRESIDENTE", "JEFE_SECCION")
    }
    
    fun canViewDescuentos(userRole: String?): Boolean {
        return userRole in listOf("DIRECTOR", "SUBDIRECTOR", "PRESIDENTE", "JEFE_SECCION", "MUSICO")
    }
    
    fun canViewAllDescuentos(userRole: String?): Boolean {
        return userRole in listOf("DIRECTOR", "SUBDIRECTOR", "PRESIDENTE")
    }
    
    // ========== ADELANTOS ==========
    fun canRegisterAdelantos(userRole: String?): Boolean {
        return userRole in listOf("DIRECTOR", "SUBDIRECTOR", "PRESIDENTE")
    }
    
    fun canViewAdelantos(userRole: String?): Boolean {
        return userRole in listOf("DIRECTOR", "SUBDIRECTOR", "PRESIDENTE")
    }
    
    // ========== MÚSICOS ==========
    fun canManageMusicos(userRole: String?): Boolean {
        return userRole in listOf("DIRECTOR", "SUBDIRECTOR", "PRESIDENTE")
    }
    
    fun canViewMusicos(userRole: String?): Boolean {
        return userRole != null
    }
    
    // ========== EVENTOS ==========
    fun canCreateEvents(userRole: String?): Boolean {
        return userRole in listOf("DIRECTOR", "SUBDIRECTOR", "PRESIDENTE")
    }
    
    fun canViewEvents(userRole: String?): Boolean {
        return userRole != null
    }
    
    // ========== REPORTES ==========
    fun canGenerateReports(userRole: String?): Boolean {
        return userRole in listOf("DIRECTOR", "SUBDIRECTOR", "PRESIDENTE")
    }
    
    fun getPermissionDeniedMessage(action: String): String {
        return "❌ No tienes permisos para $action"
    }
}
```

---

### SOLUCIÓN 9: Validadores de Datos

**Archivo:** `utils/Validators.kt`

```kotlin
package com.example.bandagestion.utils

import java.time.LocalDate

/**
 * Validaciones de datos ANTES de enviar al servidor.
 */

sealed class ValidationResult {
    object Valid : ValidationResult()
    data class Invalid(val errors: List<String>) : ValidationResult()
}

object DescuentoValidator {
    
    fun validate(
        monto: Double?,
        motivo: String?,
        fecha: String?
    ): ValidationResult {
        val errors = mutableListOf<String>()
        
        // Validar monto
        if (monto == null || monto <= 0) {
            errors.add("El monto debe ser mayor a 0")
        }
        if (monto != null && monto > 100000) {
            errors.add("El monto no puede ser mayor a 100.000")
        }
        
        // Validar motivo
        if (motivo.isNullOrBlank()) {
            errors.add("El motivo es obligatorio")
        }
        if (motivo != null && motivo.length < 3) {
            errors.add("El motivo debe tener al menos 3 caracteres")
        }
        if (motivo != null && motivo.length > 200) {
            errors.add("El motivo no puede exceder 200 caracteres")
        }
        
        // Validar fecha
        if (fecha.isNullOrBlank()) {
            errors.add("La fecha es obligatoria")
        } else {
            try {
                val fechaFalta = LocalDate.parse(fecha)
                if (fechaFalta > LocalDate.now()) {
                    errors.add("La fecha no puede ser futura")
                }
                if (fechaFalta.year < LocalDate.now().year - 1) {
                    errors.add("La fecha no puede ser anterior a un año atrás")
                }
            } catch (e: Exception) {
                errors.add("Formato de fecha inválido (usa YYYY-MM-DD)")
            }
        }
        
        return if (errors.isEmpty()) ValidationResult.Valid else ValidationResult.Invalid(errors)
    }
}

object AdelantoValidator {
    
    fun validate(
        monto: Double?,
        motivo: String?,
        fecha: String?
    ): ValidationResult {
        val errors = mutableListOf<String>()
        
        // Validar monto
        if (monto == null || monto <= 0) {
            errors.add("El monto debe ser mayor a 0")
        }
        if (monto != null && monto > 500000) {
            errors.add("El monto no puede ser mayor a 500.000")
        }
        
        // Validar motivo
        if (motivo.isNullOrBlank()) {
            errors.add("El motivo es obligatorio")
        }
        if (motivo != null && motivo.length < 5) {
            errors.add("El motivo debe tener al menos 5 caracteres")
        }
        
        // Validar fecha
        if (fecha.isNullOrBlank()) {
            errors.add("La fecha es obligatoria")
        } else {
            try {
                val fechaAdelanto = LocalDate.parse(fecha)
                if (fechaAdelanto > LocalDate.now()) {
                    errors.add("La fecha no puede ser futura")
                }
            } catch (e: Exception) {
                errors.add("Formato de fecha inválido")
            }
        }
        
        return if (errors.isEmpty()) ValidationResult.Valid else ValidationResult.Invalid(errors)
    }
}
```

---

### SOLUCIÓN 10: ViewModel con Manejo de Errores

**Archivo:** `ui/viewmodels/DescuentosViewModel.kt` (Ejemplo)

```kotlin
package com.example.bandagestion.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.bandagestion.data.repository.DescuentoRepository
import com.example.bandagestion.utils.ApiError
import com.example.bandagestion.utils.ErrorHandler
import com.example.bandagestion.utils.PermissionChecker
import com.example.bandagestion.utils.ValidationResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import android.util.Log

data class DescuentoUiState(
    val isLoading: Boolean = false,
    val descuentos: List<DescuentoData> = emptyList(),
    val error: ApiError? = null,
    val success: String? = null
)

data class DescuentoData(
    val id: Int,
    val musicoNombre: String,
    val monto: Double,
    val motivo: String,
    val fecha: String,
    val estado: String
)

class DescuentosViewModel(
    private val repository: DescuentoRepository,
    private val permissionChecker: PermissionChecker
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(DescuentoUiState())
    val uiState: StateFlow<DescuentoUiState> = _uiState
    
    fun loadDescuentos() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            try {
                val descuentos = repository.getDescuentos()
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    descuentos = descuentos,
                    error = null
                )
                Log.d("DescuentosVM", "Descuentos cargados: ${descuentos.size}")
            } catch (e: Exception) {
                val error = ErrorHandler.handleException(e)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = error
                )
                Log.e("DescuentosVM", "Error al cargar descuentos", e)
            }
        }
    }
    
    fun registrarDescuento(
        monto: Double,
        motivo: String,
        fecha: String,
        userRole: String?
    ) {
        // 1. Validar permisos
        if (!permissionChecker.canRegisterDescuentos(userRole)) {
            val message = permissionChecker.getPermissionDeniedMessage("registrar descuentos")
            _uiState.value = _uiState.value.copy(
                error = ApiError.Forbidden(message)
            )
            return
        }
        
        // 2. Validar datos
        val validationResult = com.example.bandagestion.utils.DescuentoValidator.validate(
            monto, motivo, fecha
        )
        if (validationResult !is ValidationResult.Valid) {
            val errorMessage = (validationResult as ValidationResult.Invalid).errors.joinToString("\n")
            _uiState.value = _uiState.value.copy(
                error = ApiError.ValidationError(errorMessage)
            )
            return
        }
        
        // 3. Enviar al servidor
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, success = null)
            
            try {
                repository.registrarDescuento(monto, motivo, fecha)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    success = "Descuento registrado exitosamente"
                )
                Log.d("DescuentosVM", "Descuento registrado")
                
                // Recargar lista después de 1 segundo
                loadDescuentos()
            } catch (e: Exception) {
                val error = ErrorHandler.handleException(e)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = error
                )
                Log.e("DescuentosVM", "Error al registrar descuento", e)
            }
        }
    }
}
```

---

### SOLUCIÓN 11: Screen Composable Mejorada

**Archivo:** `ui/screens/DescuentosScreen.kt` (Ejemplo)

```kotlin
package com.example.bandagestion.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.bandagestion.ui.viewmodels.DescuentosViewModel
import com.example.bandagestion.utils.ApiError
import com.example.bandagestion.utils.ValidationResult

@Composable
fun DescuentosScreen(
    viewModel: DescuentosViewModel,
    userRole: String?
) {
    val uiState by viewModel.uiState.collectAsState()
    var monto by remember { mutableStateOf("") }
    var motivo by remember { mutableStateOf("") }
    var fecha by remember { mutableStateOf("") }
    
    LaunchedEffect(Unit) {
        viewModel.loadDescuentos()
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "Gestión de Descuentos",
            style = MaterialTheme.typography.headlineSmall,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        
        // ========== FORMULARIO ==========
        if (viewModel.permissionChecker.canRegisterDescuentos(userRole)) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    TextField(
                        value = monto,
                        onValueChange = { monto = it },
                        label = { Text("Monto") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    TextField(
                        value = motivo,
                        onValueChange = { motivo = it },
                        label = { Text("Motivo") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    TextField(
                        value = fecha,
                        onValueChange = { fecha = it },
                        label = { Text("Fecha (YYYY-MM-DD)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Button(
                        onClick = {
                            viewModel.registrarDescuento(
                                monto.toDoubleOrNull() ?: 0.0,
                                motivo,
                                fecha,
                                userRole
                            )
                        },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !uiState.isLoading
                    ) {
                        if (uiState.isLoading) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp))
                        } else {
                            Text("Registrar Descuento")
                        }
                    }
                }
            }
        }
        
        // ========== ERRORES ==========
        uiState.error?.let { error ->
            ErrorCard(error)
        }
        
        // ========== ÉXITO ==========
        uiState.success?.let { message ->
            SuccessCard(message)
        }
        
        // ========== LISTA DE DESCUENTOS ==========
        if (uiState.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (uiState.descuentos.isEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "No hay descuentos registrados",
                    modifier = Modifier.padding(16.dp)
                )
            }
        } else {
            LazyColumn {
                items(uiState.descuentos.size) { index ->
                    val descuento = uiState.descuentos[index]
                    DescuentoItem(descuento)
                }
            }
        }
    }
}

@Composable
fun ErrorCard(error: ApiError) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        backgroundColor = MaterialTheme.colorScheme.errorContainer
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "⚠️ Error",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.error
            )
            Text(
                text = error.message,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
    }
}

@Composable
fun SuccessCard(message: String) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        backgroundColor = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Text(
            text = "✅ $message",
            modifier = Modifier.padding(16.dp)
        )
    }
}

@Composable
fun DescuentoItem(descuento: DescuentoData) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            Text(
                text = descuento.musicoNombre,
                style = MaterialTheme.typography.titleSmall
            )
            Text(
                text = "Monto: Bs${descuento.monto}",
                style = MaterialTheme.typography.bodySmall
            )
            Text(
                text = "Motivo: ${descuento.motivo}",
                style = MaterialTheme.typography.bodySmall
            )
            Text(
                text = descuento.fecha,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}
```

---

## 📋 ARCHIVO: `dependencies.txt`

Agregar estas dependencias en `build.gradle.kts`:

```kotlin
dependencies {
    // Retrofit + OkHttp
    implementation("com.squareup.retrofit2:retrofit:2.10.0")
    implementation("com.squareup.retrofit2:converter-gson:2.10.0")
    implementation("com.squareup.okhttp3:okhttp:4.11.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.11.0")
    
    // Security (Encrypted SharedPreferences)
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    
    // Jetpack Compose
    implementation("androidx.compose.material3:material3:1.1.1")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // Lifecycle / ViewModel
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.1")
}
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] **1. Configurar BuildConfig** - Dinámico por flavor (dev, staging, prod)
- [ ] **2. Actualizar RetrofitClient.kt** - Usar BuildConfig.API_BASE_URL
- [ ] **3. Reescribir TokenRefreshInterceptor** - Sin runBlocking, usar sincronía de interceptor
- [ ] **4. Completar AuthApiService** - Agregar refreshTokenSync() para interceptor
- [ ] **5. Reemplazar SessionManager** - Encriptación con MasterKey + EncryptedSharedPreferences
- [ ] **6. Mejorar AuthInterceptor** - Validar que agrega Bearer token correctamente
- [ ] **7. Crear RetryInterceptor** - Exponential backoff automático
- [ ] **8. Crear ErrorHandler.kt** - Clasificar errores en ApiError sealed class
- [ ] **9. Crear PermissionChecker.kt** - Validar permisos por rol
- [ ] **10. Crear Validators.kt** - Validar monto, motivo, fecha ANTES de enviar
- [ ] **11. Refactorizar ViewModel** - Usar ErrorHandler y PermissionChecker
- [ ] **12. Actualizar UI Screens** - Mostrar errores específicos, validar permisos
- [ ] **13. Agregar dependencias** - retrofit, okhttp, security-crypto, coroutines
- [ ] **14. Testear login** - Verificar que tokens se guardan encriptados
- [ ] **15. Testear descuentos** - Registrar desde Jefe de Sección (debe funcionar)
- [ ] **16. Testear 401** - Dejar token expirado, verificar refresh automático
- [ ] **17. Testear errores** - Desconectar WiFi, ver retry logic
- [ ] **18. Verificar logs** - Debe mostrar "Token agregado", "Token renovado", etc.

---

## 🚀 ORDEN DE IMPLEMENTACIÓN RECOMENDADO

1. **Primero:** BuildConfig + RetrofitClient (base de todo)
2. **Segundo:** SessionManager + Encriptación (seguridad)
3. **Tercero:** Interceptores (Auth + Refresh + Retry)
4. **Cuarto:** AuthApiService completo
5. **Quinto:** ErrorHandler + Validators (validación)
6. **Sexto:** PermissionChecker (autorización)
7. **Séptimo:** ViewModel actualizado
8. **Octavo:** UI Screens mejoradas
9. **Noveno:** Testeo completo

---

## 📞 CONTACTO CON EL BACKEND

**Backend Django (Auditado y Funcionando):**
- Base URL: `http://192.168.3.179:8000` (dev) / `https://api.tudominio.com` (prod)
- Documentación: `/ANDROID_API_CONTRACT.md`
- Auditoría: `/AUDIT_REPORT.md`
- Arquitectura: `/ARQUITECTURA_Y_TESTING_COMPLETO.md`

**Endpoints Principales:**
- `POST /api/token/` - Login
- `POST /api/token/refresh/` - Refrescar token
- `POST /api/descuentos/registrar_app/` - Registrar descuentos
- `GET /api/descuentos/` - Listar descuentos
- `POST /api/adelantos/registrar_app/` - Registrar adelantos
- `GET /api/adelantos/` - Listar adelantos

---

**Fin del Prompt de Corrección - Implementa todos los puntos en orden**
