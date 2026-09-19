package com.chordex.app

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.ColorDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.widget.FrameLayout
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import com.getcapacitor.BridgeActivity
import com.getcapacitor.BridgeWebChromeClient
import com.getcapacitor.JSObject
import java.io.File
import androidx.compose.ui.platform.ComposeView
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.unit.dp
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.ui.Alignment
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.ui.graphics.Brush
import androidx.compose.foundation.Image
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.foundation.background
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.runtime.*
import androidx.compose.animation.core.*
import androidx.compose.ui.draw.drawWithContent
import com.felixny.inkflow.inkReveal
import com.felixny.inkflow.InkFlowConfig
import android.view.ViewGroup
import com.kyant.backdrop.backdrops.rememberLayerBackdrop
import com.kyant.backdrop.backdrops.layerBackdrop
import com.kyant.backdrop.drawBackdrop
import com.kyant.backdrop.effects.blur
import com.kyant.backdrop.effects.lens
import com.kyant.backdrop.effects.vibrancy

class MainActivity : BridgeActivity() {

    companion object {
        @JvmField
        var lastSharedFile: JSObject? = null
        
        @Volatile
        @JvmField
        var isWebViewReady = false
    }

    private var sharedFileUriToProcess: Uri? = null

    private var navLeft by mutableFloatStateOf(0f)
    private var navTop by mutableFloatStateOf(0f)
    private var navWidth by mutableFloatStateOf(0f)
    private var navHeight by mutableFloatStateOf(0f)
    private var navVisible by mutableStateOf(false)
    private var navTheme by mutableStateOf("dark")
    private var navCornerRadius by mutableFloatStateOf(0f)

    private var pillLeft by mutableFloatStateOf(0f)
    private var pillWidth by mutableFloatStateOf(0f)
    private var pillVisible by mutableStateOf(false)

    private var floatLeft by mutableFloatStateOf(0f)
    private var floatTop by mutableFloatStateOf(0f)
    private var floatWidth by mutableFloatStateOf(0f)
    private var floatHeight by mutableFloatStateOf(0f)
    private var floatVisible by mutableStateOf(false)

    @Volatile
    private var isExclusiveVolumeMode = false

    private var activeTransitionOverlay: View? = null
    private var activeTransitionBitmap: Bitmap? = null

    private fun cleanupActiveTransition() {
        val oldOverlay = activeTransitionOverlay
        activeTransitionOverlay = null
        val oldBitmap = activeTransitionBitmap
        activeTransitionBitmap = null

        val cleanupAction = {
            if (oldOverlay != null) {
                val rootView = findViewById<FrameLayout>(android.R.id.content)
                rootView?.removeView(oldOverlay)
                if (oldOverlay is ComposeView) {
                    try {
                        oldOverlay.disposeComposition()
                    } catch (_: Exception) {}
                }
            }
            if (oldBitmap != null && !oldBitmap.isRecycled) {
                try {
                    oldBitmap.recycle()
                } catch (_: Exception) {}
            }
        }

        if (android.os.Looper.myLooper() == android.os.Looper.getMainLooper()) {
            cleanupAction()
        } else {
            runOnUiThread(cleanupAction)
        }
    }

    inner class ExclusiveVolumeBridge {
        @JavascriptInterface
        fun setExclusiveVolumeMode(enabled: Boolean) {
            isExclusiveVolumeMode = enabled
            android.util.Log.i("ExclusiveVolume", "setExclusiveVolumeMode: $enabled")
        }
    }

    inner class ThemeTransitionBridge {
        @JavascriptInterface
        fun triggerTransition(nextTheme: String, amoled: Boolean, x: Float, y: Float) {
            val themeStr = if (nextTheme == "light") "light" else if (amoled) "amoled" else "dark"
            try {
                val prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
                prefs.edit().putString("livex_theme", themeStr).apply()
            } catch (e: Exception) {
                android.util.Log.w("LivexTheme", "Failed to persist theme transition: ${e.message}")
            }
            runOnUiThread {
                runInkFlowTransition(nextTheme, amoled, x, y)
            }
        }

        @JavascriptInterface
        fun updateTheme(theme: String) {
            try {
                val prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
                prefs.edit().putString("livex_theme", theme).apply()
            } catch (e: Exception) {
                android.util.Log.w("LivexTheme", "Failed to persist updateTheme: ${e.message}")
            }
            runOnUiThread {
                applyNativeThemeColors(theme)
            }
        }
    }

