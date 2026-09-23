/**
 * Filter Feeds Catalog Manifest API
 */

const FILTER_SOURCES_MANIFEST = [
  {
    id: "adguard-dns",
    name: "AdGuard DNS Filter",
    url: "https://adguardteam.github.io/HostlistsRegistry/assets/filter_1.txt",
    category: ["ads", "trackers"],
    format: "adblock",
    enabledByDefault: true,
    trustLevel: "trusted",
    license: "Apache-2.0 / CC-BY-SA 3.0",
    attribution: "AdGuard Team",
    lastUpdated: "2026-09-23T12:00:00Z",
    ruleCount: 68420
  },
  {
    id: "hagezi-light",
    name: "HaGeZi Multi LIGHT",
    url: "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/pro.mini.txt",
    category: ["trackers", "ads"],
    format: "adblock",
    enabledByDefault: true,
    trustLevel: "trusted",
    license: "CC-BY-SA 4.0",
    attribution: "HaGeZi Blocklists",
    lastUpdated: "2026-09-23T10:00:00Z",
    ruleCount: 84310
  },
  {
    id: "oisd-basic",
    name: "OISD Basic",
    url: "https://basic.oisd.nl",
    category: ["ads", "telemetry"],
    format: "adblock",
    enabledByDefault: true,
    trustLevel: "trusted",
    license: "CC0 / Public Domain",
    attribution: "Stephan Brouwers",
    lastUpdated: "2026-09-23T08:00:00Z",
    ruleCount: 42100
  },
  {
    id: "stevenblack-unified",
    name: "StevenBlack Unified",
    url: "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts",
    category: ["ads", "malware"],
    format: "hosts",
    enabledByDefault: true,
    trustLevel: "trusted",
    license: "MIT License",
    attribution: "Steven Black",
    lastUpdated: "2026-09-22T18:00:00Z",
    ruleCount: 164800
  },
  {
    id: "urlhaus-malware",
    name: "URLhaus Malware Feed",
    url: "https://urlhaus.abuse.ch/downloads/hostfile/",
    category: ["malware", "c2"],
    format: "hosts",
    enabledByDefault: true,
    trustLevel: "trusted",
    license: "CC0 / Public Domain",
    attribution: "abuse.ch",
    lastUpdated: "2026-09-23T16:00:00Z",
    ruleCount: 12500
  }
];

function filtersApiRouter(express) {
  const router = express.Router();

  router.get("/manifest", (req, res) => {
    res.json({
      manifestVersion: "1.0",
      generatedAt: new Date().toISOString(),
      sources: FILTER_SOURCES_MANIFEST
    });
  });

  return router;
}

module.exports = { filtersApiRouter, FILTER_SOURCES_MANIFEST };
