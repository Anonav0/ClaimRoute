import React from "react";
import {
  Gift,
  MapPin,
  ShieldCheck,
  Check,
  Clock,
  ChevronRight,
} from "lucide-react";
import Card from "../ui/Card.jsx";
import Badge from "../ui/Badge.jsx";

export function DeliveryPreviewCard() {
  return (
    <div className="preview-card-wrapper">
      <div className="preview-decoration-circle" />
      <Card className="delivery-preview-card" padded={false}>
        {/* Card Header */}
        <div className="preview-card-header">
          <div className="preview-badge-row">
            <Badge variant="warm" icon={Gift} size="sm">
              Incoming Gift Delivery
            </Badge>
            <span className="preview-time-tag">
              <Clock size={12} />
              <span>Link active</span>
            </span>
          </div>

          <h3 className="preview-item-title">
            Single Origin Coffee Roast & Dripper
          </h3>
          <p className="preview-sender">
            Sent with care by <strong>Marcus C.</strong>
          </p>
        </div>

        {/* Card Body */}
        <div className="preview-card-body">
          {/* Progress Timeline */}
          <div className="preview-stepper">
            <div className="preview-step completed">
              <div className="step-icon-dot">
                <Check size={11} strokeWidth={3} />
              </div>
              <span className="step-label">Order Created</span>
            </div>
            <div className="step-connector active" />
            <div className="preview-step current">
              <div className="step-icon-dot pulse" />
              <span className="step-label">Your Delivery Address</span>
            </div>
            <div className="step-connector" />
            <div className="preview-step upcoming">
              <div className="step-icon-dot" />
              <span className="step-label">Courier Dispatched</span>
            </div>
          </div>

          {/* Interactive Form Teaser */}
          <div className="preview-address-box">
            <div className="address-box-header">
              <MapPin size={16} className="pin-icon" />
              <span className="box-title">Where should we deliver this?</span>
            </div>
            <div className="mock-input-row">
              <div className="mock-input-placeholder">
                <span>Enter your street address...</span>
              </div>
              <button
                className="mock-input-btn"
                aria-label="Simulated claim action"
                tabIndex={-1}
              >
                <ChevronRight size={15} />
              </button>
            </div>
            <div className="mock-chips-row">
              <span className="mock-chip selected">Leave at front door</span>
              <span className="mock-chip">Weekday afternoon</span>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="preview-card-footer">
          <ShieldCheck size={16} className="privacy-icon" />
          <p className="preview-privacy-note">
            <strong>Address Privacy Guaranteed:</strong> Marcus never sees where
            you live. Your address is routed securely for delivery only.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default DeliveryPreviewCard;
