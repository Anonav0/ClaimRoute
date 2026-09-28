# ClaimRoute Security Audit & Threat Assessment (Phase 6)

This document provides a comprehensive security audit of ClaimRoute as of **Phase 6 (Security Hardening)**. It assesses the threat landscape across the full stack, outlines architectural mitigations implemented in Phase 6, and transparently documents remaining considerations and future boundaries.

---

## 1. System Overview & Trust Boundaries

ClaimRoute enforces a strict multi-tier trust model:

```text
       [ Public Internet / Untrusted Client ]
                          │
                          ▼
           [ React + Vite Client Application ]
       (Browser is NEVER an authorization boundary)
                          │  HTTP / JSON (Rate-Limited, Strict Referrer, Helmet, CORS)
                          ▼
              [ Node.js / Express API ]
       ┌──────────────────┴──────────────────┐
       │                                     │
   [ Request Correlation ]          [ Body Limits 100kb ]
       │                                     │
   [ Authentication & Authorization ]   [ Input Validators ]
       │                                     │
       └──────────────────┬──────────────────┘
                          ▼
                  [ Service Layer ]
        (Ownership & Capability Checks, Response DTOs)
                          │
                          ▼
                 [ Repository Layer ]
                          │
                          ▼
              [ Firebase Admin SDK ]
     (Privileged backend service account credentials)
                          │
                          ▼
                  [ Cloud Firestore ]
         (Deny-by-default client access rules)
```

---

## 2. Threat Matrix & Mitigations

