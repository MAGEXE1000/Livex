package com.chordex.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.os.Build
import android.os.IBinder
import android.os.SystemClock
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.util.Base64
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.media.app.NotificationCompat.MediaStyle
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

data class MetadataPayload(
    val title: String,
    val artist: String,
    val album: String,
    val durationMs: Long,
    val artworkUrl: String?
)

data class PlaybackStatePayload(
    val state: String,
    val positionMs: Long,
    val speed: Float
)

class MediaNotificationService : Service() {

    companion object {
        private const val TAG = "LivexMediaService"
        const val CHANNEL_ID = "studio_media_playback"
        const val NOTIFICATION_ID = 2001

        const val ACTION_PLAY = "com.chordex.app.ACTION_PLAY"
        const val ACTION_PAUSE = "com.chordex.app.ACTION_PAUSE"
        const val ACTION_TOGGLE_PLAY = "com.chordex.app.ACTION_TOGGLE_PLAY"
        const val ACTION_PREV = "com.chordex.app.ACTION_PREV"
        const val ACTION_NEXT = "com.chordex.app.ACTION_NEXT"
        const val ACTION_REWIND = "com.chordex.app.ACTION_REWIND"
        const val ACTION_FAST_FORWARD = "com.chordex.app.ACTION_FAST_FORWARD"
        const val ACTION_STOP = "com.chordex.app.ACTION_STOP"

        @Volatile
        var instance: MediaNotificationService? = null
            private set

        @Volatile
        var pendingMetadata: MetadataPayload? = null

        @Volatile
        var pendingPlaybackState: PlaybackStatePayload? = null
    }

    private var mediaSession: MediaSessionCompat? = null
    private var isForeground = false

    private var currentTitle: String = "Livex Playback"
    private var currentArtist: String = "Livex"
    private var currentAlbum: String = ""
    private var currentDurationMs: Long = 0L
    private var currentPlaybackState: Int = PlaybackStateCompat.STATE_NONE
    private var currentPositionMs: Long = 0L
    private var currentSpeed: Float = 1.0f

    private var currentArtworkBitmap: Bitmap? = null
    private var lastArtworkUrl: String? = null
    private val imageExecutor = Executors.newSingleThreadExecutor()

    private val mediaSessionCallback = object : MediaSessionCompat.Callback() {
        override fun onPlay() {
            Log.d(TAG, "MediaSessionCompat.Callback -> onPlay")
            NativeMediaPlugin.dispatchMediaAction("play")
        }

        override fun onPause() {
            Log.d(TAG, "MediaSessionCompat.Callback -> onPause")
            NativeMediaPlugin.dispatchMediaAction("pause")
        }

        override fun onSkipToNext() {
            Log.d(TAG, "MediaSessionCompat.Callback -> onSkipToNext")
            NativeMediaPlugin.dispatchMediaAction("next")
        }

        override fun onSkipToPrevious() {
            Log.d(TAG, "MediaSessionCompat.Callback -> onSkipToPrevious")
            NativeMediaPlugin.dispatchMediaAction("previous")
        }

        override fun onFastForward() {
            Log.d(TAG, "MediaSessionCompat.Callback -> onFastForward (+10s)")
            NativeMediaPlugin.dispatchMediaAction("skipForward", 10)
        }

        override fun onRewind() {
            Log.d(TAG, "MediaSessionCompat.Callback -> onRewind (-10s)")
            NativeMediaPlugin.dispatchMediaAction("skipBackward", 10)
        }

        override fun onSeekTo(pos: Long) {
            Log.d(TAG, "MediaSessionCompat.Callback -> onSeekTo: $pos")
            NativeMediaPlugin.dispatchMediaAction("seek", pos)
        }

        override fun onStop() {
            Log.d(TAG, "MediaSessionCompat.Callback -> onStop")
            NativeMediaPlugin.dispatchMediaAction("stop")
            stopForegroundService()
        }
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        createNotificationChannel()

        mediaSession = MediaSessionCompat(this, "LivexMediaSession").apply {
            setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
                MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
            )
            setCallback(mediaSessionCallback)
            isActive = true
        }

        pendingMetadata?.let {
            updateMetadata(it.title, it.artist, it.album, it.durationMs, it.artworkUrl)
            pendingMetadata = null
        }

        pendingPlaybackState?.let {
            updatePlaybackState(it.state, it.positionMs, it.speed)
            pendingPlaybackState = null
        }

