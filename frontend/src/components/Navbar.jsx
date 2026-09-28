import React from "react";
import { Package, Shield, Sparkles } from "lucide-react";

export function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="brand-icon-wrapper">
            <Package size={22} className="brand-icon" />
          </div>
          <span className="brand-name">ClaimRoute</span>
        </div>

        <div className="navbar-meta">
          <span className="phase-pill">
            <Sparkles size={13} />
            Phase 1 Foundation
          </span>
          <span className="security-pill">
            <Shield size={13} />
            Address-Free Logistics
          </span>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
