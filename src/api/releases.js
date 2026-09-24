/**
 * Release Management Subsystem
 * Supports states: DRAFT, INTERNAL, BETA, STABLE, RETIRED, REVOKED
 */

class ReleaseStore {
  constructor() {
    this.releases = [
      {
        id: "rel_100",
        channel: "stable",
        version: "1.0.0",
        versionCode: 100,
        minimumAndroidVersion: 26,
        releaseDate: "2026-09-23",
        downloadUrl: "/download/AdShield-v1.0.0.apk",
        sha256: "cac3f9f1ac953a8b744c574286eced3e76e17903735b4a790c35e6bfc32d30d3",
        fileSizeBytes: 2083609,
        releaseNotesUrl: "/docs/RELEASE.md",
        status: "STABLE",
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
