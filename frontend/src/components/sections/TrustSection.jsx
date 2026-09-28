import React from "react";
import { ShieldCheck, EyeOff, Lock, Clock } from "lucide-react";
import Card from "../ui/Card.jsx";

const trustPillars = [
  {
    icon: EyeOff,
    title: "Sender Never Sees Your Address",
    description:
      "When someone sends you a delivery, they never see your street address, apartment number, or phone number. Your private information stays between you and the courier.",
  },
  {
    icon: Lock,
    title: "One-Time Secure Claim Links",
    description:
      "Each delivery link is uniquely generated and can only be used once. After you submit your preferred delivery address, the link is permanently retired.",
  },
  {
    icon: Clock,
    title: "Delivery On Your Terms",
    description:
      "You decide whether you want packages left at the front porch, behind a gate, or on a specific day of the week. You are in complete control of delivery instructions.",
  },
];

export function TrustSection() {
  return (
    <section id="trust" className="trust-section">
      <div className="trust-container">
        <div className="trust-header">
          <div className="trust-badge">
            <ShieldCheck size={16} />
            <span>Privacy & Respect First</span>
          </div>
          <h2 className="trust-title">Your details, handled carefully.</h2>
          <p className="trust-description">
            Your delivery information is only collected when you claim your
            delivery and is handled securely throughout the fulfillment process.
          </p>
        </div>

        <div className="trust-grid">
          {trustPillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <Card key={i} className="trust-card" padded>
                <div className="trust-icon-box">
                  <Icon size={20} className="trust-icon" />
                </div>
                <h3 className="trust-card-title">{pillar.title}</h3>
                <p className="trust-card-desc">{pillar.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default TrustSection;
