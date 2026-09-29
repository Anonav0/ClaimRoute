import React from "react";
import Badge from "../ui/Badge.jsx";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  AlertTriangle,
  RotateCw,
  Compass,
  Truck,
  HelpCircle,
} from "lucide-react";

export function ClaimStatusBadge({ status, size = "sm" }) {
  switch (status) {
    case "CLAIMED":
      return (
        <Badge variant="success" size={size} icon={CheckCircle2}>
          Claimed
        </Badge>
      );
    case "AWAITING_CLAIM":
    case "CLAIM_PENDING":
      return (
        <Badge variant="warm" size={size} icon={Clock}>
          Awaiting Claim
        </Badge>
      );
    case "CREATED":
      return (
        <Badge variant="neutral" size={size} icon={Clock}>
          Created
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="neutral" size={size} icon={XCircle}>
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" size={size}>
          {status || "Unknown"}
        </Badge>
      );
  }
}

export function AIStatusBadge({ status, size = "sm" }) {
  switch (status) {
    case "COMPLETED":
      return (
        <Badge variant="primary" size={size} icon={Sparkles}>
          Extracted
        </Badge>
      );
    case "PROCESSING":
    case "PENDING":
      return (
        <Badge variant="warm" size={size} icon={RotateCw}>
          Extracting
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="error" size={size} icon={AlertTriangle}>
          Failed
        </Badge>
      );
    case "NO_NOTES":
      return (
        <Badge variant="neutral" size={size}>
          No Notes
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" size={size}>
          {status || "N/A"}
        </Badge>
      );
  }
}

export function RoutingStatusBadge({ status, size = "sm" }) {
  switch (status) {
    case "READY":
    case "ROUTING_CREATED":
      return (
        <Badge variant="success" size={size} icon={Compass}>
          Route Ready
        </Badge>
      );
    case "NOT_READY":
    case "BLOCKED":
      return (
        <Badge variant="warm" size={size} icon={AlertTriangle}>
          Blocked
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge variant="success" size={size} icon={CheckCircle2}>
          Routed
        </Badge>
      );
    case "PENDING":
    default:
      return (
        <Badge variant="neutral" size={size} icon={HelpCircle}>
          Pending
        </Badge>
      );
  }
}

export function FulfillmentStatusBadge({ status, size = "sm" }) {
  switch (status) {
    case "READY":
    case "FULFILLMENT_READY":
      return (
        <Badge variant="warm" size={size} icon={Truck}>
          Fulfillment Ready
        </Badge>
      );
    case "PROCESSING":
      return (
        <Badge variant="primary" size={size} icon={RotateCw}>
          In Process
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge variant="success" size={size} icon={CheckCircle2}>
          Fulfilled
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="neutral" size={size} icon={XCircle}>
          Cancelled
        </Badge>
      );
    case "PENDING":
    default:
      return (
        <Badge variant="neutral" size={size}>
          Pending
        </Badge>
      );
  }
}
