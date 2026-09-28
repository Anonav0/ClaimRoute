# ClaimRoute — AI Delivery Extraction Architecture (Phase 7)

This document provides a comprehensive technical overview of **Phase 7: AI Delivery Extraction** for the ClaimRoute logistics platform. It outlines the extraction pipeline, LangChain and LLM provider integration, Pydantic schema validation, security boundaries, failure recovery models, and observability standards.

---

## 1. System Objective & Overview

During claim completion, recipients submit optional unstructured delivery notes detailing scheduling preferences, physical building access instructions, gate codes, package handling guidelines, and dietary restrictions or allergies:

```text
Recipient Note Example:
"Please deliver after 6 PM. The apartment gate is locked, so call me
before entering. There is a security guard at the entrance. I'm vegetarian,
so please don't include anything with meat."
```

Phase 7 introduces an automated extraction pipeline that parses this free-form text and transforms it into strict, validated, structured constraints persisted in Cloud Firestore:

```text
                                [ Recipient Notes ]
                                         │
                                         ▼
                            [ AI Extraction Service ]
                     (Strict Data Minimization: Notes Only)
                                         │
                                         ▼
                                   [ LangChain ]
                     (ChatPromptTemplate + System Defenses)
                                         │
                                         ▼
                                       [ LLM ]
                   (Zero Temperature, Strict Structured Output)
                                         │
                                         ▼
                             [ Pydantic Schema Model ]
                     (Type Checks, 24-hr Time Ordering, Extra=Forbid)
                                         │
                                         ▼
                           [ Application Normalization ]
                     (Deduplication, Standardized Dietary Terms)
                                         │
                                         ▼
                           [ Cloud Firestore Persistence ]
                       (deliveryConstraints/{constraintId})
```

> [!IMPORTANT]
> **Architectural Non-Negotiable**: The LLM is strictly an **information extraction component**, not an autonomous decision-maker. It has **no direct access to Cloud Firestore** and **no authorization authority**. The application remains the authoritative gatekeeper for validation and persistence.

---

## 2. Pipeline Components

### 2.1 Extraction Schema & Pydantic Validation

