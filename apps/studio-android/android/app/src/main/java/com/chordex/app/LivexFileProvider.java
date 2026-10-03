package com.chordex.app;

import android.net.Uri;
import androidx.core.content.FileProvider;

/**
 * LivexFileProvider ensures that custom file formats like .livex
 * are reported with explicit, recognized MIME types (e.g. application/json)
 * instead of falling back to null / application/octet-stream.
 *
 * This prevents WhatsApp, Android Files, and other sharing targets
 * from stripping filenames or corrupting attachments into generic DOC-xxxx.bin files.
 */
public class LivexFileProvider extends FileProvider {

    @Override
    public String getType(Uri uri) {
        if (uri != null) {
            String path = uri.getPath();
            if (path != null) {
                String lower = path.toLowerCase(java.util.Locale.ROOT);
                if (lower.endsWith(".livex") || lower.endsWith(".json")) {
                    return "application/json";
                }
                if (lower.endsWith(".pdf")) {
                    return "application/pdf";
                }
                if (lower.endsWith(".apk")) {
                    return "application/vnd.android.package-archive";
                }
                if (lower.endsWith(".mp3")) {
                    return "audio/mpeg";
                }
                if (lower.endsWith(".wav")) {
                    return "audio/wav";
                }
                if (lower.endsWith(".m4a") || lower.endsWith(".aac")) {
                    return "audio/mp4";
                }
            }
        }
        return super.getType(uri);
    }
}
