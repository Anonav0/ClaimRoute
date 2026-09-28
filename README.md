# ClaimRoute — Address-Free Claim & Routing Logistics Engine

ClaimRoute is a fulfillment and delivery-routing platform where a sender can initiate a fulfillment or gift order without having to solicit or store the recipient's sensitive delivery address upfront. Instead, the recipient receives a one-time cryptographic claim link to supply their delivery preferences and address securely.

> **Current Status**: **Phase 6 (Security Hardening)**. This repository contains the complete full-stack foundation, the warm consumer-first design system, Cloud Firestore persistence, sender order management, secure claim token infrastructure, the end-to-end Recipient Claim Experience, and comprehensive **Security Hardening** (Firestore deny-by-default rules, sender authorization abstraction, public rate limiting, strict referrer policy, mass assignment protection, recursive log redaction, production error sanitization, response DTO mappers, and fail-fast environment validation).

---

## Recipient Claim Flow Architecture (Phase 5)

Phase 5 completes the recipient-facing claim workflow that begins when a recipient opens a secure tokenized claim link and ends when their delivery address is safely recorded:

```text
Recipient Opens /claim/:token
         ↓
Backend Validates Token (GET /api/claims/:token)
         ↓
Warm Intake Form Displayed (Item Summary, Recipient Name, Phone, Structured Address, Notes)
         ↓
Client-Side Validation Checks Formatting
         ↓
Recipient Submits Claim (POST /api/claims/:token/complete)
         ↓
Backend Request Validator Enforces Required Fields & Length Constraints (Rejects Client OrderId)
         ↓
Single Atomic Firestore Transaction (db.runTransaction):
   ├─ Verifies Token Exists, Not Expired, Not Used
   ├─ Verifies Order Exists & Is Eligible (Not Cancelled)
   ├─ Persists Recipient Record (recipients/{recipientId})
   ├─ Marks Claim Token Used (used: true, usedAt: serverTimestamp)
   └─ Updates Order Status to CLAIMED (claimedAt: serverTimestamp, recipientId)
         ↓
Confirmation Screen Displayed to Recipient
         ↓
Subsequent Submissions or Link Refreshes Rejected (409 Conflict: CLAIM_ALREADY_COMPLETED)
```

> [!IMPORTANT]
> **Privacy Guarantee**: Recipient delivery addresses and contact numbers are stored exclusively in the server-managed `recipients` Firestore collection and are **never** exposed to the sender or leaked in public validation endpoints. Delivery notes are stored as raw text in Phase 5 for downstream processing in later phases.

---

## Current Features (Phases 1, 1.5, 2, 3, 4 & 5)

- **Frontend Client**: Modern React + Vite application with design tokens, responsive layout, accessible UI primitives, **Sender Deliveries Dashboard** (`/deliveries`), and the new **Recipient Claim Form** (`/claim/:token`).
- **Recipient Intake Experience**: Human-centered delivery form collecting full name, phone number, structured address (`line1`, `line2`, `city`, `state`, `postalCode`, `country`), and optional delivery notes.
- **Client & Server-Side Validation**: Immediate feedback on the frontend paired with authoritative backend schema validation (`validators/recipientValidator.js`) rejecting missing fields, malformed input, and client-injected protected fields.
- **Atomic Claim Completion**: Multi-document transactional integrity via Firestore transactions (`claimTokenRepository.completeClaimAtomically`). Token consumption, recipient creation, and order state transition happen together or roll back entirely.
- **Single Active Token Policy**: Generating a replacement link for an order automatically revokes previous unconsumed tokens to prevent multiple valid links.
- **Cryptographic Security Layer**: 256-bit URL-safe tokens generated via `crypto.randomBytes(32).toString('base64url')` with SHA-256 hex indexing. Raw tokens are **never** stored in Firestore.
- **Minimal Information Exposure**: Public validation endpoints return only item name, description, quantity, and expiration. Sender IDs, raw tokens, token hashes, and internal database keys are never exposed.
- **Persistence Layer**: Cloud Firestore integration via `firebase-admin` with automatic server timestamps (`FieldValue.serverTimestamp()`) and server-mediated default-deny security rules (`firestore.rules`).
- **Automated Test Suite**: 49 native `node:test` automated tests covering order workflows, token cryptography, expiration boundaries, recipient validation, duplicate prevention, and race-condition prevention.

