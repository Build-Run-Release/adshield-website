/**
 * AdShield Web & Backend Infrastructure
 * Serves:
 * - Public Product Landing Page (/)
 * - Public Download Portal (/download)
 * - Public Pricing (/pricing)
 * - Public Documentation (/docs)
 * - Public APIs (/api/v1/...)
 * - Private Owner Admin Dashboard (/admin)
 */

const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");

const { releaseStore, releaseApiRouter } = require("./api/releases");
const { licensingApiRouter } = require("./api/licensing");
const { filtersApiRouter } = require("./api/filters");
const { adminRouter } = require("./admin/adminRouter");

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Security Headers
app.use(helmet({
  contentSecurityPolicy: false // Allows self-contained scripts for interactive dashboard & download page
}));

// 2. Cookie Parser & Body Parsers
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.static(path.join(__dirname, "../public")));

// 3. MANDATORY PRIVACY GATE MIDDLEWARE
// Automatically rejects any request that attempts to transmit prohibited user browsing or security activity
const PROHIBITED_KEYS = [
  "url", "urls", "visitedurls", "browsinghistory", "dnshistory", "dnsquery",
  "dnsqueries", "trafficdata", "downloadcontents", "filecontents", "quarantinepayload",
  "searchquery", "searchqueries"
];

app.use((req, res, next) => {
  const checkObject = (obj) => {
    if (!obj || typeof obj !== "object") return null;
    for (const key of Object.keys(obj)) {
      const normalized = key.toLowerCase().replace(/[^a-z]/g, "");
      if (PROHIBITED_KEYS.includes(normalized)) {
        return key;
      }
      if (typeof obj[key] === "object") {
        const nested = checkObject(obj[key]);
        if (nested) return nested;
      }
    }
    return null;
  };

  const badBodyKey = checkObject(req.body);
  const badQueryKey = checkObject(req.query);

  if (badBodyKey || badQueryKey) {
    return res.status(400).json({
      error: "PRIVACY_VIOLATION_REJECTED",
      message: `The field '${badBodyKey || badQueryKey}' violates AdShield's Zero-Surveillance Architecture. User browsing activity, DNS lookups, and personal files must never be transmitted to the backend.`,
      privacyPolicyUrl: "/docs/PRIVACY.md"
    });
  }

  next();
});

// 4. API Routes
app.use("/api/v1/releases", releaseApiRouter(express));
app.use("/api/v1/licenses", licensingApiRouter(express));
app.use("/api/v1/filters", filtersApiRouter(express));

// 5. Admin Dashboard Routes
app.use("/admin", adminRouter(express));

// 6. Public Web Pages

