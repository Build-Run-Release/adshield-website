# AdShield Release Management & Signing Specification

## 1. Release Lifecycle & Channel Gates

Every release progresses through formalized quality and security stages:

```text
1. Development Build ──► 2. Automated CI (Lint/Tests/Scan)
                                │
3. Release Candidate ◄──────────┘
        │
        ▼
4. Cryptographic APK Signing (v2/v3 signature scheme)
        │
        ▼
5. Register in Admin Release Manager (State: DRAFT)
        │
        ▼
6. Admin Quality Review ──► Promote to BETA
        │
        ▼
7. Verification on physical test devices ──► Promote to STABLE
        │
        ▼
8. Public Web Portal & Update API distribute latest STABLE release
```

---

## 2. Release Promotion & Revocation Checklist

### Pre-Promotion Verification
- [ ] Gradle build passes `./gradlew lint test`.
- [ ] Dependency secret scan via GitLeaks clean.
- [ ] APK signed with official v2/v3 release keystore.
- [ ] SHA-256 checksum calculated and verified.
- [ ] Changelog and user-facing release notes finalized.

### Emergency Revocation Procedure
If a published release is discovered to contain a critical bug or security flaw:
1. Log into Private Admin Dashboard (`/admin/releases`).
2. Mark the compromised version as **REVOKED**.
3. Select the target fallback version and promote to **STABLE**.
4. The public `/download` portal immediately reverts to serving the fallback stable version, and active clients checking for updates are notified of the recommended replacement.
