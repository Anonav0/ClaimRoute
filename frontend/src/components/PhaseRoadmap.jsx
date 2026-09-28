import React from "react";
import { Layers, Database, KeyRound, Bot, Navigation } from "lucide-react";

const phases = [
  {
    id: 1,
    title: "Phase 1: Foundation & Setup",
    desc: "React + Express architecture, health check API, CORS, environment configuration.",
    status: "active",
    icon: Layers,
  },
  {
    id: 2,
    title: "Phase 2: Database & Models",
    desc: "Firebase Firestore integration, security rules, data access repositories.",
    status: "upcoming",
    icon: Database,
  },
  {
    id: 3,
    title: "Phase 3: Secure Claim Engine",
    desc: "Cryptographic token generation, hash verification, recipient address collection.",
    status: "upcoming",
    icon: KeyRound,
  },
  {
    id: 4,
    title: "Phase 4: AI Logistics Extraction",
    desc: "LangChain & Pydantic structured constraint extraction from recipient notes.",
    status: "upcoming",
    icon: Bot,
  },
  {
    id: 5,
    title: "Phase 5: Routing & Operations",
    desc: "Routing readiness evaluation, fulfillment status, operations dashboard.",
    status: "upcoming",
    icon: Navigation,
  },
];

export function PhaseRoadmap() {
  return (
    <div className="roadmap-container">
      <div className="roadmap-header">
        <h3 className="roadmap-title">Incremental Build Roadmap</h3>
        <p className="roadmap-subtitle">
          ClaimRoute is being developed in deliberate phases. Business logic,
          Firestore, and AI are queued for subsequent phases.
        </p>
      </div>

      <div className="roadmap-list">
        {phases.map((phase) => {
          const Icon = phase.icon;
          const isActive = phase.status === "active";

          return (
            <div
              key={phase.id}
              className={`roadmap-item ${isActive ? "is-active" : "is-upcoming"}`}
            >
              <div className="roadmap-item-icon">
                <Icon size={18} />
              </div>
              <div className="roadmap-item-content">
                <div className="roadmap-item-title-row">
                  <span className="roadmap-item-title">{phase.title}</span>
                  <span className={`roadmap-badge ${phase.status}`}>
                    {isActive ? "Current Phase" : "Planned"}
                  </span>
                </div>
                <p className="roadmap-item-desc">{phase.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PhaseRoadmap;
