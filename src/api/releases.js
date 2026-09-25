/**
 * Release Management Subsystem
 * Supports states: DRAFT, INTERNAL, BETA, STABLE, RETIRED, REVOKED
 */

class ReleaseStore {
  constructor() {
    this.releases = [
      {
        id: "rel_200",
        channel: "stable",
        version: "2.0.0",
        versionCode: 200,
        minimumAndroidVersion: 26,
        releaseDate: "2026-09-24",
        downloadUrl: "/downloads/AdShield-v2.0.0.apk",
        sha256: "a6e45daccc1d4de087123e511ec73844074a9523feacc7c65981dc21316d4873",
        fileSizeBytes: 2113586,
        releaseNotesUrl: "/docs/RELEASE.md",
        status: "STABLE",
        changelog: "Version 2.0.0: Powerful ad & tracker suppression with 600+ network rules, advanced mobile threat intelligence database, real-time APK security inspection, and sandboxed persistent quarantine vault."
      },
      {
        id: "rel_100",
        channel: "stable",
        version: "1.0.0",
        versionCode: 100,
        minimumAndroidVersion: 26,
        releaseDate: "2026-09-23",
        downloadUrl: "/downloads/AdShield-v1.0.0.apk",
        sha256: "e0ff4c9bbc0a5e85d514d20f8c089e05fb9019b4a2d3b1d3c601aec899476462",
        fileSizeBytes: 2083609,
        releaseNotesUrl: "/docs/RELEASE.md",
        status: "RETIRED",
        changelog: "Initial commercial release: in-app Paystack subscriptions, system-wide DNS filtering, threat intelligence, and local quarantine."
      }
    ];
  }

  getPublicLatest(channel = "stable") {
    // Only releases marked public (STABLE or BETA) can be returned
    const valid = this.releases.filter(r => 
      (channel === "beta" ? (r.status === "BETA" || r.status === "STABLE") : r.status === "STABLE")
    );
    return valid.sort((a, b) => b.versionCode - a.versionCode)[0] || null;
  }

  getAllReleases() {
    return [...this.releases];
  }

  createRelease(metadata) {
    const newRel = {
      id: `rel_${Date.now()}`,
      status: "DRAFT",
      ...metadata
    };
    this.releases.push(newRel);
    return newRel;
  }

  updateStatus(id, newStatus) {
    const rel = this.releases.find(r => r.id === id);
    if (!rel) return null;
    rel.status = newStatus;
    return rel;
  }

  revokeRelease(id) {
    const rel = this.releases.find(r => r.id === id);
    if (!rel) return null;
    rel.status = "REVOKED";
    return rel;
  }
}

const releaseStore = new ReleaseStore();

function releaseApiRouter(express) {
  const router = express.Router();

  // Public endpoint: GET /api/v1/releases/latest
  router.get("/latest", (req, res) => {
    const channel = req.query.channel === "beta" ? "beta" : "stable";
    const latest = releaseStore.getPublicLatest(channel);
    if (!latest) {
      return res.status(404).json({ error: "No active public release found for channel" });
    }

    // Never leak internal/draft status or admin secrets
    res.json({
      channel: latest.channel,
      version: latest.version,
      versionCode: latest.versionCode,
      minimumAndroidVersion: latest.minimumAndroidVersion,
      releaseDate: latest.releaseDate,
      downloadUrl: latest.downloadUrl,
      sha256: latest.sha256,
      releaseNotesUrl: latest.releaseNotesUrl,
      changelog: latest.changelog
    });
  });

  return router;
}

module.exports = { releaseStore, releaseApiRouter };
