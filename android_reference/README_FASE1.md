# FASE 1 - Android: Implementación de Token Refresh

Esta carpeta contiene los componentes necesarios para implementar el sistema automático de renovación de tokens JWT en tu app Android.

## 📋 Archivos a integrar

### 1. **RefreshTokenRequest.kt** (NUEVO)
Data class que envuelve el refresh token para el endpoint `/api/token/refresh/`

**Ubicación:** `data/model/RefreshTokenRequest.kt`
**Acción:** Copiar tal cual

---

### 2. **TokenRefreshInterceptor.kt** (NUEVO)
Interceptor de OkHttp que:
- Detecta respuestas 401 (No autorizado)
- Obtiene el refresh token de SharedPreferences
- Llama a `/api/token/refresh/` para obtener nuevo access token
- Reintentar la petición original con el nuevo token
- Si falla, limpiar tokens y redirigir a login

**Ubicación:** `network/TokenRefreshInterceptor.kt`
**Acción:** Copiar, actualizar imports según tu package name
**Dependencias:** 
- Timber (para logging) - opcional
- SessionManager (tu gestor de preferencias)
- AuthApiService (tu interfaz Retrofit)

---

### 3. **AuthApiService_update.kt** (ACTUALIZAR)
Agrega el nuevo endpoint al final de tu interfaz AuthApiService:

```kotlin
@POST("token/refresh/")
suspend fun refreshToken(@Body refreshTokenRequest: RefreshTokenRequest): TokenResponse
```

**Ubicación:** Tu archivo `network/AuthApiService.kt`
**Acción:** Agregar el método refreshToken() al final

---

### 4. **RetrofitClient_update.kt** (ACTUALIZAR)
Muestra cómo registrar el TokenRefreshInterceptor en OkHttpClient

**Cambios clave:**
```kotlin
// En getInstance(), agregar esta línea en httpClient:
val authService = getAuthApiService(context, sessionManager)
httpClient.addNetworkInterceptor(TokenRefreshInterceptor(context, authService, sessionManager))
```

**Ubicación:** Tu archivo `network/RetrofitClient.kt`
**Acción:** Integrar el interceptor en la cadena de OkHttp

---

### 5. **SessionManager_update.kt** (ACTUALIZAR)
Agrega métodos para gestionar refresh tokens:

**Nuevos métodos a agregar:**
- `getRefreshToken()` - obtener refresh token
- `saveAccessToken(token)` - actualizar solo access token
- `logout()` - limpiar todos los tokens
- `isLoggedIn()` - verificar si está autenticado

**Ubicación:** Tu archivo `data/local/SessionManager.kt`
**Acción:** Agregar estos métodos

---

## 🔄 Flujo de funcionamiento

```
┌─────────────────┐
│ Petición HTTP   │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ AuthInterceptor      │  (Agrega token al header)
│ (Existente)          │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Petición al servidor │
└────────┬─────────────┘
         │
     ┌───┴───┐
     │ ¿401? │
     └───┬───┘
         │
    NO   │    SÍ
    ┌────┘    ┌──────────────────────┐
    │         │TokenRefreshInterceptor│
    │         │ 1. Obtener refresh   │
    │         │ 2. POST /token/refresh│
    │         │ 3. Guardar new token │
    │         │ 4. Reintentar request│
    │         └──────┬───────────────┘
    │                │
    │            ┌───┴───┐
    │            │¿Éxito?│
    │            └───┬───┘
    │                │
    │    SÍ          │    NO
    │    ┌───────────┘    ┌──────────────┐
    │    │                │ logout()     │
    │    │                │ Ir a Login   │
    │    │                └──────────────┘
    │    │
    ▼    ▼
┌─────────────────┐
│ Respuesta 200   │
└─────────────────┘
```

---

## ✅ Pasos de integración

1. **Copiar RefreshTokenRequest.kt** a tu carpeta `data/model/`

2. **Copiar TokenRefreshInterceptor.kt** a tu carpeta `network/`

3. **Editar AuthApiService.kt** - Agregar método `refreshToken()`

4. **Editar RetrofitClient.kt** - Registrar el interceptor:
   ```kotlin
   val authService = getAuthApiService(context, sessionManager)
   httpClient.addNetworkInterceptor(TokenRefreshInterceptor(context, authService, sessionManager))
   ```

5. **Editar SessionManager.kt** - Agregar los 5 nuevos métodos

6. **Importaciones** - Asegurar que tus imports usen tu package name (ej: `com.tuempresa.sis_banda`)

7. **Probar** - Hacer login, esperar a que expire el token, hacer una petición y verificar que se renueve automáticamente

---

## 🧪 Cómo probar

1. **Con token válido:** Hacer login y peticiones normales funcionan
2. **Simular expiración:** Cambiar el ACCESS_TOKEN en SharedPreferences a un token inválido
3. **Verificar renovación:** Hacer una petición - debería renovarse automáticamente
4. **Sin refresh token:** Eliminar el REFRESH_TOKEN y hacer una petición - debería ir a Login

---

## ⚙️ Configuración importante

### Variables de entorno
En tu `RetrofitClient.kt`, cambiar:
```kotlin
private const val BASE_URL = "http://192.168.3.179:8000/api/"
```

Por variable de entorno o BuildConfig:
```kotlin
private const val BASE_URL = BuildConfig.API_BASE_URL
```

En `build.gradle`:
```gradle
buildTypes {
    debug {
        buildConfigField "String", "API_BASE_URL", '"http://localhost:8000/api/"'
    }
    release {
        buildConfigField "String", "API_BASE_URL", '"https://tu-api-produccion.com/api/"'
    }
}
```

---

## 📝 Notas importantes

- El `TokenRefreshInterceptor` se registra como `addNetworkInterceptor()` (red), no `addInterceptor()` (aplicación)
- Se usa `synchronized(this)` para evitar múltiples renovaciones simultáneas
- Se usa `runBlocking` para convertir la corrutina en llamada síncrona dentro del interceptor
- El interceptor solo renueva UNA vez por petición (evita bucles infinitos)

---

## 🔗 Endpoints necesarios (Backend)

✅ **YA CONFIGURADO** en Django:
- `POST /api/token/` - Login
- `POST /api/token/refresh/` - Renovar access token

No necesita cambios adicionales en el backend.

---

## ❓ Troubleshooting

**Q: El token nunca se renueva**
A: Verificar que TokenRefreshInterceptor esté registrado en RetrofitClient

**Q: Bucle infinito de renovación**
A: El interceptor solo renueva UNA vez (catch block previene bucles)

**Q: Falla al refrescar pero no va a login**
A: Verificar que `sessionManager.logout()` esté siendo llamado

**Q: Interceptor no funciona en producción**
A: Verificar que BASE_URL sea correcta en BuildConfig

---

## 📱 Versión recomendada

- Kotlin: 1.9+
- Retrofit: 2.9+
- OkHttp: 4.10+
- Min SDK: 21+

---

**¿Dudas? Pregunta y ajustamos los componentes** 👌
