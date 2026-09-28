# ClaimRoute — Address-Free Claim & Routing Logistics Engine

ClaimRoute is a fulfillment and delivery-routing platform where a sender can initiate a fulfillment or gift order without having to solicit or store the recipient's sensitive delivery address upfront. Instead, the recipient receives a one-time cryptographic claim link to supply their delivery preferences and address securely.

> **Current Status**: **Phase 4 (Secure Claim System)**. This repository contains the complete full-stack foundation, the warm consumer-first design system, Cloud Firestore persistence, sender order management, and the end-to-end **Secure Claim System** (cryptographic token generation, SHA-256 hashing, server-authoritative expiration, concurrency-safe atomic consumption, and the `/claim/:token` recipient validation interface).

---

## Secure Claim System Architecture (Phase 4)

Phase 4 establishes the secure claim-token security layer that decouples order initiation from recipient delivery details:

```text
Order Created (CREATED status)
         ↓
Sender Generates Claim Link (POST /api/orders/:orderId/claim)
         ↓
Backend Generates 256-Bit Cryptographic Token (crypto.randomBytes)
         ↓
Only SHA-256 Hash Persisted in Firestore (claimTokens/{tokenHash})
         ↓
Order Status Transitions: CREATED → CLAIM_PENDING
         ↓
Sender Shares Time-Limited Claim URL: http://localhost:5173/claim/<raw-token>
         ↓
Recipient Opens Claim Link (GET /api/claims/:token)
         ↓
Server Hashes Supplied Token, Verifies Expiry & Unused Status
         ↓
Minimal Sanitized Delivery Metadata Displayed (Zero PII Leaked)
         ↓
Atomic One-Time Consumption (POST /api/claims/:token/consume)
         ↓
Firestore Transaction Commits: used = true, Order Status → CLAIMED
         ↓
Subsequent Use Attempts Rejected (409 Conflict: CLAIM_TOKEN_USED)
```

> [!IMPORTANT]
> **Core Architectural Security Guarantee**: ClaimRoute **never** stores the raw claim token in Cloud Firestore or application logs. Only its deterministic SHA-256 hash is persisted. When a recipient submits their claim link, the backend computes `sha256(token)` to find and validate the record.

---

## Current Features (Phases 1, 1.5, 2, 3 & 4)

- **Frontend Client**: Modern React + Vite application with design tokens, responsive layout, accessible UI primitives, **Sender Deliveries Dashboard** (`/deliveries`), and the new **Recipient Claim Experience** (`/claim/:token`).
- **Sender Order Management**: Create, view, update, cancel deliveries, and generate single-use claim links through an intuitive, human-centered UI.
- **Cryptographic Security Layer**: 256-bit URL-safe tokens generated via `crypto.randomBytes(32).toString('base64url')` with SHA-256 hex indexing.
- **Single Active Token Policy**: Generating a replacement link for an order automatically revokes previous unconsumed tokens to prevent multiple valid links.
- **Race-Condition-Safe Atomic Consumption**: Concurrency-safe one-time usage enforced via Firestore transactions (`db.runTransaction()`). Simultaneous requests allow strictly one consumption to succeed.
- **Authoritative Server Expiration**: Expiration enforced strictly by server timestamps (`CLAIM_TOKEN_EXPIRATION_MINUTES=30`). Client timestamps are never trusted.
- **Minimal Information Exposure**: Public validation endpoints return only the item name, description, quantity, and expiration. Sender IDs, raw tokens, token hashes, and internal database keys are never exposed.
- **Persistence Layer**: Cloud Firestore integration via `firebase-admin` with automatic server timestamps (`FieldValue.serverTimestamp()`) and server-mediated default-deny security rules (`firestore.rules`).
- **Automated Test Suite**: 39 native `node:test` automated tests covering token randomness, SHA-256 collision resistance, order eligibility, expiration boundaries, zero data leakage, one-time consumption, and concurrent race-condition prevention.

---

## Claim Token Data Model

Stored in Firestore under `claimTokens/{tokenHash}`:

