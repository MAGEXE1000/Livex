# Chordex Studio — Firebase Services Guide

This document describes the Firebase database schemas, authentication architectures, security rules, and metadata hosting structures.

---

## 1. Firebase Service Architecture

```
                                  ┌─────────────────┐
                                  │  Firebase Auth  │
                                  └────────┬────────┘
                                           │
                ┌──────────────────────────┼──────────────────────────┐
                ▼                          ▼                          ▼
      ┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
      │     Firestore     │      │   Cloud Storage   │      │ Firebase Hosting  │
      │  (User Databases) │      │  (Asset Packages) │      │  (OTA & SPA Web)  │
      └───────────────────┘      └───────────────────┘      └───────────────────┘
```

- **Firebase Authentication**: User accounts authorization system. Handles email/password and anonymous credentials.
- **Cloud Firestore**: Document database storing user configurations and user preferences.
- **Cloud Storage**: Hosts user profile assets (avatars) and user-uploaded media content.
- **Firebase Hosting**: Distributes compiled web assets and houses public OTA check metadata files (`version.json`, `app-release.json`).
  - Target folder `firebase-public/`: Deployed for standard web browser SPA routes.
  - Target folder `firebase-public-android/`: Deployed for native Capacitor web asset loads.

Source:

- `firebase.json`
- `packages/studio-core/src/lib/firebase.ts`

---

## 2. OTA Metadata Structure

Firebase Hosting distributes version metadata consumed by the app's OTA update manager.

### Version Mapping File (`version.json`)

Located at Hosting root `/version.json`. Specifies the latest valid version tag.

```json
{
  "version": "3.7.56"
}
```

### App Release Package Manifest (`app-release.json`)

Located at Hosting root `/app-release.json`. Defines the target release file, version labels, and integrity checks.

```json
{
  "version": "3.7.56",
  "versionCode": 184,
  "apkUrl": "https://github.com/MAGEXE1000/Livex/releases/download/v3.7.56/studio-3.7.56.apk",
  "sha256": "4a7b8c...d9ef01",
  "apkSizeBytes": 14720386
}
```

Source:

- `firebase-public/app-release.json`
- `firebase-public/version.json`

---

## 3. Firestore Security Rules (`firestore.rules`)

To enforce data privacy, Firestore documents are locked to authenticated owner contexts:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /{allPaths=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Source:

- `firestore.rules`

---

## 4. Cloud Storage Rules (`storage.rules`)

Storage buckets partition user assets using strict size limits and content-type validations:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/profile/avatar.jpg {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId
                   && request.resource.size < 2 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
    match /users/{userId}/profile/avatar.webp {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId
                   && request.resource.size < 2 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
    match /users/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

Source:

- `storage.rules`
