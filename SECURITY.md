# Security Policy

## Supported Versions

Livex actively maintains and provides security updates for the current release track:

| Version | Supported          |
| ------- | ------------------ |
| 4.x (Web) | :white_check_mark: |
| 3.x (Android APK) | :white_check_mark: |
| < 3.x   | :x:                |

## Reporting a Vulnerability

We take the security of Livex and our users' audio, project, and synchronization data seriously. If you discover a security vulnerability, please do NOT disclose it publicly via GitHub Issues or discussions.

Instead, please report security vulnerabilities privately:

1. **GitHub Private Vulnerability Reporting**: Use the **"Report a vulnerability"** button under the [Security Advisory tab](https://github.com/MAGEXE1000/Livex/security/advisories/new) of this repository.
2. **Email**: If you are unable to use GitHub Security Advisories, contact the maintainers directly with details.

### What to Include

To help us triage and resolve the issue quickly, please provide:

- A description of the vulnerability and its potential impact.
- Clear step-by-step reproduction instructions or a minimal proof-of-concept.
- Affected platform (Web browser, Android APK, Firebase/Supabase synchronization, or CI/CD pipeline).
- Any proposed remediations or patches if available.

### Our Commitment

- We will acknowledge receipt of your vulnerability report within 48 hours.
- We will provide an assessment of the issue and an estimated timeline for a fix.
- We will notify you when a fix is deployed or released.
- You will be credited in the release notes if you wish.

## Security Architecture Principles

- **No Hardcoded Secrets**: Secrets and signing credentials must never be committed to source code or git history.
- **Fail-Closed Release Validation**: Production releases enforce strict cryptographic signature and fingerprint verification.
- **Sandbox Isolation**: Cross-user data is isolated in Cloud Firestore and Cloud Storage using strict ownership rules (`request.auth.uid == userId`).
