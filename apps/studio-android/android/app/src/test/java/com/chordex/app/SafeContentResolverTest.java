package com.chordex.app;

import static org.junit.Assert.*;

import android.content.ContentResolver;
import android.content.ContextWrapper;
import android.content.pm.PackageManager;
import android.net.MockUri;
import android.net.Uri;
import java.io.File;
import java.io.IOException;
import org.junit.Before;
import org.junit.Test;

public class SafeContentResolverTest {

    private static class TestContext extends ContextWrapper {
        private final String testPackageName;
        private int permissionResult = PackageManager.PERMISSION_DENIED;

        public TestContext(String testPackageName) {
            super(null);
            this.testPackageName = testPackageName;
        }

        public void setPermissionResult(int result) {
            this.permissionResult = result;
        }

        @Override
        public String getPackageName() {
            return testPackageName;
        }

        @Override
        public PackageManager getPackageManager() {
            return null;
        }

        @Override
        public ContentResolver getContentResolver() {
            return null;
        }

        @Override
        public int checkCallingOrSelfUriPermission(Uri uri, int modeFlags) {
            return permissionResult;
        }

        @Override
        public File getCacheDir() {
            return new File(System.getProperty("java.io.tmpdir"), "studio_test_cache");
        }
    }

    private TestContext context;

    @Before
    public void setUp() {
        context = new TestContext("com.chordex.app");
    }

    @Test
    public void testBoundedReadingLimitsConstants() {
        assertEquals(5 * 1024 * 1024L, SafeContentResolver.DEFAULT_MAX_TEXT_BYTES);
        assertEquals(50 * 1024 * 1024L, SafeContentResolver.DEFAULT_MAX_STREAM_BYTES);
        assertTrue(SafeContentResolver.TRUSTED_AUTHORITIES.contains("media"));
        assertTrue(SafeContentResolver.TRUSTED_AUTHORITIES.contains("com.android.providers.media.documents"));
        assertTrue(SafeContentResolver.TRUSTED_AUTHORITIES.contains("com.android.providers.downloads.documents"));
        assertTrue(SafeContentResolver.TRUSTED_AUTHORITIES.contains("com.android.externalstorage.documents"));
        assertTrue(SafeContentResolver.TRUSTED_AUTHORITIES.contains("com.google.android.apps.docs.storage"));
        assertTrue(SafeContentResolver.TRUSTED_AUTHORITIES.contains("com.google.android.apps.photos.contentprovider"));
    }

    @Test
    public void testIsSafeUri_rejectsNullAndEmptyInputs() {
        assertFalse("Null context must be rejected", SafeContentResolver.isSafeUri(null, new MockUri("content", "media", "file.mp3")));
        assertFalse("Null URI must be rejected", SafeContentResolver.isSafeUri(context, null));
        assertFalse("URI with null scheme must be rejected", SafeContentResolver.isSafeUri(context, new MockUri(null, "media", "file.mp3")));
        assertFalse("URI with empty scheme must be rejected", SafeContentResolver.isSafeUri(context, new MockUri("", "media", "file.mp3")));
        assertFalse("URI with null authority must be rejected", SafeContentResolver.isSafeUri(context, new MockUri("content", null, "file.mp3")));
        assertFalse("URI with empty authority must be rejected", SafeContentResolver.isSafeUri(context, new MockUri("content", "", "file.mp3")));
        assertFalse("URI with whitespace authority must be rejected", SafeContentResolver.isSafeUri(context, new MockUri("content", "   ", "file.mp3")));
    }

    @Test
    public void testIsSafeUri_rejectsNonContentSchemes() {
        assertFalse("file:// scheme must be rejected", SafeContentResolver.isSafeUri(context, new MockUri("file", "", "sdcard/secret.txt")));
        assertFalse("http:// scheme must be rejected", SafeContentResolver.isSafeUri(context, new MockUri("http", "example.com", "file.mp3")));
        assertFalse("https:// scheme must be rejected", SafeContentResolver.isSafeUri(context, new MockUri("https", "example.com", "file.mp3")));
        assertFalse("javascript:// scheme must be rejected", SafeContentResolver.isSafeUri(context, new MockUri("javascript", "alert(1)", "")));
        assertFalse("ftp:// scheme must be rejected", SafeContentResolver.isSafeUri(context, new MockUri("ftp", "example.com", "file.mp3")));
        assertFalse("data:// scheme must be rejected", SafeContentResolver.isSafeUri(context, new MockUri("data", "text/plain", "base64")));
    }

    @Test
    public void testIsSafeUri_rejectsDataDirectoryPath() {
        assertFalse("Direct /data path must be rejected",
                SafeContentResolver.isSafeUri(context, new MockUri("content", "media", "data")));
        assertFalse("Sub /data path must be rejected",
                SafeContentResolver.isSafeUri(context, new MockUri("content", "media", "data/user/0/stolen.db")));
    }

