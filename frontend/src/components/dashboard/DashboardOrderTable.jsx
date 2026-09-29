import React from "react";
import {
  ClaimStatusBadge,
  AIStatusBadge,
  RoutingStatusBadge,
  FulfillmentStatusBadge,
} from "./OperationalStatusBadges.jsx";
import { Package, ArrowRight, Clock, User, ChevronRight } from "lucide-react";
import Button from "../ui/Button.jsx";

export function DashboardOrderTable({
  orders = [],
  onSelectOrder,
  isLoading = false,
}) {
  if (orders.length === 0) {
    return (
      <div className="dashboard-empty-card">
        <Package size={36} className="empty-icon text-muted" />
        <h4 className="empty-title">No deliveries found</h4>
        <p className="empty-desc">
          No orders match the current filter criteria. Try adjusting or clearing
          your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-orders-wrapper">
      {/* Desktop Table */}
      <div className="dashboard-desktop-table-container">
        <table className="dashboard-table" aria-label="Deliveries List">
          <thead>
            <tr>
              <th scope="col">Delivery Item</th>
              <th scope="col">Claim Status</th>
              <th scope="col">Recipient</th>
              <th scope="col">AI Extraction</th>
              <th scope="col">Routing</th>
              <th scope="col">Fulfillment</th>
              <th scope="col">Updated</th>
              <th scope="col" className="text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const itemName =
                typeof order.item === "object" ? order.item.name : order.item;
              const formattedDate = order.updatedAt
                ? new Date(order.updatedAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "N/A";

              return (
                <tr
                  key={order.id}
                  className="dashboard-table-row"
                  onClick={() => onSelectOrder(order.id)}
                >
                  <td className="item-cell">
                    <div className="item-cell-group">
                      <strong className="item-cell-name">{itemName}</strong>
                      <span className="item-cell-id">
                        ID: {order.id.slice(0, 10)}... • Qty {order.quantity}
                      </span>
                    </div>
                  </td>
                  <td>
                    <ClaimStatusBadge status={order.claimStatus} />
                  </td>
                  <td className="recipient-cell">
                    <span className="recipient-name">
                      {order.recipientName || "—"}
                    </span>
                  </td>
                  <td>
                    <AIStatusBadge status={order.aiStatus} />
                  </td>
                  <td>
                    <RoutingStatusBadge status={order.routingStatus} />
                  </td>
                  <td>
                    <FulfillmentStatusBadge status={order.fulfillmentStatus} />
                  </td>
                  <td className="date-cell">
                    <span className="text-muted text-sm">{formattedDate}</span>
                  </td>
                  <td className="text-right action-cell">
                    <Button
                      variant="ghost"
                      size="xs"
                      icon={ArrowRight}
                      iconPosition="right"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOrder(order.id);
                      }}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile & Tablet Card List */}
      <div className="dashboard-mobile-card-list">
        {orders.map((order) => {
          const itemName =
            typeof order.item === "object" ? order.item.name : order.item;
          const formattedDate = order.updatedAt
            ? new Date(order.updatedAt).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })
            : "N/A";

          return (
            <div
              key={order.id}
              className="dashboard-mobile-card"
              onClick={() => onSelectOrder(order.id)}
            >
              <div className="mobile-card-header">
                <div>
                  <h4 className="mobile-card-title">{itemName}</h4>
                  <span className="mobile-card-subtitle">
                    ID: {order.id.slice(0, 8)}... • Qty {order.quantity}
                  </span>
                </div>
                <ChevronRight size={18} className="text-muted" />
              </div>

              <div className="mobile-card-badges-grid">
                <div className="mobile-badge-item">
                  <span className="mobile-badge-label">Claim:</span>
                  <ClaimStatusBadge status={order.claimStatus} size="xs" />
                </div>
                <div className="mobile-badge-item">
                  <span className="mobile-badge-label">AI:</span>
                  <AIStatusBadge status={order.aiStatus} size="xs" />
                </div>
                <div className="mobile-badge-item">
                  <span className="mobile-badge-label">Routing:</span>
                  <RoutingStatusBadge status={order.routingStatus} size="xs" />
                </div>
                <div className="mobile-badge-item">
                  <span className="mobile-badge-label">Fulfillment:</span>
                  <FulfillmentStatusBadge
                    status={order.fulfillmentStatus}
                    size="xs"
                  />
                </div>
              </div>

              <div className="mobile-card-footer">
                <span className="mobile-recipient">
                  <User size={13} className="inline mr-1" />
                  {order.recipientName || "Awaiting recipient"}
                </span>
                <span className="mobile-date">
                  <Clock size={13} className="inline mr-1" />
                  {formattedDate}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DashboardOrderTable;