    private fun getResolvedPersistedTheme(): String {
        return try {
            val prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            val savedTheme = prefs.getString("livex_theme", null)
            if (!savedTheme.isNullOrEmpty()) {
                savedTheme
            } else {
                val isSystemNight = (resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK) == android.content.res.Configuration.UI_MODE_NIGHT_YES
                if (isSystemNight) "dark" else "light"
            }
        } catch (e: Exception) {
            "light"
        }
    }

    private fun getBackgroundColorForTheme(theme: String): Int {
        return when (theme) {
            "light" -> android.graphics.Color.WHITE
            "amoled" -> android.graphics.Color.BLACK
            else -> android.graphics.Color.parseColor("#141414")
        }
    }

    private fun applyNativeThemeColors(theme: String) {
        val bgColor = getBackgroundColorForTheme(theme)
        val isLight = (theme == "light")
        try {
            window?.decorView?.setBackgroundColor(bgColor)
            window?.setBackgroundDrawable(ColorDrawable(bgColor))
            if (this.bridge != null && this.bridge.webView != null) {
                this.bridge.webView.setBackgroundColor(bgColor)
            }
            val win = window
            if (win != null) {
                val insetsController = WindowCompat.getInsetsController(win, win.decorView)
                insetsController.isAppearanceLightStatusBars = isLight
                insetsController.isAppearanceLightNavigationBars = isLight
            }
        } catch (e: Exception) {
            android.util.Log.w("LivexTheme", "Failed to apply native theme colors: ${e.message}")
        }
    }

    inner class AudioModeBridge {
        @JavascriptInterface
        fun ensureNormalMode() {
            runOnUiThread {
                volumeControlStream = android.media.AudioManager.STREAM_MUSIC
                ensureNormalAudioMode()
            }
        }
    }

    fun ensureNormalAudioMode() {
        try {
            val audioManager = getSystemService(Context.AUDIO_SERVICE) as? android.media.AudioManager
            if (audioManager != null) {
                val currentMode = audioManager.mode
                // Do not collide with an active cellular phone call
                if (currentMode != android.media.AudioManager.MODE_IN_CALL) {
                    if (currentMode != android.media.AudioManager.MODE_NORMAL) {
                        audioManager.mode = android.media.AudioManager.MODE_NORMAL
                        android.util.Log.i("LivexAudio", "Enforced AudioManager.MODE_NORMAL (previous mode: $currentMode)")
                    }
                    try {
                        audioManager.isSpeakerphoneOn = true
                    } catch (se: Exception) {
                        android.util.Log.w("LivexAudio", "Could not set isSpeakerphoneOn: ${se.message}")
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.w("LivexAudio", "Failed to enforce normal audio mode: ${e.message}")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        handleIncomingIntent(intent)

        var processStartTime: Long = 0
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            processStartTime = android.os.Process.getStartElapsedRealtime()
        }
        val onCreateTime = android.os.SystemClock.elapsedRealtime()
        android.util.Log.i("LivexBoot", "MainActivity onCreate started at " + onCreateTime + "ms since boot. Process start to onCreate gap: " + (if (processStartTime > 0) (onCreateTime - processStartTime) else "N/A") + "ms")

        val splashScreen = installSplashScreen()
        splashScreen.setKeepOnScreenCondition {
            if (isWebViewReady) {
                false
            } else if (android.os.SystemClock.elapsedRealtime() - onCreateTime > 2500) {
                false
            } else {
                true
            }
        }

        registerPlugin(AppInstallerPlugin::class.java)
        registerPlugin(NativeMediaPlugin::class.java)
        super.onCreate(savedInstanceState)
        volumeControlStream = android.media.AudioManager.STREAM_MUSIC
        ensureNormalAudioMode()
        WindowCompat.setDecorFitsSystemWindows(window, false)

        val currentTheme = getResolvedPersistedTheme()
        val initialBgColor = getBackgroundColorForTheme(currentTheme)

        window.decorView.setBackgroundColor(initialBgColor)
        window.setBackgroundDrawable(ColorDrawable(initialBgColor))
        val insetsController = WindowCompat.getInsetsController(window, window.decorView)
        insetsController.isAppearanceLightStatusBars = (currentTheme == "light")
        insetsController.isAppearanceLightNavigationBars = (currentTheme == "light")

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val window = window
                if (window != null) {
                    val layoutParams = window.attributes
                    val display = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        display
                    } else {
                        window.windowManager.defaultDisplay
                    }
                    if (display != null) {
                        val modes = display.supportedModes
                        var highestMode: android.view.Display.Mode? = null
                        var maxRate = 0f
                        for (mode in modes) {
                            if (mode.refreshRate > maxRate) {
                                maxRate = mode.refreshRate
                                highestMode = mode
                            }
                        }
                        if (highestMode != null && maxRate >= 90f) {
                            layoutParams.preferredDisplayModeId = highestMode.modeId
                            window.attributes = layoutParams
                            android.util.Log.i("LivexRefreshRate", "Configured preferred display mode: ModeId=" + highestMode.modeId + ", RefreshRate=" + maxRate + " Hz")
                        }
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("LivexRefreshRate", "Failed to configure preferred display mode: " + e.message)
            }
        }

        window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING)

        if (this.bridge != null && this.bridge.webView != null) {
            val webView = this.bridge.webView
            android.util.Log.i("LivexBoot", "WebView initialized at " + android.os.SystemClock.elapsedRealtime() + "ms since boot")
            webView.setBackgroundColor(initialBgColor)
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)
            
            webView.addJavascriptInterface(ThemeTransitionBridge(), "ThemeTransitionBridge")
            webView.addJavascriptInterface(LiquidGlassBridge(), "LiquidGlassBridge")
            webView.addJavascriptInterface(ExclusiveVolumeBridge(), "ExclusiveVolumeBridge")
            webView.addJavascriptInterface(AudioModeBridge(), "AudioModeBridge")

            val webViewInitTime = android.os.SystemClock.elapsedRealtime()
            webView.post {
                if (this.bridge != null && this.bridge.webView != null) {
                    val timingsJs = "window.__nativeBootTimings = {" +
                        "processStart: " + processStartTime + "," +
                        "onCreate: " + onCreateTime + "," +
                        "webViewInit: " + webViewInitTime +
                        "};"
                    this.bridge.webView.evaluateJavascript(timingsJs, null)

                    val transitionJs = """
                        window.__triggerThemeTransition = function(nextTheme, amoled, x, y, callback) {
                            window.__themeTransitionCallback = callback;
                            window.ThemeTransitionBridge.triggerTransition(nextTheme, amoled, x, y);
                        };
                    """.trimIndent()
                    this.bridge.webView.evaluateJavascript(transitionJs, null)
                }
            }

            webView.webChromeClient = object : BridgeWebChromeClient(this.bridge) {
                override fun onPermissionRequest(request: PermissionRequest) {
                    runOnUiThread {
                        request.grant(request.resources)
                    }
                }
            }
        }

        if (sharedFileUriToProcess != null) {
            resolveContentUri(sharedFileUriToProcess!!)
            sharedFileUriToProcess = null
        }
        handlePackageInstallerIntent(intent)
    }

