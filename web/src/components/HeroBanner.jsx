import React from 'react';
import { 
  GraduationCap, 
  Store, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  ArrowRight,
  TrendingDown,
  Award
} from 'lucide-react';

export default function HeroBanner({ onOpenAuth }) {
  return (
    <div className="hero-section glass-panel">
      <div className="hero-content">
        <div className="hero-pill-badge">
          <span className="live-indicator"></span>
          <span>EPITECH Capstone 2026-2027 · Paris Pilot</span>
        </div>

        <h1 className="hero-title">
          Turn Bakery Surplus Into <span className="gradient-text-warm">Free, Dignified</span> Student Meals
        </h1>

        <p className="hero-subtitle">
          Vif is the real-time bridge connecting French boulangeries with local university students. 
          When surplus is posted, students within 1 km reserve instantly with a 20-minute QR code — 
          while bakeries automatically generate Cerfa tax reduction receipts.
        </p>

        <div className="hero-cta-cards">
          <div 
            className="hero-role-card student-hero-card glass-card"
            onClick={() => onOpenAuth('signup', 'student')}
          >
            <div className="role-card-top">
              <div className="role-icon-box student-icon-box">
                <GraduationCap size={28} color="#818CF8" />
              </div>
              <span className="badge badge-indigo">For Students</span>
            </div>
            <h3 className="role-card-heading">Find Free Bakery Meals</h3>
            <p className="role-card-description">
              Browse real surplus pulses within 1,000 meters of your campus. 20-minute fair claim timer, 100% free and dignified.
            </p>
            <div className="role-card-action">
              <span>Sign Up / Log In as Student</span>
              <ArrowRight size={16} />
            </div>
          </div>

          <div 
            className="hero-role-card bakery-hero-card glass-card"
            onClick={() => onOpenAuth('signup', 'shopkeeper')}
          >
            <div className="role-card-top">
              <div className="role-icon-box bakery-icon-box">
                <Store size={28} color="#F59E0B" />
              </div>
              <span className="badge badge-amber">For Boulangeries</span>
            </div>
            <h3 className="role-card-heading">Offload Surplus & Save on Taxes</h3>
            <p className="role-card-description">
              1-tap surplus posting before closing. Automated Cerfa n° 11580*05 tax receipts for a 60% corporate tax deduction.
            </p>
            <div className="role-card-action">
              <span>Sign Up / Log In as Bakery</span>
              <ArrowRight size={16} />
            </div>
          </div>
        </div>

        {/* Impact Numbers */}
        <div className="hero-stats-row">
          <div className="stat-item">
            <div className="stat-number">10 sec</div>
            <div className="stat-label">1-Tap Surplus Broadcast</div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-number">1,000 m</div>
            <div className="stat-label">Real-Time Geofence Radar</div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-number">20 min</div>
            <div className="stat-label">Anti-Ghosting Claim Window</div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-number">60%</div>
            <div className="stat-label">Tax Credit (Art. 238 bis CGI)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