---

## Data Models

### 1. Recipient Document: `recipients/{recipientId}`

```json
{
  "id": "OAtwoGm753gV4kmtvn4U",
  "orderId": "ceY2osOJRdzJcyAyoZZb",
  "fullName": "Priya Sharma",
  "phone": "+91 98300 12345",
  "address": {
    "line1": "42 Park Street",
    "line2": "Flat 3C, Heritage Residency",
    "city": "Kolkata",
    "state": "West Bengal",
    "postalCode": "700016",
    "country": "India"
  },
  "notes": "Please call on intercom 303 before delivery.",
  "createdAt": "2026-09-28T17:39:44.633Z",
  "updatedAt": "2026-09-28T17:39:44.633Z"
}
```

### 2. Claim Token Document: `claimTokens/{tokenHash}`

```json
{
  "id": "364fa204d380bd6b8c4d2d488...",
  "tokenHash": "364fa204d380bd6b8c4d2d488...",
  "orderId": "ceY2osOJRdzJcyAyoZZb",
  "used": true,
  "usedAt": "2026-09-28T17:39:44.633Z",
  "revoked": false,
  "revokedAt": null,
  "expiresAt": "2026-09-28T18:09:43.826Z",
  "createdAt": "2026-09-28T17:39:44.247Z",
  "updatedAt": "2026-09-28T17:39:44.633Z"
}
```

### 3. Order Document: `orders/{orderId}`

```json
{
  "id": "ceY2osOJRdzJcyAyoZZb",
  "senderId": "development-sender",
  "item": {
    "name": "Artisanal Coffee Box",
    "description": "Roast beans with ceramic dripper"
  },
  "quantity": 1,
  "deliveryTimeframe": "By Friday",
  "notes": "Fragile glassware",
  "status": "CLAIMED",
  "claimedAt": "2026-09-28T17:39:44.633Z",
  "recipientId": "OAtwoGm753gV4kmtvn4U",
  "createdAt": "2026-09-28T16:59:50.844Z",
  "updatedAt": "2026-09-28T17:39:44.633Z"
}
```

---

## Order Lifecycle

| Status              | Phase              | Description                                                              |
| :------------------ | :----------------- | :----------------------------------------------------------------------- |
| `CREATED`           | Phase 3 (Active)   | Order created by sender; fully editable and cancellable.                 |
| `CLAIM_PENDING`     | Phase 4 (Active)   | Claim token generated; order locked against edits, awaiting recipient.   |
| `CLAIMED`           | Phase 5 (Active)   | Recipient submitted delivery address & preferences; claim completed.     |
| `PROCESSING`        | Phase 6 (Upcoming) | Recipient address and constraints undergoing AI extraction & validation. |
| `ROUTING_READY`     | Phase 6 (Upcoming) | Delivery constraints extracted; ready for courier routing.               |
| `FULFILLMENT_READY` | Phase 7 (Upcoming) | Route finalized and queued for delivery.                                 |
| `COMPLETED`         | Phase 7 (Upcoming) | Package delivered to recipient.                                          |
| `CANCELLED`         | Phase 3 (Active)   | Order cancelled by sender; preserved in history.                         |
| `EXPIRED`           | Phase 4 (Active)   | Claim link passed expiration date without consumption.                   |

---

## API Documentation

### 1. Sender Endpoints (`/api/orders`)

All order requests automatically scope to the server-controlled sender context (or `X-Sender-Id` header).

