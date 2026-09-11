package com.chordex.app.hub

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class ModuleCardData(
    val key: String,
    val title: String,
    val subtitle: String,
    val accentColor: Color,
    val icon: ImageVector,
    val badge: String
)

@Composable
fun NativeHubView(
    bridge: NativeHubBridge,
    modifier: Modifier = Modifier
) {
    val state by bridge.state.collectAsState()
    val colors = LocalLivexColors.current

    val modules = remember {
        listOf(
            ModuleCardData(
                key = "chordex",
                title = "Chordex",
                subtitle = "Voicings, Assistant & Tuning",
                accentColor = Color(0xFFA855F7),
                icon = Icons.Default.MusicNote,
                badge = "HARMONY"
            ),
            ModuleCardData(
                key = "drumex",
                title = "Drumex",
                subtitle = "Pattern Sequencer & Drum Kits",
                accentColor = Color(0xFFEC4899),
                icon = Icons.Default.PlayArrow,
                badge = "RHYTHM"
            ),
            ModuleCardData(
                key = "stagex",
                title = "Stagex",
                subtitle = "Stage Canvas & Live Rig",
                accentColor = Color(0xFF3B82F6),
                icon = Icons.Default.GridView,
                badge = "LIVE"
            ),
            ModuleCardData(
                key = "groovex",
                title = "Groovex",
                subtitle = "Multi-Track Stem Player",
                accentColor = Color(0xFF10B981),
                icon = Icons.Default.GraphicEq,
                badge = "STEMS"
            ),
            ModuleCardData(
                key = "vocalex",
                title = "Vocalex",
                subtitle = "Vocal Pitch Lab & Takes",
                accentColor = Color(0xFFF59E0B),
                icon = Icons.Default.Mic,
                badge = "VOCALS"
            )
        )
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(colors.background)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
        ) {
            // Top Header Bar
            HubHeaderBar(
                userName = state.userName,
                currentTheme = state.theme,
                currentLang = state.language,
                onToggleTheme = { bridge.toggleTheme() },
                onToggleLanguage = { bridge.setLanguageMenuOpen(!state.isLanguageMenuOpen) }
            )

            // Scrollable Content Body
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Morphing Quick Actions Trigger Surface
                item {
                    MorphingQuickActionsSection(
                        isOpen = state.isQuickActionsOpen,
                        onOpenChange = { bridge.setQuickActionsOpen(it) },
                        onNavigate = { bridge.navigateTo(it) }
                    )
                }

                // Section Title
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 2.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "CREATIVE MODULES",
                            color = colors.textSecondary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.2.sp
                        )
                        Text(
                            text = "5 ACTIVE",
                            color = colors.brandAccent,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                // Module Cards
                items(modules.size) { index ->
                    val module = modules[index]
                    ModuleCardItem(
                        module = module,
                        onClick = { bridge.navigateTo(module.key) }
                    )
                }

                // Bottom Padding spacer so items clear the navigation dock
                item {
                    Spacer(modifier = Modifier.height(96.dp))
                }
            }
        }

        // Native Bottom Navigation Dock
        NativeBottomNavDock(
            activeApp = state.activeApp,
            onSelectApp = { appKey ->
                if (appKey != "hub") {
                    bridge.navigateTo(appKey)
                }
            },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = 12.dp)
        )

        // Morphing Language Dialog Overlay
        if (state.isLanguageMenuOpen) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.6f))
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) { bridge.setLanguageMenuOpen(false) },
                contentAlignment = Alignment.Center
            ) {
                LanguageSelectionSurface(
                    currentLang = state.language,
                    onSelect = { bridge.setLanguage(it) },
                    onClose = { bridge.setLanguageMenuOpen(false) }
                )
            }
        }
    }
}

