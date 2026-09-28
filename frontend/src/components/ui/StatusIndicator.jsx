import React, { useState } from "react";
import {
  RefreshCw,
  Server,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { API_BASE_URL } from "../../utils/constants.js";

export function StatusIndicator({
  status,
  data,
  error,
  lastChecked,
  onRefresh,
}) {
  const [showDetails, setShowDetails] = useState(false);

  const isConnected = status === "connected";
  const isChecking = status === "checking";
  const isError = status === "error";
  const firestoreStatus = data?.services?.firestore || "unconfigured";
  const isFirestoreHealthy = firestoreStatus === "healthy";

  return (
    <div className="status-indicator-container">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`status-pill ${status}`}
        aria-label="Toggle system health details"
        title="Click to view system status"
      >
        <span className={`status-dot ${status}`} />
        <span className="status-text">
          {isConnected && "Systems Operational"}
          {isChecking && "Connecting..."}
          {isError && "System Offline"}
        </span>
      </button>

      {showDetails && (
        <>
          <div
            className="status-popover-backdrop"
            onClick={() => setShowDetails(false)}
          />
          <div className="status-popover">
            <div className="status-popover-header">
              <div className="status-popover-title">
                <Server size={15} />
                <span>System Health & Services</span>
              </div>
              <button
                onClick={onRefresh}
                disabled={isChecking}
                className="status-refresh-btn"
                aria-label="Refresh status"
              >
                <RefreshCw size={13} className={isChecking ? "spin" : ""} />
              </button>
            </div>

            <div className="status-popover-body">
              <div className="status-row">
                <span className="label">API Gateway:</span>
                <span className={`value-badge ${status}`}>
                  {isConnected && <CheckCircle2 size={13} />}
                  {isError && <AlertCircle size={13} />}
                  {isChecking && <Loader2 size={13} className="spin" />}
                  <span>
                    {status === "connected" ? "ONLINE" : status.toUpperCase()}
                  </span>
                </span>
              </div>

              {/* Firestore Service Status */}
              <div className="status-row">
                <span className="label">Cloud Firestore:</span>
                <span
                  className={`value-badge ${isFirestoreHealthy ? "connected" : "checking"}`}
                >
                  <Database size={12} />
                  <span>{firestoreStatus.toUpperCase()}</span>
                </span>
              </div>

              <div className="status-row">
                <span className="label">Endpoint:</span>
                <code className="value-code">{API_BASE_URL}/health</code>
              </div>

              {isConnected && data && (
                <>
                  <div className="status-row">
                    <span className="label">Message:</span>
                    <span className="value-text">{data.message}</span>
                  </div>
                  <div className="status-row">
                    <span className="label">Server Time:</span>
                    <span className="value-time">{data.timestamp}</span>
                  </div>
                </>
              )}

              {isError && (
                <div className="status-error-alert">
                  <p className="error-title">Unable to reach backend API</p>
                  <p className="error-sub">
                    {error || "Verify server is running on port 5000"}
                  </p>
                </div>
              )}

              {lastChecked && (
                <div className="status-popover-footer">
                  Last checked: {lastChecked}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default StatusIndicator;