```json
{
  "id": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "tokenHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "orderId": "ceY2osOJRdzJcyAyoZZb",
  "used": false,
  "usedAt": null,
  "revoked": false,
  "revokedAt": null,
  "expiresAt": "2026-09-28T18:00:00.000Z",
  "createdAt": "2026-09-28T17:30:00.000Z",
  "updatedAt": "2026-09-28T17:30:00.000Z"
}
```

---

## Order Lifecycle

| Status              | Phase              | Description                                                              |
| :------------------ | :----------------- | :----------------------------------------------------------------------- |
| `CREATED`           | Phase 3 (Active)   | Order created by sender; fully editable and cancellable.                 |
| `CLAIM_PENDING`     | Phase 4 (Active)   | Claim token generated; order locked against edits, awaiting recipient.   |
| `CLAIMED`           | Phase 4 (Active)   | Claim link unlocked and consumed atomically by recipient.                |
| `PROCESSING`        | Phase 5 (Upcoming) | Recipient address and constraints undergoing AI extraction & validation. |
| `ROUTING_READY`     | Phase 5 (Upcoming) | Delivery constraints extracted; ready for courier routing.               |
| `FULFILLMENT_READY` | Phase 5 (Upcoming) | Route finalized and queued for delivery.                                 |
| `COMPLETED`         | Phase 5 (Upcoming) | Package delivered to recipient.                                          |
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
  - **Response** (`201 Created`):
    ```json
    {
      "success": true,
      "data": {
        "orderId": "ceY2osOJRdzJcyAyoZZb",
        "claimUrl": "http://localhost:5173/claim/dGhpc2lzYXNhbXBsZXRva2Vu...",
        "expiresAt": "2026-09-28T18:00:00.000Z"
      }
    }
    ```

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

#### Atomically Consume Claim Token

- **Method**: `POST /api/claims/:token/consume`
- **Purpose**: Atomically marks the token `used: true` and transitions the order status to `CLAIMED`.
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": {
      "consumed": true,
      "orderId": "ceY2osOJRdzJcyAyoZZb",
      "claimedAt": "2026-09-28T17:35:12.441Z"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `CLAIM_TOKEN_INVALID` (malformed or missing token)
  - `404 Not Found`: `CLAIM_TOKEN_INVALID` or `CLAIM_ORDER_NOT_FOUND`
  - `409 Conflict`: `CLAIM_TOKEN_USED` (already consumed) or `CLAIM_ORDER_NOT_ELIGIBLE` (order cancelled)
  - `410 Gone`: `CLAIM_TOKEN_EXPIRED` (link exceeded 30-minute validity)

### 3. System & Health

- `GET /api/health`: Reports server and Cloud Firestore health.

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

Open `http://localhost:5173/deliveries` to create orders and generate claim links. Open `/claim/<token>` to preview and consume claim links.

---

## Development Roadmap

| Phase         | Description                                              | Status        |
| :------------ | :------------------------------------------------------- | :------------ |
| **Phase 1**   | Project Foundation, React+Vite, Express, Health Check    | **Completed** |
| **Phase 1.5** | Welcoming UI, Design Tokens, Responsive Foundation       | **Completed** |
| **Phase 2**   | Firebase Admin SDK, Cloud Firestore, Repositories        | **Completed** |
| **Phase 3**   | Order Management (Sender Workflows, CRUD, Validation)    | **Completed** |
| **Phase 4**   | Secure Claim System (Tokens, Hashing, Expiration, Claim) | **Completed** |
| **Phase 5**   | Recipient Claim Flow (Address Form & Preferences Intake) | Queued        |
| **Phase 6**   | LangChain & Pydantic AI Extraction for Delivery Notes    | Queued        |
| **Phase 7**   | Fulfillment Readiness & Operations Dispatch              | Queued        |

---

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)**. See [`LICENSE.md`](file:///home/swarnavo/Desktop/PROJECTS/ClaimRoute/LICENSE.md) for terms.

## Contact & Author

Maintained by **Swarnavo Khanra** (`swarnavokhanra@gmail.com`).
