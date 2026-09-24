# AdShield Privacy Architecture & Zero-Surveillance Policy

## 1. Absolute Privacy Guarantee

AdShield is architected so that **user privacy cannot be compromised by policy changes or subpoenas, because the server never receives private user data in the first place**.

> **"Your Internet activity stays on your device. AdShield protects you without turning your privacy product into another source of surveillance."**

---

## 2. Strictly Prohibited Data Transmission

The client application will **NEVER** collect, log, aggregate, or transmit to any remote server or third party:
1. **Browsing Activity**: Full URLs, domain request sequences, query parameters, web page titles, bookmarks, or browsing timestamps.
2. **Search Queries**: Search terms entered into search engines or browser address bars.
3. **Application Traffic**: Network payloads, request bodies, HTTP headers, authentication tokens, cookies, or SSL session identifiers.
4. **DNS Activity Logs**: Full query histories, unresolved names, or timestamped lookups.
5. **App Usage Activity**: YouTube watch history, Spotify listening data, streaming sessions, or app interaction timing.
6. **User-Created Lists**: Custom allowlist domains, custom blocklist entries, or manual security overrides.
7. **Downloaded Files**: File names, file contents, file extensions, or private document metadata.
8. **Quarantine Contents**: Quarantined APKs, binaries, scripts, or their recovered file contents.
9. **Personal Identifiers**: Phone numbers, IMEI, Android ID, advertising ID (GAID), contacts, call logs, or sensor data.

---

## 3. Allowed Infrastructure Telemetry (Narrow Boundary)

The **only** communications permitted between the AdShield client and external infrastructure are:

| Category | Endpoint | Data Transmitted | Data Received |
| :--- | :--- | :--- | :--- |
| **Filter Intelligence Updates** | `GET /api/v1/filters/manifest` | Client filter format version, last-updated timestamp | Public filter list URLs, SHA-256 hashes, rule counts |
| **Threat Feed Updates** | `GET /api/v1/threats/hashes` | Threat DB version identifier | New verified malware/phishing domain & file hashes |
| **Application Updates** | `GET /api/v1/releases/latest` | Channel (`stable` or `beta`), current `versionCode` | Latest version number, APK download URL, SHA-256 hash |
| **Licensing & Entitlement** | `POST /api/v1/licenses/verify` | Ephemeral Device-Install UUID, license key | Cryptographically signed entitlement token & expiry |

None of these requests contain browsing data, URLs, or security logs.

---

## 4. Default Privacy Controls

- **Anonymous Analytics**: Disabled by default (`OFF`).
- **Crash Reporting**: Disabled by default (`OFF`). No third-party crash reporting SDKs (e.g., Firebase Crashlytics, Bugsnag) are bundled in the application.
- **Advertising SDKs**: Strictly 0 advertising SDKs in the application.
- **Telemetry Opt-In**: Any future optional diagnostic feature requires explicit, unbundled user opt-in, clear data disclosure, and the immediate ability to revoke.

---

## 5. On-Device Data Handling & Sanitization

1. **Local Log Redaction**: When local events (e.g., blocked ads or threats) are displayed to the user in the Activity log, domains are sanitized to prevent accidental tap execution (e.g., `malicious-domain[.]com`).
2. **Local Retention Controls**: Users can clear local event history, purge statistics counters, or reset configuration at any time from the Settings screen with a single tap.
3. **Sandboxed DataStore**: Local preferences are stored in Android's private app sandbox (`Context.dataStore`), inaccessible to other non-root applications.
