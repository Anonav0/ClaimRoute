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
  Link as LinkIcon,
  Copy,
  Check,
  ExternalLink,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { mapOrderError, orderService } from "../../services/order.service.js";

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

  // Claim generation state
  const [generatedClaim, setGeneratedClaim] = useState(null);
  const [isGeneratingClaim, setIsGeneratingClaim] = useState(false);
  const [claimError, setClaimError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [localStatus, setLocalStatus] = useState(order?.status);

  // Sync local status when order changes
  React.useEffect(() => {
    setLocalStatus(order?.status);
    setGeneratedClaim(null);
    setClaimError(null);
    setCopied(false);
    setConfirmCancelOpen(false);
  }, [order?.id, order?.status]);

  if (!order) return null;

  const itemName =
    typeof order.item === "object" ? order.item.name : order.item;
  const itemDesc = typeof order.item === "object" ? order.item.description : "";
  const currentStatus = localStatus || order.status;
  const isEditable = currentStatus === "CREATED";
  const isCancellable =
    currentStatus === "CREATED" || currentStatus === "CLAIM_PENDING";
  const isClaimEligible =
    currentStatus === "CREATED" || currentStatus === "CLAIM_PENDING";

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

  const handleGenerateClaimClick = async () => {
    setIsGeneratingClaim(true);
    setClaimError(null);
    try {
      const data = await orderService.generateClaimLink(order.id);
      setGeneratedClaim(data);
      if (currentStatus === "CREATED") {
        setLocalStatus("CLAIM_PENDING");
      }
    } catch (err) {
      setClaimError(mapOrderError(err));
    } finally {
      setIsGeneratingClaim(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedClaim?.claimUrl) return;
    try {
      await navigator.clipboard.writeText(generatedClaim.claimUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is blocked
      const input = document.getElementById("claim-url-input");
      if (input) {
        input.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
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
            <OrderStatusBadge status={currentStatus} size="md" />
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

        {/* Phase 4 Secure Claim Link Section */}
        {isClaimEligible && (
          <div className="detail-claim-section">
            {!generatedClaim ? (
              <div className="claim-prompt-box">
                <div className="claim-prompt-text">
                  <div className="claim-prompt-title">
                    <KeyRound size={17} className="text-primary inline mr-1" />
                    <strong>Recipient Claim Link</strong>
                  </div>
                  <p className="claim-prompt-desc">
                    Generate a secure, single-use claim link to share with your
                    recipient. The raw token is never stored in the database.
                  </p>
                </div>
                {claimError && <p className="confirm-error">{claimError}</p>}
                <Button
                  variant="secondary"
                  size="sm"
                  icon={LinkIcon}
                  onClick={handleGenerateClaimClick}
                  isLoading={isGeneratingClaim}
                >
                  Generate Claim Link
                </Button>
              </div>
            ) : (
              <div className="claim-generated-card">
                <div className="claim-generated-header">
                  <div className="claim-generated-badge">
                    <ShieldCheck size={15} className="inline mr-1" /> Single-Use
                    Claim Link Created
                  </div>
                  <span className="claim-expires-notice">
                    <Clock size={12} className="inline mr-1 text-accent" />
                    Expires at{" "}
                    {new Date(generatedClaim.expiresAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="claim-url-bar">
                  <input
                    id="claim-url-input"
                    type="text"
                    readOnly
                    value={generatedClaim.claimUrl}
                    className="claim-url-text"
                  />
                  <Button
                    variant={copied ? "primary" : "secondary"}
                    size="sm"
                    icon={copied ? Check : Copy}
                    onClick={handleCopyLink}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <a
                    href={generatedClaim.claimUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="claim-open-btn"
                  >
                    <Button variant="ghost" size="sm" icon={ExternalLink}>
                      Open
                    </Button>
                  </a>
                </div>

                <div className="claim-security-footer">
                  <p className="claim-security-text">
                    🔒 <strong>Sensitive link:</strong> Share this link directly
                    with the recipient. Anyone with this link can view delivery
                    metadata and claim this package once.
                  </p>
                  <Button
                    variant="ghost"
                    size="xs"
                    icon={RefreshCw}
                    onClick={handleGenerateClaimClick}
                    isLoading={isGeneratingClaim}
                    className="regenerate-link-btn"
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Address Privacy Notice for other statuses */}
        {!isClaimEligible && (
          <div className="detail-privacy-banner">
            <ShieldCheck size={16} className="privacy-icon" />
            <p>
              <strong>Status {currentStatus}:</strong> Claim links can only be
              generated for orders in CREATED or CLAIM_PENDING status.
            </p>
          </div>
        )}

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
