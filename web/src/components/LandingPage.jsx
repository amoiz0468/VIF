import React, { useState } from 'react';
import { 
  GraduationCap, 
  Store, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  Flame, 
  QrCode, 
  FileText, 
  Send, 
  Lock, 
  EyeOff, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  Award,
  Heart,
  Navigation,
  ExternalLink
} from 'lucide-react';

export default function LandingPage({ onOpenAuth }) {
  // Journey tab toggle: 'student' or 'bakery'
  const [journeyTab, setJourneyTab] = useState('student');

  // FAQ category filter & accordion state
  const [faqCategory, setFaqCategory] = useState('all');
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const faqs = [
    {
      category: 'student',
      q: 'Who is eligible to receive free surplus meals on Vif?',
      a: 'Any verified student enrolled in higher education in France. During registration, students simply sign up with an academic email address (.edu, .eu, .ac.uk, or .univ) and verify their student card via our privacy-first ephemeral OCR scanner.'
    },
    {
      category: 'student',
      q: 'What is the Reliability Karma Engine and what happens if I miss a pickup?',
      a: 'Every student starts with a Karma score of 50/100. When you claim a surplus meal, you have a 20-minute reservation window to collect it. If you do not show up, the reservation expires, the food is immediately released back to other students, and your Karma score decreases by 10 points. If your score falls below 30, your account is temporarily locked to maintain fairness for bakeries and fellow students.'
    },
    {
      category: 'bakery',
      q: 'How does the 60% tax reduction work under French law (Article 238 bis CGI)?',
      a: 'Under Article 238 bis of the Code Général des Impôts and the French Loi Garot against food waste, corporate food donations to certified non-profits allow bakeries to deduct 60% of the cost price (prix de revient HT) directly from their corporate tax liability. Vif automatically records all validated handovers and compiles them into DGFiP-compliant Cerfa n° 11580*05 tax receipts.'
    },
    {
      category: 'bakery',
      q: 'Does a bakery employee need to spend time typing inventory every evening?',
      a: 'Not at all! Vif is built specifically for busy bakery closing hours. With 1-Click French Bakery presets (e.g. 10 Baguettes Tradition, 8 Croissants & Viennoiseries), a shopkeeper can broadcast an entire surplus pulse in less than 10 seconds without typing a single word.'
    },
    {
      category: 'safety',
      q: 'Is the surplus food fresh, safe, and hygienic?',
      a: 'Absolutely. Vif operates strictly under European Hygiene Regulation (EC) 852/2004 and the French Loi n° 2016-138 (Loi Garot). Food posted on Vif consists of fresh, same-day end-of-production bakery items and sandwiches stored under proper temperature-controlled vitrines, prepared only hours earlier.'
    },
    {
      category: 'student',
      q: 'How does the secure QR Code challenge handshake work?',
      a: 'When you reserve a surplus meal, Vif generates a unique cryptographic challenge QR code on your phone screen. When you arrive at the bakery, the artisan scans or inputs this token to confirm collection. This prevents fraud, protects your karma score, and officially logs the donation into the bakery’s fiscal tax report.'
    },
    {
      category: 'safety',
      q: 'Are donations legally anchored through a recognized public body?',
      a: 'Yes. Donations processed on Vif are anchored through an authorized partner Organisme d’Intérêt Général (OIG), satisfying all French fiscal and legal donation regulations.'
    }
  ];

  const filteredFaqs = faqCategory === 'all' 
    ? faqs 
    : faqs.filter(f => f.category === faqCategory);

  return (
    <div className="landing-container">
      {/* 1. HERO SECTION (Warm, Friendly, Animated) */}
      <section className="hero-friendly-section">
        <div className="hero-friendly-grid">
          <div className="hero-friendly-text-col">
            <div className="hero-pill-badge">
              <span className="live-indicator"></span>
              <span>EPITECH Capstone 2026-2027 · Paris Pilot</span>
            </div>

            <h1 className="hero-friendly-title">
              Turn Evening Bakery Surplus into <span className="gradient-text-warm">Free, Dignified</span> Student Meals
            </h1>

            <p className="hero-friendly-subtitle">
              Vif is the real-time bridge connecting Parisian boulangeries with local university students. 
              When a bakery has unsold food, it broadcasts a <strong>Pulse in under 10 seconds</strong>. 
              Students within 1 km reserve instantly with a 20-minute QR code — while bakeries receive an 
              automated <strong>60% corporate tax deduction</strong> under French law.
            </p>

            <div className="hero-cta-buttons-row">
              <button 
                className="btn btn-primary btn-lg"
                onClick={() => onOpenAuth('signup', 'student')}
              >
                <GraduationCap size={18} />
                I am a Student (Get Meals)
              </button>

              <button 
                className="btn btn-secondary btn-lg"
                onClick={() => onOpenAuth('signup', 'shopkeeper')}
              >
                <Store size={18} color="#D97706" />
                I am a Bakery (Reduce Waste)
              </button>
            </div>

            <div className="hero-trust-row">
              <div className="hero-trust-item">
                <ShieldCheck size={16} color="#059669" />
                <span>Article 238 bis CGI (60% Tax Benefit)</span>
              </div>
              <div className="hero-trust-item">
                <CheckCircle2 size={16} color="#059669" />
                <span>Loi Garot Zero-Waste Compliant</span>
              </div>
              <div className="hero-trust-item">
                <Lock size={16} color="#059669" />
                <span>GDPR & CNIL Privacy-by-Design</span>
              </div>
            </div>
          </div>

          {/* Interactive Visual Radar Card with Animated Floating Food Badges */}
          <div className="hero-visual-card">
            <div className="visual-card-header">
              <div className="badge badge-emerald">
                <span className="live-indicator"></span> Live 1,000m Geofence Radar
              </div>
              <span className="badge badge-amber">Paris 5ème / 4ème</span>
            </div>

            <div className="visual-radar-box">
              <div className="floating-pulse-card">
                <div className="pulse-badge-left">
                  <span className="pulse-badge-emoji">🥖</span>
                  <div>
                    <div className="pulse-badge-title">Boulangerie St. Michel</div>
                    <div className="pulse-badge-sub">10 Baguettes Tradition · 320m away</div>
                  </div>
                </div>
                <span className="badge badge-indigo">Priority Window</span>
              </div>

              <div className="floating-pulse-card reverse">
                <div className="pulse-badge-left">
                  <span className="pulse-badge-emoji">🥐</span>
                  <div>
                    <div className="pulse-badge-title">Maison Landemaine Sorbonne</div>
                    <div className="pulse-badge-sub">8 Croissants & Viennoiseries · 640m away</div>
                  </div>
                </div>
                <span className="badge badge-rose">20m Timer Active</span>
              </div>

              <div className="floating-pulse-card">
                <div className="pulse-badge-left">
                  <span className="pulse-badge-emoji">🥪</span>
                  <div>
                    <div className="pulse-badge-title">Boulangerie du Marais</div>
                    <div className="pulse-badge-sub">5 Sandwiches & Quiches du Jour · 890m away</div>
                  </div>
                </div>
                <span className="badge badge-emerald">Available</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. IMPACT METRICS BANNER */}
      <section className="metrics-banner-section">
        <div className="metric-friendly-card">
          <div className="metric-icon-box" style={{ background: '#FEF3C7', color: '#B45309' }}>
            <span style={{ fontSize: '1.5rem' }}>🥖</span>
          </div>
          <div>
            <div className="metric-number">1,420+ kg</div>
            <div className="metric-label">Food Waste Diverted</div>
          </div>
        </div>

        <div className="metric-friendly-card">
          <div className="metric-icon-box" style={{ background: '#E0E7FF', color: '#3730A3' }}>
            <GraduationCap size={24} color="#4F46E5" />
          </div>
          <div>
            <div className="metric-number">3,890+</div>
            <div className="metric-label">Free Student Meals Served</div>
          </div>
        </div>

        <div className="metric-friendly-card">
          <div className="metric-icon-box" style={{ background: '#FFEDD5', color: '#9A3412' }}>
            <Clock size={24} color="#EA580C" />
          </div>
          <div>
            <div className="metric-number">&lt;10 sec</div>
            <div className="metric-label">Surplus Posting Speed</div>
          </div>
        </div>

        <div className="metric-friendly-card">
          <div className="metric-icon-box" style={{ background: '#D1FAE5', color: '#065F46' }}>
            <FileText size={24} color="#059669" />
          </div>
          <div>
            <div className="metric-number">60%</div>
            <div className="metric-label">Cerfa Tax Reduction (CGI)</div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS (Interactive Dual Personas) */}
      <section className="how-it-works-section">
        <div className="section-centered-header">
          <span className="badge badge-amber section-badge-pill">Step-by-Step Walkthrough</span>
          <h2 className="section-heading-big">How Vif Works</h2>
          <p className="section-sub-desc">
            A frictionless, dignified workflow designed specifically for busy bakers and hungry students.
          </p>
        </div>

        <div className="journey-tab-switch">
          <button 
            className={`journey-tab-btn ${journeyTab === 'student' ? 'active' : ''}`}
            onClick={() => setJourneyTab('student')}
          >
            <GraduationCap size={16} /> For Students (Étudiants)
          </button>
          <button 
            className={`journey-tab-btn ${journeyTab === 'bakery' ? 'active' : ''}`}
            onClick={() => setJourneyTab('bakery')}
          >
            <Store size={16} /> For Bakeries (Boulangeries)
          </button>
        </div>

        {journeyTab === 'student' ? (
          <div className="steps-timeline-grid">
            <div className="step-card">
              <div className="step-number-bubble">1</div>
              <h3 className="step-title">Get Instant Radar Alerts</h3>
              <p className="step-desc">
                When a boulangerie within 1 km posts evening surplus, verified students receive an instant notification. Verified students enjoy an exclusive 10-minute priority window.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number-bubble">2</div>
              <h3 className="step-title">Claim in 1 Click & Start Timer</h3>
              <p className="step-desc">
                Reserve your meal pack in one tap. A 20-minute pickup window begins, generating a secure challenge-response QR code directly on your phone screen.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number-bubble">3</div>
              <h3 className="step-title">Show QR & Eat Free</h3>
              <p className="step-desc">
                Walk to the bakery, present your QR code to the baker at checkout, collect your warm, fresh food for free, and boost your reliability Karma score.
              </p>
            </div>
          </div>
        ) : (
          <div className="steps-timeline-grid">
            <div className="step-card">
              <div className="step-number-bubble">1</div>
              <h3 className="step-title">Broadcast Surplus in 1 Tap</h3>
              <p className="step-desc">
                Before closing, tap one of our ready-to-use French bakery presets (e.g. 10 Baguettes, 8 Croissants) or enter a custom amount. Zero paperwork, zero typing.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number-bubble">2</div>
              <h3 className="step-title">Scan QR Challenge Handshake</h3>
              <p className="step-desc">
                When the student arrives, scan or enter their 6-digit challenge code. The handover is completed in seconds without disrupting your counter flow.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number-bubble">3</div>
              <h3 className="step-title">Receive Cerfa Tax Deductions</h3>
              <p className="step-desc">
                At the end of each month, download an accountant-ready Cerfa n° 11580*05 PDF generating a 60% corporate tax deduction under Article 238 bis CGI.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 4. THE 4 CORE ENGINES */}
      <section className="core-engines-section">
        <div className="section-centered-header">
          <span className="badge badge-emerald section-badge-pill">Innovative Architecture</span>
          <h2 className="section-heading-big">Built On 4 Core Engines</h2>
          <p className="section-sub-desc">
            Engineered with FastAPI, PostGIS geospatial queries, and automated fiscal reporting.
          </p>
        </div>

        <div className="engines-grid-4">
          <div className="engine-card">
            <div className="engine-icon-wrapper">
              <Send size={24} color="#D97706" />
            </div>
            <h3 className="engine-title">The 10-Second Pulse Engine</h3>
            <p className="engine-description">
              Replaces complicated inventory management. Pre-configured presets allow bakers to broadcast end-of-day surplus in a single tap before closing shop.
            </p>
            <div className="engine-feature-list">
              <div className="engine-feature-item">
                <CheckCircle2 size={14} color="#059669" /> 1-Tap French bakery surplus presets
              </div>
              <div className="engine-feature-item">
                <CheckCircle2 size={14} color="#059669" /> Instant push notifications dispatch
              </div>
            </div>
          </div>

          <div className="engine-card">
            <div className="engine-icon-wrapper">
              <Navigation size={24} color="#4F46E5" />
            </div>
            <h3 className="engine-title">Real-Time PostGIS Geofencing</h3>
            <p className="engine-description">
              Powered by PostgreSQL and PostGIS spatial geography queries (<code>ST_DWithin</code> and <code>ST_Distance</code>), restricting notifications strictly to students within 1,000 meters.
            </p>
            <div className="engine-feature-list">
              <div className="engine-feature-item">
                <CheckCircle2 size={14} color="#059669" /> Walkable radius (&lt;1 km / under 15 minutes)
              </div>
              <div className="engine-feature-item">
                <CheckCircle2 size={14} color="#059669" /> 10-minute priority window for verified students
              </div>
            </div>
          </div>

          <div className="engine-card">
            <div className="engine-icon-wrapper">
              <Flame size={24} color="#EA580C" />
            </div>
            <h3 className="engine-title">The Reliability Karma Engine</h3>
            <p className="engine-description">
              An asynchronous background engine that guarantees fair distribution. Claims expire after 20 minutes; ghosting automatically returns inventory and deducts 10 karma points.
            </p>
            <div className="engine-feature-list">
              <div className="engine-feature-item">
                <CheckCircle2 size={14} color="#059669" /> Single active reservation limit
              </div>
              <div className="engine-feature-item">
                <CheckCircle2 size={14} color="#059669" /> Anti-ghosting penalty safeguards bakery trust
              </div>
            </div>
          </div>

          <div className="engine-card">
            <div className="engine-icon-wrapper">
              <FileText size={24} color="#059669" />
            </div>
            <h3 className="engine-title">Automated Cerfa Tax Generator</h3>
            <p className="engine-description">
              Compiled on demand with ReportLab. Tracks collected claims and inventory cost prices to generate official <strong>Cerfa n° 11580*05</strong> receipts ready for company accountants.
            </p>
            <div className="engine-feature-list">
              <div className="engine-feature-item">
                <CheckCircle2 size={14} color="#059669" /> 60% corporate tax credit (Art. 238 bis CGI)
              </div>
              <div className="engine-feature-item">
                <CheckCircle2 size={14} color="#059669" /> 1-Click accountant-ready PDF download
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. GDPR & PRIVACY BY DESIGN HUB */}
      <section className="gdpr-hub-section">
        <div className="section-centered-header">
          <div className="gdpr-header-badge">
            <ShieldCheck size={16} /> Privacy-by-Design & GDPR Compliance
          </div>
          <h2 className="section-heading-big">How Vif Protects Your Data</h2>
          <p className="section-sub-desc">
            Vif is built according to CNIL regulations and the EU General Data Protection Regulation (GDPR). 
            We protect student dignity and never monetize, track, or sell your personal data.
          </p>
        </div>

        <div className="gdpr-cards-grid">
          <div className="gdpr-feature-card">
            <div className="gdpr-card-icon">
              <EyeOff size={20} color="#059669" />
            </div>
            <h4 className="gdpr-card-title">Ephemeral OCR Processing</h4>
            <p className="gdpr-card-desc">
              When a student uploads an ID card, our OCR engine extracts student status and current academic year in memory. The image file is immediately deleted and never stored on any server.
            </p>
          </div>

          <div className="gdpr-feature-card">
            <div className="gdpr-card-icon">
              <Lock size={20} color="#059669" />
            </div>
            <h4 className="gdpr-card-title">Data Minimization (Art. 5 GDPR)</h4>
            <p className="gdpr-card-desc">
              We collect only the bare minimum required: an academic email address, verification flag, and karma score. We never store credit cards, home addresses, or continuous location traces.
            </p>
          </div>

          <div className="gdpr-feature-card">
            <div className="gdpr-card-icon">
              <Trash2 size={20} color="#059669" />
            </div>
            <h4 className="gdpr-card-title">Right to Erasure (Art. 17 GDPR)</h4>
            <p className="gdpr-card-desc">
              Under GDPR Article 17, any user can request immediate account termination. All associated claim history and profile records are purged from the database permanently.
            </p>
          </div>

          <div className="gdpr-feature-card">
            <div className="gdpr-card-icon">
              <ShieldCheck size={20} color="#059669" />
            </div>
            <h4 className="gdpr-card-title">Strong Cryptographic Security</h4>
            <p className="gdpr-card-desc">
              All user passwords are encrypted using PBKDF2-SHA256. API requests are authenticated through JSON Web Tokens (JWT) and transmitted over encrypted TLS 1.3 channels.
            </p>
          </div>

          <div className="gdpr-feature-card">
            <div className="gdpr-card-icon">
              <Award size={20} color="#059669" />
            </div>
            <h4 className="gdpr-card-title">Zero Commercial Advertising</h4>
            <p className="gdpr-card-desc">
              Vif is an academic capstone innovation project dedicated to food security. We do not use third-party analytics trackers, cookies for ads, or sell data to advertisers.
            </p>
          </div>

          <div className="gdpr-feature-card">
            <div className="gdpr-card-icon">
              <Heart size={20} color="#059669" />
            </div>
            <h4 className="gdpr-card-title">Public Interest Anchor (OIG)</h4>
            <p className="gdpr-card-desc">
              All surplus food transfers are legally recognized through a partner Organisme d’Intérêt Général (OIG), guaranteeing strict adherence to non-profit food aid charters.
            </p>
          </div>
        </div>
      </section>

      {/* 6. FAQS SECTION */}
      <section className="faqs-section">
        <div className="section-centered-header">
          <span className="badge badge-amber section-badge-pill">Have Questions?</span>
          <h2 className="section-heading-big">Frequently Asked Questions</h2>
          <p className="section-sub-desc">
            Everything you need to know about eligibility, collection, tax benefits, and food safety.
          </p>
        </div>

        <div className="faq-categories-row">
          <button 
            className={`faq-cat-btn ${faqCategory === 'all' ? 'active' : ''}`}
            onClick={() => setFaqCategory('all')}
          >
            All Questions
          </button>
          <button 
            className={`faq-cat-btn ${faqCategory === 'student' ? 'active' : ''}`}
            onClick={() => setFaqCategory('student')}
          >
            For Students
          </button>
          <button 
            className={`faq-cat-btn ${faqCategory === 'bakery' ? 'active' : ''}`}
            onClick={() => setFaqCategory('bakery')}
          >
            For Bakeries
          </button>
          <button 
            className={`faq-cat-btn ${faqCategory === 'safety' ? 'active' : ''}`}
            onClick={() => setFaqCategory('safety')}
          >
            Safety & Legal
          </button>
        </div>

        <div className="faq-accordion-list">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={idx} className={`faq-item-card ${isOpen ? 'open' : ''}`}>
                <button 
                  className="faq-question-btn"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={18} color="#D97706" /> : <ChevronDown size={18} color="#94A3B8" />}
                </button>
                {isOpen && (
                  <div className="faq-answer-content">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. PRE-FOOTER CALL TO ACTION */}
      <section className="pre-footer-cta">
        <h3>Ready to Stop Waste & Feed Students?</h3>
        <p>
          Join the pilot in Paris today. Whether you are an artisan baker with evening surplus or a university student looking for fresh dinner, Vif is ready for you.
        </p>
        <div className="cta-button-group">
          <button 
            className="btn btn-primary btn-lg"
            onClick={() => onOpenAuth('signup', 'student')}
          >
            <GraduationCap size={18} /> Register as Student
          </button>
          <button 
            className="btn btn-secondary btn-lg"
            onClick={() => onOpenAuth('signup', 'shopkeeper')}
          >
            <Store size={18} color="#D97706" /> Register as Bakery
          </button>
        </div>
      </section>
    </div>
  );
}
