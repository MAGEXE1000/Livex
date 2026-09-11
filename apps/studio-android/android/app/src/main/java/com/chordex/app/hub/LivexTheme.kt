package com.chordex.app.hub

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

data class LivexColors(
    val background: Color,
    val surface: Color,
    val surfaceCard: Color,
    val border: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val accentChordex: Color = Color(0xFFA855F7),
    val accentDrumex: Color = Color(0xFFEC4899),
    val accentStagex: Color = Color(0xFF3B82F6),
    val accentGroovex: Color = Color(0xFF10B981),
    val accentVocalex: Color = Color(0xFFF59E0B),
    val brandAccent: Color = Color(0xFF6366F1),
    val isAmoled: Boolean = false
)

val DarkLivexColors = LivexColors(
    background = Color(0xFF141418),
    surface = Color(0xFF1E1E24),
    surfaceCard = Color(0xFF262630),
    border = Color(0x20FFFFFF),
    textPrimary = Color(0xFFFAFAFA),
    textSecondary = Color(0xFF94A3B8),
    isAmoled = false
)

val LightLivexColors = LivexColors(
    background = Color(0xFFF8F9FC),
    surface = Color(0xFFFFFFFF),
    surfaceCard = Color(0xFFF1F3F7),
    border = Color(0x18000000),
    textPrimary = Color(0xFF0F172A),
    textSecondary = Color(0xFF64748B),
    isAmoled = false
)

val AmoledLivexColors = LivexColors(
    background = Color(0xFF000000),
    surface = Color(0xFF000000),
    surfaceCard = Color(0xFF08080A),
    border = Color(0x35FFFFFF),
    textPrimary = Color(0xFFFFFFFF),
    textSecondary = Color(0xFFA1A1AA),
    isAmoled = true
)

val LocalLivexColors = staticCompositionLocalOf { DarkLivexColors }

@Composable
fun LivexTheme(
    theme: String = "dark", // "dark", "light", "amoled"
    content: @Composable () -> Unit
) {
    val livexColors = when (theme.lowercase()) {
        "light" -> LightLivexColors
        "amoled" -> AmoledLivexColors
        else -> DarkLivexColors
    }

    val materialColors = if (theme.lowercase() == "light") {
        lightColorScheme(
            background = livexColors.background,
            surface = livexColors.surface,
            primary = livexColors.brandAccent,
            onBackground = livexColors.textPrimary,
            onSurface = livexColors.textPrimary
        )
    } else {
        darkColorScheme(
            background = livexColors.background,
            surface = livexColors.surface,
            primary = livexColors.brandAccent,
            onBackground = livexColors.textPrimary,
            onSurface = livexColors.textPrimary
        )
    }

    CompositionLocalProvider(LocalLivexColors provides livexColors) {
        MaterialTheme(
            colorScheme = materialColors,
            content = content
        )
    }
}
