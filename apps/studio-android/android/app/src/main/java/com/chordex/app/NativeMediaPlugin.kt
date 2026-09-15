package com.chordex.app

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "NativeMediaSession")
class NativeMediaPlugin : Plugin() {

    companion object {
        private const val TAG = "NativeMediaPlugin"

        @Volatile
        var instance: NativeMediaPlugin? = null
            private set

        fun dispatchMediaAction(action: String, value: Long? = null) {
            instance?.let { plugin ->
                val data = JSObject()
                data.put("action", action)
                if (value != null) {
                    if (action == "seek") {
                        data.put("position", value)
                    } else if (action == "skipForward" || action == "skipBackward") {
                        data.put("seconds", value)
                    }
                }
                plugin.notifyListeners("mediaAction", data)
                Log.d(TAG, "Notified JS of media action: $action, value: $value")
            } ?: Log.w(TAG, "dispatchMediaAction called but plugin instance is null")
        }
    }

    override fun load() {
        super.load()
        instance = this
        Log.i(TAG, "NativeMediaPlugin loaded.")
    }

    private fun ensureService(): MediaNotificationService? {
        val current = MediaNotificationService.instance
        if (current != null) return current

        val ctx = context ?: return null
        val intent = Intent(ctx, MediaNotificationService::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(intent)
            } else {
                ctx.startService(intent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start MediaNotificationService: ${e.message}", e)
        }
        return MediaNotificationService.instance
    }

    @PluginMethod
    fun updateMetadata(call: PluginCall) {
        val title = call.getString("title") ?: ""
        val artist = call.getString("artist") ?: ""
        val album = call.getString("album") ?: ""
        val durationMs = call.getLong("duration") ?: 0L
        val artworkUrl = call.getString("artworkUrl")

        val service = MediaNotificationService.instance
        if (service != null) {
            service.updateMetadata(title, artist, album, durationMs, artworkUrl)
        } else {
            MediaNotificationService.pendingMetadata = MetadataPayload(
                title = title,
                artist = artist,
                album = album,
                durationMs = durationMs,
                artworkUrl = artworkUrl
            )
        }
        call.resolve()
    }

    @PluginMethod
    fun updatePlaybackState(call: PluginCall) {
        val state = call.getString("state") ?: "none"
        val positionMs = call.getLong("position") ?: 0L
        val speed = call.getFloat("speed") ?: 1.0f

        val isPlaying = state.equals("playing", ignoreCase = true)
        var service = MediaNotificationService.instance
        if (service == null && isPlaying) {
            service = ensureService()
        }

        if (service != null) {
            service.updatePlaybackState(state, positionMs, speed)
        } else {
            MediaNotificationService.pendingPlaybackState = PlaybackStatePayload(
                state = state,
                positionMs = positionMs,
                speed = speed
            )
        }
        call.resolve()
    }

    @PluginMethod
    fun stopSession(call: PluginCall) {
        MediaNotificationService.pendingMetadata = null
        MediaNotificationService.pendingPlaybackState = null
        MediaNotificationService.instance?.stopForegroundService()
        call.resolve()
    }
}
