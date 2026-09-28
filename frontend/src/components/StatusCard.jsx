import React from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Server,
  Laptop,
} from "lucide-react";
import { API_BASE_URL } from "../utils/constants.js";

export function StatusCard({
  backendStatus,
  backendData,
  backendError,
  lastChecked,
  onRefresh,
}) {
  const isConnected = backendStatus === "connected";
  const isChecking = backendStatus === "checking";
  const isError = backendStatus === "error";

  return (
    <div className="status-card">
      <div className="status-header">
        <div className="status-title-row">
          <Server className="icon-server" size={20} />
          <h2 className="status-title">System Status</h2>
        </div>
        <button
          onClick={onRefresh}
          disabled={isChecking}
          className="refresh-button"
          title="Re-check backend status"
          aria-label="Re-check backend status"
        >
          <RefreshCw size={14} className={isChecking ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="status-grid">
        {/* Frontend Status */}
        <div className="status-item">
          <div className="status-item-left">
            <Laptop size={18} className="status-item-icon frontend" />
            <div>
              <span className="status-label">Frontend</span>
              <p className="status-desc">Vite Dev Server (Client)</p>
            </div>
          </div>
          <div className="status-badge running">
            <CheckCircle2 size={15} />
            <span>Running</span>
          </div>
        </div>

        {/* Backend Status */}
        <div className="status-item">
          <div className="status-item-left">
            <Server size={18} className="status-item-icon backend" />
            <div>
              <span className="status-label">Backend</span>
              <p className="status-desc">Express API ({API_BASE_URL})</p>
            </div>
          </div>

          {isConnected && (
            <div className="status-badge connected">
              <CheckCircle2 size={15} />
              <span>Connected</span>
            </div>
          )}

          {isChecking && (
            <div className="status-badge checking">
              <Loader2 size={15} className="spin" />
              <span>Checking...</span>
            </div>
          )}

          {isError && (
            <div className="status-badge disconnected">
              <XCircle size={15} />
              <span>Disconnected</span>
            </div>
          )}
        </div>
      </div>

      {/* Backend API Details / Diagnostics */}
      <div className="status-footer">
        {isConnected && backendData && (
          <div className="api-diagnostic success">
            <p className="api-message">✓ {backendData.message}</p>
            <p className="api-timestamp">
              Backend Timestamp: <code>{backendData.timestamp}</code>
            </p>
          </div>
        )}

        {isError && (
          <div className="api-diagnostic error">
            <p className="api-message">✕ Connection Failed: {backendError}</p>
            <p className="api-tip">
              Ensure backend server is running on port 5000:{" "}
              <code>npm run dev</code> in <code>backend/</code>
            </p>
          </div>
        )}

        {lastChecked && (
          <div className="last-checked">
            Last checked at: <span>{lastChecked}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatusCard;
