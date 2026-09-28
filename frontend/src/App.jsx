import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import HomePage from "./pages/HomePage.jsx";
import "./App.css";

export function App() {
  return (
    <Router>
      <div className="app-shell">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            {/* Catch-all redirect to home for now */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="footer">
          <div className="footer-content">
            <p className="footer-title">
              ClaimRoute Logistics Engine — Phase 1
            </p>
            <p className="footer-sub">
              Recipient forms, cryptographic claims, Firestore persistence, and
              AI extraction will be enabled in subsequent phases.
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
