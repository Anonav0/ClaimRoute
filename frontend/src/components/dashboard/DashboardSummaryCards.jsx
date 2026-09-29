import React from "react";
import {
  Package,
  Clock,
  RotateCw,
  Compass,
  Truck,
  CheckCircle2,
} from "lucide-react";

export function DashboardSummaryCards({
  counts = {},
  activeFilter,
  onSelectFilter,
}) {
  const cards = [
    {
      id: "ALL",
      label: "Total Deliveries",
      count: counts.total || 0,
      icon: Package,
      color: "var(--color-primary)",
      bgColor: "rgba(79, 70, 229, 0.08)",
    },
    {
      id: "CLAIM_PENDING",
      label: "Awaiting Claim",
      count: counts.claimPending || 0,
      icon: Clock,
      color: "#d97706",
      bgColor: "rgba(217, 119, 6, 0.08)",
    },
    {
      id: "PROCESSING",
      label: "In Processing",
      count: counts.processing || 0,
      icon: RotateCw,
      color: "#2563eb",
      bgColor: "rgba(37, 99, 235, 0.08)",
    },
    {
      id: "ROUTING_READY",
      label: "Routing Ready",
      count: counts.routingReady || 0,
      icon: Compass,
      color: "#7c3aed",
      bgColor: "rgba(124, 58, 237, 0.08)",
    },
    {
      id: "FULFILLMENT_READY",
      label: "Fulfillment Ready",
      count: counts.fulfillmentReady || 0,
      icon: Truck,
      color: "#ea580c",
      bgColor: "rgba(234, 88, 12, 0.08)",
    },
    {
      id: "COMPLETED",
      label: "Completed",
      count: counts.completed || 0,
      icon: CheckCircle2,
      color: "#16a34a",
      bgColor: "rgba(22, 163, 74, 0.08)",
    },
  ];

  return (
    <div className="dashboard-summary-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeFilter === card.id;

        return (
          <button
            key={card.id}
            type="button"
            className={`dashboard-summary-card ${isSelected ? "selected" : ""}`}
            onClick={() => onSelectFilter(card.id)}
            aria-label={`${card.label}: ${card.count}`}
          >
            <div className="summary-card-top">
              <div
                className="summary-card-icon"
                style={{ background: card.bgColor, color: card.color }}
              >
                <Icon size={18} />
              </div>
              <span className="summary-card-count">{card.count}</span>
            </div>
            <span className="summary-card-label">{card.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default DashboardSummaryCards;
