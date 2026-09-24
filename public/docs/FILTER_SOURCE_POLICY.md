# AdShield Filter Source Policy, Curation & Attribution

## 1. Curation Philosophy

AdShield does not hardcode millions of raw filter lines inside the APK source. Instead, it relies on a **dynamically verified filter-source catalog** maintained by trusted open security and privacy communities.

### Guiding Curation Principles:
1. **Low False Positives (LFP)**: Lists that break core Android services (e.g. Google Play Services, push notifications, banking apps) are barred from the default enabled set.
2. **Resource Efficiency**: Overlapping, redundant lists that cause excessive memory bloat or battery drain are pruned.
3. **Strict Licensing & Attribution**: Only sources with clear open redistribution licenses (CC-BY, MIT, GPL, Public Domain) are integrated with full author attribution.

---

## 2. Integrated Filter & Threat Intelligence Sources

| Source Name | Category | Primary Format | Update Frequency | License / Terms | Default State |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AdGuard DNS Filter** | Ads, Trackers | Adblock syntax | 24 Hours | Apache-2.0 / CC-BY-SA 3.0 | **Enabled** (Default) |
| **HaGeZi Multi LIGHT** | Trackers, Ads | Hosts & Adblock | 24 Hours | CC-BY-SA 4.0 | **Enabled** (Default) |
| **OISD Basic** | Ads, Telemetry | Adblock syntax | 24 Hours | CC0 / Public Domain | **Enabled** (Default) |
| **StevenBlack Unified** | Ads, Malware | Standard Hosts | 48 Hours | MIT License | **Enabled** (Default) |
| **URLHaus Malware Feeds** | Malware, C2 | Domain list | 12 Hours | CC0 (abuse.ch) | **Enabled** (Default) |
| **HaGeZi Threat Intelligence**| Phishing, Scams | Adblock syntax | 12 Hours | CC-BY-SA 4.0 | **Enabled** (Default) |
| **1Hosts Lite** | Aggressive Ads | Standard Hosts | 7 Days | Custom permissive | Optional (Disabled) |

---

## 3. Remote Source Attribution & Fair Use

In accordance with upstream author licensing terms:
- Attribution metadata (author name, website, license URL) is preserved in the application UI under `Settings > Filters > Source Details`.
- Remote downloads are performed using an identifiable, respectful User-Agent header (`AdShield-Engine/1.0; +https://adshield.internal`) with conditional HTTP caching (`If-Modified-Since`, `ETag`) to minimize bandwidth consumption on source maintainers.
