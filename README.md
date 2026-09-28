# ClaimRoute — Address-Free Claim & Routing Logistics Engine

ClaimRoute is a fulfillment and delivery-routing platform where a sender can initiate a fulfillment or gift order without having to solicit or store the recipient's sensitive delivery address upfront. Instead, the recipient receives a one-time cryptographic claim link to supply their delivery preferences and address securely.

> **Current Status**: **Phase 2 (Firebase & Firestore Database Foundation)**. This repository contains the complete full-stack foundation, the warm consumer-first design system, and the server-mediated Firebase Admin SDK & Cloud Firestore persistence layer. Business workflows and AI extraction will be implemented in subsequent phases.

---

## Current Features (Phase 1, 1.5 & 2)

- **Frontend Client**: Modern React + Vite application with design tokens, warm consumer landing page, accessible components (`Button`, `Card`, `Badge`, `Modal`), and integrated backend/database status indicator.
- **Backend Server**: Modular Node.js + Express REST service with Route-Controller-Service-Repository layered architecture.
- **Persistence Layer**: Cloud Firestore integration via `firebase-admin` with automatic server timestamps (`FieldValue.serverTimestamp()`) and snapshot serializers.
- **Repository Pattern**: Centralized `BaseRepository` with typed domain repositories (`UserRepository`, `OrderRepository`, `ClaimTokenRepository`, `RecipientRepository`, `DeliveryConstraintRepository`, `RoutingRequestRepository`).
- **Security & Firestore Rules**: Server-first architecture; `firestore.rules` enforces default-deny for direct browser access, keeping PII secure.
- **Health Check API**: `GET /api/health` reports status of both API gateway and Cloud Firestore connection.
- **Test Suite**: Native `node:test` suite verifying repository initialization, timestamp serializers, and health probes.

---

## Tech Stack

- **Frontend**:
  - React (v18)
  - Vite (v6)
  - React Router DOM (v6)
  - Lucide React (Icons)
  - Modern CSS (Tokens, responsive design)
- **Backend**:
  - Node.js (v20+)
  - Express.js (v4)
  - Firebase Admin SDK (`firebase-admin` v13)
  - Cloud Firestore
  - Helmet (HTTP security headers)
  - CORS (Cross-Origin Resource Sharing)
  - Dotenv (Environment variable management)
  - Native Node Test Runner (`node:test`)

---

## Database Architecture

ClaimRoute utilizes a collection structure where all client access is mediated through the backend:

```text
users/                        # Senders, Operations, and Admin accounts
├── id                        # Unique User ID
├── email                     # User email address
├── displayName               # User full name
├── role                      # SENDER | OPERATIONS | ADMIN
├── createdAt                 # Server timestamp
└── updatedAt                 # Server timestamp

orders/                       # Fulfillment & gift order records
├── id                        # Unique Order ID
├── senderId                  # Reference to users/{userId}
├── item                      # Item / gift description
├── quantity                  # Item count
├── status                    # CREATED | CLAIM_PENDING | CLAIMED | PROCESSING |
│                             # ROUTING_READY | FULFILLMENT_READY | COMPLETED | CANCELLED | EXPIRED
├── createdAt                 # Order creation timestamp
├── updatedAt                 # Last update timestamp
└── claimedAt                 # Recipient claim timestamp (when claimed)

claimTokens/                  # Cryptographic one-time claim tokens
├── tokenHash                 # Primary Key: SHA-256 hash of the secret URL token
├── orderId                   # Reference to orders/{orderId}
├── expiresAt                 # Expiration timestamp
├── used                      # Boolean flag indicating consumption
├── usedAt                    # Timestamp when token was consumed
└── createdAt                 # Creation timestamp

recipients/                   # Recipient delivery details (Protected PII)
├── id                        # Recipient record ID
├── orderId                   # Reference to orders/{orderId}
├── name                      # Recipient full name
├── address                   # Structured object (line1, line2, city, state, postalCode, country)
├── phone                     # Recipient contact number
├── deliveryNotes             # Freeform notes (e.g. "Leave at back door")
├── createdAt                 # Creation timestamp
└── updatedAt                 # Last update timestamp

deliveryConstraints/          # Normalized constraints (extracted via LLM in Phase 4)
├── id                        # Constraint record ID
├── orderId                   # Reference to orders/{orderId}
├── deliveryStartTime         # Time window start
├── deliveryEndTime           # Time window end
├── accessCode                # Gate or callbox code
├── accessInstructions        # Gate/callbox instructions
├── dietaryConstraints        # Dietary preferences / perishable flags
├── deliveryInstructions      # Structured drop-off notes
├── createdAt                 # Extraction timestamp
└── updatedAt                 # Last update timestamp

routingRequests/              # Dispatch requests for courier routing (Phase 5)
├── id                        # Request ID
├── orderId                   # Reference to orders/{orderId}
├── status                    # Routing preparation state
├── createdAt                 # Creation timestamp
└── updatedAt                 # Last update timestamp
```

---

## Firebase & Firestore Setup

### 1. Create a Firebase Project

1. Open the [Firebase Console](https://console.firebase.google.com/) and create a new project (e.g., `claimroute`).
2. Navigate to **Build > Firestore Database** and click **Create Database**.
3. Choose your preferred region and start in **Production mode** (our `firestore.rules` enforces secure access).

### 2. Generate Service Account Credentials

1. In Firebase Console, go to **Project Settings > Service Accounts**.
2. Click **Generate New Private Key** and download the JSON file.
3. Extract `project_id`, `client_email`, and `private_key` into `backend/.env`.

### 3. Local Development & Emulator Support

For offline local development without active GCP credentials:

- Set `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` in `backend/.env`.
- Run the local emulator via Firebase tools using `firebase.json` and `firestore.rules`.

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Server Runtime
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:5173

# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# Optional: Local Firestore Emulator
# FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Local Setup

### 1. Prerequisites

- **Node.js** `>= 20.0.0`
- **npm** `>= 10.0.0`

### 2. Backend Setup & Verification

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Firebase configuration

# Run unit tests (verifies repository layer and health service)
npm test

# Start development server
npm run dev
```

The backend starts at `http://localhost:5000`.

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The client will be running at `http://localhost:5173`.

---

## API Documentation

### Health Check (`GET /api/health`)

Returns system status and services connectivity:

```json
{
  "success": true,
  "message": "ClaimRoute API is running",
  "services": {
    "api": "healthy",
    "firestore": "healthy"
  },
  "timestamp": "2026-09-28T16:29:23.428Z"
}
```

---

## Development Roadmap

| Phase         | Description                                                       | Status        |
| :------------ | :---------------------------------------------------------------- | :------------ |
| **Phase 1**   | Project Foundation, React+Vite, Express, Health Check             | **Completed** |
| **Phase 1.5** | Welcoming UI, Design Tokens, Responsive Foundation                | **Completed** |
| **Phase 2**   | Firebase Admin SDK, Cloud Firestore, Repositories                 | **Completed** |
| **Phase 3**   | Cryptographic One-Time Claim Token Engine & Recipient Intake Form | Queued        |
| **Phase 4**   | LangChain & Pydantic AI Extraction for Delivery Notes             | Queued        |
| **Phase 5**   | Fulfillment Readiness Evaluation & Operations Dispatch            | Queued        |

---

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)**. See [`LICENSE.md`](file:///home/swarnavo/Desktop/PROJECTS/ClaimRoute/LICENSE.md) for terms.

## Contact & Author

Maintained by **Swarnavo Khanra** (`swarnavokhanra@gmail.com`).
