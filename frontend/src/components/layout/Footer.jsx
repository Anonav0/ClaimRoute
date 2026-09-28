import React from "react";
import { Package, Shield, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand-col">
            <div className="footer-logo">
              <div className="footer-icon-box">
                <Package size={20} />
              </div>
              <span className="footer-brand-name">ClaimRoute</span>
            </div>
            <p className="footer-description">
              Warm technology for effortless delivery. Connecting recipients
              directly with their packages without pre-sharing home addresses.
            </p>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-heading">Product</h4>
            <ul className="footer-nav-list">
              <li>
                <a href="#how-it-works">How It Works</a>
              </li>
              <li>
                <a href="#trust">Trust & Security</a>
              </li>
              <li>
                <a href="#roadmap">Build Roadmap</a>
              </li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-heading">Privacy & Integrity</h4>
            <ul className="footer-nav-list">
              <li className="footer-feature-item">
                <Shield size={14} className="feature-icon" />
                <span>Zero pre-shared addresses</span>
              </li>
              <li className="footer-feature-item">
                <Shield size={14} className="feature-icon" />
                <span>One-time secure tokens</span>
              </li>
              <li className="footer-feature-item">
                <Shield size={14} className="feature-icon" />
                <span>Direct courier fulfillment</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {new Date().getFullYear()} ClaimRoute Logistics Engine. Designed
            for modern, human-first delivery workflows.
          </p>
          <div className="footer-badge">
            <span>Built with care</span>
            <Heart size={13} className="heart-icon" />
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
