import React from "react";
import { AlertCircle, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

export function DashboardAttentionSection({ attention = {}, onApplyFilter }) {
  const {
    aiExtractionFailed = 0,
    routingBlocked = 0,
    recipientDetailsPending = 0,
  } = attention;

  const totalAttention =
    aiExtractionFailed + routingBlocked + recipientDetailsPending;

  if (totalAttention === 0) {
    return (
      <div className="dashboard-attention-banner calm">
        <CheckCircle2 size={18} className="attention-icon-calm" />
        <div className="attention-text-group">
          <strong>Everything looks good.</strong>
          <span className="attention-subtext">
            No deliveries currently require operational intervention.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-attention-banner alert">
      <div className="attention-header-row">
        <div className="attention-title-group">
          <AlertTriangle size={18} className="attention-icon-warn" />
          <strong className="attention-title">Action Required</strong>
        </div>
        <span className="attention-badge">
          {totalAttention} item{totalAttention > 1 ? "s" : ""}
        </span>
      </div>

      <div className="attention-items-row">
        {aiExtractionFailed > 0 && (
          <button
            type="button"
            className="attention-chip danger"
            onClick={() => onApplyFilter({ aiStatus: "FAILED" })}
          >
            <AlertCircle size={14} />
            <span>{aiExtractionFailed} AI extraction failed</span>
          </button>
        )}

        {routingBlocked > 0 && (
          <button
            type="button"
            className="attention-chip warning"
            onClick={() => onApplyFilter({ routingStatus: "NOT_READY" })}
          >
            <AlertTriangle size={14} />
            <span>{routingBlocked} routing blocked (address needed)</span>
          </button>
        )}

        {recipientDetailsPending > 0 && (
          <button
            type="button"
            className="attention-chip info"
            onClick={() => onApplyFilter({ status: "CLAIM_PENDING" })}
          >
            <Clock size={14} />
            <span>{recipientDetailsPending} awaiting recipient claim</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default DashboardAttentionSection;
