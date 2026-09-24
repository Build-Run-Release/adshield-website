# AdShield Filter Engine Specification & Grammar

## 1. Supported Rule Syntax & Formats

The AdShield filtering engine processes two industry-standard filter rule syntaxes:

### 1.1 Standard `/etc/hosts` Syntax
Common in hostlists (e.g. StevenBlack, Peter Lowe):
```text
# Comment lines begin with # or !
127.0.0.1  adservice.google.com
0.0.0.0    tracker.facebook.com
0.0.0.0    malware-payload.ru
```
- **Evaluation**: Extracted domain is normalized (lowercased, trailing dots stripped) and categorized into `ADS`, `TRACKERS`, or `MALWARE`.

### 1.2 Adblock / ABP Network Filter Syntax
Common in AdGuard, OISD, and uBlock Origin rule lists:
```text
||doubleclick.net^               # Block doubleclick.net and all its subdomains
||google-analytics.com^$tracker  # Block tracker domain with category hint
@@||whitelist-example.com^       # Allowlist exception rule (overrides block)
||phishing-test.org^$important   # High-priority security threat (cannot be overridden by generic allowlist)
```
- `||`: Anchors to domain root boundary (matches domain and all subdomains).
- `^`: Separator character (end of domain or slash/colon).
- `@@`: Exception marker (unconditionally allows the domain from normal ad/tracker filters).
- `$important`: Security priority flag indicating high-confidence malware/phishing.

---

## 2. Precedence & Conflict Resolution Matrix

When a domain query is evaluated, the engine resolves precedence in the following strict order:

```text
Domain Query Arrives (e.g. login.phishing-bank.com)
  │
  ▼
1. Is domain marked as CONFIRMED HIGH-CONFIDENCE MALWARE / PHISHING?
   ├── YES ──► BLOCK (RuleAction.BLOCK, Category: MALWARE / PHISHING)
   │           [Security Policy: Cannot be bypassed by ordinary allowlists]
   └── NO
        │
        ▼
2. Is domain present on USER CUSTOM ALLOWLIST?
   ├── YES ──► ALLOW (RuleAction.ALLOW, Category: USER_ALLOW)
   └── NO
        │
        ▼
3. Is domain present on USER CUSTOM BLOCKLIST?
   ├── YES ──► BLOCK (RuleAction.BLOCK, Category: USER_BLOCK)
   └── NO
        │
        ▼
4. Does domain match standard exception rule (@@)?
   ├── YES ──► ALLOW (RuleAction.ALLOW)
   └── NO
        │
        ▼
5. Does domain match blocklist rule (||domain^ or 0.0.0.0)?
   ├── YES ──► BLOCK (RuleAction.BLOCK, Category: ADS/TRACKERS)
   └── NO
        │
        ▼
6. Default: ALLOW (Forward to upstream DNS resolver)
```

---

## 3. Data Structure: Reversed-Domain Trie (Radix Tree)

To evaluate domain lookups with sub-millisecond latency:
- Domains are stored in reverse label order (e.g., `com` -> `doubleclick` -> `ad`).
- Querying `video.ad.doubleclick.net`:
  1. Lookup `net` -> MATCH
  2. Lookup `doubleclick` -> MATCH (Flagged as Root Wildcard `||doubleclick.net^`)
  3. Suffix match satisfied immediately without needing to traverse deeper child nodes.
- **Lookup Time Complexity**: $O(L)$, where $L$ is the number of domain segments (typically 2 to 4), completely independent of the total number of rules (300,000+ rules).
