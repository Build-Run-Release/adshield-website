# How to Host the AdShield Website & APK Download Portal

This step-by-step guide teaches you how to host the AdShield website so anyone can visit your site and download the Android APK file (`AdShield-v1.0.0.apk`).

---

## 🔒 Source Code Separation & GitHub Privacy Safeguard

The project is strictly separated into two independent directories to protect your intellectual property:

| Directory | Purpose | GitHub Policy |
| :--- | :--- | :--- |
| **[`adshield-website/`](file:///c:/Users/Hp/Downloads/New%20folder%20(11)/adshield-website)** | **Public Web Portal & Downloads**: Standalone Node.js server, landing page, download portal, and the compiled `AdShield-v1.0.0.apk`. | **Upload this folder only** to GitHub for hosting on Render, Railway, or VPS. |
| **Android Client Source Code** (`app/`, `core/`, `filtering/`) | **Private Native Android Source**: VPN service, DNS packet engine, triage algorithms, and build scripts. | **NEVER UPLOAD TO GITHUB**. The root [`.gitignore`](file:///c:/Users/Hp/Downloads/New%20folder%20(11)/.gitignore) strictly ignores all Android source code directories. |

---

## 1. How the Website Works

The website is a lightweight, secure **Node.js + Express** web server located in the [`adshield-website/`](file:///c:/Users/Hp/Downloads/New%20folder%20(11)/adshield-website) folder.

When hosted, it provides:
- **`GET /`** — The public product landing page showcasing features, privacy guarantees, and pricing.
- **`GET /download`** — The public download portal with version details, minimum Android requirements, SHA-256 integrity hash, and a direct download button.
- **`GET /download/:file`** — The binary download stream that delivers the signed `AdShield-v1.0.0.apk` with the proper Android MIME type (`application/vnd.android.package-archive`).
- **`GET /api/v1/releases/latest`** — The metadata API used by the app to check for updates.
- **`GET /admin`** — Your private password-protected owner dashboard.

---

## 2. Quick Start: Test Hosting Locally (Right Now)

You can run the website on your computer and download the APK to your phone over your local Wi-Fi in under 2 minutes.

### Step 1: Ensure the APK is in Place
The pre-compiled, signed release APK is already present in:
```text
adshield-website/public/downloads/AdShield-v1.0.0.apk
```

### Step 2: Start the Web Server
Open a terminal and navigate to the website folder:
```powershell
cd adshield-website
npm start
```

You will see:
```text
[AdShield] Production server running on http://localhost:3000
[AdShield] Public Landing Page: http://localhost:3000/
[AdShield] Public Download:     http://localhost:3000/download
[AdShield] Private Admin:       http://localhost:3000/admin
```

### Step 3: Test on Your Computer
Open your web browser and go to:
- **Landing Page**: `http://localhost:3000/`
- **Download Page**: `http://localhost:3000/download`
- Click **"Download Official APK"** to confirm the download starts!

### Step 4: Download on Your Android Phone via Local Wi-Fi
1. Find your computer's local IP address:
   ```powershell
   ipconfig
   # Look for "IPv4 Address", e.g. 192.168.1.50
   ```
2. Make sure your Android phone is connected to the **same Wi-Fi network**.
3. Open Chrome or any browser on your Android phone and visit:
   ```text
   http://YOUR_LOCAL_IP:3000/download
   # Example: http://192.168.1.50:3000/download
   ```
4. Tap **Download Official APK** and install AdShield directly on your device!

---

## 3. Free Cloud Hosting: Render.com (Recommended for Beginners)

If you want a public URL (like `https://adshield.onrender.com`) that anyone in the world can access 24/7 for free without managing servers:

### Step 1: Push ONLY the `adshield-website` Folder to GitHub
1. Create a new empty repository on [GitHub](https://github.com) (e.g. `adshield-website`).
2. In your terminal, enter the `adshield-website` folder and push **only** this folder:
   ```bash
   cd adshield-website
   git init
   git add .
   git commit -m "Deploy AdShield website and APK download portal"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/adshield-website.git
   git push -u origin main
   ```
   
### Step 2: Deploy on Render
1. Create a free account at [Render.com](https://render.com).
2. Click **New +** → **Web Service**.
3. Select your `adshield-website` GitHub repository.
4. Configure the settings:
   - **Name**: `adshield`
   - **Root Directory**: *(leave blank — the repository itself is the website)*
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
5. In **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `ADMIN_PASSWORD` = `ChooseYourSecretPassword`
   - `ENTITLEMENT_SIGNING_KEY` = `AnyRandomSecretKeyForLicensing`
6. Click **Create Web Service**.

Within 2 minutes, Render will provide a live HTTPS URL (e.g. `https://adshield.onrender.com`) with automated SSL certificates!

---

## 4. Production Hosting: Linux VPS (Ubuntu / Debian)

For complete commercial control, custom domains (`adshield.com`), and unlimited bandwidth, deploy on a $5/mo VPS (DigitalOcean, Linode, Hetzner, AWS Lightsail, or Vultr).

### Step 1: Server Setup & Prerequisites
Connect to your server via SSH:
```bash
ssh root@YOUR_SERVER_IP
```

Update system packages and install Node.js 20 LTS:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx ufw
```

Install PM2 (process manager to keep your server running forever):
```bash
sudo npm install -g pm2
```

### Step 2: Clone and Setup AdShield
```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/adshield.git /var/www/adshield
cd /var/www/adshield/server

# Install server dependencies
npm install --production

# Create storage directory for downloads
mkdir -p public/downloads
```

Copy your compiled `app-release.apk` into `/var/www/adshield/server/public/downloads/AdShield-v1.0.0.apk`.

### Step 3: Start the Web App with PM2
```bash
cd /var/www/adshield/server

# Start the application
pm2 start src/server.js --name "adshield-web" --env production

# Ensure PM2 restarts automatically if the server reboots
pm2 save
pm2 startup
```

Check that the server is running:
```bash
pm2 status
```

### Step 4: Configure Nginx Reverse Proxy
Create an Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/adshield
```

Paste the following configuration (replace `adshield.com` with your domain or server IP):
```nginx
server {
    listen 80;
    server_name adshield.com www.adshield.com;

    # Maximum upload size for APK updates
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/adshield /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 5: Enable Free HTTPS (Let's Encrypt SSL)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d adshield.com -d www.adshield.com
```

Certbot will automatically install the TLS certificate, set up automatic 90-day renewals, and redirect all HTTP traffic to secure HTTPS.

---

## 5. How to Publish a New APK Update

Whenever you build a new version of AdShield (e.g. `v1.1.0`), follow this simple workflow:

1. **Build the New Release APK**:
   ```powershell
   cmd /c "gradlew.bat assembleRelease"
   ```
2. **Calculate the SHA-256 Hash**:
   ```powershell
   Get-FileHash app\build\outputs\apk\release\app-release.apk -Algorithm SHA256
   ```
3. **Copy the New APK to the Downloads Folder**:
   ```powershell
   Copy-Item app\build\outputs\apk\release\app-release.apk server\public\downloads\AdShield-v1.1.0.apk
   ```
4. **Update Release Metadata** in [`server/src/api/releases.js`](file:///c:/Users/Hp/Downloads/New%20folder%20(11)/server/src/api/releases.js):
   ```javascript
   {
     id: "rel_110",
     channel: "stable",
     version: "1.1.0",
     versionCode: 110,
     minimumAndroidVersion: 26,
     releaseDate: "2026-10-01",
     downloadUrl: "/download/AdShield-v1.1.0.apk",
     sha256: "YOUR_NEW_SHA256_HASH",
     fileSizeBytes: 1869167,
     status: "STABLE",
     changelog: "Updated filter rules and threat database definitions."
   }
   ```
5. **Restart Server** (if on VPS):
   ```bash
   pm2 restart adshield-web
   ```

All website visitors will immediately see and download the new release, and existing app installations will detect the update via `/api/v1/releases/latest`.

---

## 6. Security & Privacy Guarantees

- **No User Traffic Passes Through This Server**: The website only delivers the APK binary and filter rule lists. Android users perform all DNS resolution and threat interception locally on their own device.
- **Privacy Gate Active**: The backend middleware rejects any request containing browsing history, personal queries, or visited URLs with HTTP 400 (`PRIVACY_VIOLATION_REJECTED`).
- **Owner Admin Access**: Your metrics and release controls are protected under `/admin`. Keep your `ADMIN_PASSWORD` strong and never commit production secrets into public repositories.
