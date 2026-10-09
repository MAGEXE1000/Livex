package com.chordex.app;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * SafeContentResolver centralizes all ContentResolver operations on incoming
 * untrusted URIs (e.g. from ACTION_VIEW and ACTION_SEND intents).
 *
 * Implements strict anti-confused-deputy verification, scheme and authority validation,
 * authority whitelisting, UTF-8 text bounding against memory DoS, and canonical
 * directory-separator trailing guards against partial path traversal attacks.
 */
public final class SafeContentResolver {
    public static final long DEFAULT_MAX_TEXT_BYTES = 5 * 1024 * 1024L; // 5 MB
    public static final long DEFAULT_MAX_STREAM_BYTES = 50 * 1024 * 1024L; // 50 MB

    public static final Set<String> TRUSTED_AUTHORITIES = Collections.unmodifiableSet(
        new HashSet<>(Arrays.asList(
            "media",
            "com.android.providers.media.documents",
            "com.android.providers.downloads.documents",
            "com.android.externalstorage.documents",
            "com.google.android.apps.docs.storage",
            "com.google.android.apps.photos.contentprovider"
        ))
    );

    private SafeContentResolver() {}

    /**
     * Checks whether a target file is strictly located within an allowed base directory,
     * preventing partial path traversal (e.g. /app/base_dir_extra matching /app/base_dir)
     * and parent directory traversal (e.g. ../../etc/passwd).
     *
     * @param allowedDirectory The allowed base directory
     * @param targetFile The file to verify
     * @return true if targetFile is within allowedDirectory or equals allowedDirectory, false otherwise
     */
    public static boolean isPathWithinDirectory(File allowedDirectory, File targetFile) {
        if (allowedDirectory == null || targetFile == null) {
            return false;
        }
        try {
            File baseDir = allowedDirectory.getCanonicalFile();
            File target = targetFile.getCanonicalFile();
            String basePath = baseDir.getPath();
            if (!basePath.endsWith(File.separator)) {
                basePath += File.separator;
            }
            return target.getPath().startsWith(basePath) || target.equals(baseDir);
        } catch (IOException e) {
            return false;
        }
    }

    /**
     * Resolves a relative or sub-path against an allowed base directory, verifying that
     * the resolved canonical file remains strictly within the base directory.
     *
     * @param allowedDirectory The allowed base directory
     * @param requestedPath The sub-path to resolve
     * @return Canonical File strictly within allowedDirectory
     * @throws IOException If resolving canonical path fails
     * @throws SecurityException If requestedPath traverses outside allowedDirectory
     */
    public static File resolveSafePath(File allowedDirectory, String requestedPath) throws IOException, SecurityException {
        if (allowedDirectory == null) {
            throw new IllegalArgumentException("Allowed directory cannot be null");
        }
        if (requestedPath == null || requestedPath.trim().isEmpty()) {
            throw new IllegalArgumentException("Requested path cannot be null or empty");
        }
        File targetFile = new File(allowedDirectory, requestedPath);
        if (!isPathWithinDirectory(allowedDirectory, targetFile)) {
            throw new SecurityException("Target path is outside allowed directory: " + requestedPath);
        }
        return targetFile.getCanonicalFile();
    }