@Composable
private fun HubHeaderBar(
    userName: String,
    currentTheme: String,
    currentLang: String,
    onToggleTheme: () -> Unit,
    onToggleLanguage: () -> Unit
) {
    val colors = LocalLivexColors.current

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // App Title and User Greeting
        Column {
            Text(
                text = "LIVEX STUDIO",
                color = colors.textPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 0.5.sp
            )
            Text(
                text = "Welcome, $userName",
                color = colors.textSecondary,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium
            )
        }

        // Top Action Controls
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Language Picker Pill
            Surface(
                onClick = onToggleLanguage,
                shape = CircleShape,
                color = colors.surfaceCard,
                border = BorderStroke(1.dp, colors.border),
                modifier = Modifier.height(34.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Language,
                        contentDescription = "Language",
                        tint = colors.textSecondary,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = currentLang.uppercase(),
                        color = colors.textPrimary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Theme Toggle Button
            Surface(
                onClick = onToggleTheme,
                shape = CircleShape,
                color = colors.surfaceCard,
                border = BorderStroke(1.dp, colors.border),
                modifier = Modifier.size(34.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    val themeIcon = when (currentTheme.lowercase()) {
                        "light" -> Icons.Default.LightMode
                        "amoled" -> Icons.Default.Contrast
                        else -> Icons.Default.DarkMode
                    }
                    Icon(
                        imageVector = themeIcon,
                        contentDescription = "Theme: $currentTheme",
                        tint = if (colors.isAmoled) Color.White else colors.brandAccent,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun MorphingQuickActionsSection(
    isOpen: Boolean,
    onOpenChange: (Boolean) -> Unit,
    onNavigate: (String) -> Unit
) {
    val colors = LocalLivexColors.current

    Surface(
        shape = RoundedCornerShape(20.dp),
        color = colors.surfaceCard,
        border = BorderStroke(1.dp, colors.border),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(colors.brandAccent.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.FlashOn,
                            contentDescription = null,
                            tint = colors.brandAccent,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    Text(
                        text = "Quick Actions",
                        color = colors.textPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Morphing Toggle Button
                Surface(
                    onClick = { onOpenChange(!isOpen) },
                    shape = CircleShape,
                    color = if (isOpen) colors.brandAccent else colors.surface,
                    border = BorderStroke(1.dp, colors.border),
                    modifier = Modifier.height(28.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = if (isOpen) Icons.Default.Close else Icons.Default.Add,
                            contentDescription = null,
                            tint = if (isOpen) Color.White else colors.textPrimary,
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = if (isOpen) "Close" else "Expand",
                            color = if (isOpen) Color.White else colors.textPrimary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            AnimatedVisibility(
                visible = isOpen,
                enter = fadeIn() + expandVertically(animationSpec = spring(dampingRatio = 0.8f, stiffness = 400f)),
                exit = fadeOut() + shrinkVertically(animationSpec = spring(dampingRatio = 0.8f, stiffness = 400f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    QuickActionItem(
                        icon = Icons.Default.MusicNote,
                        title = "New Chord Progression",
                        subtitle = "Launch Chordex Assistant",
                        color = Color(0xFFA855F7),
                        onClick = { onNavigate("chordex") }
                    )
                    QuickActionItem(
                        icon = Icons.Default.PlayArrow,
                        title = "Program New Beat",
                        subtitle = "Open Drumex Sequencer",
                        color = Color(0xFFEC4899),
                        onClick = { onNavigate("drumex") }
                    )
                    QuickActionItem(
                        icon = Icons.Default.Mic,
                        title = "Record Vocal Take",
                        subtitle = "Open Vocalex Pitch Lab",
                        color = Color(0xFFF59E0B),
                        onClick = { onNavigate("vocalex") }
                    )
                }
            }
        }
    }
}

@Composable
private fun QuickActionItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    color: Color,
    onClick: () -> Unit
) {
    val colors = LocalLivexColors.current

    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = colors.surface,
        border = BorderStroke(1.dp, colors.border),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(color.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(16.dp)
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    color = colors.textPrimary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = subtitle,
                    color = colors.textSecondary,
                    fontSize = 11.sp
                )
            }
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = colors.textSecondary,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

@Composable
private fun ModuleCardItem(
    module: ModuleCardData,
    onClick: () -> Unit
) {
    val colors = LocalLivexColors.current
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()

    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.97f else 1.0f,
        animationSpec = spring(stiffness = 500f, dampingRatio = 0.75f),
        label = "card_scale"
    )

    Surface(
        onClick = onClick,
        interactionSource = interactionSource,
        shape = RoundedCornerShape(22.dp),
        color = colors.surfaceCard,
        border = BorderStroke(
            1.dp,
            if (colors.isAmoled) Color(0x30FFFFFF) else colors.border
        ),
        modifier = Modifier
            .fillMaxWidth()
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Module Icon with Glow Background
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(module.accentColor.copy(alpha = 0.18f))
                    .border(1.dp, module.accentColor.copy(alpha = 0.35f), RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = module.icon,
                    contentDescription = module.title,
                    tint = module.accentColor,
                    modifier = Modifier.size(24.dp)
                )
            }

            // Title, Subtitle, and Badge
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = module.title,
                        color = colors.textPrimary,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Surface(
                        shape = CircleShape,
                        color = module.accentColor.copy(alpha = 0.15f),
                        modifier = Modifier.height(18.dp)
                    ) {
                        Text(
                            text = module.badge,
                            color = module.accentColor,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
                Text(
                    text = module.subtitle,
                    color = colors.textSecondary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }

            // Chevron Icon
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = colors.textSecondary,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

@Composable
private fun NativeBottomNavDock(
    activeApp: String,
    onSelectApp: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = LocalLivexColors.current

    val navItems = remember {
        listOf(
            Triple("hub", "Hub", Icons.Default.Home),
            Triple("chordex", "Chords", Icons.Default.MusicNote),
            Triple("drumex", "Drums", Icons.Default.PlayArrow),
            Triple("stagex", "Stage", Icons.Default.GridView),
            Triple("groovex", "Groove", Icons.Default.GraphicEq),
            Triple("vocalex", "Vocals", Icons.Default.Mic)
        )
    }

    Surface(
        shape = RoundedCornerShape(32.dp),
        color = if (colors.isAmoled) Color(0xFF0C0C0E) else colors.surfaceCard,
        border = BorderStroke(1.dp, colors.border),
        shadowElevation = 8.dp,
        modifier = modifier
            .padding(horizontal = 16.dp)
            .height(56.dp)
    ) {
        Row(
            modifier = Modifier
                .padding(horizontal = 8.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            navItems.forEach { (key, label, icon) ->
                val isSelected = activeApp == key
                val activeColor = when (key) {
                    "chordex" -> Color(0xFFA855F7)
                    "drumex" -> Color(0xFFEC4899)
                    "stagex" -> Color(0xFF3B82F6)
                    "groovex" -> Color(0xFF10B981)
                    "vocalex" -> Color(0xFFF59E0B)
                    else -> colors.brandAccent
                }

                Surface(
                    onClick = { onSelectApp(key) },
                    shape = CircleShape,
                    color = if (isSelected) activeColor.copy(alpha = 0.18f) else Color.Transparent,
                    modifier = Modifier.height(40.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = label,
                            tint = if (isSelected) activeColor else colors.textSecondary,
                            modifier = Modifier.size(18.dp)
                        )
                        if (isSelected) {
                            Text(
                                text = label,
                                color = activeColor,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LanguageSelectionSurface(
    currentLang: String,
    onSelect: (String) -> Unit,
    onClose: () -> Unit
) {
    val colors = LocalLivexColors.current

    val languages = remember {
        listOf(
            Pair("en", "English"),
            Pair("es", "Español"),
            Pair("de", "Deutsch"),
            Pair("fr", "Français"),
            Pair("pt", "Português"),
            Pair("it", "Italiano"),
            Pair("ja", "日本語"),
            Pair("ko", "한국어")
        )
    }

    Surface(
        shape = RoundedCornerShape(24.dp),
        color = colors.surfaceCard,
        border = BorderStroke(1.dp, colors.border),
        modifier = Modifier
            .fillMaxWidth(0.85f)
            .padding(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Select Language",
                    color = colors.textPrimary,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                IconButton(onClick = onClose, modifier = Modifier.size(24.dp)) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close",
                        tint = colors.textSecondary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            HorizontalDivider(color = colors.border, thickness = 1.dp)

            languages.forEach { (code, name) ->
                val isSelected = currentLang == code
                Surface(
                    onClick = { onSelect(code) },
                    shape = RoundedCornerShape(10.dp),
                    color = if (isSelected) colors.brandAccent.copy(alpha = 0.15f) else Color.Transparent,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = name,
                            color = if (isSelected) colors.brandAccent else colors.textPrimary,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            fontSize = 14.sp
                        )
                        if (isSelected) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                tint = colors.brandAccent,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
