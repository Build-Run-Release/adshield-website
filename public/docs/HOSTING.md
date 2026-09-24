# AdShield Infrastructure, Hosting & Deployment Architecture

## 1. Hosting Topology & Security Boundaries

AdShield's web services and backend APIs are hosted under a unified, cleanly segregated domain and network architecture:

```text
                               +-----------------------------+
                               |     DNS / Edge Gateway      |
                               |    (Cloudflare / CDN / WAF) |
                               +--------------+--------------+
                                              |
                       +----------------------+----------------------+
                       |                                             |
             (Public Web Traffic)                           (Private Admin IP/MFA)
                       v                                             v
        +------------------------------+             +-------------------------------+
        |    adshield.com (Port 443)   |             |  adshield.com/admin (Private) |
        |                              |             |                               |
        |  - Landing Page (/)          |             |  - Owner Authentication (MFA) |
        |  - Download (/download)      |             |  - Business & Revenue Metrics |
        |  - Pricing (/pricing)        |             |  - Release Manager Pipeline   |
        |  - Public Docs (/docs)       |             |  - Filter Source Management   |
        |  - Release API (/api/v1/...) |             |  - Tamper-Evident Audit Logs  |
        +------------------------------+             +-------------------------------+
```

---

## 2. Environments & Configurations

| Parameter | Development | Staging | Production |
| :--- | :--- | :--- | :--- |
| **Port** | 3000 | 8080 | 8080 (behind Nginx/Cloudflare reverse proxy) |
| **HTTPS** | Localhost self-signed / HTTP | Managed Let's Encrypt | Automated TLS 1.3 / HSTS 2-Year |
| **Admin Auth** | Local dev credentials | Strong password + mock MFA | Scrypt / Argon2id password hash + TOTP 2FA |
| **Database** | SQLite / Local memory | SQLite persistent file | PostgreSQL / Managed SQLite |
| **CORS Policy** | Permissive for dev | Restricted to staging domain | Strict whitelist (`adshield.com` only) |

---

## 3. Environment Variables Reference

```bash
# Server Configuration
PORT=3000
NODE_ENV=production
BASE_URL=https://adshield.com

# Security & Secrets
ADMIN_SECRET_KEY=replace_with_32_byte_random_hex
ENTITLEMENT_SIGNING_KEY=replace_with_64_byte_crypto_secret
SESSION_SECRET=replace_with_session_encryption_secret

# Release Storage
RELEASE_STORAGE_PATH=./storage/releases
FILTER_STORAGE_PATH=./storage/filters
```

---

## 4. Practical Step-by-Step Deployment Guide

For detailed walkthroughs on deploying locally, to free cloud hosts (Render), or setting up Nginx, PM2, and Let's Encrypt SSL on an Ubuntu VPS, see:
👉 **[How to Host Website & Download Portal](HOW_TO_HOST_WEBSITE.md)**

