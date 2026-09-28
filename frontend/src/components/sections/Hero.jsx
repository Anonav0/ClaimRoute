import React from "react";
import {
  ArrowRight,
  Sparkles,
  KeyRound,
  Shield,
  HeartHandshake,
} from "lucide-react";
import Button from "../ui/Button.jsx";
import DeliveryPreviewCard from "./DeliveryPreviewCard.jsx";

export function Hero({ onCreateClick, onClaimClick }) {
  return (
    <section className="hero-section">
      <div className="hero-grid">
        {/* Left Column: Copy & Actions */}
        <div className="hero-text-col">
          <div className="hero-pill-badge">
            <Sparkles size={14} className="hero-sparkle" />
            <span>Modern, address-free delivery</span>
          </div>

          <h1 className="hero-headline">
            Delivery, without the{" "}
            <span className="highlight-text">address hassle</span>.
          </h1>

          <p className="hero-lead">
            Send gifts, packages, and surprises without asking someone for their
            private home address upfront. Recipients securely choose where and
            when they want their package delivered with a single private link.
          </p>

          <div className="hero-actions">
            <Button
              variant="primary"
              size="lg"
              onClick={onCreateClick}
              icon={ArrowRight}
              iconPosition="right"
              className="hero-btn-primary"
            >
              Create a Delivery
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={onClaimClick}
              icon={KeyRound}
              className="hero-btn-secondary"
            >
              I Have a Claim Link
            </Button>
          </div>

          {/* Value Props Micro Row */}
          <div className="hero-perks-row">
            <div className="perk-item">
              <Shield size={16} className="perk-icon" />
              <span>Recipient Privacy Guaranteed</span>
            </div>
            <div className="perk-divider" />
            <div className="perk-item">
              <HeartHandshake size={16} className="perk-icon" />
              <span>No App or Account Required</span>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Preview Card */}
        <div className="hero-visual-col">
          <DeliveryPreviewCard />
        </div>
      </div>
    </section>
  );
}

export default Hero;
