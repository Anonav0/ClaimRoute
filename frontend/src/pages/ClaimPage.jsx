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
  RefreshCw,
  Home,
  MapPin,
  User,
  Phone,
  FileText,
} from "lucide-react";
import "./ClaimPage.css";

const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{5,20}$/;

export function ClaimPage() {
  const { token } = useParams();

  const [claimState, setClaimState] = useState({
    status: "loading", // "loading" | "valid" | "completed" | "error"
    data: null,
    error: null,
  });

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "India",
    },
    notes: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [completedResult, setCompletedResult] = useState(null);

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
      });
      return;
    }

    setClaimState({ status: "loading", data: null, error: null });
    setSubmitError(null);

    try {
      const data = await claimService.validateClaimToken(token);
      setClaimState({
        status: "valid",
        data,
        error: null,
      });
    } catch (err) {
      const mapped = mapClaimError(err);
      setClaimState({
        status: "error",
        data: null,
        error: mapped,
      });
    }
  };

  useEffect(() => {
    loadClaimDetails();
  }, [token]);

  const validateClientInput = () => {
    const errors = {};

    if (!formData.fullName.trim()) {
      errors.fullName = "Full name is required.";
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters.";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required.";
    } else if (!PHONE_REGEX.test(formData.phone.trim())) {
      errors.phone = "Please enter a valid phone number.";
    }

    if (!formData.address.line1.trim()) {
      errors.line1 = "Street address is required.";
    }

    if (!formData.address.city.trim()) {
      errors.city = "City is required.";
    }

    if (!formData.address.state.trim()) {
      errors.state = "State or province is required.";
    }

    if (!formData.address.postalCode.trim()) {
      errors.postalCode = "Postal or ZIP code is required.";
    }

    if (!formData.address.country.trim()) {
      errors.country = "Country is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [name]: value,
      },
    }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateClientInput()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        address: {
          line1: formData.address.line1.trim(),
          line2: formData.address.line2.trim(),
          city: formData.address.city.trim(),
          state: formData.address.state.trim(),
          postalCode: formData.address.postalCode.trim(),
          country: formData.address.country.trim(),
        },
        notes: formData.notes.trim() || null,
      };

      const result = await claimService.completeClaim(token, payload);
      setCompletedResult({
        ...result,
        recipientName: payload.fullName,
        destinationCity: `${payload.address.city}, ${payload.address.state}`,
      });
      setClaimState({
        status: "completed",
        data: claimState.data,
        error: null,
      });
    } catch (err) {
      const mapped = mapClaimError(err);
      if (mapped.type === "validation") {
        setSubmitError(mapped.message);
      } else {
        setClaimState({
          status: "error",
          data: null,
          error: mapped,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="claim-page-container">
      <div className="claim-card-wrapper">
        {/* 1. Loading State */}
        {claimState.status === "loading" && (
          <Card className="claim-card loading-state">
            <div className="claim-loading-content">
              <div className="claim-spinner">
                <RefreshCw size={36} className="spin-icon text-primary" />
              </div>
              <h2 className="claim-loading-title">
                Preparing Your Delivery Claim
              </h2>
              <p className="claim-loading-subtitle">
                Securing your delivery session and verifying the cryptographic
                token...
              </p>
            </div>
          </Card>
        )}

        {/* 2. Valid State: Recipient Intake Form */}
        {claimState.status === "valid" && claimState.data && (
          <Card className="claim-card valid-state">
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

              <h1 className="claim-headline">Your delivery is ready</h1>
              <p className="claim-subheadline">
                Confirm where you'd like your package delivered. Your address is
                kept strictly private and never shared with the sender.
              </p>
            </div>

            {/* Delivery Item Preview Card */}
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

            {/* Recipient Input Form */}
            <form onSubmit={handleSubmit} className="recipient-form" noValidate>
              {/* Section 1: Contact Details */}
              <div className="form-section">
                <div className="section-header">
                  <User size={16} className="text-primary inline mr-1" />
                  <h3 className="section-title">Your Details</h3>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="fullName">
                    Full Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    name="fullName"
                    placeholder="e.g. Jane Doe"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`form-input ${fieldErrors.fullName ? "input-error" : ""}`}
                  />
                  {fieldErrors.fullName && (
                    <span className="field-error">{fieldErrors.fullName}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="phone">
                    Phone Number <span className="text-danger">*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    placeholder="e.g. +91 98765 43210"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`form-input ${fieldErrors.phone ? "input-error" : ""}`}
                  />
                  {fieldErrors.phone && (
                    <span className="field-error">{fieldErrors.phone}</span>
                  )}
                  <span className="field-hint">
                    Used only for delivery notifications and courier
                    coordination.
                  </span>
                </div>
              </div>

              {/* Section 2: Delivery Address */}
              <div className="form-section">
                <div className="section-header">
                  <MapPin size={16} className="text-primary inline mr-1" />
                  <h3 className="section-title">Delivery Address</h3>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="line1">
                    Street Address <span className="text-danger">*</span>
                  </label>
                  <input
                    id="line1"
                    type="text"
                    name="line1"
                    placeholder="e.g. 123 Main Street"
                    value={formData.address.line1}
                    onChange={handleAddressChange}
                    className={`form-input ${fieldErrors.line1 ? "input-error" : ""}`}
                  />
                  {fieldErrors.line1 && (
                    <span className="field-error">{fieldErrors.line1}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="line2">
                    Apartment, Suite, Unit{" "}
                    <span className="text-muted">(Optional)</span>
                  </label>
                  <input
                    id="line2"
                    type="text"
                    name="line2"
                    placeholder="e.g. Apt 4B, 2nd Floor"
                    value={formData.address.line2}
                    onChange={handleAddressChange}
                    className="form-input"
                  />
                </div>

                <div className="form-row-two-col">
                  <div className="form-group">
                    <label className="form-label" htmlFor="city">
                      City <span className="text-danger">*</span>
                    </label>
                    <input
                      id="city"
                      type="text"
                      name="city"
                      placeholder="e.g. Kolkata"
                      value={formData.address.city}
                      onChange={handleAddressChange}
                      className={`form-input ${fieldErrors.city ? "input-error" : ""}`}
                    />
                    {fieldErrors.city && (
                      <span className="field-error">{fieldErrors.city}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="state">
                      State / Province <span className="text-danger">*</span>
                    </label>
                    <input
                      id="state"
                      type="text"
                      name="state"
                      placeholder="e.g. West Bengal"
                      value={formData.address.state}
                      onChange={handleAddressChange}
                      className={`form-input ${fieldErrors.state ? "input-error" : ""}`}
                    />
                    {fieldErrors.state && (
                      <span className="field-error">{fieldErrors.state}</span>
                    )}
                  </div>
                </div>

                <div className="form-row-two-col">
                  <div className="form-group">
                    <label className="form-label" htmlFor="postalCode">
                      Postal Code / PIN <span className="text-danger">*</span>
                    </label>
                    <input
                      id="postalCode"
                      type="text"
                      name="postalCode"
                      placeholder="e.g. 700001"
                      value={formData.address.postalCode}
                      onChange={handleAddressChange}
                      className={`form-input ${fieldErrors.postalCode ? "input-error" : ""}`}
                    />
                    {fieldErrors.postalCode && (
                      <span className="field-error">
                        {fieldErrors.postalCode}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="country">
                      Country <span className="text-danger">*</span>
                    </label>
                    <input
                      id="country"
                      type="text"
                      name="country"
                      placeholder="e.g. India"
                      value={formData.address.country}
                      onChange={handleAddressChange}
                      className={`form-input ${fieldErrors.country ? "input-error" : ""}`}
                    />
                    {fieldErrors.country && (
                      <span className="field-error">{fieldErrors.country}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Delivery Notes */}
              <div className="form-section">
                <div className="section-header">
                  <FileText size={16} className="text-primary inline mr-1" />
                  <h3 className="section-title">
                    Delivery Notes{" "}
                    <span className="text-muted">(Optional)</span>
                  </h3>
                </div>

                <div className="form-group">
                  <textarea
                    id="notes"
                    name="notes"
                    placeholder="Anything the courier should know? (e.g. gate code #1234, leave with security, call before arrival)"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    maxLength={500}
                    className="form-textarea"
                  />
                  <span className="field-hint text-right">
                    {500 - (formData.notes?.length || 0)} characters remaining
                  </span>
                </div>
              </div>

              {/* Server Submit Error */}
              {submitError && (
                <div className="submit-error-banner">
                  <AlertTriangle size={18} className="flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Action Button */}
              <div className="claim-action-footer">
                <Button
                  variant="primary"
                  size="lg"
                  type="submit"
                  icon={CheckCircle2}
                  iconPosition="right"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  className="claim-confirm-btn"
                >
                  {isSubmitting
                    ? "Saving Delivery Details..."
                    : "Confirm Delivery Details"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* 3. Completed / Consumed State */}
        {claimState.status === "completed" && (
          <Card className="claim-card consumed-state">
            <div className="claim-result-icon success">
              <CheckCircle2 size={48} />
            </div>

            <h1 className="claim-headline text-success">
              Your delivery details are confirmed!
            </h1>
            <p className="claim-subheadline">
              We've safely saved your delivery address. The next step is
              preparing your delivery.
            </p>

            <div className="consumed-receipt">
              <div className="receipt-row">
                <span>Recipient</span>
                <strong>
                  {completedResult?.recipientName || formData.fullName}
                </strong>
              </div>
              <div className="receipt-row">
                <span>Destination</span>
                <span>
                  {completedResult?.destinationCity || formData.address.city}
                </span>
              </div>
              <div className="receipt-row">
                <span>Order Reference</span>
                <strong>
                  {completedResult?.orderId || claimState.data?.orderId}
                </strong>
              </div>
              <div className="receipt-row">
                <span>Status</span>
                <Badge variant="success" size="sm">
                  Claim Completed
                </Badge>
              </div>
            </div>

            <div className="claim-test-reuse-box">
              <p className="reuse-hint">
                <Lock size={14} className="inline mr-1" />
                <strong>Single-Use Security:</strong> This claim token has been
                permanently marked as used. If anyone tries to access or
                resubmit this link, it will be rejected.
              </p>
              <div className="reuse-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={RefreshCw}
                  onClick={loadClaimDetails}
                >
                  Verify One-Time Protection
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

        {/* 4. Error / Expired / Already Used State */}
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
                  To protect delivery privacy, all ClaimRoute claim links
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
