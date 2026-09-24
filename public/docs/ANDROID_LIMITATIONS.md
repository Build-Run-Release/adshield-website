# Android Platform Capabilities & Honest Technical Limitations

## 1. Guiding Philosophy: Truth in Engineering

AdShield will **never claim capabilities that Android does not legitimately expose to standard user applications**. We refuse to fake functionality or compromise user device security through questionable mechanisms such as user-installed root certificates or root access exploits.

---

## 2. Explicit Platform Boundaries & Limitations

### 2.1 Encrypted HTTPS Traffic & In-App Ads
- **The Reality**: Modern Android applications utilize TLS 1.3 encryption with certificate pinning and Network Security Configuration (`res/xml/network_security_config.xml`). A standard Android app cannot decrypt in-flight HTTPS traffic between another app (e.g. YouTube or Instagram) and its servers without installing a custom Root CA certificate.
- **Why We Refuse Root CAs**: Installing a custom root CA certificate breaks Android's operating system trust boundary, exposes user banking and credentials to potential MITM compromise, and trips enterprise MDM checks.
- **The Supported AdShield Approach**: AdShield performs filtering strictly at the **DNS and domain layer** via Android's native `VpnService`. Ad servers served from distinct domains are blocked instantly. If an application (e.g. YouTube or Spotify) serves ads and content from identical IP endpoints over pinned HTTPS, blocking may be partial or best-effort to avoid breaking legitimate streaming playback.

### 2.2 Inaccessible App Data & Sandboxed Files
- **The Reality**: Android enforces strict multi-user Linux sandbox boundaries (UID isolation). AdShield cannot inspect or alter files stored inside other applications' private directories (`/data/data/<package>/`).
- **The Supported AdShield Approach**: File threat inspection and quarantine are strictly applied to **accessible storage** (such as the public `Download/` folder, shared external media, and user-selected APK artifacts) using the Android Storage Access Framework (SAF) and standard media APIs.

### 2.3 Process Termination & App Murdering
- **The Reality**: Non-system Android apps cannot force-kill or uninstall other apps without user consent.
- **The Supported AdShield Approach**: When malicious APKs are identified, AdShield warns the user, quarantines the uninstalled APK file to prevent installation, and guides the user through Android's system application settings to complete removal.

### 2.4 Single Active VPN Constraint
- **The Reality**: Android operating system architecture permits only **one active `VpnService` at a time**.
- **The Supported AdShield Approach**: If the user connects to a third-party commercial VPN client, Android will automatically pause AdShield's VPN interface. AdShield detects this lifecycle event, alerts the user gracefully in the UI, and restores protection when the third-party VPN disconnects.

---

## 3. Supported Android Versions Matrix

| Android Version | API Level | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Android 15** | API 35 | **Fully Supported** | Primary target SDK; supports 16KB page sizes and predictive back gesture. |
| **Android 14** | API 34 | **Fully Supported** | Full VpnService, foreground service type `systemExempted`/`specialUse`. |
| **Android 13** | API 33 | **Fully Supported** | Requires runtime notification permission (`POST_NOTIFICATIONS`). |
| **Android 12 / 12L** | API 31–32 | **Fully Supported** | Standard VpnService and Material 3 Dynamic Color support. |
| **Android 10 / 11** | API 29–30 | **Fully Supported** | Scoped storage compatibility for download inspection. |
| **Android 8.0 / 9.0** | API 26–28 | **Supported (Minimum)** | Baseline required for Java 8/17 desugaring and VpnService stability. |
| **Android < 8.0** | API < 26 | **Unsupported** | Deprecated due to security and modern networking limitations. |
