# AdShield Security Model & System Protection

## 1. Security Architecture Principles

AdShield is designed to withstand adversarial inputs, supply chain compromises, and local device tampering while protecting users from active web and file-based threats.

### Foundational Security Axioms
1. **Remote Data Is Always Untrusted**: Filter rules, threat lists, and release manifests are strictly treated as inert data, never as executable code.
2. **Signed Cryptographic Entitlements**: Licensing relies on asymmetric or HMAC-SHA256 signatures verified locally; clients cannot be tricked by spoofed JSON responses.
3. **No Root CA / No Man-in-the-Middle (MITM)**: We explicitly reject TLS interception. User encrypted communications (e.g. banking, HTTPS web) remain end-to-end encrypted with their original server certificates.
4. **Defense in Depth**: Multiple security layers (DNS wire filtering, domain reputation, download analysis, sandboxed quarantine) protect the user independently.

---

## 2. Supply Chain & Release Security

### 2.1 APK Signing & Release Integrity
- Every production APK is signed using a dedicated Android release signing key managed strictly in secure CI environment secrets.
- Unsigned, debug, or internal test builds are never served via the public download portal or release metadata API.
- All public releases include verifiable SHA-256 integrity checksums published alongside the release artifact.

### 2.2 Dependency Governance
- Zero third-party advertising or analytics SDKs.
- Dependency catalog locking via `gradle/libs.versions.toml`.
- Continuous secret scanning via GitLeaks in CI to prevent accidental credential commits.

---

## 3. Remote Data Input Sanitization & Parser Security

Every remote filter list and threat feed must pass rigorous pipeline validation prior to activation:
1. **Transport Security**: Enforced HTTPS with valid TLS certificates for all downloads.
2. **Payload Size Gate**: Hard limit on input file sizes (e.g. maximum 30 MB per source) to prevent memory-exhaustion DoS attacks.
3. **Strict Syntax Grammar**: The parser strictly matches accepted formats (`0.0.0.0 domain`, `||domain^`, `@@||domain^`). Unrecognized tokens, shell scripts, or binary escapes are immediately discarded.
4. **Execution Prevention**: The filter compilation engine produces an in-memory Trie data structure. Rules cannot execute shell commands, invoke Android components, or alter permissions.

---

## 4. Local Quarantine Vault Architecture

When suspicious or confirmed malicious files (such as sideloaded APKs or malicious scripts) are detected:
- **Immediate Renaming & Neutralization**: Files moved to quarantine are renamed with a `.quarantine` extension and stripped of executable permissions (`chmod 0600`).
- **Sandbox Isolation**: Files are relocated to the application's internal private storage directory (`context.filesDir/quarantine/`), rendering them inaccessible to Android's media scanner, package installer, or other user apps.
- **Encrypted Metadata**: Threat origin, detection timestamp, SHA-256 hash, and original file path are stored in an encrypted local database.
- **Controlled Restoration**: Restoration requires an explicit, multi-step confirmation dialogue and warning.

---

## 5. Security Vulnerability Disclosure Policy

If you discover a potential vulnerability in AdShield (Android client, backend API, or web portal), please contact the engineering team confidentially:
- **Email**: `security@adshield.internal`
- **PGP Key**: Fingerprint `9B4E 23F1 D80C 112A 7E85 6400 AD54 1337 AD54 SHLD`
- **Response SLA**: Initial triage within 24 hours; remediation deployment within 72 hours for critical vulnerabilities.
