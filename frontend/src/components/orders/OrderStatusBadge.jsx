import React from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  PackageCheck,
  RotateCw,
  Compass,
  Truck,
} from "lucide-react";
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
    case "PROCESSING":
      return (
        <Badge variant="warm" size={size} icon={RotateCw}>
          Processing
        </Badge>
      );
    case "ROUTING_READY":
      return (
        <Badge variant="primary" size={size} icon={Compass}>
          Routing Ready
        </Badge>
      );
    case "FULFILLMENT_READY":
      return (
        <Badge variant="warm" size={size} icon={Truck}>
          Fulfillment Ready
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge variant="success" size={size} icon={PackageCheck}>
          Completed
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
