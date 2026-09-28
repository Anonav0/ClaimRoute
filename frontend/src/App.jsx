import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/layout/Navbar.jsx";
import Footer from "./components/layout/Footer.jsx";
import HomePage from "./pages/HomePage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import { useHealthCheck } from "./hooks/useHealthCheck.js";
import Modal from "./components/ui/Modal.jsx";
import Button from "./components/ui/Button.jsx";
import { ArrowRight, KeyRound } from "lucide-react";
import "./App.css";

export function App() {
  const healthState = useHealthCheck(true, 15000);
  const [globalClaimModal, setGlobalClaimModal] = useState(false);
  const [tokenInput, setTokenInput] = useState("");

  return (
    <Router>
      <div className="app-shell">
        <Navbar
          healthState={healthState}
          onClaimClick={() => setGlobalClaimModal(true)}
        />

        <main className="main-viewport">
          <Routes>
            <Route path="/" element={<HomePage healthState={healthState} />} />
            <Route path="/deliveries" element={<OrdersPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Footer />

        {/* Global Claim Modal accessible from Navbar CTA */}
        <Modal
          isOpen={globalClaimModal}
          onClose={() => setGlobalClaimModal(false)}
          title="Enter Your Claim Link"
        >
          <div className="modal-feature-teaser">
            <div className="teaser-icon-wrapper claim">
              <KeyRound size={26} className="teaser-icon" />
            </div>
            <h4 className="teaser-headline">Claim a Pending Delivery</h4>
            <p className="teaser-body">
              If someone sent you a ClaimRoute link, paste your token or link
              below to preview the upcoming claim interface.
            </p>
            <div className="claim-input-group">
              <input
                type="text"
                placeholder="e.g. claimroute.app/claim/a8f9b..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="claim-modal-input"
              />
              <Button
                variant="primary"
                size="sm"
                icon={ArrowRight}
                iconPosition="right"
                onClick={() => {
                  alert(
                    "Token verification and recipient address form are scheduled for Phase 4.",
                  );
                  setGlobalClaimModal(false);
                }}
              >
                Proceed
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Router>
  );
}

export default App;