    @Test
    public void testIsSafeUri_acceptsAppFileProvider() {
        assertTrue("App's own FileProvider authority must be accepted for local stem loading",
                SafeContentResolver.isSafeUri(context, new MockUri("content", "com.chordex.app.fileprovider", "stems/vocals.wav")));
        assertTrue("livex.app.fileprovider must be accepted",
                SafeContentResolver.isSafeUri(context, new MockUri("content", "livex.app.fileprovider", "stems/vocals.wav")));
    }

    @Test
    public void testIsSafeUri_rejectsUnauthorizedInternalAndThirdPartyAuthorities() {
        // Direct package name (no .fileprovider) must be rejected
        assertFalse("Direct package authority without .fileprovider must be rejected",
                SafeContentResolver.isSafeUri(context, new MockUri("content", "com.chordex.app", "data")));
        // Sub-package authority
        assertFalse("Sub-package authority must be rejected",
                SafeContentResolver.isSafeUri(context, new MockUri("content", "com.chordex.app.provider", "data")));
        // Third-party fileproviders
        assertFalse("Generic third-party .fileprovider authority must be rejected",
                SafeContentResolver.isSafeUri(context, new MockUri("content", "custom.fileprovider", "shared/file.mp3")));
        assertFalse("External app .fileprovider authority must be rejected",
                SafeContentResolver.isSafeUri(context, new MockUri("content", "org.external.app.fileprovider", "shared/file.mp3")));
    }

    @Test
    public void testIsSafeUri_normalizesAuthorityWithUserinfoAndPort() {
        assertFalse("Authority with userinfo resolving to internal package must be rejected",
                SafeContentResolver.isSafeUri(context, new MockUri("content", "user:pass@com.chordex.app", "file.mp3")));
        assertTrue("Authority with port resolving to app fileprovider must be accepted",
                SafeContentResolver.isSafeUri(context, new MockUri("content", "com.chordex.app.fileprovider:8080", "file.mp3")));
        assertFalse("Authority with userinfo and port resolving to untrusted .fileprovider must be rejected",
                SafeContentResolver.isSafeUri(context, new MockUri("content", "admin@secret.fileprovider:443", "file.mp3")));

        // Trusted authority with userinfo and port
        assertTrue("Trusted authority with userinfo and port must be accepted",
                SafeContentResolver.isSafeUri(context, new MockUri("content", "user@media:8080", "audio.mp3")));
    }

    @Test
    public void testIsSafeUri_acceptsTrustedAuthorities() {
        assertTrue("media authority must be accepted",
                SafeContentResolver.isSafeUri(context, new MockUri("content", "media", "external/audio/media/1")));
        assertTrue("com.android.providers.media.documents must be accepted",
                SafeContentResolver.isSafeUri(context, new MockUri("content", "com.android.providers.media.documents", "document/123")));
        assertTrue("com.android.providers.downloads.documents must be accepted",
                SafeContentResolver.isSafeUri(context, new MockUri("content", "com.android.providers.downloads.documents", "document/456")));
        assertTrue("com.android.externalstorage.documents must be accepted",
                SafeContentResolver.isSafeUri(context, new MockUri("content", "com.android.externalstorage.documents", "document/789")));
        assertTrue("com.google.android.apps.docs.storage must be accepted",
                SafeContentResolver.isSafeUri(context, new MockUri("content", "com.google.android.apps.docs.storage", "doc")));
        assertTrue("com.google.android.apps.photos.contentprovider must be accepted",
                SafeContentResolver.isSafeUri(context, new MockUri("content", "com.google.android.apps.photos.contentprovider", "photo")));
    }

    @Test
    public void testIsSafeUri_rejectsUntrustedExternalAuthorities() {
        MockUri evilUri = new MockUri("content", "com.evil.provider", "data");
        assertFalse("Arbitrary external authority must be rejected",
                SafeContentResolver.isSafeUri(context, evilUri));

        MockUri externalUri = new MockUri("content", "com.external.provider", "shared/song.chordex");
        assertFalse("Untrusted external provider must be rejected even with permission flags",
                SafeContentResolver.isSafeUri(context, externalUri));
    }

    @Test
    public void testValidateContentUri_succeedsOnAuthorizedUri() {
        SafeContentResolver.validateContentUri(context, new MockUri("content", "com.chordex.app.fileprovider", "stems/vocals.wav"));
        SafeContentResolver.validateContentUri(context, new MockUri("content", "media", "audio/1"));
    }

    @Test(expected = SecurityException.class)
    public void testValidateContentUri_throwsOnUntrustedAuthority() {
        SafeContentResolver.validateContentUri(context, new MockUri("content", "com.evil.provider", "data"));
    }

