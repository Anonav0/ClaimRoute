import React, { useState } from "react";
import {
  Layers,
  Database,
  KeyRound,
  Bot,
  Navigation,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import Card from "../ui/Card.jsx";
import Badge from "../ui/Badge.jsx";

const phases = [
  {
    id: "1.0",
    title: "Phase 1: Project Foundation",
    desc: "React + Express architecture, REST health checks, centralized error middleware, and CORS configuration.",
    status: "completed",
    icon: Layers,
  },
  {
    id: "1.5",
    title: "Phase 1.5: Welcoming UI & Visual Foundation",
    desc: "Warm, human-centered consumer UI, design tokens, responsive layout, and integrated system status.",
    status: "current",
    icon: Layers,
  },
  {
    id: "2.0",
    title: "Phase 2: Database & Data Models",
    desc: "Firebase Firestore persistence, security rules, data access repositories, and order schema definitions.",
    status: "upcoming",
    icon: Database,
  },
  {
    id: "3.0",
    title: "Phase 3: Cryptographic Claim Engine",
    desc: "One-time secure tokens, SHA-256 token hashing, single-use enforcement, and recipient address intake.",
    status: "upcoming",
    icon: KeyRound,
  },
  {
    id: "4.0",
    title: "Phase 4: AI Logistics Extraction",
    desc: "LangChain & Pydantic structured constraint extraction from recipient delivery instructions.",
    status: "upcoming",
    icon: Bot,
  },
  {
    id: "5.0",
    title: "Phase 5: Routing & Dispatch Engine",
    desc: "Fulfillment readiness checks, courier routing preparation, and operational delivery dispatch.",
    status: "upcoming",
    icon: Navigation,
  },
];

export function PhaseRoadmapSection() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section id="roadmap" className="roadmap-section">
      <div className="roadmap-panel">
        <div
          className="roadmap-panel-header"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="roadmap-header-left">
            <Layers size={18} className="roadmap-icon" />
            <div>
              <h3 className="roadmap-panel-title">
                Development Roadmap & Architecture Scope
              </h3>
              <p className="roadmap-panel-sub">
                ClaimRoute is being engineered incrementally across structured
                phases.
              </p>
            </div>
          </div>
          <div className="roadmap-header-right">
            <Badge variant="primary" size="sm">
              Phase 1.5 Active
            </Badge>
            <button
              className="roadmap-expand-btn"
              aria-label={isExpanded ? "Collapse roadmap" : "Expand roadmap"}
            >
              <ChevronDown
                size={18}
                className={`expand-chevron ${isExpanded ? "rotated" : ""}`}
              />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="roadmap-panel-body">
            <div className="roadmap-grid">
              {phases.map((phase) => {
                const Icon = phase.icon;
                const isCurrent = phase.status === "current";
                const isCompleted = phase.status === "completed";

                return (
                  <Card
                    key={phase.id}
                    className={`roadmap-card ${isCurrent ? "current" : ""} ${isCompleted ? "completed" : ""}`}
                    padded
                  >
                    <div className="roadmap-card-header">
                      <div className="roadmap-card-icon-box">
                        <Icon size={16} />
                      </div>
                      <span className="roadmap-phase-id">{phase.id}</span>
                      <span className={`roadmap-status-pill ${phase.status}`}>
                        {isCompleted && <CheckCircle2 size={12} />}
                        <span>
                          {phase.status === "completed"
                            ? "Completed"
                            : phase.status === "current"
                              ? "Current Phase"
                              : "Queued"}
                        </span>
                      </span>
                    </div>

                    <h4 className="roadmap-phase-name">{phase.title}</h4>
                    <p className="roadmap-phase-desc">{phase.desc}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default PhaseRoadmapSection;
