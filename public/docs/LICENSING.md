# AdShield Licensing, Trial & Cryptographic Entitlement Model

## 1. Licensing Philosophy & Offline-First Guarantees

AdShield is a commercial product offering robust privacy protection. However, **licensing verification must never penalize legitimate users during temporary network drops or server outages**.

### Core Guarantees:
1. **No Constant Connectivity Requirement**: Normal local ad-blocking, threat protection, and DNS filtering operate 100% offline.
2. **Offline Grace Window (14 Days)**: If the client cannot reach the licensing verification endpoint, filtering continues without interruption for up to 14 days using the securely cached local entitlement token.
3. **No Ransomware Lockouts**: If a subscription lapses, AdShield degrades gracefully to free baseline protection (or notifies the user) rather than bricking device networking.

---

## 2. Supported Plans & Entitlement Types

| Plan Type | Pricing (NGN / USD) | Duration | Description & Terms |
| :--- | :--- | :--- | :--- |
| **7-Day Premium Trial** | **₦0** ($0) | 7 Days | Automatically initiated on first application launch. Unlocks 100% of premium threat protection, download analysis, and custom filters. No payment card required upfront. |
| **Student Plan** | **₦500/mo** or **₦2,500/yr** | Monthly / 365 Days | Specially discounted for Nigerian university & polytechnic students. Saves mobile internet data and provides campus Wi-Fi threat interception. |
| **Annual Subscription** | **₦4,500/yr** (~$3.00) | 365 Days (Recurring) | Full access with discounted annual commitment (~₦375/mo). Continuous priority filter intelligence updates. |
| **Lifetime License** | **₦9,500 once** (~$6.50) | Non-expiring | One-time purchase for the lifetime of the AdShield product under applicable license terms. Zero recurring bank debits. |

> **Lifetime Notice**: *"Lifetime access grants full licensing to the AdShield application across supported Android versions. It does not guarantee that third-party public filter providers will remain active forever."*

---


## 3. Cryptographic Entitlement Token Specification

When a license or trial is validated, the backend issues a signed JSON Web Token (JWT) or HMAC-SHA256 entitlement payload:

```json
{
  "entitlementId": "ent_99a8b1c2d3e4",
  "licenseType": "YEARLY",
  "deviceInstallId": "4a8e23f9-712b-4cd3-a15e-9988aabbccdd",
  "issuedAt": 1727118000,
  "expiresAt": 1758654000,
  "gracePeriodDays": 14,
  "signature": "c8f3e1b7a2d4e8c6..."
}
```

### Verification Flow:
1. Client verifies signature using the bundled public key / secret.
2. Token is cached in Android's encrypted SharedPreferences / DataStore.
3. On every app launch, `expiresAt + (gracePeriodDays * 86400)` is checked locally.
4. Background refresh occurs every 7 days when network is reachable.