        Log.i(TAG, "MediaNotificationService created and MediaSessionCompat initialized.")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PLAY -> NativeMediaPlugin.dispatchMediaAction("play")
            ACTION_PAUSE -> NativeMediaPlugin.dispatchMediaAction("pause")
            ACTION_TOGGLE_PLAY -> {
                if (currentPlaybackState == PlaybackStateCompat.STATE_PLAYING) {
                    NativeMediaPlugin.dispatchMediaAction("pause")
                } else {
                    NativeMediaPlugin.dispatchMediaAction("play")
                }
            }
            ACTION_PREV -> NativeMediaPlugin.dispatchMediaAction("previous")
            ACTION_NEXT -> NativeMediaPlugin.dispatchMediaAction("next")
            ACTION_REWIND -> NativeMediaPlugin.dispatchMediaAction("skipBackward", 10)
            ACTION_FAST_FORWARD -> NativeMediaPlugin.dispatchMediaAction("skipForward", 10)
            ACTION_STOP -> {
                NativeMediaPlugin.dispatchMediaAction("stop")
                stopForegroundService()
            }
        }
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Livex Audio Playback"
            val descriptionText = "Playback controls and notifications for GrooveX and Drumex"
            val importance = NotificationManager.IMPORTANCE_LOW
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                setShowBadge(false)
                setSound(null, null)
                enableVibration(false)
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun updateMetadata(
        title: String,
        artist: String,
        album: String,
        durationMs: Long,
        artworkUrl: String?
    ) {
        currentTitle = title.ifEmpty { "Livex Playback" }
        currentArtist = artist.ifEmpty { "Livex" }
        currentAlbum = album
        currentDurationMs = durationMs

        if (!artworkUrl.isNullOrEmpty() && artworkUrl != lastArtworkUrl) {
            lastArtworkUrl = artworkUrl
            if (artworkUrl.startsWith("data:image/")) {
                try {
                    val base64Data = artworkUrl.substringAfter("base64,")
                    val decodedBytes = Base64.decode(base64Data, Base64.DEFAULT)
                    val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                    if (bitmap != null) {
                        currentArtworkBitmap = bitmap
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to decode base64 artwork: ${e.message}")
                }
            } else {
                loadArtwork(artworkUrl)
            }
        } else if (artworkUrl.isNullOrEmpty() && (currentArtist == "Drumex Metronome" || currentTitle.contains("Metronome") || currentAlbum.contains("BPM") || currentArtist.contains("BPM"))) {
            val bpmMatch = Regex("""(\d+)\s*BPM""", RegexOption.IGNORE_CASE).find(currentAlbum)
                ?: Regex("""(\d+)\s*BPM""", RegexOption.IGNORE_CASE).find(currentArtist)
                ?: Regex("""(\d+)\s*BPM""", RegexOption.IGNORE_CASE).find(currentTitle)
            val bpmStr = bpmMatch?.groupValues?.get(1) ?: "120"
            currentArtworkBitmap = generateBpmArtwork(bpmStr)
        }

        applyMetadataToSession()

        val notification = buildNotification()
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private fun applyMetadataToSession() {
        val metadataBuilder = MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, currentAlbum)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, currentDurationMs)

        currentArtworkBitmap?.let {
            metadataBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, it)
            metadataBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, it)
        }

        mediaSession?.setMetadata(metadataBuilder.build())
        mediaSession?.isActive = true
    }

    fun updatePlaybackState(stateStr: String, positionMs: Long, speed: Float) {
        val state = when (stateStr.lowercase()) {
            "playing" -> PlaybackStateCompat.STATE_PLAYING
            "paused" -> PlaybackStateCompat.STATE_PAUSED
            "stopped" -> PlaybackStateCompat.STATE_STOPPED
            else -> PlaybackStateCompat.STATE_NONE
        }
        currentPlaybackState = state
        currentPositionMs = positionMs
        currentSpeed = speed

        val actions = PlaybackStateCompat.ACTION_PLAY or
                      PlaybackStateCompat.ACTION_PAUSE or
                      PlaybackStateCompat.ACTION_PLAY_PAUSE or
                      PlaybackStateCompat.ACTION_SEEK_TO or
                      PlaybackStateCompat.ACTION_FAST_FORWARD or
                      PlaybackStateCompat.ACTION_REWIND or
                      PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                      PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                      PlaybackStateCompat.ACTION_STOP

        val effectiveSpeed = if (state == PlaybackStateCompat.STATE_PLAYING) speed else 0f
        val playbackState = PlaybackStateCompat.Builder()
            .setActions(actions)
            .setState(state, positionMs, effectiveSpeed, SystemClock.elapsedRealtime())
            .build()

        mediaSession?.setPlaybackState(playbackState)

        if (state == PlaybackStateCompat.STATE_STOPPED) {
            stopForegroundService()
        } else {
            val notification = buildNotification()
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (state == PlaybackStateCompat.STATE_PLAYING) {
                startForegroundCompat(notification)
            } else {
                notificationManager.notify(NOTIFICATION_ID, notification)
            }
        }
    }

    private fun loadArtwork(urlStr: String) {
        imageExecutor.execute {
            try {
                val bitmap: Bitmap? = if (urlStr.startsWith("data:image/")) {
                    val base64Data = urlStr.substringAfter("base64,")
                    val decodedBytes = Base64.decode(base64Data, Base64.DEFAULT)
                    BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                } else {
                    val url = URL(urlStr)
                    val conn = url.openConnection() as HttpURLConnection
                    conn.connectTimeout = 5000
                    conn.readTimeout = 5000
                    conn.doInput = true
                    conn.connect()
                    val inputStream: InputStream = conn.inputStream
                    val bmp = BitmapFactory.decodeStream(inputStream)
                    inputStream.close()
                    conn.disconnect()
                    bmp
                }

                if (bitmap != null) {
                    currentArtworkBitmap = bitmap
                    applyMetadataToSession()
                    val notification = buildNotification()
                    val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    notificationManager.notify(NOTIFICATION_ID, notification)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to load artwork from $urlStr: ${e.message}")
            }
        }
    }

    private fun generateBpmArtwork(bpm: String, subtext: String = "BPM"): Bitmap {
        val size = 512
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        // 1. Sleek deep black background (#000000)
        val bgPaint = Paint().apply {
            color = Color.parseColor("#000000")
            isAntiAlias = true
        }
        canvas.drawRect(0f, 0f, size.toFloat(), size.toFloat(), bgPaint)

        // 2. Centered compact inner card badge with generous 146px padding (220x220 in 512x512)
        val inset = 146f
        val innerCardPaint = Paint().apply {
            color = Color.parseColor("#121215")
            isAntiAlias = true
        }
        canvas.drawRoundRect(inset, inset, size - inset, size - inset, 28f, 28f, innerCardPaint)

        val ringPaint = Paint().apply {
            color = Color.parseColor("#27272A")
            style = Paint.Style.STROKE
            strokeWidth = 2.5f
            isAntiAlias = true
        }
        canvas.drawRoundRect(inset, inset, size - inset, size - inset, 28f, 28f, ringPaint)

        // 3. Crisp modern white BPM number centered
        val numPaint = Paint().apply {
            color = Color.WHITE
            textSize = 56f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
            isAntiAlias = true
        }
        val yPosNum = (size / 2f) - ((numPaint.descent() + numPaint.ascent()) / 2f) - 14f
        canvas.drawText(bpm, size / 2f, yPosNum, numPaint)

        // 4. "BPM" badge label in clean slate/light gray
        val labelPaint = Paint().apply {
            color = Color.parseColor("#A1A1AA")
            textSize = 16f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
            letterSpacing = 0.10f
            isAntiAlias = true
        }
        canvas.drawText(subtext, size / 2f, yPosNum + 42f, labelPaint)

        return bitmap
    }

    private fun buildNotification(): Notification {
        val sessionToken = mediaSession?.sessionToken

        val prevIntent = PendingIntent.getService(
            this, 1, Intent(this, MediaNotificationService::class.java).setAction(ACTION_PREV),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val rewIntent = PendingIntent.getService(
            this, 2, Intent(this, MediaNotificationService::class.java).setAction(ACTION_REWIND),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val togglePlayIntent = PendingIntent.getService(
            this, 3, Intent(this, MediaNotificationService::class.java).setAction(ACTION_TOGGLE_PLAY),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val ffIntent = PendingIntent.getService(
            this, 4, Intent(this, MediaNotificationService::class.java).setAction(ACTION_FAST_FORWARD),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val nextIntent = PendingIntent.getService(
            this, 5, Intent(this, MediaNotificationService::class.java).setAction(ACTION_NEXT),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val isPlaying = currentPlaybackState == PlaybackStateCompat.STATE_PLAYING
        val playPauseIcon = if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
        val playPauseTitle = if (isPlaying) "Pause" else "Play"

        val openAppIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val mediaStyle = MediaStyle()
            .setShowActionsInCompactView(0, 2, 4) // Previous (0), Play/Pause (2), Next (4)
            .setCancelButtonIntent(
                PendingIntent.getService(
                    this,
                    6,
                    Intent(this, MediaNotificationService::class.java).setAction(ACTION_STOP),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
            )

        if (sessionToken != null) {
            mediaStyle.setMediaSession(sessionToken)
        }

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setSubText(currentAlbum)
            .setContentIntent(openAppIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(isPlaying)
            .setStyle(mediaStyle)
            .addAction(android.R.drawable.ic_media_previous, "Previous", prevIntent)   // Action 0
            .addAction(android.R.drawable.ic_media_rew, "Rewind 10s", rewIntent)      // Action 1
            .addAction(playPauseIcon, playPauseTitle, togglePlayIntent)               // Action 2
            .addAction(android.R.drawable.ic_media_ff, "Forward 10s", ffIntent)       // Action 3
            .addAction(android.R.drawable.ic_media_next, "Next", nextIntent)          // Action 4

        currentArtworkBitmap?.let {
            builder.setLargeIcon(it)
        }

        return builder.build()
    }

    private fun startForegroundCompat(notification: Notification) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ServiceCompat.startForeground(
                    this,
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            isForeground = true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to startForeground: ${e.message}", e)
        }
    }

    fun stopForegroundService() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
            isForeground = false
            mediaSession?.isActive = false
            stopSelf()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping foreground: ${e.message}", e)
        }
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        Log.i(TAG, "onTaskRemoved called - cleaning up media session and notification")
        stopForegroundService()
    }

    override fun onDestroy() {
        Log.i(TAG, "onDestroy called - releasing MediaSessionCompat")
        mediaSession?.release()
        mediaSession = null
        instance = null
        imageExecutor.shutdown()
        super.onDestroy()
    }
}
