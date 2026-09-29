import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import {
  ClaimStatusBadge,
  AIStatusBadge,
  RoutingStatusBadge,
  FulfillmentStatusBadge,
} from "./OperationalStatusBadges.jsx";
import {
  Package,
  Clock,
  Calendar,
  User,
  MapPin,
  Sparkles,
  Compass,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  RefreshCw,
} from "lucide-react";
import dashboardService from "../../services/dashboard.service.js";
import { orderService, mapOrderError } from "../../services/order.service.js";

export function DashboardDetailModal({
  isOpen,
  onClose,
  orderId,
  onOrderUpdated,
}) {
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadDetail = async () => {
    if (!orderId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getOrderDetail(orderId);
      setDetail(data);
    } catch (err) {
      setError(mapOrderError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && orderId) {
      loadDetail();
    } else {
      setDetail(null);
      setError(null);
    }
  }, [isOpen, orderId]);

  const handleAction = async (actionFn, nextStatus) => {
    setActionLoading(true);
    setError(null);
    try {
      await actionFn(orderId);
      await loadDetail();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      setError(mapOrderError(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const order = detail?.order;
  const recipient = detail?.recipient;
  const constraints = detail?.deliveryConstraints;
  const routing = detail?.routing;
  const fulfillment = detail?.fulfillment;
  const readiness = detail?.readiness;
  const timeline = detail?.timeline || [];

  const currentStatus = order?.status;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Operational Delivery Overview"
    >
      {isLoading && !detail ? (
        <div className="dashboard-detail-loading">
          <RotateCw size={24} className="spin-icon text-primary" />
          <p>Loading operational details...</p>
        </div>
      ) : error && !detail ? (
        <div className="dashboard-detail-error">
          <AlertTriangle size={24} className="text-error" />
          <p>{error}</p>
          <Button variant="secondary" size="sm" onClick={loadDetail}>
            Retry
          </Button>
        </div>
      ) : detail ? (
        <div className="dashboard-detail-body">
          {/* Header Summary */}
          <div className="detail-top-card">
            <div className="detail-header-row">
              <div className="detail-title-group">
                <div className="detail-icon-box">
                  <Package size={22} />
                </div>
                <div>
                  <h3 className="detail-item-title">{order.item.name}</h3>
                  <span className="detail-id-tag">ID: {order.id}</span>
                </div>
              </div>
              <FulfillmentStatusBadge status={order.status} size="md" />
            </div>

            {order.item.description && (
              <p className="detail-description-text">
                {order.item.description}
              </p>
            )}
          </div>

          {/* Operational Progress Status Bar */}
          <div className="detail-badges-summary-row">
            <div className="summary-badge-col">
              <span className="badge-col-label">Claim</span>
              <ClaimStatusBadge status={detail.claim.status} />
            </div>
            <div className="summary-badge-col">
              <span className="badge-col-label">AI Extraction</span>
              <AIStatusBadge status={constraints?.status || "NO_NOTES"} />
            </div>
            <div className="summary-badge-col">
              <span className="badge-col-label">Routing</span>
              <RoutingStatusBadge
                status={
                  routing?.status ||
                  (readiness?.isReady ? "READY" : "NOT_READY")
                }
              />
            </div>
            <div className="summary-badge-col">
              <span className="badge-col-label">Fulfillment</span>
              <FulfillmentStatusBadge
                status={fulfillment?.status || order.status}
              />
            </div>
          </div>

          {/* Recipient & Destination Card */}
          <div className="detail-section-card">
            <h4 className="detail-section-title">
              <User size={16} className="text-primary inline mr-1" />
              Recipient Information
            </h4>
            {recipient ? (
              <div className="recipient-info-grid">
                <div>
                  <span className="info-label">Name</span>
                  <strong className="info-value">{recipient.name}</strong>
                </div>
                <div>
                  <span className="info-label">Phone</span>
                  <span className="info-value font-mono">
                    {recipient.phone || "—"}
                  </span>
                </div>
                {recipient.address && (
                  <div className="full-col">
                    <span className="info-label">Delivery Destination</span>
                    <span className="info-value">
                      <MapPin size={13} className="inline mr-1 text-muted" />
                      {recipient.address.line1}, {recipient.address.city},{" "}
                      {recipient.address.state} {recipient.address.postalCode}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted text-sm">
                Recipient details have not been provided yet. Delivery link is
                awaiting claim.
              </p>
            )}
          </div>

          {/* AI Delivery Constraints Snapshot */}
          <div className="detail-section-card">
            <h4 className="detail-section-title">
              <Sparkles size={16} className="text-primary inline mr-1" />
              Delivery Constraints
            </h4>
            {constraints ? (
              <div className="constraints-display-group">
                {constraints.deliveryWindow && (
                  <div className="constraint-pill">
                    <Clock size={13} className="inline mr-1 text-primary" />
                    <strong>Window:</strong>{" "}
                    {constraints.deliveryWindow.start || "Anytime"}
                    {constraints.deliveryWindow.end
                      ? ` - ${constraints.deliveryWindow.end}`
                      : ""}
                  </div>
                )}
                {constraints.accessInstructions?.length > 0 && (
                  <div className="constraint-list">
                    <span className="info-label">Access Instructions:</span>
                    <ul>
                      {constraints.accessInstructions.map((inst, i) => (
                        <li key={i}>{inst}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {constraints.dietaryConstraints?.length > 0 && (
                  <div className="constraint-list">
                    <span className="info-label">Dietary:</span>
                    <ul>
                      {constraints.dietaryConstraints.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted text-sm">
                No delivery constraints extracted or specified.
              </p>
            )}
          </div>

          {/* Routing Simulation / Readiness */}
          <div className="detail-section-card">
            <h4 className="detail-section-title">
              <Compass size={16} className="text-primary inline mr-1" />
              Routing Details
            </h4>
            {routing?.mockRoute ? (
              <div className="mock-route-box">
                <div className="mock-route-header">
                  <strong>Simulated Route Active</strong>
                  <span className="text-muted text-xs font-mono">
                    Provider: {routing.mockRoute.provider}
                  </span>
                </div>
                <p className="text-sm text-secondary">
                  Estimated delivery window:{" "}
                  {routing.mockRoute.estimatedDurationMinutes} mins to
                  destination.
                </p>
              </div>
            ) : (
              <div className="readiness-status-row">
                <span className="text-sm">
                  {readiness?.isReady
                    ? "✓ Delivery is verified and ready for routing dispatch."
                    : readiness?.missingPrerequisites?.length > 0
                      ? `Routing waiting on: ${readiness.missingPrerequisites.join(", ")}`
                      : "Routing readiness evaluation pending."}
                </span>
              </div>
            )}
          </div>

          {/* Operational Timeline */}
          <div className="detail-section-card">
            <h4 className="detail-section-title">
              <Clock size={16} className="text-primary inline mr-1" />
              Operational Timeline
            </h4>
            <div className="operational-timeline">
              {timeline.map((step, idx) => (
                <div
                  key={idx}
                  className={`timeline-node ${step.completed ? "completed" : "pending"}`}
                >
                  <div className="timeline-marker">
                    <CheckCircle2 size={14} />
                  </div>
                  <div className="timeline-content">
                    <span className="timeline-label">{step.label}</span>
                    {step.timestamp && (
                      <span className="timeline-time">
                        {new Date(step.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && <p className="confirm-error mt-2">{error}</p>}

          {/* Operational Action Controls */}
          <div className="dashboard-detail-footer">
            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              onClick={loadDetail}
              isLoading={isLoading}
            >
              Refresh
            </Button>

            <div className="footer-action-buttons">
              {currentStatus === "CLAIMED" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    handleAction(orderService.startProcessing, "PROCESSING")
                  }
                  isLoading={actionLoading}
                >
                  Start Processing
                </Button>
              )}

              {currentStatus === "PROCESSING" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    handleAction(
                      orderService.createRoutingRequest,
                      "ROUTING_READY",
                    )
                  }
                  isLoading={actionLoading}
                  disabled={!readiness?.isReady}
                >
                  Create Routing Request
                </Button>
              )}

              {currentStatus === "ROUTING_READY" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    handleAction(
                      orderService.markFulfillmentReady,
                      "FULFILLMENT_READY",
                    )
                  }
                  isLoading={actionLoading}
                >
                  Mark Fulfillment Ready
                </Button>
              )}

              {currentStatus === "FULFILLMENT_READY" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    handleAction(orderService.completeOrder, "COMPLETED")
                  }
                  isLoading={actionLoading}
                >
                  Complete Delivery
                </Button>
              )}

              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

export default DashboardDetailModal;
