import React, { useState } from "react";
import Hero from "../components/sections/Hero.jsx";
import HowItWorks from "../components/sections/HowItWorks.jsx";
import TrustSection from "../components/sections/TrustSection.jsx";
import PhaseRoadmapSection from "../components/sections/PhaseRoadmapSection.jsx";
import Modal from "../components/ui/Modal.jsx";
import Button from "../components/ui/Button.jsx";
import { PackagePlus, KeyRound, Sparkles, ArrowRight } from "lucide-react";

export function HomePage({ healthState }) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimTokenInput, setClaimTokenInput] = useState("");

  return (
    <div className="homepage-wrapper">
      {/* Hero Welcome Section */}
      <Hero
        onCreateClick={() => setCreateModalOpen(true)}
        onClaimClick={() => setClaimModalOpen(true)}
      />

      {/* 3-Step Human Process */}
      <HowItWorks />

      {/* Trust & Privacy Assurance */}
      <TrustSection />

      {/* Incremental Roadmap (Expandable) */}
      <PhaseRoadmapSection />

      {/* Friendly "Create Delivery" Placeholder Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create an Address-Free Delivery"
      >
        <div className="modal-feature-teaser">
          <div className="teaser-icon-wrapper">
            <PackagePlus size={28} className="teaser-icon" />
          </div>
          <h4 className="teaser-headline">Order Creation Workflow</h4>
          <p className="teaser-body">
            In subsequent phases, senders will be able to enter an item or gift
            name, set an optional delivery timeframe, and generate a secure,
            one-time claim link.
          </p>
          <div className="teaser-box">
            <Sparkles size={16} className="teaser-sparkle" />
            <span>
              <strong>Phase 2 Preview:</strong> Persistent order creation and
              Firestore schema integration are scheduled for the next
              development phase.
            </span>
          </div>
          <div className="modal-btn-row">
            <Button variant="primary" onClick={() => setCreateModalOpen(false)}>
              Got it, thanks!
            </Button>
          </div>
        </div>
      </Modal>

      {/* Friendly "I Have a Claim Link" Placeholder Modal */}
      <Modal
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        title="Claim Your Delivery"
      >
        <div className="modal-feature-teaser">
          <div className="teaser-icon-wrapper claim">
            <KeyRound size={28} className="teaser-icon" />
          </div>
          <h4 className="teaser-headline">Have a Claim Token?</h4>
          <p className="teaser-body">
            Recipients normally click their unique link directly from a message
            or email (e.g.,{" "}
            <code>claimroute.app/claim/&lt;secure-token&gt;</code>).
          </p>
          <div className="claim-input-group">
            <input
              type="text"
              placeholder="Paste token or link here..."
              value={claimTokenInput}
              onChange={(e) => setClaimTokenInput(e.target.value)}
              className="claim-modal-input"
            />
            <Button
              variant="primary"
              size="sm"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => {
                alert(
                  "Secure one-time token verification engine will be enabled in Phase 3.",
                );
                setClaimModalOpen(false);
              }}
            >
              Verify Link
            </Button>
          </div>
          <p className="teaser-subnote">
            In Phase 3, cryptographic hash verification and the recipient
            address collection form will be activated.
          </p>
        </div>
      </Modal>
    </div>
  );
}

export default HomePage;
