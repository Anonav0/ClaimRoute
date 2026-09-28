import React from "react";
import { Gift, Sparkles, Truck } from "lucide-react";
import Card from "../ui/Card.jsx";

const steps = [
  {
    number: "01",
    title: "Create",
    subtitle: "Order without an address",
    desc: "The sender picks an item or gift and specifies an optional timeframe. No recipient address is needed to complete the order.",
    icon: Gift,
    tag: "Sender Step",
  },
  {
    number: "02",
    title: "Claim",
    subtitle: "Provide private details",
    desc: "The recipient receives a private one-time link. They choose where and when they want it delivered, adding any custom notes or instructions.",
    icon: Sparkles,
    tag: "Recipient Step",
  },
  {
    number: "03",
    title: "Receive",
    subtitle: "Delivered seamlessly",
    desc: "Delivery details are verified and securely routed directly to the delivery partner. Senders never see your private home address.",
    icon: Truck,
    tag: "Fulfillment",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="how-it-works-section">
      <div className="section-header-centered">
        <span className="section-eyebrow">Simplicity at its core</span>
        <h2 className="section-title">How ClaimRoute Works</h2>
        <p className="section-subtitle">
          Effortless gift-giving and deliveries in three human-centered steps.
        </p>
      </div>

      <div className="steps-grid">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <Card key={step.number} hover className="step-card">
              <div className="step-card-top">
                <span className="step-number">{step.number}</span>
                <span className="step-tag">{step.tag}</span>
              </div>

              <div className="step-icon-wrapper">
                <Icon size={24} className="step-icon" />
              </div>

              <h3 className="step-title">{step.title}</h3>
              <h4 className="step-subtitle">{step.subtitle}</h4>
              <p className="step-description">{step.desc}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export default HowItWorks;