- `POST /api/orders`: Create an order with item name, quantity, and delivery timeframe.
- `GET /api/orders`: List all orders created by the sender.
- `GET /api/orders/:orderId`: Retrieve full details of a sender order.
- `PATCH /api/orders/:orderId`: Update editable fields while in `CREATED` status.
- `POST /api/orders/:orderId/cancel`: Cancel an order in `CREATED` or `CLAIM_PENDING` status.
- `POST /api/orders/:orderId/claim`: Generate a secure, single-use claim link for an order.

### 2. Recipient Claim Endpoints (`/api/claims`)

Public endpoints decoupled from sender authorization context.

#### Validate Claim Link

- **Method**: `GET /api/claims/:token`
- **Purpose**: Inspects token validity and delivers minimal delivery preview without consuming the token.
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": {
      "valid": true,
      "orderId": "ceY2osOJRdzJcyAyoZZb",
      "status": "CLAIM_PENDING",
      "item": {
        "name": "Artisanal Coffee Box",
        "description": "Roast beans with ceramic dripper"
      },
      "quantity": 1,
      "deliveryTimeframe": "By Friday",
      "expiresAt": "2026-09-28T18:00:00.000Z"
    }
  }
  ```

#### Complete Claim with Recipient Information

- **Method**: `POST /api/claims/:token/complete`
- **Purpose**: Atomically validates recipient address and delivery notes, creates the recipient record in Firestore, marks the token as used, and updates the order status to `CLAIMED`.
- **Request Body**:
  ```json
  {
    "fullName": "Priya Sharma",
    "phone": "+91 98300 12345",
    "address": {
      "line1": "42 Park Street",
      "line2": "Flat 3C, Heritage Residency",
      "city": "Kolkata",
      "state": "West Bengal",
      "postalCode": "700016",
      "country": "India"
    },
    "notes": "Please call on intercom 303 before delivery."
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": {
      "orderId": "ceY2osOJRdzJcyAyoZZb",
      "status": "CLAIMED",
      "recipientId": "OAtwoGm753gV4kmtvn4U"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `VALIDATION_ERROR` (missing or invalid address fields) or `CLAIM_TOKEN_INVALID`
  - `404 Not Found`: `CLAIM_TOKEN_INVALID` or `CLAIM_ORDER_NOT_FOUND`
  - `409 Conflict`: `CLAIM_ALREADY_COMPLETED` (already claimed) or `CLAIM_ORDER_NOT_ELIGIBLE` (order cancelled)
  - `410 Gone`: `CLAIM_TOKEN_EXPIRED` (link exceeded 30-minute validity)

### 3. System & Health

- `GET /api/health`: Reports server and Cloud Firestore health.

---

---

## Security Architecture

ClaimRoute implements a defense-in-depth security model:

```text
Browser / Client (Untrusted)
       │
       ▼
Express API Layer (Rate Limiting, Strict Referrer, Helmet, CORS, 100kb Limits)
       │
       ▼
Authentication & Authorization Layer (req.user context, authorizeOrderAccess)
       │
       ▼
Service Layer & Response DTOs (mapOrderResponse, mapClaimPreviewResponse)
       │
       ▼
Firebase Admin SDK (Privileged Backend Credentials)
       │
       ▼
Cloud Firestore (Deny-By-Default Client Rules)
```

### 1. Trust Boundaries & Principles

- **Deny By Default**: Direct client-side reads/writes to Firestore collections are denied (`firestore.rules`). All operations are server-mediated.
- **Order Ownership & Isolation**: Senders are strictly isolated to their own orders. Attempted cross-tenant queries trigger HTTP 403 `ACCESS_DENIED`.
- **Claim Token as Capability Credential**: 256-bit URL-safe tokens grant capability only to inspect minimal delivery preview metadata and submit delivery details once. Raw tokens are never persisted or logged.
- **Mass Assignment Protection**: Order updates strictly reject attempts to modify `id`, `senderId`, `status`, `createdAt`, `updatedAt`, `claimedAt`, `recipientId`, `recipient`, `tokenHash`, or `claimToken`.
- **Response DTO Mappers**: Internal database attributes, security hashes, and unneeded recipient PII are stripped from sender and public API responses.
- **Rate Limiting**: Sliding-window rate limiting on public capability endpoints (30 requests / 15 minutes per IP) mitigates token guessing and DoS.
- **Security Headers & Referrer Policy**: `Helmet` enforces `strict-origin-when-cross-origin` to prevent claim token leakage in HTTP `Referer` headers when external links are clicked.
- **Recursive Metadata Sanitization**: Server logger automatically redacts tokens, hashes, passwords, private keys, phones, addresses, and delivery notes.
- **Request Correlation & Error Sanitization**: Requests receive unique `X-Request-Id` headers. In production (`NODE_ENV=production`), unexpected system errors are sanitized to generic messages with correlated request IDs.
- **Fail-Fast Environment Validation**: `validateEnv()` audits required variables on startup and halts execution cleanly without logging secrets.

### 2. Secret Management

- **Local Development**: Configured in untracked `.env` files.
- **Production**: Backed by Google Cloud Secret Manager or runtime secrets; zero credentials are committed to version control.
- **Frontend Safety**: Only `VITE_`-prefixed variables are bundled to browser code; server credentials never enter the client bundle.

### 3. Protected Sensitive Collections

- `users`: User profiles and future role scopes (server-mediated).
- `orders`: Order fulfillment details (ownership-restricted).
- `claimTokens`: SHA-256 token hashes, expiration, and consumption states (server-only).
- `recipients`: Recipient PII including full names, phone numbers, and delivery addresses (server-only).
- `deliveryConstraints`: AI-extracted structured delivery constraints (server-only).
- `routingRequests`: Downstream routing queue items (server-only).

---

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
FRONTEND_BASE_URL=http://localhost:5173
CLAIM_TOKEN_EXPIRATION_MINUTES=30

# Firebase Admin Configuration
FIREBASE_PROJECT_ID=claimroute-5ff4e
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Local Setup & Run Instructions

### 1. Prerequisites

- **Node.js** `>= 20.0.0`
- **npm** `>= 10.0.0`

### 2. Backend Setup & Automated Tests

```bash
cd backend
npm install
npm test
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173/deliveries` to create orders and generate claim links. Open `/claim/<token>` to fill out the recipient claim form.

---

## Development Roadmap

| Phase         | Description                                              | Status        |
| :------------ | :------------------------------------------------------- | :------------ |
| **Phase 1**   | Project Foundation, React+Vite, Express, Health Check    | **Completed** |
| **Phase 1.5** | Welcoming UI, Design Tokens, Responsive Foundation       | **Completed** |
| **Phase 2**   | Firebase Admin SDK, Cloud Firestore, Repositories        | **Completed** |
| **Phase 3**   | Order Management (Sender Workflows, CRUD, Validation)    | **Completed** |
| **Phase 4**   | Secure Claim System (Tokens, Hashing, Expiration, Claim) | **Completed** |
| **Phase 5**   | Recipient Claim Flow (Address Form & Preferences Intake) | **Completed** |
| **Phase 6**   | Security Hardening & Rate Limiting (69 Tests Passing)    | **Completed** |
| **Phase 7**   | LangChain & Pydantic AI Extraction for Delivery Notes    | Queued        |
| **Phase 8**   | Fulfillment Readiness & Operations Dispatch              | Queued        |

---

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)**. See [`LICENSE.md`](file:///home/swarnavo/Desktop/PROJECTS/ClaimRoute/LICENSE.md) for terms.

## Contact & Author

Maintained by **Swarnavo Khanra** (`swarnavokhanra@gmail.com`).