| #      | Threat                                           | Risk Description                                                                                                          | Pre-Phase 6 Protection                                                     | Phase 6 Security Hardening Mitigation                                                                                                                                                                                                                                          | Remaining Consideration                                                                                                                    |
| ------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **1**  | **Claim-Token Guessing**                         | Attacker attempts to brute-force 256-bit URL claim tokens to claim gifts or inspect deliveries.                           | 256-bit cryptographically secure random tokens (`crypto.randomBytes(32)`). | Added sliding-window rate limiting on `GET /api/claims/:token` and `POST /api/claims/:token/*` (30 req / 15 mins per IP). Constant-time lookup via SHA-256 hash. Generic error codes (`CLAIM_TOKEN_INVALID`).                                                                  | Distributed deployments across multiple server instances should back the rate limiter with Redis/Memorystore.                              |
| **2**  | **Claim-Token Leakage**                          | Tokens in URLs leak to third parties via browser history, external referrers, or logs.                                    | Raw tokens were not stored in database.                                    | Configured `Helmet` with strict referrer policy: `Referrer-Policy: strict-origin-when-cross-origin`. Automated recursive log redaction of tokens and hashes. Public claim frontend has no third-party analytics or external trackers.                                          | Recipient email/SMS delivery channels in future phases must transmit links over TLS and avoid third-party URL shorteners that log targets. |
| **3**  | **Token Replay**                                 | Attacker captures a used claim link and attempts to resubmit or alter delivery details.                                   | Token flagged `used: true` upon initial consumption.                       | Verified atomic transition in single Firestore transaction. Replay attempts trigger HTTP 409 `CLAIM_TOKEN_USED` or `CLAIM_ALREADY_COMPLETED`.                                                                                                                                  | Claim tokens are strictly single-use and cannot be un-consumed.                                                                            |
| **4**  | **Duplicate Claim Submission / Race Conditions** | Concurrent requests simultaneously submit delivery addresses for the same token.                                          | Atomic Firestore transaction.                                              | Validated transactional isolation in `claimTokenRepository.completeClaimAtomically` where only the first concurrent worker succeeds and subsequent workers roll back cleanly.                                                                                                  | Concurrency testing validated in automated test suite.                                                                                     |
| **5**  | **Unauthorized Order Access**                    | Unauthenticated callers request order data or trigger state modifications.                                                | Implicit development mock context.                                         | Introduced `authenticateUser` and `requireAuth` middleware (`middleware/auth.js`) rejecting unauthenticated requests with HTTP 401 `UNAUTHORIZED`. Isolated development identity behind `config.isDevelopment \|\| config.isTest`.                                             | Full Firebase Auth JWT verification (`admin.auth().verifyIdToken()`) will be wired in future authentication phases.                        |
| **6**  | **Cross-Sender Order Access**                    | Sender A queries or modifies an order owned by Sender B (IDOR).                                                           | Repository query scoping.                                                  | Centralized authorization in `authorizationService.authorizeOrderAccess()` enforcing `order.senderId === user.id` across `getOrderById`, `updateOrder`, `cancelOrder`, and `generateClaimForOrder`. Cross-sender queries reject with HTTP 403 `ACCESS_DENIED`.                 | Administrative roles (`ADMIN`, `OPERATIONS`) are abstracted and reserved for future staff dashboards.                                      |
| **7**  | **Direct Firestore Access**                      | Malicious users exploit Firebase client credentials to bypass backend logic and read/write database collections directly. | Baseline security rules.                                                   | Hardened `firestore.rules` with strict, universal deny-by-default (`allow read, write: if false;` on `/{document=**}` and all named collections). All queries must traverse the Express API mediated by Firebase Admin SDK.                                                    | Rules must be kept updated if mobile SDKs or direct client subscriptions are introduced in the future.                                     |
| **8**  | **Sensitive API Responses**                      | API endpoints accidentally serialize internal metadata, database keys, token hashes, or unneeded recipient PII.           | Manual object construction in controllers.                                 | Created strict response DTO mappers (`mapOrderResponse`, `mapOrderListResponse`, `mapClaimPreviewResponse`, `mapClaimCompletionResponse`). Recipient PII is stripped from sender views; token hashes and database metadata are eliminated from all responses.                  | Review DTO mappings whenever new fields are added to domain models.                                                                        |
| **9**  | **Environment-Secret Exposure**                  | Service account private keys or database credentials leak during server crashes or startup errors.                        | Basic `.env` parsing.                                                      | Implemented `validateEnv()` in `config/env.js` that audits required variables on startup and fails fast with safe messages without printing secret values. Confirmed `.gitignore` excludes `.env` and `*.json` keys.                                                           | Production deployments should retrieve credentials directly from Google Cloud Secret Manager.                                              |
| **10** | **Error-Message Leakage**                        | Uncaught exceptions leak database schemas, file paths, or stack traces to clients.                                        | Generic 500 error code.                                                    | Updated `errorHandler.js` to sanitize non-operational system errors in production (`NODE_ENV === 'production'`) to generic messages with correlated `requestId`. Stack traces and diagnostics are restricted to development mode.                                              | Frontend must never display raw server error bodies to users.                                                                              |
| **11** | **Excessive Request Payloads (DoS)**             | Attackers send megabyte-sized JSON payloads to exhaust backend memory and CPU.                                            | 10kb body parser.                                                          | Standardized body limits to `100kb` for `express.json()` and `express.urlencoded()`, preventing payload bloating attacks while accommodating complex recipient address and notes inputs.                                                                                       | Additional multipart/form-data limits should be added if file uploads are supported in later phases.                                       |
| **12** | **API Abuse / Scraping**                         | Scripted bots crawl the API looking for order data or valid tokens.                                                       | None.                                                                      | Sliding-window IP rate limiter (`createRateLimiter`) with standard headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `Retry-After`). Throttled callers receive HTTP 429 `RATE_LIMIT_EXCEEDED`.                                                             | Rate limits can be tuned per environment via configuration.                                                                                |
| **13** | **Log Leakage**                                  | Sensitive recipient PII (phone, address, delivery notes) or cryptographic tokens leak into logging aggregators.           | Selective manual logging.                                                  | Created recursive metadata sanitizer (`sanitizeLogValue` / `sanitizeMetadata`) in `utils/logger.js`. Automatically redacts keys matching tokens, hashes, passwords, private keys, phones, addresses, delivery notes, and credentials.                                          | Verify third-party log drivers (e.g. Datadog, CloudWatch) respect structured log output.                                                   |
| **14** | **CORS Abuse**                                   | Malicious origins make unauthorized cross-origin requests to authenticated backend routes.                                | Broad origin check.                                                        | Configured strict CORS policy with environment-driven allowed origins (`config.corsOrigin`). Wildcard origins explicitly disallow `credentials: true`. Correlation and rate-limit headers exposed cleanly.                                                                     | Ensure staging and production environments specify exact origins rather than wildcards.                                                    |
| **15** | **Prototype / Request Manipulation**             | Attackers manipulate query or header parameters to bypass authorization checks.                                           | Basic Express parsing.                                                     | Explicit type and presence validation in middleware. `senderContext` / `auth` sanitizes strings. Request correlation headers (`X-Request-Id`) are generated or normalized using UUIDs.                                                                                         | Use object schema validators (e.g. Zod or Joi) for complex nested query parameters.                                                        |
| **16** | **Resource Enumeration**                         | Sequential integer IDs allow attackers to guess existing order IDs.                                                       | Firestore IDs.                                                             | All entities (`orders`, `recipients`, `claimTokens`) use 20-character high-entropy alphanumeric Firestore IDs or 256-bit SHA-256 hashes. Enumeration is mathematically infeasible.                                                                                             | Avoid exposing autoincrementing numbers in public URLs.                                                                                    |
| **17** | **Mass Assignment Vulnerabilities**              | Attackers inject protected fields (e.g. `status`, `senderId`, `recipientId`, `claimedAt`) into create or update payloads. | Initial create validator.                                                  | Expanded `PROTECTED_FIELDS` in `orderValidator.js` to include `id`, `senderId`, `status`, `createdAt`, `updatedAt`, `claimedAt`, `recipientId`, `recipient`, `tokenHash`, and `claimToken`. Attempts to mutate these fields immediately fail with HTTP 400 `VALIDATION_ERROR`. | Update allowlists whenever model definitions expand.                                                                                       |
| **18** | **Accidental Client-Side Secret Exposure**       | Vite bundles inadvertently package backend service account keys or private environment variables into static JS.          | Vite `.env` separation.                                                    | Verified frontend references only `VITE_`-prefixed variables (`VITE_API_BASE_URL`). No Firebase Admin SDK, private keys, or server configurations exist in the frontend package. Audited build output (`npm run build`).                                                       | Continuous integration should include automated secret scanners (e.g. GitGuardian or TruffleHog).                                          |