    /**
     * Strictly verifies whether an authority is authorized for content resolution.
     * Only trusted platform storage authorities and the app's own FileProvider are authorized.
     * Arbitrary external authorities are rejected.
     *
     * @param context Application/Activity context
     * @param rawAuthority Raw authority string from content URI
     * @return true if the authority is authorized, false otherwise
     */
    public static boolean isAuthorizedAuthority(Context context, String rawAuthority) {
        if (rawAuthority == null || rawAuthority.trim().isEmpty()) {
            return false;
        }

        // Normalize authority: strip userinfo (before '@') and port (after ':')
        String authority = rawAuthority.trim();
        int atIndex = authority.lastIndexOf('@');
        if (atIndex != -1) {
            authority = authority.substring(atIndex + 1);
        }
        int colonIndex = authority.indexOf(':');
        if (colonIndex != -1) {
            authority = authority.substring(0, colonIndex);
        }
        authority = authority.trim().toLowerCase(Locale.ROOT);
        if (authority.isEmpty()) {
            return false;
        }

        // 1. Trusted platform storage and media providers
        if (TRUSTED_AUTHORITIES.contains(authority)) {
            return true;
        }

        // 2. Application's own FileProvider (for local audio stems, cached waveforms, etc.)
        if (context != null) {
            String currentPackage = context.getPackageName();
            if (currentPackage != null && !currentPackage.trim().isEmpty()) {
                String lowerPackage = currentPackage.trim().toLowerCase(Locale.ROOT);
                if (authority.equals(lowerPackage + ".fileprovider")) {
                    return true;
                }
            }
        }

        // Explicit canonical app fileproviders for backward compatibility / multi-app flavors
        if (authority.equals("com.chordex.app.fileprovider") ||
            authority.equals("livex.app.fileprovider")) {
            return true;
        }

        // All other authorities (e.g. arbitrary external apps, com.evil.provider, etc.) are rejected
        return false;
    }

    /**
     * Validates whether a URI is a safe content URI authorized for access by this app.
     *
     * @param context Application/Activity context
     * @param uri The URI to validate
     * @return true if the URI is safe to access via ContentResolver, false otherwise
     */
    public static boolean isSafeUri(Context context, Uri uri) {
        if (context == null || uri == null) {
            return false;
        }

        // 1. Require "content" scheme strictly
        String scheme = uri.getScheme();
        if (scheme == null || !"content".equalsIgnoreCase(scheme)) {
            return false;
        }

        // 1b. Block access to internal private directories like /data (CWE-441 / CWE-610)
        String path = uri.getPath();
        if (path != null) {
            String normalizedPath = path.replace('\\', '/');
            if (normalizedPath.equals("/data") || normalizedPath.startsWith("/data/")) {
                return false;
            }
        }

        // 2. Require non-empty authority and validate against strict whitelist
        String rawAuthority = uri.getAuthority();
        if (rawAuthority == null || rawAuthority.trim().isEmpty()) {
            return false;
        }

        return isAuthorizedAuthority(context, rawAuthority);
    }

    /**
     * Validates that a content URI is safe and authorized for resolution.
     * Throws SecurityException if the URI fails validation.
     *
     * @param context Application/Activity context
     * @param uri Content URI to validate
     * @throws IllegalArgumentException If context or URI is null
     * @throws SecurityException If URI is not safe or authority is unauthorized
     */
    public static void validateContentUri(Context context, Uri uri) throws SecurityException {
        if (context == null || uri == null) {
            throw new IllegalArgumentException("Context and URI cannot be null");
        }
        if (!isSafeUri(context, uri)) {
            throw new SecurityException("Unsafe or unauthorized content URI: " + uri);
        }
    }

