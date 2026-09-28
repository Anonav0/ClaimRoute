# ClaimRoute — Address-Free Claim & Routing Logistics Engine

ClaimRoute is a fulfillment and delivery-routing platform where a sender can initiate a fulfillment or gift order without having to solicit or store the recipient's sensitive delivery address upfront. Instead, the recipient receives a one-time cryptographic claim link to supply their delivery preferences and address securely.

> **Current Status**: **Phase 1 (Project Foundation & Initial Setup)**. This repository currently contains the foundational architecture, client-server communication channels, and health check APIs. Business workflows, database persistence, and AI features will be implemented incrementally in subsequent phases.

---

## Current Features (Phase 1)

- **Frontend Client**: Modern React + Vite application with clean modular layout, custom hooks, and live backend connection monitoring.
- **Backend Server**: Modular Node.js + Express REST service with Route-Controller-Service layered architecture.
- **Security & Headers**: Helmet HTTP security headers and environment-driven CORS configuration.
- **Centralized Error Handling**: Unified operational error structure (`AppError`, 404 handler, standard JSON error responses without stack leaks).
- **Health Check API**: `GET /api/health` providing service status and backend timestamp.
- **Git & Environment Hygiene**: Explicit `.gitignore` and template `.env.example` configurations.

---

## Tech Stack

- **Frontend**:
  - React (v18)
  - Vite (v6)
  - React Router DOM (v6)
  - Lucide React (Icons)
  - Modern CSS (Custom variables, responsive layout)
- **Backend**:
  - Node.js (v20+)
  - Express.js (v4)
  - Helmet (HTTP security headers)
  - CORS (Cross-Origin Resource Sharing)
  - Dotenv (Environment variable management)
  - Nodemon (Development runtime reload)

---

## Project Structure

```text
claimroute/
├── frontend/                     # React + Vite client application
│   ├── src/
│   │   ├── components/           # Reusable UI components (Navbar, StatusCard, etc.)
│   │   ├── pages/                # Top-level view pages (HomePage)
│   │   ├── services/             # API client and health service abstractions
│   │   ├── hooks/                # React custom hooks (useHealthCheck)
│   │   ├── utils/                # Constants and helpers
│   │   ├── types/                # JSDoc type definitions
│   │   ├── App.jsx               # Main application router and shell
│   │   ├── App.css               # Application layout styling
│   │   ├── index.css             # Design tokens and base styles
│   │   └── main.jsx              # Application entry point
│   ├── public/                   # Static assets (favicons, etc.)
│   ├── .env.example              # Environment variables template
│   ├── package.json              # Frontend dependencies and scripts
│   └── vite.config.js            # Vite build configuration
│
├── backend/                      # Express.js REST API
│   ├── src/
│   │   ├── config/               # Configuration loading and validation (env.js)
│   │   ├── controllers/          # HTTP request/response controllers
│   │   ├── routes/               # API route definitions
│   │   ├── services/             # Business logic layer (health.service.js)
│   │   ├── repositories/         # Data access layer (Firestore in Phase 2)
│   │   ├── middleware/           # Express middleware (CORS, errors, 404)
│   │   ├── validators/           # Request schema validators (subsequent phases)
│   │   ├── utils/                # Utilities and structured logger
│   │   ├── errors/               # Centralized error classes (AppError)
│   │   ├── app.js                # Express app setup and middleware chain
│   │   └── server.js             # HTTP server entry point & graceful shutdown
│   ├── .env.example              # Backend environment template
│   └── package.json              # Backend dependencies and scripts
│
├── docs/                         # Architecture documentation and roadmap
├── .gitignore                    # Version control ignore rules
├── LICENSE.md                    # License terms
└── README.md                     # Project overview and setup instructions
```

---

## Local Setup

### 1. Prerequisites

- **Node.js** `>= 20.0.0`
- **npm** `>= 10.0.0`

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your local environment file:
   ```bash
   cp .env.example .env
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend will be running at `http://localhost:5000`.

### 3. Frontend Setup

1. In a separate terminal, navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your local environment file:
   ```bash
   cp .env.example .env
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`.

---

## API Documentation

### Health Check

Checks backend server operational status.

- **URL**: `/api/health`
- **Method**: `GET`
- **Authentication**: None

#### Successful Response (`200 OK`)

```json
{
  "success": true,
  "message": "ClaimRoute API is running",
  "timestamp": "2026-09-28T15:56:52.000Z"
}
```

#### Error Response Format

All API errors return a standard JSON structure without leaking internal traces:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Cannot GET /api/unknown"
  }
}
```

---

## Development Status & Roadmap

ClaimRoute is constructed deliberately in phases:

| Phase       | Description                                           | Status        |
| :---------- | :---------------------------------------------------- | :------------ |
| **Phase 1** | Project Foundation, React+Vite, Express, Health Check | **Completed** |
| **Phase 2** | Firebase Firestore Setup, Data Models, Repositories   | Queued        |
| **Phase 3** | Cryptographic Tokenized Claim Engine & Recipient Form | Queued        |
| **Phase 4** | LangChain & Pydantic AI Extraction for Delivery Notes | Queued        |
| **Phase 5** | Fulfillment Readiness Evaluation & Operations View    | Queued        |

---

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)**. See the [`LICENSE.md`](file:///home/swarnavo/Desktop/PROJECTS/ClaimRoute/LICENSE.md) file for complete terms.

## Contact

For questions or support, please open an issue or contact the maintainer at: `swarnavokhanra@gmail.com`

## Author & Generation Statement

This project was authored and is maintained by **Swarnavo Khanra**.