    fun runInkFlowTransition(nextTheme: String, amoled: Boolean, x: Float, y: Float) {
        val webView = this.bridge?.webView ?: return
        if (webView.width <= 0 || webView.height <= 0) {
            // Background JS callback run fallback directly
            webView.evaluateJavascript("if (typeof window.__themeTransitionCallback === 'function') { window.__themeTransitionCallback(); }", null)
            return
        }

        // Cancel and recycle any existing active transition before starting a new one
        cleanupActiveTransition()

        // 1. Capture WebView bitmap at 0.5x resolution to reduce memory allocation by 75%
        // (e.g. from 10.4MB down to 2.6MB on 1080p, and from 18.4MB down to 4.6MB on 1440p)
        // using ARGB_8888 for full 32-bit color fidelity (preventing RGB_565 dark banding/alpha artifacts).
        val captureWidth = Math.max(1, webView.width / 2)
        val captureHeight = Math.max(1, webView.height / 2)

        val bitmap: Bitmap
        try {
            bitmap = Bitmap.createBitmap(captureWidth, captureHeight, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            canvas.scale(captureWidth.toFloat() / webView.width.toFloat(), captureHeight.toFloat() / webView.height.toFloat())
            webView.draw(canvas)
        } catch (e: Throwable) {
            android.util.Log.w("LivexTheme", "Failed to allocate theme transition bitmap (low memory): ${e.message}")
            webView.evaluateJavascript("if (typeof window.__themeTransitionCallback === 'function') { window.__themeTransitionCallback(); }", null)
            return
        }

        activeTransitionBitmap = bitmap

        // 2. Add ComposeView overlay
        val rootView = findViewById<FrameLayout>(android.R.id.content)
        val composeView = ComposeView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }
        activeTransitionOverlay = composeView
        rootView.addView(composeView)

        // 3. Set content with InkFlow reveal
        composeView.setContent {
            var progress by remember { mutableStateOf(0f) }

            LaunchedEffect(Unit) {
                try {
                    // Execute the JS theme change callback to update the WebView in the background
                    webView.evaluateJavascript("if (typeof window.__themeTransitionCallback === 'function') { window.__themeTransitionCallback(); }", null)

                    // Allow 40ms (approx 2 frames) for the WebView to finish background style recalculation & paint
                    // under the static screenshot overlay before running the reveal animation.
                    kotlinx.coroutines.delay(40)

                    // Run progress animation
                    animate(
                        initialValue = 0f,
                        targetValue = 1f,
                        animationSpec = tween(durationMillis = 550, easing = FastOutSlowInEasing)
                    ) { value, _ ->
                        progress = value
                    }
                } finally {
                    // Guaranteed release of native resources on completion or coroutine cancellation
                    if (activeTransitionOverlay === composeView) {
                        cleanupActiveTransition()
                    }
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer(compositingStrategy = CompositingStrategy.Offscreen)
            ) {
                Image(
                    bitmap = bitmap.asImageBitmap(),
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.FillBounds
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .inkReveal(progress = progress, config = InkFlowConfig.CENTER)
                        .drawWithContent {
                            drawRect(
                                color = Color.Black,
                                blendMode = BlendMode.DstOut
                            )
                        }
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        
        val targetUri = extractTargetUri(intent)
        if (targetUri != null) {
            resolveContentUri(targetUri)
        }
        handlePackageInstallerIntent(intent)
        handleThemeIntent(intent)
    }

    private fun handleThemeIntent(intent: Intent?) {
        val themeArg = intent?.getStringExtra("theme")
        val safeTheme = when (themeArg?.lowercase(java.util.Locale.ROOT)) {
            "light" -> "light"
            "dark" -> "dark"
            "amoled" -> "amoled"
            "system" -> "system"
            else -> null
        } ?: return

        runOnUiThread {
            navTheme = safeTheme
            val js = when (safeTheme) {
                "light" -> "window.dispatchEvent(new CustomEvent('studio-set-theme', { detail: { theme: 'light' } }));"
                "dark" -> "window.dispatchEvent(new CustomEvent('studio-set-theme', { detail: { theme: 'dark' } }));"
                "amoled" -> "window.dispatchEvent(new CustomEvent('studio-set-theme', { detail: { theme: 'amoled' } }));"
                "system" -> "window.dispatchEvent(new CustomEvent('studio-set-theme', { detail: { theme: 'system' } }));"
                else -> return@runOnUiThread
            }
            this.bridge?.webView?.evaluateJavascript(js, null)
        }
    }

    private fun handlePackageInstallerIntent(intent: Intent?) {
        if (intent == null) return
        val action = intent.action
        if ("com.chordex.app.SESSION_API_PACKAGE_INSTALLED" == action) {
            android.util.Log.i("MainActivity", "[INSTRUMENTATION] [NATIVE] Intercepted PackageInstaller intent in MainActivity: action=$action")
            InstallReceiver().onReceive(this, intent)
        }
    }

    private fun isSafeUri(uri: Uri?): Boolean {
        return SafeContentResolver.isSafeUri(this, uri)
    }

    private fun extractTargetUri(intent: Intent?): Uri? {
        if (intent == null) return null
        val action = intent.action
        var targetUri: Uri? = null

        if (Intent.ACTION_VIEW == action && intent.data != null) {
            val data = intent.data
            if (data != null && SafeContentResolver.isSafeUri(this, data)) {
                intent.data = null // Prevent BridgeActivity from loading this file path directly as a webpage
                intent.action = Intent.ACTION_MAIN
                targetUri = data
            }
        } else if (Intent.ACTION_SEND == action && intent.type != null) {
            val streamUri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
            if (streamUri != null && SafeContentResolver.isSafeUri(this, streamUri)) {
                intent.action = Intent.ACTION_MAIN
                intent.removeExtra(Intent.EXTRA_STREAM)
                targetUri = streamUri
            }
        }
        return targetUri
    }

    private fun handleIncomingIntent(intent: Intent?) {
        val targetUri = extractTargetUri(intent)
        if (targetUri != null) {
            sharedFileUriToProcess = targetUri
        }
    }

    private fun resolveContentUri(uri: Uri) {
        if (!SafeContentResolver.isSafeUri(this, uri)) {
            android.util.Log.w("MainActivity", "Access to internal or unsafe content URI blocked: $uri")
            return
        }

        try {
            val fileName = SafeContentResolver.getSafeDisplayName(this, uri)
            val mimeType = SafeContentResolver.getSafeMimeType(this, uri) ?: ""

            val fileObj = JSObject()
            fileObj.put("fileName", fileName)

            if (fileName.endsWith(".json", ignoreCase = true) || mimeType.contains("json", ignoreCase = true)) {
                val jsonContent = SafeContentResolver.readSafeTextContent(this, uri) ?: return

                fileObj.put("type", "json")
                fileObj.put("data", jsonContent)
            } else {
                val tempFile = SafeContentResolver.copySafeStreamToCache(this, uri, fileName)
                val filePath = tempFile.absolutePath
                fileObj.put("type", "audio")
                fileObj.put("data", filePath)
            }
            lastSharedFile = fileObj
            AppInstallerPlugin.instance?.emitSharedFileReceived(fileObj)
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Failed to process shared file: " + e.message)
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
        }
    }

    inner class LiquidGlassBridge {
        @android.webkit.JavascriptInterface
        fun updatePosition(left: Float, top: Float, width: Float, height: Float, visible: Boolean, theme: String, cornerRadius: Float) {
            android.util.Log.i("LiquidGlass", "updatePosition: left=$left, top=$top, w=$width, h=$height, vis=$visible, theme=$theme, rad=$cornerRadius")
            runOnUiThread {
                navLeft = left
                navTop = top
                navWidth = width
                navHeight = height
                navVisible = visible
                navTheme = theme
                navCornerRadius = cornerRadius
            }
        }

        @android.webkit.JavascriptInterface
        fun updatePillPosition(left: Float, width: Float, visible: Boolean) {
            android.util.Log.i("LiquidGlass", "updatePillPosition: left=$left, width=$width, vis=$visible")
            runOnUiThread {
                pillLeft = left
                pillWidth = width
                pillVisible = visible
            }
        }

        @android.webkit.JavascriptInterface
        fun updateFloatingButtonPosition(left: Float, top: Float, width: Float, height: Float, visible: Boolean) {
            android.util.Log.i("LiquidGlass", "updateFloatingButtonPosition: left=$left, top=$top, w=$width, h=$height, vis=$visible")
            runOnUiThread {
                floatLeft = left
                floatTop = top
                floatWidth = width
                floatHeight = height
                floatVisible = visible
            }
        }
    }

    override fun onStart() {
        super.onStart()
        AppInstallerPlugin.logNativeInstrumentation(this, "MainActivity", -1, "onStart", "MainActivity entered onStart")
    }

    override fun onResume() {
        super.onResume()
        volumeControlStream = android.media.AudioManager.STREAM_MUSIC
        ensureNormalAudioMode()
        AppInstallerPlugin.logNativeInstrumentation(this, "MainActivity", -1, "onResume", "MainActivity entered onResume")
    }

    override fun onPause() {
        super.onPause()
        isExclusiveVolumeMode = false
        AppInstallerPlugin.logNativeInstrumentation(this, "MainActivity", -1, "onPause", "MainActivity entered onPause")
    }

    override fun onStop() {
        super.onStop()
        isExclusiveVolumeMode = false
        cleanupActiveTransition()
        AppInstallerPlugin.logNativeInstrumentation(this, "MainActivity", -1, "onStop", "MainActivity entered onStop")
    }

    override fun onDestroy() {
        super.onDestroy()
        isExclusiveVolumeMode = false
        cleanupActiveTransition()
        AppInstallerPlugin.logNativeInstrumentation(this, "MainActivity", -1, "onDestroy", "MainActivity entered onDestroy")
    }

    override fun onKeyDown(keyCode: Int, event: android.view.KeyEvent?): Boolean {
        if (isExclusiveVolumeMode) {
            if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP) {
                runOnUiThread {
                    this.bridge?.webView?.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('metronome-volume-key', { detail: { direction: 'up' } }));",
                        null
                    )
                }
                return true
            } else if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_DOWN) {
                runOnUiThread {
                    this.bridge?.webView?.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('metronome-volume-key', { detail: { direction: 'down' } }));",
                        null
                    )
                }
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onKeyUp(keyCode: Int, event: android.view.KeyEvent?): Boolean {
        if (isExclusiveVolumeMode && (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP || keyCode == android.view.KeyEvent.KEYCODE_VOLUME_DOWN)) {
            return true
        }
        return super.onKeyUp(keyCode, event)
    }
}
