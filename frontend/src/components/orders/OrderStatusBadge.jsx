import React from "react";
import { Clock, CheckCircle2, XCircle, PackageCheck } from "lucide-react";
import Badge from "../ui/Badge.jsx";

export function OrderStatusBadge({ status, size = "sm" }) {
  switch (status) {
    case "CREATED":
      return (
        <Badge variant="primary" size={size} icon={Clock}>
          Created
        </Badge>
      );
    case "CLAIM_PENDING":
      return (
        <Badge variant="warm" size={size} icon={Clock}>
          Ready to Claim
        </Badge>
      );
    case "CLAIMED":
      return (
        <Badge variant="success" size={size} icon={CheckCircle2}>
          Claimed
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge variant="success" size={size} icon={PackageCheck}>
          Fulfilled
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
          {status}
        </Badge>
      );
  }
}

export default OrderStatusBadge;
