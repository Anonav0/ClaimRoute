import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Package, Menu, X, ArrowRight, ListOrdered } from "lucide-react";
import Button from "../ui/Button.jsx";
import StatusIndicator from "../ui/StatusIndicator.jsx";

export function Navbar({ healthState, onClaimClick }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isDeliveriesPage = location.pathname === "/deliveries";

  return (
    <header className="site-header">
      <div className="header-container">
        {/* Brand */}
        <Link to="/" className="brand-logo" aria-label="ClaimRoute Home">
          <div className="brand-icon-box">
            <Package size={22} className="brand-icon" />
          </div>
          <div className="brand-text-group">
            <span className="brand-title">ClaimRoute</span>
            <span className="brand-tagline">Effortless Delivery</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="desktop-nav" aria-label="Main Navigation">
          <Link
            to="/"
            className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
          >
            Home
          </Link>
          <Link
            to="/deliveries"
            className={`nav-link ${isDeliveriesPage ? "active" : ""}`}
          >
            Your Deliveries
          </Link>
          <a href="/#how-it-works" className="nav-link">
            How It Works
          </a>
          <a href="/#trust" className="nav-link">
            Trust & Privacy
          </a>
        </nav>

        {/* Right Actions */}
        <div className="header-actions">
          <StatusIndicator
            status={healthState.status}
            data={healthState.data}
            error={healthState.error}
            lastChecked={healthState.lastChecked}
            onRefresh={healthState.refresh}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={onClaimClick}
            className="header-cta"
            icon={ArrowRight}
            iconPosition="right"
          >
            Claim a Delivery
          </Button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-toggle"
            aria-label={mobileMenuOpen ? "Close Menu" : "Open Menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <nav className="mobile-nav-links">
            <Link
              to="/"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/deliveries"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Your Deliveries
            </Link>
            <a
              href="/#how-it-works"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              How It Works
            </a>
            <a
              href="/#trust"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Trust & Privacy
            </a>
            <div className="mobile-cta-wrapper">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onClaimClick();
                }}
                className="w-full"
                icon={ArrowRight}
                iconPosition="right"
              >
                Claim a Delivery
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export default Navbar;
