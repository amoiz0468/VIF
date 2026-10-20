import React from 'react';
import { ShieldCheck, Heart, ExternalLink, FileText } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer glass-panel">
      <div className="footer-content">
        <div className="footer-brand-col">
          <div className="footer-logo-row">
            <span style={{ fontSize: '1.4rem' }}>🥖</span>
            <span className="footer-brand-name">Vif</span>
          </div>
          <p className="footer-tagline">
            The Real-Time Student Food Bridge. Connecting French bakeries with verified university students to turn surplus into dignity.
          </p>
          <div className="footer-badge-pill">
            <ShieldCheck size={14} color="#10B981" />
            <span>GDPR & CNIL Compliant · Privacy by Design</span>
          </div>
        </div>

        <div className="footer-links-col">
          <h4 className="footer-links-title">Legal & Standards</h4>
          <ul className="footer-links-list">
            <li>Article 238 bis CGI (Donation Tax Deduction)</li>
            <li>Loi n° 2016-138 ("Loi Garot" Food Waste)</li>
            <li>Cerfa n° 11580*05 Official Receipts</li>
            <li>Regulation (EC) 852/2004 (Hygiene & Food Safety)</li>
          </ul>
        </div>

        <div className="footer-links-col">
          <h4 className="footer-links-title">Capstone Documentation</h4>
          <ul className="footer-links-list">
            <li>Functional Specification (SRS)</li>
            <li>FastAPI & PostGIS Architecture</li>
            <li>Threat Model & Security Audit</li>
            <li>Consolidated Risk Register & Cost Plan</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          EPITECH Innovative Project / Capstone · Paris, France · Built for dignified food access & zero waste.
        </p>
      </div>
    </footer>
  );
}
