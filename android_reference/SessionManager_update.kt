// Actualizar SessionManager.kt con métodos para refresh token

package com.example.sis_banda.data.local

import android.content.Context
import android.content.SharedPreferences

class SessionManager(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("session", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USERNAME = "username"
    }

    // Métodos existentes
    fun saveTokens(accessToken: String, refreshToken: String) {
        prefs.edit().apply {
            putString(KEY_ACCESS_TOKEN, accessToken)
            putString(KEY_REFRESH_TOKEN, refreshToken)
            apply()
        }
    }

    fun getAccessToken(): String? {
        return prefs.getString(KEY_ACCESS_TOKEN, null)
    }

    // AGREGAR ESTOS NUEVOS MÉTODOS:

    /**
     * Obtener el refresh token almacenado
     */
    fun getRefreshToken(): String? {
        return prefs.getString(KEY_REFRESH_TOKEN, null)
    }

    /**
     * Actualizar solo el access token (usado por TokenRefreshInterceptor)
     */
    fun saveAccessToken(accessToken: String) {
        prefs.edit().apply {
            putString(KEY_ACCESS_TOKEN, accessToken)
            apply()
        }
    }

    /**
     * Actualizar solo el refresh token
     */
    fun saveRefreshToken(refreshToken: String) {
        prefs.edit().apply {
            putString(KEY_REFRESH_TOKEN, refreshToken)
            apply()
        }
    }

    /**
     * Limpiar todos los tokens (usado cuando falla refresh o usuario hace logout)
     */
    fun logout() {
        prefs.edit().apply {
            remove(KEY_ACCESS_TOKEN)
            remove(KEY_REFRESH_TOKEN)
            remove(KEY_USER_ID)
            remove(KEY_USERNAME)
            apply()
        }
    }

    /**
     * Verificar si existe un token válido
     */
    fun isLoggedIn(): Boolean {
        return getAccessToken() != null && getRefreshToken() != null
    }

    // Métodos de usuario (existentes, si no los tienes)
    fun saveUser(userId: Int, username: String) {
        prefs.edit().apply {
            putInt(KEY_USER_ID, userId)
            putString(KEY_USERNAME, username)
            apply()
        }
    }

    fun getUsername(): String? {
        return prefs.getString(KEY_USERNAME, null)
    }
}
