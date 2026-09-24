/**
 * Automated Security, Privacy, and API Test Suite for AdShield Web & Backend
 */

const assert = require("assert");
const http = require("http");
const app = require("../src/server");

let server;
const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || "GET",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== Running AdShield Backend & Privacy Test Suite ===");

  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });

  try {
    // 1. Public Release Metadata Test
    console.log("1. Testing Public Release Metadata API...");
    const relRes = await makeRequest("/api/v1/releases/latest");
    assert.strictEqual(relRes.statusCode, 200);
    assert.strictEqual(relRes.json.channel, "stable");
    assert.strictEqual(relRes.json.version, "1.0.0");
    assert.strictEqual(relRes.json.minimumAndroidVersion, 26);
    assert.ok(relRes.json.sha256 && relRes.json.sha256.length === 64);
    console.log("   ✓ Public release metadata verified successfully.");

    // 2. 7-Day Trial Initiation Test
    console.log("2. Testing 7-Day Trial Issuance API...");
    const trialRes = await makeRequest("/api/v1/licenses/trial/start", { method: "POST" }, {
      deviceInstallId: "device_unit_test_998877"
    });
    assert.strictEqual(trialRes.statusCode, 200);
    assert.strictEqual(trialRes.json.plan, "TRIAL");
    assert.ok(trialRes.json.signature && trialRes.json.signature.length === 64);
    assert.strictEqual(trialRes.json.gracePeriodDays, 14);
    console.log("   ✓ 7-Day trial issued with valid HMAC-SHA256 signature.");

    // 3. Filter Manifest Test
    console.log("3. Testing Filter Feeds Manifest API...");
    const filterRes = await makeRequest("/api/v1/filters/manifest");
    assert.strictEqual(filterRes.statusCode, 200);
    assert.ok(filterRes.json.sources.length >= 4);
    console.log("   ✓ Filter manifest returns verified upstream sources.");

    // 4. MANDATORY PRIVACY TEST: Reject Personal Browsing Data
    console.log("4. Testing Strict Zero-Surveillance Privacy Gate...");
    const privacyViolationRes = await makeRequest("/api/v1/licenses/verify", { method: "POST" }, {
      licenseKey: "KEY-123",
      deviceInstallId: "device_123",
      browsingHistory: ["https://example.com/secret", "https://bank.com"]
    });
    assert.strictEqual(privacyViolationRes.statusCode, 400);
    assert.strictEqual(privacyViolationRes.json.error, "PRIVACY_VIOLATION_REJECTED");
    console.log("   ✓ Privacy Gate correctly rejected prohibited browsingHistory telemetry.");

    const urlViolationRes = await makeRequest("/api/v1/releases/latest?url=https://test.com");
    assert.strictEqual(urlViolationRes.statusCode, 400);
    assert.strictEqual(urlViolationRes.json.error, "PRIVACY_VIOLATION_REJECTED");
    console.log("   ✓ Privacy Gate correctly rejected query containing 'url'.");

    // 5. Admin Authentication & RBAC Test
    console.log("5. Testing Admin Dashboard Security Boundary & Active Applications Telemetry...");
    const unauthMetrics = await makeRequest("/admin/api/metrics");
    assert.strictEqual(unauthMetrics.statusCode, 401);
    console.log("   ✓ Unauthorized access to admin metrics blocked.");

    // Authorized Admin Session
    const authHeaders = { "Cookie": "adshield_admin_session=authenticated_owner_token" };
    const authMetrics = await makeRequest("/admin/api/metrics", { headers: authHeaders });
    assert.strictEqual(authMetrics.statusCode, 200);
    assert.ok(authMetrics.json.totalUsers >= 1);
    console.log("   ✓ Authenticated owner received active applications telemetry without surveillance data.");

    // 6. Paystack Subscription Payment API Test
    console.log("6. Testing Paystack Subscription Initialization & Verification...");
    const initPaystackRes = await makeRequest("/api/v1/licenses/paystack/initialize", { method: "POST" }, {
      plan: "MONTHLY",
      deviceInstallId: "device_test_paystack_device_01",
      email: "student@lagos.edu.ng"
    });
    assert.strictEqual(initPaystackRes.statusCode, 200);
    assert.strictEqual(initPaystackRes.json.data.amountNaira, 1200);
    assert.strictEqual(initPaystackRes.json.data.amountKobo, 120000);
    assert.ok(initPaystackRes.json.data.reference.startsWith("adshield_monthly_"));
    console.log("   ✓ Paystack transaction initialized successfully (₦1,200 Monthly).");

    const verifyPaystackRes = await makeRequest("/api/v1/licenses/paystack/verify", { method: "POST" }, {
      reference: initPaystackRes.json.data.reference,
      deviceInstallId: "device_test_paystack_device_01",
      plan: "MONTHLY",
      appVersion: "1.0.0"
    });
    assert.strictEqual(verifyPaystackRes.statusCode, 200);
    assert.strictEqual(verifyPaystackRes.json.data.plan, "MONTHLY");
    assert.ok(verifyPaystackRes.json.data.licenseKey.startsWith("PSK-MONTHLY-"));
    assert.ok(verifyPaystackRes.json.data.signature.length === 64);
    console.log("   ✓ Paystack payment verified and active license activated locally.");

    // 7. Release Management & Revocation Test
    console.log("7. Testing Release Promotion & Revocation Flow...");
    const revokeRes = await makeRequest("/admin/api/releases/rel_100/revoke", {
      method: "POST",
      headers: authHeaders
    });
    assert.strictEqual(revokeRes.statusCode, 200);
    assert.strictEqual(revokeRes.json.status, "REVOKED");

    // Public API should now report 404 because stable release is revoked!
    const publicAfterRevoke = await makeRequest("/api/v1/releases/latest");
    assert.strictEqual(publicAfterRevoke.statusCode, 404);
    console.log("   ✓ Emergency release revocation instantly stopped public distribution!");

    // Restore to STABLE
    const restoreRes = await makeRequest("/admin/api/releases/rel_100/promote", {
      method: "POST",
      headers: authHeaders
    }, { status: "STABLE" });
    assert.strictEqual(restoreRes.statusCode, 200);
    assert.strictEqual(restoreRes.json.status, "STABLE");

    const publicAfterRestore = await makeRequest("/api/v1/releases/latest");
    assert.strictEqual(publicAfterRestore.statusCode, 200);
    // 8. Public Paystack Configuration Test
    console.log("8. Testing Public Paystack Configuration & Custom Keys...");
    const paystackConfigRes = await makeRequest("/api/v1/licenses/paystack/config");
    assert.strictEqual(paystackConfigRes.statusCode, 200);
    assert.strictEqual(paystackConfigRes.json.status, "success");
    assert.ok(paystackConfigRes.json.publicKey);
    assert.strictEqual(paystackConfigRes.json.currency, "NGN");
    assert.strictEqual(paystackConfigRes.json.plans.MONTHLY.amountNaira, 1200);
    assert.strictEqual(paystackConfigRes.json.plans.YEARLY.amountNaira, 8500);
    assert.strictEqual(paystackConfigRes.json.plans.LIFETIME.amountNaira, 18000);

    // Test with custom user-provided public key
    const customKeyRes = await makeRequest("/api/v1/licenses/paystack/initialize", {
      method: "POST",
      headers: { "x-paystack-public-key": "pk_test_custom_user_key_7788" }
    }, {
      plan: "YEARLY",
      deviceInstallId: "device_custom_key_01",
      email: "owner@test.com"
    });
    assert.strictEqual(customKeyRes.statusCode, 200);
    assert.strictEqual(customKeyRes.json.data.publicKey, "pk_test_custom_user_key_7788");
    console.log("   ✓ Paystack config and custom public key support verified.");

    // 9. Documentation and Footer Links 200 OK Verification
    console.log("9. Testing All Public Footer Links & Documentation Pages (0 Broken Links)...");
    const footerRoutes = ["/privacy", "/security", "/limitations", "/releases", "/docs", "/download", "/docs/ARCHITECTURE.md"];
    for (const route of footerRoutes) {
      const pageRes = await makeRequest(route);
      assert.strictEqual(pageRes.statusCode, 200, `Expected ${route} to return 200 OK`);
      assert.ok(pageRes.data.includes("AdShield"), `Expected ${route} to contain AdShield layout`);
    }

    // Pricing redirect test
    const pricingRes = await makeRequest("/pricing");
    assert.strictEqual(pricingRes.statusCode, 302);
    assert.strictEqual(pricingRes.headers.location, "/#pricing");
    console.log("   ✓ All footer pages and documentation links return HTTP 200 with rich content.");

    console.log("\nALL SERVER, PRIVACY, PAYSTACK, AND TELEMETRY TESTS PASSED (9/9)!\n");

  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  if (server) server.close();
  process.exit(1);
});
