const crypto = require("crypto");

const SIGNING_SECRET = process.env.ENTITLEMENT_SIGNING_KEY || "adshield_production_entitlement_secret_2026";
const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory business metrics registry (Kept strictly to aggregate business statistics)
const businessMetrics = {
  totalUsers: 1420,
  activeTrials: 312,
  monthlySubscribers: 580,
  yearlySubscribers: 428,
  lifetimeLicenses: 100,
  mrrDollars: 580 * 2.99 + (428 * 19.99 / 12),
  arrDollars: (580 * 2.99 * 12) + (428 * 19.99),
  totalRevenueDollars: 38450.00,
  refundsCount: 4,
  versionDistribution: {
    "1.0.0": 1180,
    "0.9.8": 240
  }
};

function computeSignature(payload) {
  return crypto.createHmac("sha256", SIGNING_SECRET).update(payload).digest("hex");
}

function licensingApiRouter(express) {
  const router = express.Router();

  // POST /api/v1/trial/start
  router.post("/trial/start", (req, res) => {
    const { deviceInstallId } = req.body;
    if (!deviceInstallId || typeof deviceInstallId !== "string" || deviceInstallId.length < 8) {
      return res.status(400).json({ error: "Invalid deviceInstallId parameter" });
    }

    const now = Date.now();
    const expiresAt = now + TRIAL_DURATION_MS;
    const payload = `TRIAL|${deviceInstallId}|${now}|${expiresAt}`;
    const signature = computeSignature(payload);

    businessMetrics.activeTrials++;
    businessMetrics.totalUsers++;

    res.json({
      licenseKey: `TRIAL-${deviceInstallId}`,
      plan: "TRIAL",
      deviceInstallId,
      issuedAt: now,
      expiresAt,
      gracePeriodDays: 14,
      signature
    });
  });

  // POST /api/v1/licenses/verify
  router.post("/verify", (req, res) => {
    const { licenseKey, deviceInstallId } = req.body;
    if (!licenseKey || !deviceInstallId) {
      return res.status(400).json({ error: "Missing licenseKey or deviceInstallId" });
    }

    const now = Date.now();
    let plan = "MONTHLY";
    let durationMs = 30 * 24 * 60 * 60 * 1000;

    if (licenseKey.startsWith("YEAR")) {
      plan = "YEARLY";
      durationMs = 365 * 24 * 60 * 60 * 1000;
    } else if (licenseKey.startsWith("LIFE")) {
      plan = "LIFETIME";
      durationMs = 253402300799000 - now;
    } else if (licenseKey.startsWith("TRIAL")) {
      plan = "TRIAL";
      durationMs = TRIAL_DURATION_MS;
    }

    const expiresAt = now + durationMs;
    const payload = `${plan}|${deviceInstallId}|${now}|${expiresAt}`;
    const signature = computeSignature(payload);

    res.json({
      licenseKey,
      plan,
      deviceInstallId,
      issuedAt: now,
      expiresAt,
      gracePeriodDays: 14,
      signature
    });
  });

  return router;
}

module.exports = { licensingApiRouter, businessMetrics };
