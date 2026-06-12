package com.example.sis_banda.network

import android.content.Context
import com.example.sis_banda.data.model.RefreshTokenRequest
import com.example.sis_banda.data.local.SessionManager
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import timber.log.Timber

class TokenRefreshInterceptor(
    private val context: Context,
    private val authApiService: AuthApiService,
    private val sessionManager: SessionManager
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val response = chain.proceed(originalRequest)

        // Si la respuesta es 401 (No autorizado), intentar renovar el token
        if (response.code == 401) {
            synchronized(this) {
                // Obtener el refresh token
                val refreshToken = sessionManager.getRefreshToken()

                if (refreshToken != null) {
                    try {
                        // Intentar renovar el token de forma síncrona
                        val newTokenResponse = runBlocking {
                            authApiService.refreshToken(RefreshTokenRequest(refresh = refreshToken))
                        }

                        // Guardar el nuevo access token
                        sessionManager.saveAccessToken(newTokenResponse.access)
                        response.close()

                        // Reintentar la petición original con el nuevo token
                        val newRequest = originalRequest.newBuilder()
                            .header("Authorization", "Bearer ${newTokenResponse.access}")
                            .build()

                        return chain.proceed(newRequest)
                    } catch (e: Exception) {
                        Timber.e(e, "Error refreshing token")
                        // Si falla la renovación, limpiar tokens y redirigir a login
                        sessionManager.logout()
                        response.close()
                    }
                } else {
                    // Sin refresh token, limpiar y redirigir a login
                    sessionManager.logout()
                }
            }
        }

        return response
    }
}
