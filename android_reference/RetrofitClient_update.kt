// Actualizar RetrofitClient.kt para incluir TokenRefreshInterceptor

package com.example.sis_banda.network

import android.content.Context
import com.example.sis_banda.data.local.SessionManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {
    private const val BASE_URL = "http://192.168.3.179:8000/api/"  // Cambiar por variable de entorno
    private var retrofit: Retrofit? = null
    private var authApiService: AuthApiService? = null

    fun getInstance(context: Context, sessionManager: SessionManager): Retrofit {
        if (retrofit == null) {
            val httpClient = OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)

            // AGREGAR LOGGING INTERCEPTOR
            val logging = HttpLoggingInterceptor()
            logging.level = HttpLoggingInterceptor.Level.BODY
            httpClient.addInterceptor(logging)

            // AGREGAR AUTH INTERCEPTOR (si existe - agrega token a todas las peticiones)
            httpClient.addInterceptor(AuthInterceptor(sessionManager))

            // AGREGAR TOKEN REFRESH INTERCEPTOR (el nuevo componente)
            val authService = getAuthApiService(context, sessionManager)
            httpClient.addNetworkInterceptor(TokenRefreshInterceptor(context, authService, sessionManager))

            retrofit = Retrofit.Builder()
                .baseUrl(BASE_URL)
                .addConverterFactory(GsonConverterFactory.create())
                .client(httpClient.build())
                .build()
        }
        return retrofit!!
    }

    fun getAuthApiService(context: Context, sessionManager: SessionManager): AuthApiService {
        if (authApiService == null) {
            authApiService = getInstance(context, sessionManager).create(AuthApiService::class.java)
        }
        return authApiService!!
    }

    // Método para resetear el cliente (útil si cambias de usuario)
    fun reset() {
        retrofit = null
        authApiService = null
    }
}

// AuthInterceptor existente (agrega token a header)
class AuthInterceptor(private val sessionManager: SessionManager) : okhttp3.Interceptor {
    override fun intercept(chain: okhttp3.Interceptor.Chain): okhttp3.Response {
        val originalRequest = chain.request()
        val token = sessionManager.getAccessToken()

        val newRequest = if (token != null) {
            originalRequest.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            originalRequest
        }

        return chain.proceed(newRequest)
    }
}
