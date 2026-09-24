# AdShield Engineering & Contribution Guidelines

## 1. Code Standards & Architecture Guidelines

1. **Language Choices**:
   - Native Android client: Primary language is **Kotlin**. JVM modules maintain strict Java interoperability.
   - Web backend & Admin: **Node.js** with clean modular TypeScript / ES6 standards.
2. **Architecture**:
   - Android: Follow Clean Architecture and unidirectional data flow (MVI / StateFlow).
   - Compose: Keep composables stateless where possible; hoist state to repositories or view models.
3. **Privacy by Default**:
   - Any proposed change that logs or transmits URL, DNS, or browsing data will be rejected immediately.
   - Redact all domains in local UI logs (`domain[.]com`).
4. **Testing Requirements**:
   - All parser rules, match algorithms, and crypto entitlement logic must include automated unit tests before PR submission.
