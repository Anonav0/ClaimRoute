import React from "react";
import { useHealthCheck } from "../hooks/useHealthCheck.js";
import StatusCard from "../components/StatusCard.jsx";
import PhaseRoadmap from "../components/PhaseRoadmap.jsx";
import { ShieldCheck, Sparkles } from "lucide-react";

export function HomePage() {
  const { status, data, error, lastChecked, refresh } = useHealthCheck(
    true,
    15000,
  );

  return (
    <div className="home-container">
      {/* Hero Header */}
      <section className="hero-section">
        <div className="badge-announcement">
          <Sparkles size={14} className="sparkle-icon" />
          <span>Foundation Setup & Verification Active</span>
        </div>

        <h1 className="hero-title">ClaimRoute</h1>
        <h2 className="hero-subtitle">Address-Free Claim & Routing</h2>
        <p className="hero-description">
          Securely connect recipients with fulfillment workflows without
          pre-sharing private addresses.
        </p>
      </section>

      {/* Main Content Grid */}
      <div className="content-grid">
        <section className="status-section">
          <StatusCard
            backendStatus={status}
            backendData={data}
            backendError={error}
            lastChecked={lastChecked}
            onRefresh={refresh}
          />

          <div className="architecture-callout">
            <div className="callout-header">
              <ShieldCheck size={18} className="callout-icon" />
              <h4>Architecture Decoupling</h4>
            </div>
            <p>
              Address collection will be deferred until the recipient interacts
              with a one-time cryptographic token link. Senders never handle
              recipient raw addresses directly.
            </p>
          </div>
        </section>

        <section className="roadmap-section">
          <PhaseRoadmap />
        </section>
      </div>
    </div>
  );
}

export default HomePage;
