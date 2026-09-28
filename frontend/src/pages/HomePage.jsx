import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Hero from "../components/sections/Hero.jsx";
import HowItWorks from "../components/sections/HowItWorks.jsx";
import TrustSection from "../components/sections/TrustSection.jsx";
import PhaseRoadmapSection from "../components/sections/PhaseRoadmapSection.jsx";
import Modal from "../components/ui/Modal.jsx";
import Button from "../components/ui/Button.jsx";
import OrderFormModal from "../components/orders/OrderFormModal.jsx";
import { orderService } from "../services/order.service.js";
import { KeyRound, ArrowRight } from "lucide-react";

export function HomePage({ healthState }) {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimTokenInput, setClaimTokenInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateOrder = async (orderPayload) => {
    setIsSubmitting(true);
    try {
      await orderService.createOrder(orderPayload);
      setCreateModalOpen(false);
      navigate("/deliveries");
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* Real Live Order Creation Modal */}
      <OrderFormModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateOrder}
        isSubmitting={isSubmitting}
      />

      {/* Friendly "I Have a Claim Link" Modal */}
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
                  "Secure one-time claim token resolution engine is scheduled for Phase 4.",
                );
                setClaimModalOpen(false);
              }}
            >
              Verify Link
            </Button>
          </div>
          <p className="teaser-subnote">
            In Phase 4, cryptographic hash verification and the recipient
            address collection form will be activated.
          </p>
        </div>
      </Modal>
    </div>
  );
}

export default HomePage;
