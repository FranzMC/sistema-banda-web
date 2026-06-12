// Agregar esta interfaz en tu AuthApiService.kt

package com.example.sis_banda.network

import com.example.sis_banda.data.model.RefreshTokenRequest
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApiService {

    // Endpoint existente para login
    @POST("token/")
    suspend fun login(@Body loginRequest: LoginRequest): TokenResponse

    // AGREGAR ESTE NUEVO ENDPOINT:
    @POST("token/refresh/")
    suspend fun refreshToken(@Body refreshTokenRequest: RefreshTokenRequest): TokenResponse
}

// TokenResponse debería verse así (si no lo tienes):
data class TokenResponse(
    val access: String,
    val refresh: String? = null  // Solo incluido en login
)

// LoginRequest si no lo tienes:
data class LoginRequest(
    val username: String,
    val password: String
)
