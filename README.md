# AdShield Web Portal & Download Center

This folder contains the **standalone website, download portal, and backend API** for AdShield.

> **Notice**: This folder is completely decoupled from the Android client application source code. It contains only the web assets, server APIs, and the signed, ready-to-install Android APK (`public/downloads/AdShield-v1.0.0.apk`).

---

## What This Website Includes

- **Public Landing Page (`/`)**: Feature showcase, zero-surveillance privacy guarantee, and pricing tables.
- **Public Download Center (`/download`)**: Direct download button for `AdShield-v1.0.0.apk`, minimum Android version requirements (Android 8.0+ / API 26+), and SHA-256 hash.
- **Release Metadata API (`/api/v1/releases/latest`)**: JSON endpoint queried by the Android app to detect updates.
- **Owner Admin Dashboard (`/admin`)**: Private management interface for release promotion/revocation and revenue metrics.
- **Zero-Surveillance Privacy Gate**: Middleware automatically rejecting any telemetry requests that attempt to transmit browsing history or DNS logs.

---

## Quick Start (Run Locally)

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
```

Visit:
- **Landing Page**: `http://localhost:3000/`
- **Download Portal**: `http://localhost:3000/download`
- **Owner Dashboard**: `http://localhost:3000/admin` (Default pass: `admin123`)

---

## How to Host on GitHub & Deploy to Cloud (Render / Railway / VPS)

To host this website online so the public can download the APK:

1. **Initialize Git inside THIS folder only**:
   ```bash
   cd adshield-website
   git init
   git add .
   git commit -m "Deploy AdShield website and APK download portal"
   ```
2. **Push to a New GitHub Repository** (e.g. `your-username/adshield-website`):
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/adshield-website.git
   git push -u origin main
   ```
3. **Deploy with 1-Click on [Render.com](https://render.com)**:
   - Create a free Web Service linked to `adshield-website`.
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Set environment variables: `NODE_ENV=production`, `ADMIN_PASSWORD=your_password`.

Your website and APK download portal will be live on HTTPS worldwide!
