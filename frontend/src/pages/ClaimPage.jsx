import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { claimService, mapClaimError } from "../services/claim.service.js";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import {
  Package,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lock,
  ArrowRight,
  RefreshCw,
  Home,
  Info,
} from "lucide-react";
import "./ClaimPage.css";

export function ClaimPage() {
  const { token } = useParams();
  const [claimState, setClaimState] = useState({
    status: "loading", // "loading" | "valid" | "consumed" | "error"
    data: null,
    error: null,
    isConsuming: false,
    consumedResult: null,
  });

  const loadClaimDetails = async () => {
    if (!token) {
      setClaimState({
        status: "error",
        data: null,
        error: {
          title: "Missing Token",
          message: "No claim token was provided in the URL.",
          type: "invalid",
        },
        isConsuming: false,
        consumedResult: null,
      });
      return;
    }

    setClaimState((prev) => ({ ...prev, status: "loading", error: null }));

    try {
      const data = await claimService.validateClaimToken(token);
      setClaimState({
        status: "valid",
        data,
        error: null,
        isConsuming: false,
        consumedResult: null,
      });
    } catch (err) {
      const mapped = mapClaimError(err);
      setClaimState({
        status: "error",
        data: null,
        error: mapped,
        isConsuming: false,
        consumedResult: null,
      });
    }
  };

  useEffect(() => {
    loadClaimDetails();
  }, [token]);

  const handleConsume = async () => {
    setClaimState((prev) => ({ ...prev, isConsuming: true }));
    try {
      const result = await claimService.consumeClaimToken(token);
      setClaimState((prev) => ({
        ...prev,
        status: "consumed",
        isConsuming: false,
        consumedResult: result,
      }));
    } catch (err) {
      const mapped = mapClaimError(err);
      setClaimState((prev) => ({
        ...prev,
        status: "error",
        isConsuming: false,
        error: mapped,
      }));
    }
  };

  return (
    <div className="claim-page-container">
      <div className="claim-card-wrapper">
        {/* Loading State */}
        {claimState.status === "loading" && (
          <Card className="claim-card loading-state">
            <div className="claim-loading-content">
              <div className="claim-spinner">
                <RefreshCw size={36} className="spin-icon text-primary" />
              </div>
              <h2 className="claim-loading-title">Verifying Delivery Claim</h2>
              <p className="claim-loading-subtitle">
                Authoritatively checking token cryptographic hash and
                expiration...
              </p>
            </div>
          </Card>
        )}

        {/* Valid State (Ready for Claim) */}
        {claimState.status === "valid" && claimState.data && (
          <Card className="claim-card valid-state">
            {/* Header */}
            <div className="claim-header">
              <div className="claim-badge-row">
                <Badge variant="success" size="sm">
                  <ShieldCheck size={13} className="mr-1 inline" /> Single-Use
                  Secure Link
                </Badge>
                <Badge variant="primary" size="sm">
                  {claimState.data.status}
                </Badge>
              </div>

              <h1 className="claim-headline">
                Your delivery is ready to claim!
              </h1>
              <p className="claim-subheadline">
                The sender has prepared this delivery for you. Your location
                remains completely private until you choose to provide it.
              </p>
            </div>

            {/* Delivery Item Summary Card */}
            <div className="claim-item-card">
              <div className="claim-item-header">
                <div className="item-icon-box">
                  <Package size={24} />
                </div>
                <div className="item-info">
                  <h3 className="item-name">{claimState.data.item.name}</h3>
                  <span className="item-qty">
                    Quantity: {claimState.data.quantity}
                  </span>
                </div>
              </div>

              {claimState.data.item.description && (
                <p className="item-desc">{claimState.data.item.description}</p>
              )}

              <div className="claim-meta-grid">
                <div className="meta-box">
                  <span className="meta-label">Delivery Window</span>
                  <span className="meta-value">
                    {claimState.data.deliveryTimeframe || "Flexible / Standard"}
                  </span>
                </div>
                <div className="meta-box">
                  <span className="meta-label">Link Expiration</span>
                  <span className="meta-value">
                    <Clock size={13} className="mr-1 inline text-accent" />
                    {new Date(claimState.data.expiresAt).toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Phase 5 Scope Boundary Notice */}
            <div className="claim-boundary-notice">
              <Info size={18} className="notice-icon" />
              <div>
                <strong>Phase 5 Preview Notice:</strong> Recipient delivery
                address capture and delivery preferences are scheduled for Phase
                5. In this phase, clicking below verifies token security by
                atomically consuming the one-time link.
              </div>
            </div>

            {/* Action Bar */}
            <div className="claim-action-footer">
              <Button
                variant="primary"
                size="lg"
                icon={CheckCircle2}
                iconPosition="right"
                onClick={handleConsume}
                isLoading={claimState.isConsuming}
                className="claim-confirm-btn"
              >
                {claimState.isConsuming
                  ? "Consuming Link..."
                  : "Confirm & Consume Claim"}
              </Button>
            </div>
          </Card>
        )}

        {/* Consumed State */}
        {claimState.status === "consumed" && (
          <Card className="claim-card consumed-state">
            <div className="claim-result-icon success">
              <CheckCircle2 size={48} />
            </div>

            <h1 className="claim-headline text-success">Delivery Claimed!</h1>
            <p className="claim-subheadline">
              This one-time claim token has been atomically consumed. The order
              has transitioned to <strong>CLAIMED</strong>.
            </p>

            <div className="consumed-receipt">
              <div className="receipt-row">
                <span>Order Reference</span>
                <strong>{claimState.consumedResult?.orderId}</strong>
              </div>
              <div className="receipt-row">
                <span>Claimed At</span>
                <span>
                  {new Date(
                    claimState.consumedResult?.claimedAt || Date.now(),
                  ).toLocaleTimeString()}
                </span>
              </div>
              <div className="receipt-row">
                <span>One-Time Security</span>
                <span className="text-success font-medium">Link Exhausted</span>
              </div>
            </div>

            <div className="claim-test-reuse-box">
              <p className="reuse-hint">
                <Lock size={14} className="inline mr-1" />
                Want to verify one-time protection? Click below to test reusing
                this token. The server will reject it with a{" "}
                <code>CLAIM_TOKEN_USED</code> status.
              </p>
              <div className="reuse-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={RefreshCw}
                  onClick={loadClaimDetails}
                >
                  Test Reuse / Reload Link
                </Button>
                <Link to="/">
                  <Button variant="ghost" size="sm" icon={Home}>
                    Return Home
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Error / Inactive State */}
        {claimState.status === "error" && claimState.error && (
          <Card className="claim-card error-state">
            <div className={`claim-result-icon ${claimState.error.type}`}>
              {claimState.error.type === "expired" ? (
                <Clock size={48} />
              ) : claimState.error.type === "used" ? (
                <Lock size={48} />
              ) : (
                <XCircle size={48} />
              )}
            </div>

            <h1 className="claim-headline">{claimState.error.title}</h1>
            <p className="claim-subheadline">{claimState.error.message}</p>

            {claimState.error.type === "expired" && (
              <div className="error-guidance">
                <strong>Why did this happen?</strong>
                <p>
                  To prevent unauthorized access, all ClaimRoute claim links
                  automatically expire 30 minutes after generation. The sender
                  can issue a fresh link with one click from their delivery
                  dashboard.
                </p>
              </div>
            )}

            {claimState.error.type === "used" && (
              <div className="error-guidance">
                <strong>Security Guarantee:</strong>
                <p>
                  ClaimRoute enforces strictly one-time atomic consumption. Once
                  a delivery has been claimed, its link is immediately retired
                  to prevent tampering or replay attacks.
                </p>
              </div>
            )}

            <div className="claim-error-actions">
              <Button
                variant="secondary"
                size="md"
                icon={RefreshCw}
                onClick={loadClaimDetails}
              >
                Retry Link
              </Button>
              <Link to="/">
                <Button variant="primary" size="md" icon={Home}>
                  Return to Home
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default ClaimPage;
