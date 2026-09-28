"""
ClaimRoute — Pydantic Delivery Constraints Schema (Phase 7)

Strict schema for validating structured delivery constraints extracted by the LLM
from recipient delivery notes. Rejects unknown fields, validates time windows,
and enforces type constraints.
"""

from __future__ import annotations
import sys
import json
import re
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict

# HH:MM 24-hour time format regex (00:00 to 23:59)
TIME_REGEX = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")


class DeliveryWindow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start: Optional[str] = Field(
        default=None,
        description="Delivery window start time in 24-hour format HH:MM (e.g. 18:00)",
    )
    end: Optional[str] = Field(
        default=None,
        description="Delivery window end time in 24-hour format HH:MM (e.g. 21:00)",
    )
    raw: Optional[str] = Field(
        default=None,
        description="Original unparsed phrasing if time is ambiguous (e.g. 'evening', 'before noon')",
    )

    @field_validator("start", "end")
    @classmethod
    def validate_time_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v_clean = v.strip()
        if not TIME_REGEX.match(v_clean):
            raise ValueError(f"Invalid time format '{v}'. Expected 24-hour HH:MM (e.g. 18:00).")
        return v_clean

    @field_validator("raw")
    @classmethod
    def sanitize_raw(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = v.strip()[:100]
        return clean if clean else None

    @model_validator(mode="after")
    def validate_time_order(self) -> DeliveryWindow:
        if self.start and self.end:
            # Check chronological ordering: start should be before or equal to end
            start_mins = int(self.start[:2]) * 60 + int(self.start[3:])
            end_mins = int(self.end[:2]) * 60 + int(self.end[3:])
            if start_mins > end_mins:
                raise ValueError(
                    f"Delivery window start time ({self.start}) cannot be after end time ({self.end})."
                )
        return self


class DeliveryConstraints(BaseModel):
    model_config = ConfigDict(extra="forbid")

    deliveryWindow: Optional[DeliveryWindow] = Field(
        default=None,
        description="Structured delivery time window or raw ambiguous timeframe",
    )
    accessInstructions: List[str] = Field(
        default_factory=list,
        description="Instructions for physical property access (e.g. gate codes, call on intercom)",
    )
    dietaryConstraints: List[str] = Field(
        default_factory=list,
        description="Dietary requirements or restrictions (e.g. Vegetarian, Halal, Nut allergy)",
    )
    deliveryInstructions: List[str] = Field(
        default_factory=list,
        description="General package handling or drop-off instructions (e.g. leave with security)",
    )

    @field_validator("accessInstructions", "dietaryConstraints", "deliveryInstructions")
    @classmethod
    def clean_string_list(cls, items: List[str]) -> List[str]:
        if not isinstance(items, list):
            raise ValueError("Must be a list of strings.")
        
        cleaned = []
        for item in items:
            if not isinstance(item, str):
                continue
            s = item.strip()
            # Enforce max length per entry to prevent memory exhaustion
            if s and len(s) <= 300:
                cleaned.append(s)

        # Enforce maximum list size
        if len(cleaned) > 25:
            raise ValueError("Too many items in constraint list (max 25 allowed).")
            
        return cleaned


def validate_json_payload(raw_json_str: str) -> dict:
    """
    Parses and validates JSON against the DeliveryConstraints Pydantic model.
    Returns the validated dictionary or raises an exception.
    """
    data = json.loads(raw_json_str)
    model = DeliveryConstraints.model_validate(data)
    return model.model_dump(mode="json")


if __name__ == "__main__":
    """
    CLI interface for Node.js IPC execution:
    Reads JSON string from argument or stdin, validates, and prints validated JSON to stdout.
    Exits with code 0 on success, code 1 on validation error.
    """
    try:
        input_data = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()
        if not input_data.strip():
            print(json.dumps({"error": "Empty input"}), file=sys.stderr)
            sys.exit(1)

        result = validate_json_payload(input_data)
        print(json.dumps(result))
        sys.exit(0)
    except Exception as e:
        error_payload = {
            "error": "PYDANTIC_VALIDATION_ERROR",
            "message": str(e),
        }
        print(json.dumps(error_payload), file=sys.stderr)
        sys.exit(1)
