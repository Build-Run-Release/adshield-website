# AdShield Private Owner Admin Dashboard Specification

## 1. Scope & Privacy Guardrail

The Private Admin Dashboard is built exclusively for the owner and authorized operators to manage business metrics, licensing entitlements, application releases, and filter sources.

> **CRITICAL PRIVACY INVARIANT**: The Admin Dashboard and its underlying database **NEVER** receive, store, or display user browsing histories, visited URLs, DNS lookup logs, download contents, or local security events.

---

## 2. Admin Authentication & Security Controls

1. **Authentication Boundary**: All routes under `/admin` require authenticated session cookies (`HttpOnly`, `Secure`, `SameSite=Strict`).
2. **Brute Force Protection**: Rate limiting on login attempts (maximum 5 failed attempts per 15 minutes before temporary lockout).
3. **Role-Based Access Control (RBAC)**:
   - `OWNER`: Full control over releases, promotions, revoking, financial metrics, and admin user creation.
   - `OPERATOR`: Can view metrics, trigger filter cache purges, inspect audit logs, and register draft releases.
4. **Tamper-Evident Audit Logging**: Every administrative action (login, release status change, license key generation) is recorded with timestamp, operator ID, IP address, and operation payload.

---

## 3. Core Functional Capabilities

### 3.1 Business & Revenue Metrics
- **User Counts**: Total registered licenses, active trial users, active subscribers, lifetime license holders.
- **Financial Run Rate**: Monthly Recurring Revenue (MRR), Annual Recurring Revenue (ARR), total lifetime revenue, refund counts.
- **Adoption Distribution**: Active client versions (e.g. `v1.0.0`: 78%, `v0.9.8`: 22%).

### 3.2 Release Lifecycle Management
Owners can manage releases through a strict lifecycle pipeline:
```text
[DRAFT] ──► [INTERNAL] ──► [BETA] ──► [STABLE] ──► [RETIRED]
                                         │
                                         └──► [REVOKED] (Emergency revocation)
```
- **Promotion to Stable**: Updates the public `/download` page and client update API immediately.
- **Revocation**: Immediately halts distribution and instructs clients to roll back or notify users.

### 3.3 Filter Catalog Management
- Inspect upstream source status, last crawl timestamp, active rule count, and trigger manual crawl refreshes.
