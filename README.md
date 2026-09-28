# ClaimRoute — Address-Free Claim & Routing Logistics Engine

ClaimRoute is a fulfillment and delivery-routing platform where a sender can initiate a fulfillment or gift order without having to solicit or store the recipient's sensitive delivery address upfront. Instead, the recipient receives a one-time cryptographic claim link to supply their delivery preferences and address securely.

> **Current Status**: **Phase 3 (Order Management)**. This repository contains the complete full-stack foundation, the warm consumer-first design system, Cloud Firestore persistence, and the complete sender-side order management workflow. Business workflows for claim tokens, recipient address collection, and AI routing extraction are ready to be integrated in subsequent phases.

---

## Current Features (Phases 1, 1.5, 2 & 3)

- **Frontend Client**: Modern React + Vite application with design tokens, responsive layout, accessible UI primitives, and the new **Your Deliveries** sender workflow (`/deliveries`).
- **Sender Order Management**: Create, view, update, and cancel deliveries through an intuitive, human-centered UI and REST APIs.
- **Backend Architecture**: Route-Controller-Service-Repository layered architecture with validation middleware and server-controlled sender context.
- **Persistence Layer**: Cloud Firestore integration via `firebase-admin` with automatic server timestamps (`FieldValue.serverTimestamp()`) and snapshot serializers.
- **Repository Pattern**: Centralized `BaseRepository` with typed domain repositories (`OrderRepository`, `UserRepository`, etc.).
- **Security & Validation**: Request validation layer rejects protected field tampering (`status`, `senderId`, `id`). `firestore.rules` enforces default-deny for direct browser access.
- **Health Check API**: `GET /api/health` reports status of both API gateway and Cloud Firestore connection.
- **Automated Test Suite**: Native `node:test` suite verifying validation rules, state transitions, sender isolation, and health probes.

---

## Order Management Workflow

1. **Create Order**: Senders create a delivery order by specifying an item name, optional description, quantity, delivery timeframe, and internal notes. Senders do not supply a recipient address.
2. **List Orders**: Senders can review all their outgoing deliveries with live statuses (e.g. _Created_, _Ready to Claim_, _Cancelled_).
3. **View Details**: Clicking any order reveals its specifications, creation dates, and address-privacy guarantees.
4. **Edit Information**: Orders in `CREATED` status can be edited (item, quantity, timeframe, notes).
5. **Cancel Delivery**: Active orders in `CREATED` status can be cancelled with one click. Cancelled orders are preserved in history rather than physically deleted.

---

## Order Data Model

Stored in Firestore under `orders/{orderId}`:

```json
{
  "id": "ceY2osOJRdzJcyAyoZZb",
  "senderId": "development-sender",
  "item": {
    "name": "Single Origin Coffee Beans",
    "description": "Artisanal roast gift set"
  },
  "quantity": 2,
  "deliveryTimeframe": "By end of week",
  "notes": "Leave with concierge if absent",
  "status": "CREATED",
  "claimedAt": null,
  "createdAt": "2026-09-28T16:59:50.844Z",
  "updatedAt": "2026-09-28T17:00:22.879Z"
}
```

---

## Order Lifecycle

| Status              | Phase              | Description                                                               |
| :------------------ | :----------------- | :------------------------------------------------------------------------ |
| `CREATED`           | Phase 3 (Active)   | Order successfully created by sender; fully editable and cancellable.     |
| `CLAIM_PENDING`     | Phase 4 (Upcoming) | One-time claim token generated; awaiting recipient interaction.           |
| `CLAIMED`           | Phase 4 (Upcoming) | Recipient has unlocked the claim link and submitted delivery preferences. |
| `PROCESSING`        | Phase 5 (Upcoming) | Order is undergoing delivery constraint extraction and validation.        |
| `ROUTING_READY`     | Phase 5 (Upcoming) | Delivery constraints extracted; ready for courier routing.                |
| `FULFILLMENT_READY` | Phase 5 (Upcoming) | Route finalized and queued for delivery.                                  |
| `COMPLETED`         | Phase 5 (Upcoming) | Package delivered to recipient.                                           |
| `CANCELLED`         | Phase 3 (Active)   | Order cancelled by sender; preserved in history.                          |
| `EXPIRED`           | Phase 4 (Upcoming) | Claim link passed its expiration date without consumption.                |