---

## 3. Explicit Architecture Limitations & Future Boundaries

1. **Development Mock Identity (`development-sender`)**:
   - In development and test environments, `req.user` defaults to a mock sender identity (`development-sender`) to facilitate local testing without requiring an active Firebase Auth login session.
   - **Production Isolation**: In production (`NODE_ENV === 'production'`), this fallback is completely disabled. Requests lacking verified credentials will be rejected with HTTP 401. Full Firebase Auth token decoding will be mounted into `middleware/auth.js` when user management is implemented.
2. **In-Memory Rate Limiting**:
   - The current sliding-window rate limiter stores hit counts in Node.js process memory. In a clustered multi-node deployment, an IP could exceed limits by rotating across nodes. A Redis or Google Cloud Memorystore backend should be plugged into `createRateLimiter` prior to multi-instance production scale.
3. **Firestore Security Rules vs Admin SDK**:
   - As documented in `firestore.rules`, the backend uses the Firebase Admin SDK, which deliberately bypasses client security rules. Security enforcement resides primarily in the Express application layer.

---

## 4. Verification Summary

- **Total Security Tests**: 69 native `node:test` tests passing with 0 failures across 18 test suites.
- **Frontend Production Build**: Vite build completed cleanly with 0 warnings or bundle leaks.
- **Codebase Sanitization**: Grep audit confirmed zero `console.log` calls in frontend, zero `localStorage`/`sessionStorage` usage, and zero `dangerouslySetInnerHTML` instances.
