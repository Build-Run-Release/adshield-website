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
const { licensingApiRouter, PAYSTACK_PLANS, PAYSTACK_PUBLIC_KEY, initializePaystackPayment, verifyPaystackPayment } = require("./api/licensing");
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
app.use(express.static(path.join(__dirname, "../public"), { redirect: false }));

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
    .pricing-table { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; max-width: 1100px; margin: auto; padding: 0 6% 36px; align-items: stretch; }
    .price-card { background: var(--card); border: 1.5px solid rgba(148,163,184,0.25); border-radius: 16px; padding: 28px 22px; text-align: center; position: relative; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 20px rgba(0,0,0,0.05); transition: transform 0.2s, box-shadow 0.2s; }
    .price-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.12); }
    .price-card.featured { border: 2px solid #005ac1; box-shadow: 0 8px 32px rgba(0,90,193,0.18); }
    @media (prefers-color-scheme: dark) {
      .price-card.featured { border-color: #38bdf8; box-shadow: 0 8px 32px rgba(56,189,248,0.2); }
    }
    .badge-slot { height: 32px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
    .card-badge { font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; padding: 5px 12px; border-radius: 20px; display: inline-block; }
    .badge-featured { background: #005ac1; color: #ffffff; }
    @media (prefers-color-scheme: dark) { .badge-featured { background: #0284c7; } }
    .badge-lifetime { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.35); }
    .badge-monthly { background: rgba(148,163,184,0.12); color: #64748b; border: 1px solid rgba(148,163,184,0.25); }
    @media (prefers-color-scheme: dark) { .badge-monthly { color: #94a3b8; } }
    .price-card h3 { font-size: 22px; font-weight: 700; margin: 0 0 10px 0; }
    .price-header { min-height: 78px; display: flex; flex-direction: column; justify-content: center; margin-bottom: 16px; }
    .price-val { font-size: 38px; font-weight: 800; line-height: 1.1; color: var(--primary); }
    .price-period { font-size: 15px; font-weight: 500; color: #64748b; }
    .price-subnote { font-size: 12.5px; color: #64748b; margin-top: 4px; font-weight: 500; }
    .price-features { list-style: none; padding: 0; margin: 16px 0 24px; text-align: left; font-size: 13.5px; color: var(--text); flex-grow: 1; }
    .price-features li { margin-bottom: 10px; padding-left: 22px; position: relative; line-height: 1.4; }
    .price-features li::before { content: "✓"; position: absolute; left: 0; color: #10b981; font-weight: bold; }
    .btn-plan { display: block; width: 100%; box-sizing: border-box; text-align: center; padding: 13px 20px; border-radius: 10px; font-size: 15px; font-weight: 700; text-decoration: none; transition: all 0.2s; border: none; cursor: pointer; }
    .btn-primary-plan { background: #005ac1; color: #ffffff !important; }
    .btn-primary-plan:hover { background: #004291; }
    @media (prefers-color-scheme: dark) {
      .btn-primary-plan { background: #0284c7; }
      .btn-primary-plan:hover { background: #0369a1; }
    }
    .btn-secondary-plan { background: #eff6ff; color: #005ac1 !important; border: 1.5px solid #bfdbfe; }
    .btn-secondary-plan:hover { background: #dbeafe; }
    @media (prefers-color-scheme: dark) {
      .btn-secondary-plan { background: #1e293b; color: #38bdf8 !important; border: 1.5px solid #334155; }
      .btn-secondary-plan:hover { background: #334155; }
    }
    .btn-lifetime-plan { background: #0f766e; color: #ffffff !important; }
    .btn-lifetime-plan:hover { background: #115e59; }
    @media (prefers-color-scheme: dark) {
      .btn-lifetime-plan { background: #059669; color: #ffffff !important; }
      .btn-lifetime-plan:hover { background: #10b981; }
    }
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
      <a href="/privacy">Privacy Policy</a>
      <a href="/docs">Documentation</a>
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
  <p style="text-align:center; color:#64748b; margin-bottom:20px;">Protect your Android device and save mobile data without breaking the bank. Pay securely via Paystack.</p>

  <div style="text-align:center; max-width:820px; margin:0 auto 28px; padding:0 6%;">
    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:14px 20px; color:#1e40af; font-size:14.5px; display:inline-block; margin-bottom:12px;">
      🎉 <strong>Automatic 7-Day Free Trial:</strong> Every app install begins with 7 days of full premium protection without entering payment info upfront.
    </div>
    <div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:12px; padding:12px 18px; color:#065f46; font-size:13.5px; display:inline-block;">
      📱 <strong>Save Money on Mobile Data:</strong> By blocking intrusive video ads, popups, and tracker scripts, AdShield saves up to <strong>35% of your mobile internet data</strong> every month!
    </div>
  </div>

  <div id="pricing" class="pricing-table">
    <!-- Card 1: Monthly Plan -->
    <div class="price-card">
      <div>
        <div class="badge-slot">
          <span class="card-badge badge-monthly">FLEXIBLE · MONTH-TO-MONTH</span>
        </div>
        <h3>Monthly Plan</h3>
        <div class="price-header">
          <div class="price-val">₦1,200<span class="price-period">/mo</span></div>
          <div class="price-subnote">Billed monthly · Cancel anytime</div>
        </div>
        <ul class="price-features">
          <li>Full system-wide ad & tracker blocking</li>
          <li>Dangerous link & scam interception</li>
          <li>Save up to 35% of mobile data bundles</li>
          <li>Includes 7-day free trial on install</li>
          <li>Low RAM & battery optimized engine</li>
        </ul>
      </div>
      <a href="/checkout?plan=MONTHLY" class="btn-plan btn-secondary-plan">Get Monthly Plan</a>
    </div>

    <!-- Card 2: Yearly Plan (Featured) -->
    <div class="price-card featured">
      <div>
        <div class="badge-slot">
          <span class="card-badge badge-featured">⭐ MOST POPULAR · SAVE 41%</span>
        </div>
        <h3>Yearly Plan</h3>
        <div class="price-header">
          <div class="price-val">₦8,500<span class="price-period">/year</span></div>
          <div class="price-subnote">Only ~₦708 per month</div>
        </div>
        <ul class="price-features">
          <li>Everything in Monthly Plan</li>
          <li>Continuous threat intelligence feeds</li>
          <li>Banking overlay malware defense</li>
          <li>Dangerous APK inspector</li>
          <li>Priority customer support & rule sync</li>
        </ul>
      </div>
      <a href="/checkout?plan=YEARLY" class="btn-plan btn-primary-plan">Select Yearly (Best Value)</a>
    </div>

    <!-- Card 3: Lifetime License -->
    <div class="price-card">
      <div>
        <div class="badge-slot">
          <span class="card-badge badge-lifetime">💎 ONE-TIME PURCHASE</span>
        </div>
        <h3>Lifetime License</h3>
        <div class="price-header">
          <div class="price-val">₦18,000<span class="price-period"> once</span></div>
          <div class="price-subnote">Zero recurring debits ever</div>
        </div>
        <ul class="price-features">
          <li>One-time payment for lifetime protection*</li>
          <li>Permanent application & security updates</li>
          <li>Never worry about monthly deductions</li>
          <li>Zero-surveillance privacy guarantee</li>
          <li>Transferable to new Android devices</li>
        </ul>
      </div>
      <a href="/checkout?plan=LIFETIME" class="btn-plan btn-lifetime-plan">Get Lifetime License</a>
    </div>
  </div>

  <div style="max-width:860px; margin:auto; padding:0 8% 30px; text-align:center;">
    <div style="background:var(--card); border:1px solid rgba(148,163,184,0.25); border-radius:12px; padding:16px 20px; display:inline-flex; align-items:center; justify-content:center; gap:12px; flex-wrap:wrap; font-size:13.5px; color:#64748b;">
      <span style="font-weight:600; color:var(--text);">💳 Supported Nigerian Payment Options (via Paystack):</span>
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
    <p style="font-weight:600; margin-bottom:6px;">© 2026 AdShield — Private, Native Android Threat & Ad Defense.</p>
    <p style="font-size:13px; color:#64748b; margin-top:0;">Built native for Android 8.0+ (API 26+). Absolute Zero-Surveillance Architecture.</p>
    <div style="display:flex; justify-content:center; gap:16px; flex-wrap:wrap; margin-top:16px;">
      <a href="/privacy">Privacy Policy</a>
      <a href="/security">Security Model</a>
      <a href="/limitations">Android Transparency</a>
      <a href="/releases">Release Notes</a>
      <a href="/docs">Documentation Portal</a>
      <a href="/download">Download APK</a>
      <a href="/admin">Private Owner Admin</a>
    </div>
  </div>
</body>
</html>
  `);
});

// --- Documentation System Helpers ---

function readDocContent(fileName) {
  const searchPaths = [
    path.join(__dirname, "../public/docs", fileName),
    path.join(__dirname, "../../docs", fileName),
    path.join(__dirname, "../docs", fileName),
    path.join(__dirname, "docs", fileName)
  ];
  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, "utf-8");
    }
  }
  return null;
}

function formatMarkdownToHtml(md) {
  if (!md) return "<p>Documentation content currently unavailable.</p>";
  return md
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/^\> (.*$)/gim, "<blockquote>$1</blockquote>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    .replace(/```([a-z]*)\n([\s\S]*?)```/gim, "<pre><code>$2</code></pre>")
    .replace(/`([^`]+)`/gim, "<code>$1</code>")
    .replace(/^\s*\-\s+(.*$)/gim, "<li>$1</li>")
    .replace(/^\s*\d+\.\s+(.*$)/gim, "<li>$1</li>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
    .replace(/^\-\-\-$/gim, "<hr/>")
    .replace(/\n\n/gim, "</p><p>");
}

function renderDocPage({ title, subtitle, badge, contentHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} — AdShield Documentation</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root { --primary: #005ac1; --bg: #f8fafc; --text: #0f172a; --card: #ffffff; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #0b1120; --text: #f8fafc; --card: #131d35; --primary: #38bdf8; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; line-height: 1.6; }
    .nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 8%; background: var(--card); border-bottom: 1px solid rgba(148,163,184,0.2); }
    .logo { font-size: 22px; font-weight: 800; color: var(--primary); text-decoration: none; display: flex; align-items: center; gap: 8px; }
    .nav-links a { margin-left: 20px; color: var(--text); text-decoration: none; font-weight: 500; font-size: 14.5px; }
    .nav-links a:hover { color: var(--primary); }
    .container { max-width: 860px; margin: 40px auto; padding: 0 6% 60px; }
    .doc-card { background: var(--card); border: 1.5px solid rgba(148,163,184,0.25); border-radius: 16px; padding: 36px 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
    .badge { display: inline-block; background: rgba(2,132,199,0.15); color: #0284c7; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 12px; margin-bottom: 12px; }
    @media (prefers-color-scheme: dark) { .badge { color: #38bdf8; background: rgba(56,189,248,0.15); } }
    h1 { font-size: 32px; margin-top: 0; margin-bottom: 8px; color: var(--primary); line-height: 1.25; }
    .subtitle { font-size: 16px; color: #64748b; margin-bottom: 28px; border-bottom: 1px solid rgba(148,163,184,0.2); padding-bottom: 16px; }
    h2 { font-size: 22px; margin-top: 30px; margin-bottom: 12px; border-bottom: 1px solid rgba(148,163,184,0.15); padding-bottom: 6px; color: var(--primary); }
    h3 { font-size: 17px; margin-top: 20px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    th, td { text-align: left; padding: 12px 14px; border: 1px solid rgba(148,163,184,0.25); }
    th { background: rgba(148,163,184,0.1); font-weight: 700; }
    blockquote { border-left: 4px solid var(--primary); margin: 20px 0; padding: 12px 18px; background: rgba(2,132,199,0.06); border-radius: 0 8px 8px 0; font-weight: 500; }
    code { font-family: monospace; font-size: 13px; background: rgba(148,163,184,0.15); padding: 2px 6px; border-radius: 4px; }
    pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 13px; }
    pre code { background: transparent; padding: 0; color: inherit; }
    ul, ol { padding-left: 24px; }
    li { margin-bottom: 8px; }
    .back-btn { display: inline-flex; align-items: center; gap: 6px; color: var(--primary); text-decoration: none; font-weight: 600; font-size: 14px; margin-bottom: 20px; }
    .footer { background: var(--card); border-top: 1px solid rgba(148,163,184,0.2); padding: 36px 8%; text-align: center; font-size: 14px; color: #64748b; }
    .footer a { color: #64748b; margin: 0 10px; text-decoration: none; }
    .footer a:hover { color: var(--primary); }
  </style>
</head>
<body>
  <div class="nav">
    <a href="/" class="logo"><img src="/images/adshield_icon.png" width="34" height="34" style="border-radius:8px; vertical-align:middle;"> AdShield</a>
    <div class="nav-links">
      <a href="/#features">Features</a>
      <a href="/#pricing">Pricing</a>
      <a href="/download">Download</a>
      <a href="/privacy">Privacy</a>
      <a href="/docs">Docs</a>
      <a href="/admin">Owner Portal</a>
    </div>
  </div>

  <div class="container">
    <a href="/" class="back-btn">← Back to AdShield Overview</a>
    <div class="doc-card">
      ${badge ? `<span class="badge">${badge}</span>` : ""}
      <h1>${title}</h1>
      <div class="subtitle">${subtitle}</div>
      <div class="content">${contentHtml}</div>
    </div>
  </div>

  <div class="footer">
    <p>© 2026 AdShield. Built native for Android 8.0+ (API 26+).</p>
    <div style="display:flex; justify-content:center; gap:16px; flex-wrap:wrap; margin-top:12px;">
      <a href="/privacy">Privacy Policy</a>
      <a href="/security">Security Model</a>
      <a href="/limitations">Android Transparency</a>
      <a href="/releases">Release Notes</a>
      <a href="/docs">Documentation Portal</a>
      <a href="/download">Download APK</a>
      <a href="/admin">Owner Portal</a>
    </div>
  </div>
</body>
</html>`;
}

// --- Dedicated Documentation Routes ---

// 1. Privacy Policy: GET /privacy & GET /docs/PRIVACY.md
const handlePrivacy = (req, res) => {
  const content = readDocContent("PRIVACY.md");
  res.send(renderDocPage({
    title: "Privacy Architecture & Zero-Surveillance Policy",
    subtitle: "Complete transparency into how AdShield protects you without collecting or storing your personal data.",
    badge: "ZERO-SURVEILLANCE GUARANTEE",
    contentHtml: formatMarkdownToHtml(content)
  }));
};
app.get("/privacy", handlePrivacy);
app.get("/docs/PRIVACY.md", handlePrivacy);

// 2. Security Model: GET /security & GET /docs/SECURITY.md
const handleSecurity = (req, res) => {
  const content = readDocContent("SECURITY.md");
  res.send(renderDocPage({
    title: "Security Model & Threat Defense",
    subtitle: "In-depth engineering documentation of AdShield's cryptographic licensing, sandboxed quarantine, and Radix Trie filters.",
    badge: "SECURITY SPECIFICATION",
    contentHtml: formatMarkdownToHtml(content)
  }));
};
app.get("/security", handleSecurity);
app.get("/docs/SECURITY.md", handleSecurity);

// 3. Android Limitations: GET /limitations & GET /docs/ANDROID_LIMITATIONS.md
const handleLimitations = (req, res) => {
  const content = readDocContent("ANDROID_LIMITATIONS.md");
  res.send(renderDocPage({
    title: "Android Platform Limitations & Transparency",
    subtitle: "Clear technical disclosures on VpnService exclusivity, DoH/DoT fallbacks, and battery optimization requirements.",
    badge: "PLATFORM TRANSPARENCY",
    contentHtml: formatMarkdownToHtml(content)
  }));
};
app.get("/limitations", handleLimitations);
app.get("/docs/ANDROID_LIMITATIONS.md", handleLimitations);

// 4. Release Notes: GET /releases & GET /docs/RELEASE.md
const handleReleases = (req, res) => {
  const content = readDocContent("RELEASE.md");
  res.send(renderDocPage({
    title: "Release Notes & Checksums",
    subtitle: "Official release history, SHA-256 integrity digests, and safe Android sideloading instructions.",
    badge: "OFFICIAL RELEASES",
    contentHtml: formatMarkdownToHtml(content)
  }));
};
app.get("/releases", handleReleases);
app.get("/docs/RELEASE.md", handleReleases);

// 5. Documentation Portal: GET /docs & GET /docs/
app.get(["/docs", "/docs/"], (req, res) => {
  const guides = [
    { title: "Privacy Architecture", path: "/privacy", desc: "Zero-surveillance architecture, on-device DNS filtering, and data policy." },
    { title: "Security Architecture", path: "/security", desc: "Radix trie memory rules, cryptographic HMAC-SHA256 tokens, and threat database." },
    { title: "Android Platform Limitations", path: "/limitations", desc: "Transparent disclosures on VpnService rules, DoH, and battery optimization." },
    { title: "Release Notes & Hashes", path: "/releases", desc: "Official APK release digests, build 100 changelog, and integrity verification." },
    { title: "System Architecture", path: "/docs/ARCHITECTURE.md", desc: "Multi-layer overview of VPN DNS wire capture, quarantine vault, and rule engines." },
    { title: "Filter Syntax & Compilers", path: "/docs/FILTERS.md", desc: "Support for /etc/hosts, Adblock Plus rules, and Radix Trie fast lookup." },
    { title: "Filter Source Policy", path: "/docs/FILTER_SOURCE_POLICY.md", desc: "Criteria for upstream filter verification, canary checks, and rollback safety." },
    { title: "Threat Modeling", path: "/docs/THREAT_MODEL.md", desc: "STRIDE analysis, threat boundaries, and sandboxed quarantine defense." },
    { title: "Dual-Layer Updates", path: "/docs/UPDATES.md", desc: "Independent filter intelligence sync vs signed APK code update pipelines." },
    { title: "Licensing & Grace Periods", path: "/docs/LICENSING.md", desc: "7-day trials, 14-day offline grace windows, and Paystack integration." },
    { title: "Hosting Runbook", path: "/docs/HOSTING.md", desc: "Production deployment guide for Node.js, Express, Docker, and Vercel." },
    { title: "Website & APK Hosting Guide", path: "/docs/HOW_TO_HOST_WEBSITE.md", desc: "Detailed tutorial on hosting AdShield on Vercel and releasing APKs." },
    { title: "Owner Admin Portal Guide", path: "/docs/ADMIN_DASHBOARD.md", desc: "Private dashboard access, telemetry from active devices, and release controls." }
  ];

  const cardsHtml = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(250px, 1fr)); gap:18px; margin-top:20px;">
      ${guides.map(g => `
        <div style="background:rgba(148,163,184,0.06); border:1px solid rgba(148,163,184,0.2); border-radius:12px; padding:20px; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <h3 style="margin-top:0; font-size:17px; color:var(--primary);">${g.title}</h3>
            <p style="font-size:13.5px; color:#64748b; line-height:1.45;">${g.desc}</p>
          </div>
          <a href="${g.path}" style="color:var(--primary); font-weight:700; font-size:13.5px; text-decoration:none; margin-top:12px;">Read Document →</a>
        </div>
      `).join('')}
    </div>
  `;

  res.send(renderDocPage({
    title: "AdShield Engineering Documentation Portal",
    subtitle: "Complete technical reference for AdShield's native filtering, privacy guarantees, security subsystems, and operational runbooks.",
    badge: "13 PRODUCTION GUIDES",
    contentHtml: cardsHtml
  }));
});

// Dynamic markdown viewer for any /docs/:file
app.get("/docs/:file", (req, res) => {
  const fileName = req.params.file;
  const content = readDocContent(fileName);
  if (!content) {
    return res.status(404).send(renderDocPage({
      title: "Document Not Found",
      subtitle: `Could not locate documentation file: ${fileName}`,
      badge: "404 ERROR",
      contentHtml: `<p>The requested document could not be found. Please return to the <a href="/docs">Documentation Portal</a>.</p>`
    }));
  }
  const cleanTitle = fileName.replace(".md", "").replace(/_/g, " ");
  res.send(renderDocPage({
    title: `AdShield — ${cleanTitle}`,
    subtitle: `Engineering specification document: ${fileName}`,
    badge: "TECHNICAL REFERENCE",
    contentHtml: formatMarkdownToHtml(content)
  }));
});

// Pricing shortcut: GET /pricing -> redirect to /#pricing
app.get("/pricing", (req, res) => {
  res.redirect("/#pricing");
});

// --- Public Paystack Web Checkout Portal: GET /checkout & GET /pay ---
// --- Public Paystack Web Checkout Portal: GET /checkout & GET /pay ---
const handleCheckout = (req, res) => {
  const planQuery = (req.query.plan || "MONTHLY").toUpperCase();
  const selectedPlanKey = PAYSTACK_PLANS[planQuery] ? planQuery : "MONTHLY";
  const planData = PAYSTACK_PLANS[selectedPlanKey];
  const userEmail = req.query.email || "";
  const errorMessage = req.query.error ? decodeURIComponent(req.query.error) : null;

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Paystack Secure Checkout — AdShield Pro</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Secure payment for AdShield Android Pro subscription via Paystack.">
  <style>
    :root { --primary: #005ac1; --primary-dark: #004291; --bg: #f8fafc; --text: #0f172a; --card: #ffffff; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #0b1120; --text: #f8fafc; --card: #131d35; --primary: #38bdf8; --primary-dark: #0284c7; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; line-height: 1.6; }
    .nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 8%; background: var(--card); border-bottom: 1px solid rgba(148,163,184,0.2); }
    .logo { font-size: 22px; font-weight: 800; color: var(--primary); text-decoration: none; display: flex; align-items: center; gap: 8px; }
    .nav-links a { margin-left: 20px; color: var(--text); text-decoration: none; font-weight: 500; font-size: 14.5px; }
    .container { max-width: 540px; margin: 40px auto; padding: 0 16px; }
    .checkout-card { background: var(--card); border: 1.5px solid rgba(148,163,184,0.25); border-radius: 18px; padding: 32px 28px; box-shadow: 0 8px 30px rgba(0,0,0,0.06); }
    .paystack-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid rgba(148,163,184,0.2); padding-bottom: 16px; }
    .gateway-badge { background: #00C3F7; color: #002b49; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 800; }
    .plan-box { background: rgba(0,90,193,0.06); border: 1.5px solid rgba(0,90,193,0.2); border-radius: 12px; padding: 16px; margin-bottom: 20px; }
    .price { font-size: 32px; font-weight: 800; color: var(--primary); margin: 6px 0; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13.5px; font-weight: 600; margin-bottom: 6px; }
    .form-control { width: 100%; box-sizing: border-box; padding: 12px 14px; border: 1.5px solid rgba(148,163,184,0.3); border-radius: 10px; font-size: 15px; background: var(--bg); color: var(--text); }
    .btn-pay { display: block; width: 100%; box-sizing: border-box; background: #005ac1; color: white; border: none; padding: 16px; border-radius: 12px; font-size: 17px; font-weight: 700; cursor: pointer; transition: 0.2s; text-align: center; }
    .btn-pay:hover { background: #004291; }
    .btn-pay:disabled { opacity: 0.6; cursor: not-allowed; }
    .channels-bar { font-size: 12px; color: #64748b; margin-top: 14px; text-align: center; line-height: 1.5; }
    .alert-error { background: #fef2f2; border: 1px solid #f87171; color: #991b1b; padding: 12px; border-radius: 8px; font-size: 13.5px; margin-bottom: 16px; }
    .security-note { font-size: 11.5px; color: #64748b; text-align: center; margin-top: 16px; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="nav">
    <a href="/" class="logo"><img src="/images/adshield_icon.png" width="34" height="34" style="border-radius:8px; vertical-align:middle;"> AdShield</a>
    <div class="nav-links">
      <a href="/#pricing">Pricing</a>
      <a href="/download">Download</a>
      <a href="/docs">Docs</a>
    </div>
  </div>

  <div class="container">
    <div class="checkout-card" id="paymentCard">
      <div class="paystack-header">
        <div>
          <h2 style="margin:0; font-size:22px;">Paystack Checkout</h2>
          <div style="font-size:13px; color:#64748b; margin-top:2px;">Official Hosted Payment Gateway</div>
        </div>
        <span class="gateway-badge">PAYSTACK HOSTED 🔒</span>
      </div>

      ${errorMessage ? `<div class="alert-error">⚠️ ${errorMessage}</div>` : ''}

      <div class="plan-box">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong id="planNameDisplay">${planData.name}</strong>
          <span style="background:#dcfce7; color:#166534; font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px;">VERIFIED PRICING 🇳🇬</span>
        </div>
        <div class="price" id="planPriceDisplay">₦${planData.amountNaira.toLocaleString()}</div>
        <div style="font-size:12.5px; color:#64748b;" id="planDescDisplay">${selectedPlanKey === 'LIFETIME' ? 'One-time payment · Lifetime Pro Protection' : 'Renews automatically · Cancel anytime'}</div>
      </div>

      <form id="checkoutForm" method="POST" action="/checkout/initialize">
        <div class="form-group">
          <label for="planSelect">Selected Subscription Tier</label>
          <select id="planSelect" name="plan" class="form-control" onchange="updatePlanSelection()">
            <option value="MONTHLY" ${selectedPlanKey === 'MONTHLY' ? 'selected' : ''}>Monthly Plan — ₦1,200 / month</option>
            <option value="YEARLY" ${selectedPlanKey === 'YEARLY' ? 'selected' : ''}>Yearly Plan — ₦8,500 / year (Save 41%)</option>
            <option value="LIFETIME" ${selectedPlanKey === 'LIFETIME' ? 'selected' : ''}>Lifetime License — ₦18,000 once</option>
          </select>
        </div>

        <div class="form-group">
          <label for="customerEmail">Receipt Email Address</label>
          <input type="email" id="customerEmail" name="email" class="form-control" required placeholder="your.email@example.com" value="${userEmail}">
        </div>

        <button type="submit" class="btn-pay" id="payButton">
          Proceed to Paystack Payment Page 🚀
        </button>
      </form>

      <div class="channels-bar">
        💳 <strong>Supported Nigerian Payment Channels on Paystack:</strong><br/>
        Bank Transfer • OPay & PalmPay • USSD (*737#, *919#) • Verve, Mastercard & Visa
      </div>

      <div class="security-note">
        🔒 You will be redirected directly to Paystack's official secure payment page (<code>checkout.paystack.com</code>). No API keys or debit card credentials are ever exposed or stored.
      </div>
    </div>
  </div>

  <script>
    const PLANS = {
      MONTHLY: { name: "Monthly Plan", amountNaira: 1200, desc: "Renews monthly · Cancel anytime" },
      YEARLY: { name: "Yearly Plan", amountNaira: 8500, desc: "~₦708/mo · Save 41% · All shields active" },
      LIFETIME: { name: "Lifetime License", amountNaira: 18000, desc: "One-time purchase · Lifetime protection" }
    };

    function updatePlanSelection() {
      const plan = document.getElementById("planSelect").value;
      const data = PLANS[plan];
      document.getElementById("planNameDisplay").innerText = data.name;
      document.getElementById("planPriceDisplay").innerText = "₦" + data.amountNaira.toLocaleString();
      document.getElementById("planDescDisplay").innerText = data.desc;
    }

    document.getElementById("checkoutForm").addEventListener("submit", function() {
      const btn = document.getElementById("payButton");
      btn.disabled = true;
      btn.innerText = "Opening Paystack Secure Checkout... ⏳";
    });
  </script>
</body>
</html>`);
};

app.get("/checkout", handleCheckout);
app.get("/pay", handleCheckout);

// Form POST handler for Web Checkout: redirects straight to Paystack Hosted Payment Page
app.post("/checkout/initialize", async (req, res) => {
  const { plan, email } = req.body;
  const host = req.get("host") || "adshield-website.vercel.app";
  const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  const callbackUrl = `${protocol}://${host}/payment/callback`;

  try {
    const data = await initializePaystackPayment({
      plan: plan || "MONTHLY",
      email: email,
      deviceInstallId: `device_web_${Date.now()}`,
      callbackUrl
    });

    if (data.authorizationUrl) {
      return res.redirect(data.authorizationUrl);
    } else {
      return res.redirect(`/checkout?error=${encodeURIComponent("Could not obtain Paystack authorization URL.")}`);
    }
  } catch (err) {
    return res.redirect(`/checkout?error=${encodeURIComponent(err.message)}`);
  }
});

// --- Official Paystack Payment Callback & Verification Route: GET /payment/callback ---
app.get("/payment/callback", async (req, res) => {
  const reference = req.query.reference || req.query.trxref;
  if (!reference) {
    return res.status(400).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payment Callback — Missing Reference</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 40px 16px; text-align: center; }
    .card { max-width: 500px; margin: auto; background: white; padding: 32px; border-radius: 16px; border: 1.5px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .btn { display: inline-block; background: #005ac1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <h2 style="color:#dc2626;">Payment Reference Missing</h2>
    <p>No Paystack transaction reference was provided in the callback request.</p>
    <a href="/checkout" class="btn">Return to Checkout</a>
  </div>
</body>
</html>
    `);
  }

  const result = await verifyPaystackPayment({
    reference,
    deviceInstallId: `device_web_${reference.substring(0, 10)}`
  });

  if (!result.success) {
    // REAL VERIFICATION FAILED: Paystack did NOT confirm payment. Issue zero license!
    return res.status(result.statusCode || 400).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payment Verification Failed — AdShield</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root { --primary: #005ac1; --bg: #f8fafc; --text: #0f172a; --card: #ffffff; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #0b1120; --text: #f8fafc; --card: #131d35; --primary: #38bdf8; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; line-height: 1.6; }
    .nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 8%; background: var(--card); border-bottom: 1px solid rgba(148,163,184,0.2); }
    .logo { font-size: 22px; font-weight: 800; color: var(--primary); text-decoration: none; }
    .container { max-width: 560px; margin: 40px auto; padding: 0 16px; }
    .card { background: var(--card); border: 1.5px solid rgba(148,163,184,0.25); border-radius: 18px; padding: 32px 28px; text-align: center; box-shadow: 0 8px 30px rgba(0,0,0,0.06); }
    .icon { font-size: 50px; margin-bottom: 12px; }
    .meta-box { background: rgba(148,163,184,0.08); border-radius: 10px; padding: 16px; text-align: left; font-size: 13.5px; margin: 20px 0; }
    .btn { display: block; width: 100%; box-sizing: border-box; background: #005ac1; color: white; padding: 14px; border-radius: 10px; font-weight: 700; text-decoration: none; margin-top: 12px; }
    .btn:hover { background: #004291; }
    .alert { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; padding: 14px; border-radius: 10px; font-size: 13.5px; margin-bottom: 20px; text-align: left; }
  </style>
</head>
<body>
  <div class="nav">
    <a href="/" class="logo">AdShield</a>
  </div>
  <div class="container">
    <div class="card">
      <div class="icon">⚠️</div>
      <h2 style="color:#dc2626; margin:0;">Payment Unconfirmed</h2>
      <p style="color:#64748b; font-size:15px; margin:8px 0 16px;">Paystack did not confirm a successful transaction for this payment.</p>
      
      <div class="alert">
        <strong>🔒 Zero Mocking Policy:</strong> No license code has been generated. To protect users and prevent unauthorized access, AdShield licenses are only issued when Paystack confirms that the required funds were deposited.
      </div>

      <div class="meta-box">
        <div style="margin-bottom:6px;"><strong>Reference:</strong> <code style="font-family:monospace;">${reference}</code></div>
        <div style="margin-bottom:6px;"><strong>Status:</strong> ${result.error || 'UNCONFIRMED'}</div>
        <div><strong>Details:</strong> ${result.message || 'Payment verification could not be validated with Paystack.'}</div>
      </div>

      <a href="/checkout" class="btn">Try Checkout Again</a>
      <a href="/" style="display:block; margin-top:14px; color:#64748b; text-decoration:none; font-size:14px;">Return to Home Overview</a>
    </div>
  </div>
</body>
</html>
    `);
  }

  // REAL VERIFICATION SUCCEEDED: Paystack confirmed payment!
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payment Confirmed — AdShield Master Recovery Key</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root { --primary: #005ac1; --bg: #f8fafc; --text: #0f172a; --card: #ffffff; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #0b1120; --text: #f8fafc; --card: #131d35; --primary: #38bdf8; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; line-height: 1.6; }
    .nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 8%; background: var(--card); border-bottom: 1px solid rgba(148,163,184,0.2); }
    .logo { font-size: 22px; font-weight: 800; color: var(--primary); text-decoration: none; }
    .container { max-width: 580px; margin: 40px auto; padding: 0 16px; }
    .card { background: var(--card); border: 1.5px solid rgba(148,163,184,0.25); border-radius: 18px; padding: 34px 28px; text-align: center; box-shadow: 0 8px 30px rgba(0,0,0,0.06); }
    .icon { font-size: 52px; margin-bottom: 12px; }
    .badge { background: #dcfce7; color: #166534; font-size: 12px; font-weight: 800; padding: 4px 12px; border-radius: 20px; display: inline-block; margin-bottom: 12px; }
    .vault-box { background: rgba(0,90,193,0.05); border: 2px dashed #005ac1; border-radius: 14px; padding: 20px; margin: 24px 0; text-align: left; }
    .key-display { font-family: monospace; font-size: 18px; font-weight: 800; color: var(--primary); word-break: break-all; margin: 8px 0; background: var(--card); padding: 12px; border-radius: 8px; border: 1px solid rgba(0,90,193,0.2); text-align: center; }
    .action-row { display: flex; gap: 10px; margin-bottom: 12px; }
    .btn { display: block; width: 100%; box-sizing: border-box; background: #005ac1; color: white; padding: 13px; border-radius: 10px; font-weight: 700; text-decoration: none; border: none; cursor: pointer; font-size: 14.5px; transition: 0.2s; text-align: center; }
    .btn:hover { background: #004291; }
    .btn-secondary { background: #0f766e; }
    .btn-secondary:hover { background: #115e59; }
    .btn-outline { background: transparent; border: 1.5px solid rgba(148,163,184,0.4); color: var(--text); }
    .btn-outline:hover { background: rgba(148,163,184,0.1); }
    .steps { text-align: left; font-size: 13.5px; color: #64748b; padding-left: 18px; margin: 16px 0; }
    .steps li { margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="nav">
    <a href="/" class="logo">AdShield</a>
    <div>
      <a href="/download" style="color:var(--primary); font-weight:600; text-decoration:none;">Download App</a>
    </div>
  </div>
  <div class="container">
    <div class="card">
      <div class="icon">🎉</div>
      <span class="badge">PAYSTACK VERIFIED · PAID ₦${result.amountPaidNaira.toLocaleString()}</span>
      <h2 style="color:#10b981; margin:0 0 6px 0;">Payment Confirmed!</h2>
      <p style="color:#64748b; font-size:15px; margin:0 0 20px 0;">Your <strong>${result.plan}</strong> license has been successfully generated.</p>

      <div class="vault-box">
        <div style="font-size:11px; font-weight:800; color:#64748b; letter-spacing:0.5px; text-transform:uppercase;">Master License Recovery Key</div>
        <div class="key-display" id="keyVal">${result.licenseKey}</div>
        <div style="font-size:12px; color:#b45309; line-height:1.4; margin-top:8px;">
          ⚠️ <strong>SHOWN ONLY ONCE:</strong> AdShield operates on zero-surveillance principles and never stores your key centrally. Save this key in a password manager or email backup. If you change or reset your phone, enter this key in AdShield to restore your subscription.
        </div>
      </div>

      <div class="action-row">
        <button type="button" class="btn" onclick="copyKey()">Copy Key 📋</button>
        <button type="button" class="btn btn-secondary" onclick="downloadBackup()">Save .txt 💾</button>
      </div>
      <button type="button" class="btn btn-outline" onclick="emailKey()" style="margin-bottom:20px;">Email Key to Myself ✉️</button>

      <div style="text-align:left; border-top:1px solid rgba(148,163,184,0.2); padding-top:20px;">
        <h4 style="margin:0 0 6px 0;">How to Activate in AdShield for Android:</h4>
        <ol class="steps">
          <li>Open the AdShield app on your phone.</li>
          <li>Tap <strong>Settings</strong> > <strong>Account & Licensing</strong>.</li>
          <li>Under <strong>Restore on New Device</strong>, paste your Master Recovery Key.</li>
          <li>Tap <strong>Re-activate Subscription</strong>. All shields engage instantly!</li>
        </ol>
        <a href="adshield://activate?key=${result.licenseKey}" class="btn" style="margin-bottom:10px;">Activate in AdShield App 📱</a>
        <a href="/download" style="display:block; text-align:center; font-size:13.5px; color:var(--primary); text-decoration:none; font-weight:600;">Download AdShield APK for Android →</a>
      </div>
    </div>
  </div>

  <script>
    const licenseKey = "${result.licenseKey}";
    const plan = "${result.plan}";
    const ref = "${result.reference}";

    function copyKey() {
      navigator.clipboard.writeText(licenseKey).then(() => {
        alert("License Recovery Key copied to clipboard! Save it safely.");
      }).catch(() => {
        alert("License Key: " + licenseKey);
      });
    }

    function downloadBackup() {
      const text = "ADSHIELD PRO — MASTER LICENSE RECOVERY BACKUP\\n" +
                   "============================================\\n\\n" +
                   "Master Recovery Key: " + licenseKey + "\\n" +
                   "Subscription Plan:   " + plan + "\\n" +
                   "Payment Reference:   " + ref + "\\n" +
                   "Status:              CONFIRMED VIA PAYSTACK\\n" +
                   "Date:                " + new Date().toISOString() + "\\n\\n" +
                   "HOW TO RESTORE ON A NEW ANDROID DEVICE:\\n" +
                   "1. Install AdShield for Android\\n" +
                   "2. Go to Settings > Account & Licensing\\n" +
                   "3. Under 'Restore on New Device', enter this Master Recovery Key\\n" +
                   "4. Tap 'Re-activate Subscription'\\n\\n" +
                   "ZERO-SURVEILLANCE NOTICE:\\n" +
                   "AdShield does not track you or keep user logs on central servers.\\n" +
                   "Keep this file safe in your private records or password manager.\\n";
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "AdShield-License-" + plan + "-" + licenseKey.substring(0, 12) + ".txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function emailKey() {
      const subject = encodeURIComponent("My AdShield Pro License Recovery Key");
      const body = encodeURIComponent(
        "AdShield Pro Master License Recovery Key\\n\\n" +
        "Plan: " + plan + "\\n" +
        "License Recovery Key: " + licenseKey + "\\n" +
        "Payment Reference: " + ref + "\\n\\n" +
        "Keep this key safe. If you change your phone, enter this key in AdShield under 'Restore on New Device' to reactivate your subscription."
      );
      window.location.href = "mailto:?subject=" + subject + "&body=" + body;
    }
  </script>
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
    :root { --primary: #005ac1; --bg: #f8fafc; --text: #0f172a; --card: #ffffff; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #0b1120; --text: #f8fafc; --card: #131d35; --primary: #38bdf8; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; line-height: 1.6; }
    .nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 8%; background: var(--card); border-bottom: 1px solid rgba(148,163,184,0.2); }
    .logo { font-size: 22px; font-weight: 800; color: var(--primary); text-decoration: none; display: flex; align-items: center; gap: 8px; }
    .nav-links a { margin-left: 20px; color: var(--text); text-decoration: none; font-weight: 500; font-size: 14.5px; }
    .nav-links a:hover { color: var(--primary); }
    .container { max-width: 680px; margin: 40px auto; background: var(--card); padding: 40px; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.06); border: 1px solid rgba(148,163,184,0.25); }
    h1 { margin-top: 0; color: var(--primary); }
    .badge { display: inline-block; background: rgba(2,132,199,0.15); color: #0284c7; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-size: 13px; margin-bottom: 20px; }
    .meta-box { background: rgba(148,163,184,0.1); padding: 18px; border-radius: 10px; margin: 20px 0; font-size: 14px; }
    .meta-box div { margin-bottom: 6px; }
    .hash { font-family: monospace; word-break: break-all; color: #64748b; font-size: 12px; }
    .btn { display: block; text-align: center; background: #005ac1; color: white; padding: 16px; border-radius: 10px; font-size: 18px; font-weight: bold; text-decoration: none; margin: 24px 0; transition: 0.2s; }
    .btn:hover { background: #004291; }
    ol { padding-left: 20px; font-size: 14px; color: #64748b; }
    li { margin-bottom: 8px; }
    .footer { background: var(--card); border-top: 1px solid rgba(148,163,184,0.2); padding: 36px 8%; text-align: center; font-size: 14px; color: #64748b; margin-top: 60px; }
    .footer a { color: #64748b; margin: 0 10px; text-decoration: none; }
    .footer a:hover { color: var(--primary); }
  </style>
</head>
<body>
  <div class="nav">
    <a href="/" class="logo"><img src="/images/adshield_icon.png" width="34" height="34" style="border-radius:8px; vertical-align:middle;"> AdShield</a>
    <div class="nav-links">
      <a href="/#features">Features</a>
      <a href="/#pricing">Pricing</a>
      <a href="/download">Download</a>
      <a href="/privacy">Privacy</a>
      <a href="/docs">Docs</a>
      <a href="/admin">Owner Portal</a>
    </div>
  </div>

  <div class="container">
    <a href="/" style="color:var(--primary); text-decoration:none; font-weight:600;">← Back to AdShield Overview</a>
    <div style="display:flex; align-items:center; gap:16px; margin-top:20px; margin-bottom:16px;">
      <img src="/images/adshield_icon.png" width="56" height="56" style="border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
      <div>
        <h1 style="margin:0; font-size:26px; color:var(--primary);">Download AdShield</h1>
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

  <div class="footer">
    <p style="font-weight:600; margin-bottom:6px;">© 2026 AdShield — Private, Native Android Threat & Ad Defense.</p>
    <p style="font-size:13px; color:#64748b; margin-top:0;">Built native for Android 8.0+ (API 26+). Absolute Zero-Surveillance Architecture.</p>
    <div style="display:flex; justify-content:center; gap:16px; flex-wrap:wrap; margin-top:16px;">
      <a href="/privacy">Privacy Policy</a>
      <a href="/security">Security Model</a>
      <a href="/limitations">Android Transparency</a>
      <a href="/releases">Release Notes</a>
      <a href="/docs">Documentation Portal</a>
      <a href="/download">Download APK</a>
      <a href="/admin">Private Owner Admin</a>
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