---

## API Documentation

### Order Management Endpoints

All order requests automatically scope to the server-controlled sender context (or testable via `X-Sender-Id` header).

#### 1. Create Order

- **Method**: `POST /api/orders`
- **Request Body**:
  ```json
  {
    "item": {
      "name": "Artisanal Coffee Box",
      "description": "Roast beans with ceramic dripper"
    },
    "quantity": 1,
    "deliveryTimeframe": "By Friday",
    "notes": "Fragile glassware"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "data": {
      "id": "ceY2osOJRdzJcyAyoZZb",
      "senderId": "development-sender",
      "item": {
        "name": "Artisanal Coffee Box",
        "description": "Roast beans with ceramic dripper"
      },
      "quantity": 1,
      "deliveryTimeframe": "By Friday",
      "notes": "Fragile glassware",
      "status": "CREATED",
      "claimedAt": null,
      "createdAt": "2026-09-28T16:59:50.844Z",
      "updatedAt": "2026-09-28T16:59:50.844Z"
    }
  }
  ```

#### 2. List Orders

- **Method**: `GET /api/orders`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": [ ... ],
    "count": 1
  }
  ```

#### 3. Get Order by ID

- **Method**: `GET /api/orders/:orderId`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

#### 4. Update Order

- **Method**: `PATCH /api/orders/:orderId`
- **Request Body**: Editable fields only (`item`, `quantity`, `deliveryTimeframe`, `notes`).
- **Response** (`200 OK`): Returns updated order.
- **Conflict** (`409 Conflict`): Returned if order is not in `CREATED` status.

#### 5. Cancel Order

- **Method**: `POST /api/orders/:orderId/cancel`
- **Response** (`200 OK`): Returns order with `status: "CANCELLED"`.

#### 6. Health Check

- **Method**: `GET /api/health`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "ClaimRoute API is running",
    "services": {
      "api": "healthy",
      "firestore": "healthy"
    },
    "timestamp": "..."
  }
  ```

---

## Local Setup & Run Instructions

### 1. Prerequisites

- **Node.js** `>= 20.0.0`
- **npm** `>= 10.0.0`

### 2. Backend Setup & Tests

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Firebase configuration

# Run automated test suite
npm test

# Start development server
npm run dev
```

Backend listens on `http://localhost:5000`.

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend serves on `http://localhost:5173`. Open `/deliveries` in your browser to test order creation.

---

## Development Roadmap

| Phase         | Description                                              | Status        |
| :------------ | :------------------------------------------------------- | :------------ |
| **Phase 1**   | Project Foundation, React+Vite, Express, Health Check    | **Completed** |
| **Phase 1.5** | Welcoming UI, Design Tokens, Responsive Foundation       | **Completed** |
| **Phase 2**   | Firebase Admin SDK, Cloud Firestore, Repositories        | **Completed** |
| **Phase 3**   | Order Management (Sender Workflows, CRUD, Validation)    | **Completed** |
| **Phase 4**   | Cryptographic Claim Token Engine & Recipient Intake Form | Queued        |
| **Phase 5**   | LangChain & Pydantic AI Extraction for Delivery Notes    | Queued        |
| **Phase 6**   | Fulfillment Readiness Evaluation & Operations Dispatch   | Queued        |

---

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)**. See [`LICENSE.md`](file:///home/swarnavo/Desktop/PROJECTS/ClaimRoute/LICENSE.md) for terms.

## Contact & Author

Maintained by **Swarnavo Khanra** (`swarnavokhanra@gmail.com`).