// --- Public Landing Page: GET / ---
app.get("/", (req, res) => {
  const latest = releaseStore.getPublicLatest("stable");
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AdShield — Private Protection for Your Android Device</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="AdShield is a commercial-grade, native Android privacy and threat protection system. Block ads, suppress trackers, detect malicious sites, and keep your data on your device.">
  <style>
    :root { --primary: #005ac1; --primary-dark: #004291; --bg: #f8fafc; --text: #0f172a; --card: #ffffff; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #0b1120; --text: #f8fafc; --card: #131d35; --primary: #38bdf8; --primary-dark: #0284c7; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; line-height: 1.6; }
    .nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 8%; background: var(--card); border-bottom: 1px solid rgba(148,163,184,0.2); }
    .logo { font-size: 22px; font-weight: 800; color: var(--primary); text-decoration: none; display: flex; align-items: center; gap: 8px; }
    .nav-links a { margin-left: 24px; color: var(--text); text-decoration: none; font-weight: 500; font-size: 15px; }
    .nav-links a:hover { color: var(--primary); }
    .hero { text-align: center; padding: 80px 8% 60px; max-width: 860px; margin: auto; }
    .hero h1 { font-size: 48px; line-height: 1.15; font-weight: 800; margin-bottom: 20px; }
    .hero p { font-size: 20px; color: #64748b; margin-bottom: 32px; }
    .btn { display: inline-block; background: #005ac1; color: white; padding: 14px 32px; border-radius: 10px; font-size: 16px; font-weight: 600; text-decoration: none; transition: 0.2s; }
    .btn:hover { background: #004291; }
    .btn-outline { background: transparent; border: 2px solid #005ac1; color: #005ac1; margin-left: 12px; }
    .btn-outline:hover { background: rgba(0,90,193,0.08); }
    .privacy-callout { background: #ecfdf5; border: 1px solid #10b981; border-radius: 12px; padding: 20px; max-width: 860px; margin: 0 auto 60px; text-align: center; color: #065f46; font-size: 16px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; max-width: 1100px; margin: auto; padding: 0 8% 60px; }
    .feature-card { background: var(--card); padding: 28px; border-radius: 14px; border: 1px solid rgba(148,163,184,0.15); box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
    .feature-card h3 { margin-top: 0; color: var(--primary); font-size: 20px; }
    .pricing-table { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 20px; max-width: 1140px; margin: auto; padding: 0 8% 30px; }
    .price-card { background: var(--card); border: 2px solid rgba(148,163,184,0.2); border-radius: 14px; padding: 26px 18px; text-align: center; position: relative; display: flex; flex-direction: column; justify-content: space-between; }
    .price-card.featured { border-color: #005ac1; box-shadow: 0 8px 30px rgba(0,90,193,0.15); }
    .price-card.student { border-color: #10b981; box-shadow: 0 8px 30px rgba(16,185,129,0.15); }
    .price { font-size: 34px; font-weight: 800; margin: 12px 0 4px; color: var(--primary); }
    .price-features { list-style: none; padding: 0; margin: 16px 0; text-align: left; font-size: 13px; color: #64748b; }
    .price-features li { margin-bottom: 8px; padding-left: 18px; position: relative; }
    .price-features li::before { content: "✓"; position: absolute; left: 0; color: #10b981; font-weight: bold; }
    .footer { background: var(--card); border-top: 1px solid rgba(148,163,184,0.2); padding: 40px 8%; text-align: center; font-size: 14px; color: #64748b; }
    .footer a { color: #64748b; margin: 0 10px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="nav">
    <a href="/" class="logo"><img src="/images/adshield_icon.png" width="34" height="34" style="border-radius:8px; vertical-align:middle;"> AdShield</a>
    <div class="nav-links">
      <a href="/#features">Features</a>
      <a href="/#pricing">Pricing</a>
      <a href="/download">Download</a>
      <a href="/docs/PRIVACY.md">Privacy Policy</a>
      <a href="/admin">Owner Portal</a>
    </div>
  </div>

  <div class="hero">
    <h1>Private Protection for Your Android Device.</h1>
    <p>Block intrusive ads and background trackers. Defend against phishing and malicious domains. Detect suspicious downloads — while your browsing activity strictly stays on your device.</p>
    <div>
      <a href="/download" class="btn">Download for Android (${latest ? 'v' + latest.version : 'v1.0.0'})</a>
      <a href="#features" class="btn btn-outline">Explore Features</a>
    </div>
  </div>

  <div class="privacy-callout">
    <strong>Absolute Zero-Surveillance Promise:</strong> AdShield evaluates DNS and network queries locally on-device. Your browsing history, visited URLs, DNS lookups, search terms, and downloaded files are never uploaded to any server.
  </div>

  <div id="features" class="grid">
    <div class="feature-card">
      <h3>🚫 System-Wide Ad Blocking</h3>
      <p>Local DNS filtering blocks intrusive display ads, video popups, and banner networks across Android browsers and compatible apps without requiring root or risky TLS certificates.</p>
    </div>
    <div class="feature-card">
      <h3>🕵️ Tracker Suppression</h3>
      <p>Stops background telemetry and behavioral analytics SDKs from profiling your personal habits, location, and app activity.</p>
    </div>
    <div class="feature-card">
      <h3>☣️ Malicious Website Defense</h3>
      <p>Real-time protection against confirmed malware distribution hosts, phishing portals, scam pages, and exploit infrastructure.</p>
    </div>
    <div class="feature-card">
      <h3>🔀 Dangerous Redirect Interception</h3>
      <p>Identifies ad-network hopper chains routing users into deceptive landing pages or drive-by payload drops.</p>
    </div>
    <div class="feature-card">
      <h3>📦 Download Threat Analysis</h3>
      <p>Inspects downloaded APKs against known malware hashes and flags dangerous permission combinations like banking overlay abuses.</p>
    </div>
    <div class="feature-card">
      <h3>🔒 Sandboxed Local Quarantine</h3>
      <p>Neutralizes detected threats by isolating them inside the application sandbox with scrambled file extensions and zero execution rights.</p>
    </div>
  </div>

  <h2 style="text-align:center; font-size:32px; margin-bottom:8px;">Affordable, Student-Friendly Pricing</h2>
  <p style="text-align:center; color:#64748b; margin-bottom:20px;">Protect your Android device and save mobile data without breaking the bank. Every install begins with a 7-day free trial.</p>

  <div style="text-align:center; max-width:820px; margin:0 auto 36px; padding:0 8%;">
    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:12px 18px; color:#1e40af; font-size:14px; display:inline-block;">
      📱 <strong>Save Money on Mobile Data:</strong> By blocking intrusive ad videos, auto-playing popups, and hidden tracking scripts, AdShield can save up to <strong>35% of your mobile internet data</strong> every month!
    </div>
  </div>

  <div id="pricing" class="pricing-table">
    <div class="price-card">
      <div>
        <h3>7-Day Free Trial</h3>
        <div class="price">₦0</div>
        <p style="font-size:13px; color:#64748b; margin-bottom:12px;">Full premium access. No bank card or email required upfront.</p>
        <ul class="price-features">
          <li>100% full feature trial</li>
          <li>System-wide ad & tracker blocking</li>
          <li>Dangerous link & scam interception</li>
          <li>Local sandboxed quarantine</li>
        </ul>
      </div>
      <a href="/download" class="btn" style="width:100%; box-sizing:border-box; margin-top:16px;">Start Free Trial</a>
    </div>

    <div class="price-card student">
      <div>
        <div style="background:#10b981; color:white; font-size:11px; font-weight:bold; padding:4px 10px; border-radius:20px; display:inline-block; margin-bottom:8px;">🎓 STUDENT SPECIAL</div>
        <h3>Student Plan</h3>
        <div class="price">₦500<span style="font-size:14px; font-weight:normal; color:#64748b;">/mo</span></div>
        <div style="font-size:12px; color:#10b981; font-weight:600; margin-bottom:12px;">or ₦2,500/year (saves 58%)</div>
        <ul class="price-features">
          <li>Affordable campus pricing</li>
          <li>Saves mobile data bundles</li>
          <li>Blocks aggressive campus Wi-Fi popups</li>
          <li>Low RAM & battery optimized</li>
        </ul>
      </div>
      <a href="/download" class="btn" style="background:#10b981; width:100%; box-sizing:border-box; margin-top:16px;">Get Student Plan</a>
    </div>

    <div class="price-card featured">
      <div>
        <div style="background:#005ac1; color:white; font-size:11px; font-weight:bold; padding:4px 10px; border-radius:20px; display:inline-block; margin-bottom:8px;">⭐ MOST POPULAR</div>
        <h3>Yearly Plan</h3>
        <div class="price">₦4,500<span style="font-size:14px; font-weight:normal; color:#64748b;">/year</span></div>
        <div style="font-size:12px; color:#005ac1; font-weight:600; margin-bottom:12px;">Only ~₦375 per month</div>
        <ul class="price-features">
          <li>Continuous threat intelligence feeds</li>
          <li>Banking overlay malware defense</li>
          <li>Dangerous APK inspector</li>
          <li>Priority customer support</li>
        </ul>
      </div>
      <a href="/download" class="btn" style="width:100%; box-sizing:border-box; margin-top:16px;">Select Yearly</a>
    </div>

    <div class="price-card">
      <div>
        <div style="background:#0284c7; color:white; font-size:11px; font-weight:bold; padding:4px 10px; border-radius:20px; display:inline-block; margin-bottom:8px;">💎 ONE-TIME</div>
        <h3>Lifetime License</h3>
        <div class="price">₦9,500<span style="font-size:14px; font-weight:normal; color:#64748b;"> once</span></div>
        <div style="font-size:12px; color:#64748b; font-weight:600; margin-bottom:12px;">Zero recurring deductions</div>
        <ul class="price-features">
          <li>One-time payment for life*</li>
          <li>Permanent application updates</li>
          <li>Never worry about monthly debits</li>
          <li>Zero-surveillance privacy forever</li>
        </ul>
      </div>
      <a href="/download" class="btn btn-outline" style="width:100%; box-sizing:border-box; margin-top:16px; margin-left:0;">Get Lifetime</a>
    </div>
  </div>

  <div style="max-width:860px; margin:auto; padding:0 8% 30px; text-align:center;">
    <div style="background:var(--card); border:1px solid rgba(148,163,184,0.25); border-radius:12px; padding:16px 20px; display:inline-flex; align-items:center; justify-content:center; gap:12px; flex-wrap:wrap; font-size:13.5px; color:#64748b;">
      <span style="font-weight:600; color:var(--text);">💳 Supported Nigerian Payment Options:</span>
      <span>Bank Transfer</span>
      <span>•</span>
      <span>USSD</span>
      <span>•</span>
      <span>OPay & PalmPay</span>
      <span>•</span>
      <span>Verve, Mastercard & Visa</span>
    </div>
  </div>

  <div style="max-width:800px; margin:auto; padding:0 8% 40px; font-size:12px; color:#94a3b8; text-align:center;">
    *Lifetime notice: Lifetime means lifetime access to the licensed AdShield application across supported Android versions. It does not guarantee that third-party public filter providers will remain available forever. AdShield is a privacy threat-mitigation layer and not an antivirus replacement.
  </div>

  <div class="footer">
    <p>© 2026 AdShield. Built native for Android 8.0+ (API 26+).</p>
    <div>
      <a href="/docs/PRIVACY.md">Privacy Policy</a>
      <a href="/docs/SECURITY.md">Security Model</a>
      <a href="/docs/ANDROID_LIMITATIONS.md">Android Limitations</a>
      <a href="/docs/RELEASE.md">Release Notes</a>
      <a href="/admin">Private Owner Admin</a>
    </div>
  </div>
</body>
</html>
  `);
});

// --- Public Download Page: GET /download ---
app.get("/download", (req, res) => {
  const latest = releaseStore.getPublicLatest("stable");
  if (!latest) {
    return res.status(503).send("No stable release currently available for download.");
  }

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Download AdShield for Android</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 40px 8%; line-height: 1.6; }
    .container { max-width: 680px; margin: auto; background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    h1 { margin-top: 0; color: #005ac1; }
    .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-size: 13px; margin-bottom: 20px; }
    .meta-box { background: #f1f5f9; padding: 18px; border-radius: 10px; margin: 20px 0; font-size: 14px; }
    .meta-box div { margin-bottom: 6px; }
    .hash { font-family: monospace; word-break: break-all; color: #475569; font-size: 12px; }
    .btn { display: block; text-align: center; background: #005ac1; color: white; padding: 16px; border-radius: 10px; font-size: 18px; font-weight: bold; text-decoration: none; margin: 24px 0; }
    .btn:hover { background: #004291; }
    ol { padding-left: 20px; font-size: 14px; color: #475569; }
    li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <a href="/" style="color:#005ac1; text-decoration:none; font-weight:500;">← Back to AdShield</a>
    <div style="display:flex; align-items:center; gap:16px; margin-top:20px; margin-bottom:16px;">
      <img src="/images/adshield_icon.png" width="56" height="56" style="border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
      <div>
        <h1 style="margin:0; font-size:26px; color:#005ac1;">Download AdShield</h1>
        <span class="badge" style="margin-top:6px; margin-bottom:0;">OFFICIAL STABLE RELEASE</span>
      </div>
    </div>

    <div class="meta-box">
      <div><strong>Current Version:</strong> v${latest.version} (Build ${latest.versionCode})</div>
      <div><strong>Minimum Android Version:</strong> Android 8.0 Oreo+ (API ${latest.minimumAndroidVersion}+)</div>
      <div><strong>Release Date:</strong> ${latest.releaseDate}</div>
      <div><strong>SHA-256 Digest:</strong></div>
      <div class="hash">${latest.sha256}</div>
    </div>

    <a href="${latest.downloadUrl}" class="btn">Download Official APK</a>

    <h3>Safe Android Sideloading Instructions</h3>
    <ol>
      <li>Download the official APK file above directly from <code>adshield.com</code>.</li>
      <li>Open your Android Downloads folder and tap <strong>AdShield-v${latest.version}.apk</strong>.</li>
      <li>If Android prompts to allow installation from your browser, grant the permission.</li>
      <li>Complete the setup onboarding and grant the native <strong>VpnService</strong> connection request.</li>
      <li>Your 7-day full premium trial begins automatically. System-wide filtering is now active!</li>
    </ol>

    <div style="font-size:12px; color:#94a3b8; margin-top:24px; text-align:center;">
      Every official APK is signed with AdShield's production release key. Never install APKs from unverified third-party sources.
    </div>
  </div>
</body>
</html>
  `);
});

// APK binary download endpoint
app.get("/download/:file", (req, res) => {
  const fileName = req.params.file;
  const publicApk = path.join(__dirname, "../public/downloads", fileName);
  if (fs.existsSync(publicApk)) {
    return res.download(publicApk, fileName);
  }
  // High-speed CDN fallback for serverless deployments (Vercel / AWS Lambda)
  if (fileName.toLowerCase().includes("adshield")) {
    return res.redirect("https://github.com/Build-Run-Release/adshield-website/releases/download/v1.0.0/AdShield-v1.0.0.apk");
  }
  // Check build outputs directly
  const buildApk = path.join(__dirname, "../../app/build/outputs/apk/release/app-release.apk");
  if (fs.existsSync(buildApk)) {
    return res.download(buildApk, fileName);
  }
  // Fallback placeholder for environments without built binaries
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.send("ADSHIELD_OFFICIAL_SIGNED_RELEASE_BINARY_PLACEHOLDER_4A8E23F9");
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[AdShield] Production server running on http://localhost:${PORT}`);
    console.log(`[AdShield] Public Landing Page: http://localhost:${PORT}/`);
    console.log(`[AdShield] Public Download:     http://localhost:${PORT}/download`);
    console.log(`[AdShield] Private Admin:       http://localhost:${PORT}/admin`);
  });
}

module.exports = app;
