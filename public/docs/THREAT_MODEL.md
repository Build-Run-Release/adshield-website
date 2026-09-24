# AdShield Formal STRIDE Threat Model

## 1. System Assets Under Protection

1. **User Privacy & Device State**: User browsing behavior, search activity, installed applications, network metadata.
2. **Filter & Threat Rule Tables**: In-memory and persisted lookup tries; integrity of blocklists and allowlists.
3. **Licensing & Entitlement State**: Cryptographic tokens, trial timers, subscription validity flags.
4. **Quarantined Artifacts**: Isolated malicious files kept safe from accidental execution.
5. **Backend Admin Credentials & Session Tokens**: Owner dashboard access, release promotion capabilities.
6. **Release Artifacts & Public Download Portal**: Signed production APKs and published SHA-256 digests.

---

## 2. STRIDE Threat Analysis & Mitigations

| Category | Threat Scenario | Impact | Built-in Mitigation |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Adversary spoofs backend licensing server to issue rogue entitlements or force client lockouts. | High | Client validates entitlements using asymmetric signature or HMAC-SHA256 with offline grace caching (14 days). Spoofed or expired responses are rejected. |
| **Tampering** | Malicious actor modifies third-party filter list to block critical services (e.g. system update domains) or inject malicious rules. | High | Automated filter pipeline checks rule-count deviation (> 50% change rejected), syntax validation, and maintains previous known-good database with automatic rollback. |
| **Repudiation** | Unauthorized release published or admin settings altered without an audit trail. | Medium | Admin dashboard logs all configuration changes, releases, and key operations to an append-only audit event log. |
| **Information Disclosure** | Network snooper or compromised backend accesses user browsing history or DNS activity. | Critical | Strict local-first privacy boundary: DNS resolution and filtering happen entirely on-device; zero URL or DNS payloads are ever transmitted to any server. |
| **Denial of Service** | Oversized or cyclic filter feed exhausts device memory or CPU, crashing the Android VPN service. | High | Strict parser memory budgets (< 35 MB heap), maximum rule input file size caps (30 MB), and Trie construction timeouts. |
| **Elevation of Privilege** | Quarantined malicious APK is executed by another app or sideloaded without consent. | Critical | Quarantined files are moved to internal sandboxed app directory (`context.filesDir/quarantine/`), permissions set to read-only for AdShield UID, file extension scrambled to `.quarantine`. |

---

## 3. Attack Surface Decomposition

```text
ATTACK SURFACE LAYER:
1. Public Web Portal (/ & /download)
   ├── Threats: DDoS, Defacement, Malicious APK replacement
   └── Defenses: Helmet HTTP headers, CORS strictness, Rate limiting, SHA-256 validation.

2. Private Backend API (/api/v1/...)
   ├── Threats: Credential brute-force, Entitlement replay, Malicious JSON payload
   └── Defenses: Rate limiting, HMAC signature verification, Schema validation, Zero traffic endpoints.

3. Private Owner Admin (/admin)
   ├── Threats: Session hijacking, CSRF, Unauthorized release promotion
   └── Defenses: Secure HttpOnly SameSite cookies, CSRF protection tokens, RBAC, Audit logging.

4. Android Client (VpnService & Packet Receiver)
   ├── Threats: Malformed DNS packet injection, Intent spoofing, Battery drain
   └── Defenses: Strict UDP packet boundary parsing, Unexported background services, Fail-open recovery.
```
