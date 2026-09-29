import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import Navbar from "./components/layout/Navbar.jsx";
import Footer from "./components/layout/Footer.jsx";
import HomePage from "./pages/HomePage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import ClaimPage from "./pages/ClaimPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import { useHealthCheck } from "./hooks/useHealthCheck.js";
import Modal from "./components/ui/Modal.jsx";
import Button from "./components/ui/Button.jsx";
import { ArrowRight, KeyRound } from "lucide-react";
import "./App.css";

function AppContent() {
  const healthState = useHealthCheck(true, 15000);
  const [globalClaimModal, setGlobalClaimModal] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const navigate = useNavigate();

  const handleClaimProceed = () => {
    if (!tokenInput.trim()) return;

    // Extract raw token whether full URL or plain token was entered
    let extracted = tokenInput.trim();
    if (extracted.includes("/claim/")) {
      extracted = extracted.split("/claim/")[1].split(/[?#]/)[0];
    }

    setGlobalClaimModal(false);
    setTokenInput("");
    navigate(`/claim/${encodeURIComponent(extracted)}`);
  };

  return (
    <div className="app-shell">
      <Navbar
        healthState={healthState}
        onClaimClick={() => setGlobalClaimModal(true)}
      />

      <main className="main-viewport">
        <Routes>
          <Route path="/" element={<HomePage healthState={healthState} />} />
          <Route path="/deliveries" element={<OrdersPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/dashboard/orders/:orderId"
            element={<DashboardPage />}
          />
          <Route path="/claim/:token" element={<ClaimPage />} />
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
            below to access the claim interface.
          </p>
          <div className="claim-input-group">
            <input
              type="text"
              placeholder="e.g. claimroute.app/claim/a8f9b... or raw token"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleClaimProceed();
              }}
              className="claim-modal-input"
            />
            <Button
              variant="primary"
              size="sm"
              icon={ArrowRight}
              iconPosition="right"
              onClick={handleClaimProceed}
              disabled={!tokenInput.trim()}
            >
              Proceed
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
