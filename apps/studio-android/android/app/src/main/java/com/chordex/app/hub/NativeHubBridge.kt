package com.chordex.app.hub

import android.webkit.JavascriptInterface
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class NativeHubState(
    val isVisible: Boolean = true,
    val currentRoute: String = "/app",
    val activeApp: String = "hub",
    val theme: String = "dark",
    val language: String = "en",
    val userName: String = "Musician",
    val userEmail: String = "",
    val isQuickActionsOpen: Boolean = false,
    val isLanguageMenuOpen: Boolean = false
)

class NativeHubBridge(
    private val onNavigateToWeb: (appKey: String) -> Unit,
    private val onThemeChangedInNative: (theme: String) -> Unit,
    private val onLanguageChangedInNative: (lang: String) -> Unit
) {
    private val _state = MutableStateFlow(NativeHubState())
    val state: StateFlow<NativeHubState> = _state.asStateFlow()

    @JavascriptInterface
    fun updateHubVisibility(visible: Boolean, activeApp: String) {
        _state.value = _state.value.copy(
            isVisible = visible,
            activeApp = activeApp
        )
    }

    @JavascriptInterface
    fun updateTheme(theme: String) {
        _state.value = _state.value.copy(theme = theme)
    }

    @JavascriptInterface
    fun updateLanguage(language: String) {
        _state.value = _state.value.copy(language = language)
    }

    @JavascriptInterface
    fun updateUserProfile(userName: String, userEmail: String) {
        _state.value = _state.value.copy(
            userName = if (userName.isNotBlank()) userName else "Musician",
            userEmail = userEmail
        )
    }

    fun navigateTo(appKey: String) {
        _state.value = _state.value.copy(
            isVisible = false,
            activeApp = appKey,
            isQuickActionsOpen = false,
            isLanguageMenuOpen = false
        )
        onNavigateToWeb(appKey)
    }

    fun toggleTheme() {
        val current = _state.value.theme
        val next = when (current.lowercase()) {
            "dark" -> "amoled"
            "amoled" -> "light"
            else -> "dark"
        }
        _state.value = _state.value.copy(theme = next)
        onThemeChangedInNative(next)
    }

    fun setLanguage(lang: String) {
        _state.value = _state.value.copy(language = lang, isLanguageMenuOpen = false)
        onLanguageChangedInNative(lang)
    }

    fun setQuickActionsOpen(open: Boolean) {
        _state.value = _state.value.copy(isQuickActionsOpen = open)
    }

    fun setLanguageMenuOpen(open: Boolean) {
        _state.value = _state.value.copy(isLanguageMenuOpen = open)
    }

    fun handleBackPressed(): Boolean {
        if (_state.value.isQuickActionsOpen) {
            _state.value = _state.value.copy(isQuickActionsOpen = false)
            return true
        }
        if (_state.value.isLanguageMenuOpen) {
            _state.value = _state.value.copy(isLanguageMenuOpen = false)
            return true
        }
        return false
    }
}
