# AdShield Update Pipeline & Rollback Safety System

## 1. Dual Independent Update Architecture

AdShield strictly separates **Intelligence Updates** from **Application Code Updates**:

```text
+------------------------------------+    +------------------------------------+
|       FILTER INTELLIGENCE          |    |          APPLICATION CODE          |
+------------------------------------+    +------------------------------------+
| Contents:                          |    | Contents:                          |
| - Domain rules & ad signatures     |    | - Kotlin / Compose UI code         |
| - Threat reputation hashes         |    | - VpnService network packet logic  |
| - Classification metadata          |    | - Core security fixes              |
|                                    |    |                                    |
| Update Mechanism:                  |    | Update Mechanism:                  |
| - Dynamic background WorkManager   |    | - Signed APK downloads via portal  |
| - Atomic database swap             |    | - User-initiated installation      |
| - Automatic rollback on anomaly    |    | - Android PackageInstaller API     |
+------------------------------------+    +------------------------------------+
```

---

## 2. Filter Intelligence Update & Validation Pipeline

Every filter source update executes through an 8-stage verification pipeline before activation:

```text
[Step 1: Download] ──► Fetch source list via TLS 1.3 with ETag/If-Modified-Since
       │
[Step 2: Transport] ─► Verify HTTP 200, valid SSL, non-empty payload
       │
[Step 3: Size Gate] ─► Ensure size is within boundaries (50 KB < Size < 30 MB)
       │
[Step 4: Grammar] ───► Parse lines; reject malformed lines without crashing
       │
[Step 5: Anomaly] ───► Compare compiled rule count to previous version:
       │               - If rule count decreases by > 50% without release note: REJECT
       │               - If rule count explodes by > 300%: REJECT (Possible poison attack)
       │
[Step 6: Regression] ─► Verify hardcoded canary domains (e.g. ad.doubleclick.net must BLOCK;
       │               google.com and play.googleapis.com must ALLOW)
       │
[Step 7: Atomic Swap]► In-memory Trie reference atomically swapped via AtomicReference
       │
[Step 8: Persist] ───► Write serialized binary table to app cache; retain previous version
```

---

## 3. Automated Rollback & Fail-Safe Recovery

If any stage of compilation, activation, or runtime query fails:
1. **Immediate Fallback**: The engine immediately restores the previous known-good filter database snapshot (`filter_backup.bin`).
2. **Local Incident Log**: The anomaly reason (e.g. `RULE_COUNT_DROP_ANOMALY: -68%`) is logged locally in the client diagnostics store.
3. **No Network Blockage**: Under no circumstances does a failed update halt general DNS forwarding or leave the device without internet connectivity.

---

## 4. Application Release Update Pipeline

1. **Check Automatically / Manually**: Compares current `versionCode` against public metadata at `/api/v1/releases/latest`.
2. **Integrity Verification**: Prior to prompting the user, the downloaded APK's SHA-256 hash is computed and verified against the signed release metadata.
3. **Consent-Driven Install**: The app never forces or silently triggers installation. The user is presented with release notes, highlights, and an explicit `Install Update` action.