    /**
     * Safely queries the display name of a content URI via OpenableColumns.DISPLAY_NAME.
     *
     * @param context Application/Activity context
     * @param uri Content URI
     * @return Sanitized file name string
     */
    public static String getSafeDisplayName(Context context, Uri uri) {
        if (context == null || uri == null || !isSafeUri(context, uri)) {
            return "shared_file";
        }

        String displayName = null;
        try (Cursor cursor = context.getContentResolver().query(
                uri,
                new String[]{OpenableColumns.DISPLAY_NAME},
                null,
                null,
                null
        )) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) {
                    displayName = cursor.getString(index);
                }
            }
        } catch (Exception e) {
            // Query failed, fall back to path extraction
        }

        if (displayName == null || displayName.trim().isEmpty()) {
            String path = uri.getLastPathSegment();
            if (path != null && !path.trim().isEmpty()) {
                int cut = path.lastIndexOf('/');
                displayName = (cut != -1) ? path.substring(cut + 1) : path;
            }
        }

        if (displayName == null || displayName.trim().isEmpty()) {
            displayName = "shared_file";
        }

        // Sanitize file name to prevent path traversal or special control characters
        displayName = new File(displayName).getName();
        displayName = displayName.replaceAll("[^a-zA-Z0-9._-]", "_");
        return displayName.isEmpty() ? "shared_file" : displayName;
    }

    /**
     * Safely queries the MIME type of a content URI.
     *
     * @param context Application/Activity context
     * @param uri Content URI
     * @return MIME type string, or null if unresolvable or unsafe
     */
    public static String getSafeMimeType(Context context, Uri uri) {
        if (context == null || uri == null || !isSafeUri(context, uri)) {
            return null;
        }
        try {
            return context.getContentResolver().getType(uri);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Safely opens an InputStream for a validated content URI.
     *
     * @param context Application/Activity context
     * @param uri Content URI
     * @return InputStream for the content
     * @throws IOException If opening the stream fails
     * @throws SecurityException If URI fails safety validation
     */
    public static InputStream openSafeInputStream(Context context, Uri uri) throws IOException, SecurityException {
        if (context == null || uri == null) {
            throw new IllegalArgumentException("Context and URI cannot be null");
        }
        validateContentUri(context, uri);

        String path = uri.getPath();
        if (path != null) {
            String normalizedPath = path.replace('\\', '/');
            if (normalizedPath.equals("/data") || normalizedPath.startsWith("/data/")) {
                throw new SecurityException("Unsafe path in content URI: " + uri);
            }
        }

        InputStream is = context.getContentResolver().openInputStream(uri);
        if (is == null) {
            throw new IOException("Unable to open input stream for: " + uri);
        }
        return is;
    }

    /**
     * Safely opens an InputStream for a validated content URI string.
     *
     * @param context Application/Activity context
     * @param uriString URI string to parse and validate
     * @return InputStream for the content
     * @throws IOException If opening the stream fails
     * @throws SecurityException If URI string fails safety validation
     */
    public static InputStream openSafeInputStream(Context context, String uriString) throws IOException, SecurityException {
        if (context == null) {
            throw new IllegalArgumentException("Context cannot be null");
        }
        if (uriString == null || uriString.trim().isEmpty()) {
            throw new IllegalArgumentException("URI string cannot be null or empty");
        }
        Uri uri = Uri.parse(uriString.trim());
        return openSafeInputStream(context, uri);
    }

    /**
     * Safely reads UTF-8 text content from a content URI with default upper-bound byte limit (5MB)
     * to prevent memory exhaustion DoS attacks.
     *
     * @param context Application/Activity context
     * @param uri Content URI
     * @return String content in UTF-8
     * @throws IOException If reading fails or size exceeds maxBytes
     * @throws SecurityException If URI fails safety validation
     */
    public static String readSafeTextContent(Context context, Uri uri) throws IOException, SecurityException {
        return readSafeTextContent(context, uri, DEFAULT_MAX_TEXT_BYTES);
    }

    /**
     * Safely reads UTF-8 text content from a content URI with an upper-bound byte limit (int overload)
     * to prevent memory exhaustion DoS attacks.
     *
     * @param context Application/Activity context
     * @param uri Content URI
     * @param maxBytes Maximum allowable bytes to read (<= 0 uses default 5MB)
     * @return String content in UTF-8
     * @throws IOException If reading fails or size exceeds maxBytes
     * @throws SecurityException If URI fails safety validation
     */
    public static String readSafeTextContent(Context context, Uri uri, int maxBytes) throws IOException, SecurityException {
        return readSafeTextContent(context, uri, (long) maxBytes);
    }

    /**
     * Safely reads UTF-8 text content from a content URI with an upper-bound byte limit
     * to prevent memory exhaustion DoS attacks.
     *
     * @param context Application/Activity context
     * @param uri Content URI
     * @param maxBytes Maximum allowable bytes to read (<= 0 uses default 5MB)
     * @return String content in UTF-8
     * @throws IOException If reading fails or size exceeds maxBytes
     * @throws SecurityException If URI fails safety validation
     */
    public static String readSafeTextContent(Context context, Uri uri, long maxBytes) throws IOException, SecurityException {
        long limit = (maxBytes > 0) ? maxBytes : DEFAULT_MAX_TEXT_BYTES;
        try (InputStream inputStream = openSafeInputStream(context, uri)) {
            if (inputStream == null) {
                return null;
            }
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            long totalBytesRead = 0;
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                totalBytesRead += bytesRead;
                if (totalBytesRead > limit) {
                    throw new IOException("Content exceeds maximum allowed size of " + limit + " bytes");
                }
                outputStream.write(buffer, 0, bytesRead);
            }
            return outputStream.toString(StandardCharsets.UTF_8.name());
        }
    }

    /**
     * Safely copies content from a URI to a uniquely named file in the application's cache directory
     * with default 50MB upper limit.
     *
     * @param context Application/Activity context
     * @param uri Content URI
     * @param fileName Preferred file name
     * @return File referencing the cached copy
     * @throws IOException If stream copy fails or size limit is exceeded
     * @throws SecurityException If URI fails safety validation or path traversal detected
     */
    public static File copySafeStreamToCache(Context context, Uri uri, String fileName) throws IOException, SecurityException {
        return copySafeStreamToCache(context, uri, fileName, DEFAULT_MAX_STREAM_BYTES);
    }

    /**
     * Safely copies content from a URI to a uniquely named file in the application's cache directory.
     * Enforces path traversal verification to prevent writing outside the cache directory,
     * and bounds total bytes copied (50MB default) to prevent disk exhaustion.
     *
     * @param context Application/Activity context
     * @param uri Content URI
     * @param fileName Preferred file name
     * @param maxBytes Maximum allowable bytes to copy (<= 0 uses default 50MB)
     * @return File referencing the cached copy
     * @throws IOException If stream copy fails or size limit is exceeded
     * @throws SecurityException If URI fails safety validation or path traversal detected
     */
    public static File copySafeStreamToCache(Context context, Uri uri, String fileName, long maxBytes) throws IOException, SecurityException {
        if (context == null || uri == null) {
            throw new IllegalArgumentException("Context and URI cannot be null");
        }
        validateContentUri(context, uri);

        File cacheDir = context.getCacheDir();
        if (cacheDir == null) {
            throw new IOException("Cache directory is not available");
        }

        String safeName = (fileName != null && !fileName.trim().isEmpty())
                ? fileName.replaceAll("[^a-zA-Z0-9._-]", "_")
                : "shared_file";
        safeName = new File(safeName).getName();
        if (safeName.isEmpty()) {
            safeName = "shared_file";
        }

        File tempFile = resolveSafePath(cacheDir, "shared_" + System.currentTimeMillis() + "_" + safeName);

        long limit = (maxBytes > 0) ? maxBytes : DEFAULT_MAX_STREAM_BYTES;

        try (InputStream inputStream = openSafeInputStream(context, uri);
             FileOutputStream outputStream = new FileOutputStream(tempFile)) {
            if (inputStream == null) {
                throw new IOException("Failed to open safe input stream for: " + uri);
            }
            byte[] buffer = new byte[8192];
            long totalBytesRead = 0;
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                totalBytesRead += bytesRead;
                if (totalBytesRead > limit) {
                    throw new IOException("Content exceeds maximum allowed size of " + limit + " bytes");
                }
                outputStream.write(buffer, 0, bytesRead);
            }
        } catch (Exception e) {
            if (tempFile.exists()) {
                tempFile.delete();
            }
            if (e instanceof IOException) {
                throw (IOException) e;
            } else if (e instanceof SecurityException) {
                throw (SecurityException) e;
            } else {
                throw new IOException("Failed to copy stream: " + e.getMessage(), e);
            }
        }

        return tempFile;
    }
}
