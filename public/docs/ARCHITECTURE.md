# AdShield Technical Architecture

## 1. Architectural Principles

AdShield is designed from first principles as a **native Android privacy and security system**. The architecture strictly isolates local traffic inspection from remote infrastructure and maintains distinct security boundaries.

### Core Architectural Axioms
1. **Local-First Privacy**: Network traffic inspection, DNS parsing, domain classification, and quarantine storage execute entirely on-device. No telemetry, traffic data, or visited destinations cross the network boundary.
2. **Supported Android Mechanisms**: System-wide filtering utilizes Android's supported `VpnService` API. AdShield does not implement TLS interception, does not install arbitrary CA certificates, does not require root privileges, and does not alter system partition state.
3. **Decoupled Update Cycles**: Intelligence feeds (ad rules, tracker lists, threat hashes) update independently and atomically without requiring client APK recompilation.
4. **Resilient Fail-Safe Operation**: If the filtering engine or VPN service encounters an unrecoverable exception, device connectivity fails open rather than leaving the user stranded without Internet access.

---

## 2. Modular Architecture & Dependency Graph

```text
               +---------------------------+
               |           :app            |
               | (UI, VpnService, Workers) |
               +-------------+-------------+
                             |
         +-------------------+-------------------+
         |                   |                   |
         v                   v                   v
+-----------------+ +-----------------+ +------------------+
| :core:security  | |  :core:storage  | | :filtering:engine|
| (Crypto, Vault) | | (DataStore/DB)  | | (Parser, Trie)   |
+--------+--------+ +--------+--------+ +--------+---------+
         |                   |                   |
         +-------------------+-------------------+
                             |
                             v
                    +-----------------+
                    |  :core:common   |
                    | (Models, Utils) |
                    +-----------------+
```

### Module Responsibilities

| Module | Responsibilities | Target Runtime |
| :--- | :--- | :--- |
| `:core:common` | Shared domain models (`RuleCategory`, `ThreatType`), Result wrappers, redaction utilities, build config abstractions. | JVM / Android |
| `:core:storage` | Android Jetpack DataStore preferences, Room database entities for local activity logs and threat metrics. | Android Library |
| `:core:security` | Cryptographic license validation (HMAC/RSA token verification), local offline cache, quarantine vault sandboxing, file hasher. | JVM / Android |
| `:filtering:engine` | Rule parser (Hosts & Adblock syntax), reversed-domain Radix/Trie matching engine, allowlist/blocklist precedence evaluator. | Pure Kotlin JVM |
| `:app` | Jetpack Compose Material 3 UI, `VpnService` network packet interception, DNS query synthesizer, WorkManager background update schedulers. | Android Application |
| `server/` | Public website, public download distribution, licensing API, and private owner admin dashboard. | Node.js / Express |

---

## 3. Network Filtering Data Flow

```text
1. Application initiates DNS query (e.g., ad.doubleclick.net:53)
   │
   ▼
2. Android OS directs UDP packet to AdShield TUN interface (10.0.0.2)
   │
   ▼
3. AdShieldVpnService reads UDP packet from FileDescriptor
   │
   ▼
4. DnsPacket parser extracts QNAME ("ad.doubleclick.net") & QTYPE (A)
   │
   ▼
5. FilterEngine evaluates QNAME against Reversed-Domain Trie
   │
   ├─► [MATCH: BLOCK (Category: ADS)]
   │   │
   │   ├─► Synthesize DNS response with IP 0.0.0.0 (or NXDOMAIN)
   │   ├─► Write synthesized response packet back to TUN interface
   │   └─► Emit local event to Local Statistics Store (Redacted: "ad.doubleclick[.]net")
   │
   └─► [NO MATCH: ALLOW]
       │
       ├─► Forward original UDP DNS packet to upstream resolver (Quad9/Cloudflare)
       │   via protected socket (VpnService.protect(socket))
       ├─► Await upstream DNS response packet
       └─► Write upstream response packet back to TUN interface
```

---

## 4. Concurrency & Performance Model

- **TUN Processing Loop**: Runs on a dedicated high-priority background worker thread (`Dispatchers.IO`) backed by non-blocking NIO byte buffers.
- **Lookup Latency**: The reversed-domain Trie performs suffix evaluations in $O(k)$ time, where $k$ is the number of labels in the queried domain name (typically < 4 hops), delivering lookup latencies under **0.08 milliseconds**.
- **Memory Footprint**: Compiled filter tables leverage string interning and primitive array node indexes, maintaining a heap budget under **35 MB** even with over 300,000 compiled rules.

---

## 5. Architectural Decision Records (ADRs)

### ADR-001: Pure Local-First Boundary
- **Context**: Privacy and ad-blocking utilities frequently route user traffic through cloud proxies to perform remote inspection.
- **Decision**: Reject cloud proxying. All filtering executes locally on-device. The backend is restricted solely to licensing, update distribution, and public web hosting.
- **Consequence**: Zero exposure of user traffic or browsing histories; reduced backend operating costs; full offline filtering resilience.

### ADR-002: Native VpnService Without Root or TLS MITM
- **Context**: Blocking in-app ads can tempt developers to install root certificates or require rooted devices.
- **Decision**: Restrict filtering to DNS and network domain layer via Android's public `VpnService`. Explicitly refuse TLS decryption or root interception.
- **Consequence**: Compliance with Android security best practices; user banking and secure sessions remain strictly private and untampered.