The schema is defined in Python using Pydantic v2 ([`backend/src/ai/schemas/delivery_constraints.py`](file:///home/swarnavo/Desktop/PROJECTS/ClaimRoute/backend/src/ai/schemas/delivery_constraints.py)) with an in-process JavaScript mirror ([`backend/src/ai/validation/pydanticValidator.js`](file:///home/swarnavo/Desktop/PROJECTS/ClaimRoute/backend/src/ai/validation/pydanticValidator.js)).

```python
class DeliveryWindow(BaseModel):
    model_config = ConfigDict(extra="forbid")
    start: Optional[str] = Field(default=None, description="24-hour HH:MM format (e.g. 18:00)")
    end: Optional[str] = Field(default=None, description="24-hour HH:MM format (e.g. 21:00)")
    raw: Optional[str] = Field(default=None, description="Ambiguous phrasing (e.g. 'evening')")

    @field_validator("start", "end")
    def validate_time_format(cls, v):
        ...  # Enforces regex ^([01]\d|2[0-3]):([0-5]\d)$

    @model_validator(mode="after")
    def validate_time_order(self):
        ...  # Validates start <= end


class DeliveryConstraints(BaseModel):
    model_config = ConfigDict(extra="forbid")
    deliveryWindow: Optional[DeliveryWindow] = None
    accessInstructions: List[str] = Field(default_factory=list)
    dietaryConstraints: List[str] = Field(default_factory=list)
    deliveryInstructions: List[str] = Field(default_factory=list)
```

#### Key Schema Rules:

1. **Strict Field Disallowance (`extra="forbid"`)**: Rejects any unexpected or injected fields.
2. **24-Hour Time Format**: Normalizes times into `HH:MM` (e.g., `18:00`, `21:00`). If phrasing is ambiguous (e.g., "evening"), it populates `raw` and leaves `start`/`end` as `null`.
3. **Chronological Validity**: Enforces that `start` time cannot be after `end` time.
4. **Item Limits**: String lists are capped at a maximum of 25 items, with individual entries capped at 300 characters to prevent memory exhaustion attacks.

### 2.2 LangChain & Prompt Architecture

LangChain provides the orchestration layer ([`backend/src/ai/llm.js`](file:///home/swarnavo/Desktop/PROJECTS/ClaimRoute/backend/src/ai/llm.js), [`backend/src/ai/prompts/deliveryExtractionPrompt.js`](file:///home/swarnavo/Desktop/PROJECTS/ClaimRoute/backend/src/ai/prompts/deliveryExtractionPrompt.js)):

1. **System Prompt**:
   - Instructs the model to act solely as a structured extractor.
   - Mandates extraction of explicit statements only (no hallucinated allergies or inferred times).
   - Enforces anti-prompt injection defenses: recipient notes are marked as untrusted data; instructions inside notes (e.g. "Ignore previous instructions") are ignored.
2. **Few-Shot Delimiters**: Provides explicit examples covering time windows, gate codes, dietary constraints, and ambiguous phrasing.
3. **Data Minimization**: Only `recipient.notes` is passed to the LLM. Recipient addresses, phone numbers, sender IDs, and claim tokens are **never** included in prompts.

---

## 3. Data Model & Firestore Persistence

Extracted constraints are persisted in the `deliveryConstraints` Firestore collection:

```json
{
  "id": "eZfK3v4Q91La9vL1wK90",
  "orderId": "ceY2osOJRdzJcyAyoZZb",
  "recipientId": "OAtwoGm753gV4kmtvn4U",
  "deliveryWindow": {
    "start": "18:00",
    "end": null,
    "raw": null
  },
  "accessInstructions": [
    "Apartment gate is locked",
    "Call recipient before entering",
    "Security guard at entrance"
  ],
  "dietaryConstraints": ["Vegetarian"],
  "deliveryInstructions": [],
  "source": "RECIPIENT_NOTES",
  "status": "COMPLETED",
  "error": null,
  "extractedAt": "2026-09-28T18:15:00.000Z",
  "createdAt": "2026-09-28T18:15:00.120Z",
  "updatedAt": "2026-09-28T18:15:00.120Z"
}
```

### Idempotency & Conflict Strategy

The repository implements `upsertByOrderId(orderId, data)`:

- If a constraint record already exists for the order, it updates the existing record.
- Ensures re-running extraction never creates duplicate or conflicting constraint documents.

---

## 4. Failure Recovery & Fault Isolation

```text
Recipient Submits Claim (POST /api/claims/:token/complete)
                  │
                  ▼
         [ Atomic Transaction ]
  ├─ Store Recipient Record (recipients/{recipientId})
  ├─ Consume Claim Token (used: true)
  └─ Update Order (status: CLAIMED)
                  │
                  ▼
    Return HTTP 200 to Recipient
  (Instant UX confirmation; Zero AI latency)
                  │
                  ▼ (Asynchronous Background Trigger)
       [ AI Extraction Service ]
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
    [ Success ]         [ Failure ]
        │                   │
  Save status:        Save status:
   COMPLETED             FAILED
        │                   │
  Order remains       Order remains
   CLAIMED             CLAIMED (Intact)
```

1. **Independent Recipient Confirmation**: The recipient's claim submission completes atomically and responds immediately. AI extraction is triggered asynchronously.
2. **Graceful Degradation**: If the LLM provider fails, times out, or quota is exceeded, the failure is safely recorded in the `deliveryConstraints` document with `status: "FAILED"`. The completed recipient claim and order remain 100% intact.
3. **Exponential Backoff**: Transient errors (e.g. network blips, 429 rate limits) are retried up to `maxRetries` (default: 2 retries, 3 total attempts) with exponential backoff before marking as `FAILED`.
4. **Deterministic Failure Prevention**: Pydantic schema validation errors are recognized as deterministic and fail fast without unnecessary retries.

---

## 5. Security & Privacy Controls

1. **Server-Only Credentials**: `LLM_API_KEY` and LLM provider credentials are stored strictly in server-side environment variables and are never bundled into the Vite frontend.
2. **Zero Direct LLM Database Access**: The LLM has zero knowledge of database credentials or APIs. Output passes through Pydantic validation and application business logic before persistence.
3. **Secure Logging**: Recipient notes, phone numbers, delivery addresses, and raw LLM responses are recursively redacted by `logger.js`.
4. **Access Control**: Constraints are accessible only to authenticated order owners or operations staff via `GET /api/orders/:orderId/constraints` mediated by `authorizationService.authorizeOrderAccess`.

---

## 6. Verification & Automated Testing

- **Pydantic Validation Tests**: Verifies acceptance of valid 24-hr times and rejection of invalid formats, inverted times (`start > end`), and extra fields.
- **Prompt & Injection Tests**: Verifies extraction of delivery windows, access instructions, dietary constraints, and drop-off instructions while repelling prompt injections.
- **Failure & Timeout Tests**: Verifies timeout guard (`AI_EXTRACTION_TIMEOUT`), retry backoff, and non-blocking failure recording.
- **Idempotency Tests**: Verifies duplicate extraction runs update existing documents rather than creating duplicates.
