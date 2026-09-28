# ClaimRoute Architecture & Phase Overview

ClaimRoute is an address-free claim and delivery routing platform designed to decouple gift/fulfillment order creation from immediate recipient address collection.

## Phase Overview

- **Phase 1: Project Foundation & Initial Setup (Current)**
  - Dual runtime structure (React + Express)
  - Standardized health check endpoint (`/api/health`)
  - Strict CORS origin filtering
  - Centralized operational error handling
  - Frontend reactive status indicator

- **Phase 2: Database & Data Models (Upcoming)**
  - Google Cloud Firestore integration
  - Security rules & schema definition
  - Data access repositories

- **Phase 3: Secure Claim Engine (Upcoming)**
  - Cryptographic one-time token generation and hashing
  - Recipient address and delivery notes collection form

- **Phase 4: LLM Note Processing & Constraint Extraction (Upcoming)**
  - LangChain & Pydantic structured output pipeline
  - Extraction of access codes, delivery windows, and drop-off instructions

- **Phase 5: Routing & Operations (Upcoming)**
  - Dispatch readiness engine
  - Operational routing interface
