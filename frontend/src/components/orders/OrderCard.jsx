import React from "react";
import { Package, Calendar, Clock, ChevronRight } from "lucide-react";
import Card from "../ui/Card.jsx";
import OrderStatusBadge from "./OrderStatusBadge.jsx";

export function OrderCard({ order, onClick }) {
  const itemName =
    typeof order.item === "object" ? order.item.name : order.item;
  const itemDesc = typeof order.item === "object" ? order.item.description : "";

  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently";

  return (
    <Card
      hover
      className="order-item-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="order-card-main">
        <div className="order-card-header">
          <div className="order-icon-badge">
            <Package size={18} />
          </div>
          <div className="order-title-group">
            <h3 className="order-item-name">{itemName}</h3>
            {itemDesc && <p className="order-item-desc">{itemDesc}</p>}
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        <div className="order-card-details">
          <div className="order-meta-tag">
            <span className="meta-label">Qty:</span>
            <span className="meta-val">{order.quantity}</span>
          </div>

          {order.deliveryTimeframe && (
            <div className="order-meta-tag">
              <Clock size={12} className="meta-icon" />
              <span>{order.deliveryTimeframe}</span>
            </div>
          )}

          <div className="order-meta-tag date">
            <Calendar size={12} className="meta-icon" />
            <span>{formattedDate}</span>
          </div>

          <div className="order-card-arrow">
            <ChevronRight size={16} />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default OrderCard;