    @Test
    public void testIsPathWithinDirectory_preventsPartialAndParentTraversal() throws IOException {
        File baseDir = new File(System.getProperty("java.io.tmpdir"), "studio_base_test_" + System.currentTimeMillis());
        baseDir.mkdirs();
        try {
            File validChild = new File(baseDir, "child.txt");
            assertTrue("Direct child must be within base directory",
                    SafeContentResolver.isPathWithinDirectory(baseDir, validChild));

            File nestedChild = new File(baseDir, "nested/deep/child.txt");
            assertTrue("Nested child must be within base directory",
                    SafeContentResolver.isPathWithinDirectory(baseDir, nestedChild));

            assertTrue("Base directory itself must be within base directory",
                    SafeContentResolver.isPathWithinDirectory(baseDir, baseDir));

            // Sibling directory (partial path traversal attack: /base_dir_extra vs /base_dir)
            File siblingDir = new File(baseDir.getParentFile(), baseDir.getName() + "_extra");
            File siblingChild = new File(siblingDir, "stolen.txt");
            assertFalse("Sibling directory with matching prefix must be rejected",
                    SafeContentResolver.isPathWithinDirectory(baseDir, siblingChild));

            // Parent traversal (../../etc/hosts)
            File parentTraversal = new File(baseDir, "../../etc/hosts");
            assertFalse("Parent traversal must be rejected",
                    SafeContentResolver.isPathWithinDirectory(baseDir, parentTraversal));

            // Null checks
            assertFalse(SafeContentResolver.isPathWithinDirectory(null, validChild));
            assertFalse(SafeContentResolver.isPathWithinDirectory(baseDir, null));
        } finally {
            baseDir.delete();
        }
    }

    @Test
    public void testResolveSafePath_resolvesValidAndBlocksTraversal() throws IOException {
        File baseDir = new File(System.getProperty("java.io.tmpdir"), "studio_resolve_test_" + System.currentTimeMillis());
        baseDir.mkdirs();
        try {
            File resolved = SafeContentResolver.resolveSafePath(baseDir, "stems/vocals.wav");
            assertNotNull(resolved);
            assertTrue(resolved.getPath().contains("vocals.wav"));

            try {
                SafeContentResolver.resolveSafePath(baseDir, "../../etc/hosts");
                fail("resolveSafePath must throw SecurityException on parent traversal");
            } catch (SecurityException expected) {
                // Expected
            }

            try {
                SafeContentResolver.resolveSafePath(baseDir, "../" + baseDir.getName() + "_evil/file.txt");
                fail("resolveSafePath must throw SecurityException on sibling directory traversal");
            } catch (SecurityException expected) {
                // Expected
            }
        } finally {
            baseDir.delete();
        }
    }

    @Test
    public void testGetSafeDisplayName_sanitizesDirectoryTraversalAndSpecialChars() {
        // Directory traversal via getLastPathSegment fallback: ../../secret.txt -> secret.txt
        MockUri traversalUri1 = new MockUri("content", "media", "../../secret.txt");
        String name1 = SafeContentResolver.getSafeDisplayName(context, traversalUri1);
        assertEquals("secret.txt", name1);
        assertFalse(name1.contains("/"));
        assertFalse(name1.contains(".."));

        // Sanitizing directory traversal without slash
        MockUri traversalUri2 = new MockUri("content", "media", "..\\..\\secret.txt");
        String name2 = SafeContentResolver.getSafeDisplayName(context, traversalUri2);
        assertTrue("Sanitized name must end with secret.txt", name2.endsWith("secret.txt"));
        assertFalse(name2.contains("\\"));
        assertFalse(name2.contains("/"));

        // Special characters sanitized to underscores
        MockUri specialCharsUri = new MockUri("content", "media", "my song (version 1) [take 2]!.mp3");
        String name3 = SafeContentResolver.getSafeDisplayName(context, specialCharsUri);
        assertEquals("my_song__version_1___take_2__.mp3", name3);
        assertFalse(name3.contains("("));
        assertFalse(name3.contains(")"));
        assertFalse(name3.contains("["));
        assertFalse(name3.contains("]"));
        assertFalse(name3.contains("!"));
        assertFalse(name3.contains(" "));

        // Null / empty fallback to "shared_file"
        MockUri emptyPathUri = new MockUri("content", "media", "");
        String name4 = SafeContentResolver.getSafeDisplayName(context, emptyPathUri);
        assertEquals("shared_file", name4);

        // Unsafe URI fallback to "shared_file"
        MockUri unsafeUri = new MockUri("file", "", "unsafe.txt");
        String name5 = SafeContentResolver.getSafeDisplayName(context, unsafeUri);
        assertEquals("shared_file", name5);
    }

    @Test(expected = IllegalArgumentException.class)
    public void testOpenSafeInputStream_rejectsNullContext() throws IOException {
        SafeContentResolver.openSafeInputStream(null, new MockUri("content", "media", "file.mp3"));
    }

    @Test(expected = IllegalArgumentException.class)
    public void testOpenSafeInputStream_rejectsNullUri() throws IOException {
        SafeContentResolver.openSafeInputStream(context, (Uri) null);
    }

    @Test(expected = SecurityException.class)
    public void testOpenSafeInputStream_rejectsUnsafeUri() throws IOException {
        SafeContentResolver.openSafeInputStream(context, new MockUri("file", "", "sdcard/secret.txt"));
    }

    @Test(expected = SecurityException.class)
    public void testOpenSafeInputStream_rejectsUntrustedAuthority() throws IOException {
        SafeContentResolver.openSafeInputStream(context, new MockUri("content", "com.evil.provider", "file.mp3"));
    }
}
