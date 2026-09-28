import React, { useState } from "react";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import OrderStatusBadge from "./OrderStatusBadge.jsx";
import {
  Package,
  Clock,
  Calendar,
  Edit3,
  XCircle,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { mapOrderError } from "../../services/order.service.js";

export function OrderDetailModal({
  isOpen,
  onClose,
  order,
  onEdit,
  onCancel,
  isCancelling = false,
}) {
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  if (!order) return null;

  const itemName =
    typeof order.item === "object" ? order.item.name : order.item;
  const itemDesc = typeof order.item === "object" ? order.item.description : "";
  const isEditable = order.status === "CREATED";
  const isCancellable =
    order.status === "CREATED" || order.status === "CLAIM_PENDING";

  const handleCancelClick = async () => {
    setCancelError(null);
    try {
      await onCancel(order.id);
      setConfirmCancelOpen(false);
      onClose();
    } catch (err) {
      setCancelError(mapOrderError(err));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delivery Details">
      <div className="order-detail-view">
        {/* Header Summary */}
        <div className="detail-top-card">
          <div className="detail-header-row">
            <div className="detail-title-group">
              <div className="detail-icon-box">
                <Package size={22} />
              </div>
              <div>
                <h3 className="detail-item-title">{itemName}</h3>
                <span className="detail-id-tag">ID: {order.id}</span>
              </div>
            </div>
            <OrderStatusBadge status={order.status} size="md" />
          </div>

          {itemDesc && <p className="detail-description-text">{itemDesc}</p>}
        </div>

        {/* Specifications Grid */}
        <div className="detail-specs-grid">
          <div className="spec-card">
            <span className="spec-label">Quantity</span>
            <span className="spec-value">
              {order.quantity} item{order.quantity > 1 ? "s" : ""}
            </span>
          </div>

          <div className="spec-card">
            <span className="spec-label">Delivery Window</span>
            <span className="spec-value">
              {order.deliveryTimeframe || "Standard / Flexible"}
            </span>
          </div>

          <div className="spec-card">
            <span className="spec-label">Created At</span>
            <span className="spec-value">
              {order.createdAt
                ? new Date(order.createdAt).toLocaleString()
                : "N/A"}
            </span>
          </div>

          <div className="spec-card">
            <span className="spec-label">Last Updated</span>
            <span className="spec-value">
              {order.updatedAt
                ? new Date(order.updatedAt).toLocaleString()
                : "N/A"}
            </span>
          </div>
        </div>

        {/* Internal Sender Notes */}
        {order.notes && (
          <div className="detail-notes-card">
            <span className="notes-label">Internal Sender Notes:</span>
            <p className="notes-content">{order.notes}</p>
          </div>
        )}

        {/* Address Privacy Notice */}
        <div className="detail-privacy-banner">
          <ShieldCheck size={16} className="privacy-icon" />
          <p>
            <strong>Address Decoupled:</strong> Recipient delivery address has
            not been solicited yet. In Phase 4, the recipient will securely
            input their private delivery location via a single-use claim link.
          </p>
        </div>

        {/* Actions */}
        {!confirmCancelOpen ? (
          <div className="detail-actions-footer">
            <div className="detail-left-actions">
              {isCancellable && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={XCircle}
                  onClick={() => setConfirmCancelOpen(true)}
                  className="btn-danger-ghost"
                >
                  Cancel Delivery
                </Button>
              )}
            </div>

            <div className="detail-right-actions">
              {isEditable && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Edit3}
                  onClick={() => {
                    onClose();
                    onEdit(order);
                  }}
                >
                  Edit Information
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="cancel-confirm-box">
            <div className="confirm-header">
              <AlertTriangle size={18} className="warn-icon" />
              <h4>Cancel this delivery?</h4>
            </div>
            <p className="confirm-text">
              Are you sure you want to cancel this delivery order? This action
              cannot be undone.
            </p>
            {cancelError && <p className="confirm-error">{cancelError}</p>}
            <div className="confirm-actions">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmCancelOpen(false)}
                disabled={isCancelling}
              >
                Keep Delivery
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCancelClick}
                isLoading={isCancelling}
                className="btn-confirm-danger"
              >
                Yes, Cancel Order
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default OrderDetailModal;
