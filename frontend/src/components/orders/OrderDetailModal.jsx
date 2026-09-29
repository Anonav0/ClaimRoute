import React, { useState, useEffect } from "react";
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
  Truck,
  CheckCircle2,
  RotateCw,
  Compass,
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

  // Phase 8 Operational Fulfillment & Routing state
  const [opsSummary, setOpsSummary] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [isOpsLoading, setIsOpsLoading] = useState(false);
  const [opsActionLoading, setOpsActionLoading] = useState(false);
  const [opsError, setOpsError] = useState(null);

  const currentStatus = localStatus || order?.status;
  const isOperational = [
    "CLAIMED",
    "PROCESSING",
    "ROUTING_READY",
    "FULFILLMENT_READY",
    "COMPLETED",
  ].includes(currentStatus);

  const loadOpsData = async () => {
    if (!order?.id || !isOperational) return;
    setIsOpsLoading(true);
    try {
      const [summaryData, readinessData] = await Promise.all([
        orderService.getOperationsSummary(order.id).catch(() => null),
        orderService.getReadiness(order.id).catch(() => null),
      ]);
      setOpsSummary(summaryData);
      setReadiness(readinessData);
    } catch {
      // Non-fatal
    } finally {
      setIsOpsLoading(false);
    }
  };

  // Sync state when order changes or modal opens
  useEffect(() => {
    setLocalStatus(order?.status);
    setGeneratedClaim(null);
    setClaimError(null);
    setCopied(false);
    setConfirmCancelOpen(false);
    setOpsError(null);

    if (isOpen && order?.id && isOperational) {
      loadOpsData();
    }
  }, [order?.id, order?.status, isOpen]);

  if (!order) return null;

  const itemName =
    typeof order.item === "object" ? order.item.name : order.item;
  const itemDesc = typeof order.item === "object" ? order.item.description : "";
  const isEditable = currentStatus === "CREATED";
  const isCancellable =
    currentStatus === "CREATED" ||
    currentStatus === "CLAIM_PENDING" ||
    currentStatus === "CLAIMED" ||
    currentStatus === "PROCESSING";
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
      const input = document.getElementById("claim-url-input");
      if (input) {
        input.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  // Operational Transitions
  const handleStartProcessing = async () => {
    setOpsActionLoading(true);
    setOpsError(null);
    try {
      await orderService.startProcessing(order.id);
      setLocalStatus("PROCESSING");
      await loadOpsData();
    } catch (err) {
      setOpsError(mapOrderError(err));
    } finally {
      setOpsActionLoading(false);
    }
  };

  const handleCreateRouting = async () => {
    setOpsActionLoading(true);
    setOpsError(null);
    try {
      await orderService.createRoutingRequest(order.id);
      setLocalStatus("ROUTING_READY");
      await loadOpsData();
    } catch (err) {
      setOpsError(mapOrderError(err));
    } finally {
      setOpsActionLoading(false);
    }
  };

  const handleMarkFulfillmentReady = async () => {
    setOpsActionLoading(true);
    setOpsError(null);
    try {
      await orderService.markFulfillmentReady(order.id);
      setLocalStatus("FULFILLMENT_READY");
      await loadOpsData();
    } catch (err) {
      setOpsError(mapOrderError(err));
    } finally {
      setOpsActionLoading(false);
    }
  };

  const handleCompleteOrder = async () => {
    setOpsActionLoading(true);
    setOpsError(null);
    try {
      await orderService.completeOrder(order.id);
      setLocalStatus("COMPLETED");
      await loadOpsData();
    } catch (err) {
      setOpsError(mapOrderError(err));
    } finally {
      setOpsActionLoading(false);
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

        {/* Specs Grid */}
        <div className="detail-specs-grid">
          <div className="spec-card">
            <span className="spec-label">Quantity</span>
            <span className="spec-value">{order.quantity} units</span>
          </div>

          <div className="spec-card">
            <span className="spec-label">Delivery Timeframe</span>
            <span className="spec-value">
              {order.deliveryTimeframe || "Standard Delivery"}
            </span>
          </div>

          <div className="spec-card">
            <span className="spec-label">Created At</span>
            <span className="spec-value">
              {order.createdAt
                ? new Date(order.createdAt).toLocaleDateString()
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

        {/* Phase 8 Operational Fulfillment & Routing Section */}
        {isOperational && (
          <div className="detail-operational-section">
            <div className="operational-header">
              <div className="operational-title-box">
                <Truck size={18} className="text-primary" />
                <span>Delivery & Fulfillment Progress</span>
              </div>
              <OrderStatusBadge status={currentStatus} size="sm" />
            </div>

            <div className="operational-checklist">
              <div
                className={`operational-check-item ${readiness?.checks?.orderClaimed || currentStatus !== "CREATED" ? "complete" : ""}`}
              >
                <CheckCircle2
                  size={15}
                  className={
                    readiness?.checks?.orderClaimed ||
                    currentStatus !== "CREATED"
                      ? "check-icon-done"
                      : "check-icon-pending"
                  }
                />
                <span>✓ Claimed by recipient</span>
              </div>

              <div
                className={`operational-check-item ${readiness?.checks?.recipientFound ? "complete" : ""}`}
              >
                <CheckCircle2
                  size={15}
                  className={
                    readiness?.checks?.recipientFound
                      ? "check-icon-done"
                      : "check-icon-pending"
                  }
                />
                <span>
                  ✓ Recipient details confirmed{" "}
                  {opsSummary?.recipient?.name
                    ? `(${opsSummary.recipient.name})`
                    : ""}
                </span>
              </div>

              <div
                className={`operational-check-item ${readiness?.checks?.addressComplete ? "complete" : ""}`}
              >
                <CheckCircle2
                  size={15}
                  className={
                    readiness?.checks?.addressComplete
                      ? "check-icon-done"
                      : "check-icon-pending"
                  }
                />
                <span>
                  ✓ Destination address ready{" "}
                  {opsSummary?.recipient?.address?.city
                    ? `(${opsSummary.recipient.address.city}, ${opsSummary.recipient.address.state})`
                    : ""}
                </span>
              </div>

              <div
                className={`operational-check-item ${readiness?.checks?.deliveryConstraintsEvaluated ? "complete" : ""}`}
              >
                <CheckCircle2
                  size={15}
                  className={
                    readiness?.checks?.deliveryConstraintsEvaluated
                      ? "check-icon-done"
                      : "check-icon-pending"
                  }
                />
                <span>
                  ✓ Delivery constraints:{" "}
                  {readiness?.constraintsStatus === "AVAILABLE"
                    ? "Extracted"
                    : readiness?.constraintsStatus === "NO_NOTES"
                      ? "None specified"
                      : readiness?.constraintsStatus === "EXTRACTION_FAILED"
                        ? "Standard delivery (extraction failed)"
                        : "Evaluated"}
                </span>
              </div>
            </div>

            {opsError && <p className="confirm-error">{opsError}</p>}

            <div className="operational-action-bar">
              <div className="operational-status-msg">
                {currentStatus === "CLAIMED" &&
                  "Claimed. Ready to enter processing."}
                {currentStatus === "PROCESSING" &&
                  (readiness?.isReady
                    ? "Ready for routing dispatch plan."
                    : "Validating recipient delivery address...")}
                {currentStatus === "ROUTING_READY" &&
                  "Routing request created and verified."}
                {currentStatus === "FULFILLMENT_READY" &&
                  "Ready for final delivery handoff."}
                {currentStatus === "COMPLETED" &&
                  "✓ Delivery completed successfully."}
              </div>

              <div>
                {currentStatus === "CLAIMED" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleStartProcessing}
                    isLoading={opsActionLoading}
                  >
                    Start Processing
                  </Button>
                )}
                {currentStatus === "PROCESSING" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCreateRouting}
                    isLoading={opsActionLoading}
                    disabled={!readiness?.isReady}
                  >
                    Create Routing Request
                  </Button>
                )}
                {currentStatus === "ROUTING_READY" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleMarkFulfillmentReady}
                    isLoading={opsActionLoading}
                  >
                    Mark Fulfillment Ready
                  </Button>
                )}
                {currentStatus === "FULFILLMENT_READY" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCompleteOrder}
                    isLoading={opsActionLoading}
                  >
                    Complete Delivery
                  </Button>
                )}
              </div>
            </div>
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
