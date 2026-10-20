import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  Flame, 
  AlertCircle, 
  CheckCircle2, 
  QrCode, 
  RefreshCw, 
  Navigation, 
  Upload, 
  Hourglass,
  Store,
  FileCheck,
  Check
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { api } from '../api';

const PARIS_ZONES = [
  { name: 'Le Marais', lat: 48.8575, lng: 2.3598, desc: 'Commerces & Cafés' },
  { name: 'Sorbonne / Quartier Latin', lat: 48.8484, lng: 2.3438, desc: 'Universités & Écoles' },
  { name: 'Bastille / 11ème', lat: 48.8531, lng: 2.3698, desc: 'Boulangeries Artisanales' },
  { name: 'République', lat: 48.8675, lng: 2.3638, desc: 'Pôle Étudiant & Métro' },
  { name: 'Montparnasse', lat: 48.8421, lng: 2.3219, desc: 'Campus Sud' },
];

export default function StudentPortal({ user, onUserUpdate }) {
  // Location
  const [selectedZone, setSelectedZone] = useState(PARIS_ZONES[0]);
  const [coords, setCoords] = useState({ lat: 48.8575, lng: 2.3598 });
  const [locating, setLocating] = useState(false);

  // Pulses feed
  const [pulses, setPulses] = useState([]);
  const [loadingPulses, setLoadingPulses] = useState(false);
  const [feedError, setFeedError] = useState(null);

  // Active claim state
  const [activeClaim, setActiveClaim] = useState(() => {
    const saved = localStorage.getItem('vif_active_claim');
    return saved ? JSON.parse(saved) : null;
  });
  const [timeRemaining, setTimeRemaining] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);

  // Verification upload state
  const [uploadingId, setUploadingId] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // Toast / notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Fetch nearby pulses when coordinates change
  useEffect(() => {
    fetchNearbyPulses();
  }, [coords]);

  // Persist active claim
  useEffect(() => {
    if (activeClaim) {
      localStorage.setItem('vif_active_claim', JSON.stringify(activeClaim));
    } else {
      localStorage.removeItem('vif_active_claim');
    }
  }, [activeClaim]);

  // Countdown timer for active claim
  useEffect(() => {
    if (!activeClaim || !activeClaim.claim_deadline) return;

    const timer = setInterval(() => {
      const deadline = new Date(activeClaim.claim_deadline).getTime();
      const now = new Date().getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        clearInterval(timer);
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeClaim]);

  const fetchNearbyPulses = async () => {
    setLoadingPulses(true);
    setFeedError(null);
    try {
      const data = await api.getNearbyPulses(coords.lat, coords.lng);
      setPulses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch nearby pulses from backend:', err);
      setFeedError(err.message || 'Could not connect to nearby feed.');
      setPulses([]);
    } finally {
      setLoadingPulses(false);
    }
  };

  const handleZoneSelect = (zone) => {
    setSelectedZone(zone);
    setCoords({ lat: zone.lat, lng: zone.lng });
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSelectedZone({ name: 'My Current Location (GPS)', lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        showToast('Radar updated to your GPS coordinates!');
      },
      (err) => {
        console.error(err);
        setLocating(false);
        showToast('Could not fetch GPS. Using selected Paris zone.', 'error');
      }
    );
  };

  const handleClaimPulse = async (pulse) => {
    if (activeClaim) {
      showToast('You already have an active reservation! Collect it first.', 'error');
      return;
    }
    setClaimLoading(true);
    try {
      const res = await api.createClaim(pulse.pulse_id);
      setActiveClaim({
        ...res,
        shop_name: pulse.shop_name,
        shop_address: pulse.shop_address,
        item_name: pulse.item_name
      });
      showToast(`Meal reserved at ${pulse.shop_name}! Active 20-min QR challenge generated.`);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
      fetchNearbyPulses();
    } catch (err) {
      console.error('API createClaim error:', err);
      showToast(err.message || 'Could not create reservation.', 'error');
    } finally {
      setClaimLoading(false);
    }
  };

  const handleIdUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(true);
    try {
      const res = await api.verifyStudentId(file);
      setVerificationResult(res);
      showToast('Student ID verified by backend OCR! Priority window unlocked.');
      if (onUserUpdate) {
        onUserUpdate({ ...user, is_verified: true, id_verification_status: 'verified' });
      }
      fetchNearbyPulses();
    } catch (err) {
      console.error('ID upload failed:', err);
      showToast(err.message || 'Failed to verify ID card.', 'error');
    } finally {
      setUploadingId(false);
    }
  };

  return (
    <div className="portal-container">
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hero Sub-header */}
      <div className="portal-header glass-panel">
        <div className="portal-header-content">
          <div className="badge badge-emerald">
            <span className="live-indicator"></span> Live Surplus Radar (&lt;1000m)
          </div>
          <h2 className="portal-title">Real-Time Bakery Meals for Students</h2>
          <p className="portal-desc">
            Boulangeries in Paris post their surplus before closing. 
            Claim a meal in one click, show your QR code within 20 minutes, and eat for free.
          </p>
        </div>

        {/* Karma Score Card */}
        <div className="karma-stat-card glass-card">
          <div className="karma-header-row">
            <span className="karma-card-title">Reliability Karma</span>
            <Flame size={18} color="#F59E0B" />
          </div>
          <div className="karma-score-number">{user?.karma_score ?? 50}<span>/100</span></div>
          <div className="karma-progress-bar">
            <div 
              className="karma-progress-fill" 
              style={{ width: `${Math.min(100, user?.karma_score ?? 50)}%` }}
            ></div>
          </div>
          <p className="karma-explanation">
            Keep karma above 30. Ghosting a reservation deducts 10 points. Timely pickups preserve access!
          </p>
        </div>
      </div>

      <div className="portal-grid">
        {/* Left Column: Nearby Pulses Feed */}
        <div className="portal-main-column">
          {/* Location Selector Bar */}
          <div className="location-toolbar glass-panel">
            <div className="location-toolbar-left">
              <MapPin size={18} color="#F59E0B" />
              <span className="location-label">Zone:</span>
              <div className="zone-pills">
                {PARIS_ZONES.map((zone) => (
                  <button
                    key={zone.name}
                    className={`zone-pill-btn ${selectedZone.name === zone.name ? 'active' : ''}`}
                    onClick={() => handleZoneSelect(zone)}
                  >
                    {zone.name}
                  </button>
                ))}
              </div>
            </div>
            <button 
              className="btn btn-outline btn-sm"
              onClick={handleUseMyLocation}
              disabled={locating}
            >
              <Navigation size={14} />
              {locating ? 'Locating...' : 'Use GPS'}
            </button>
          </div>

          {/* Active Claim Spotlight (If present) */}
          {activeClaim && (
            <div className="active-claim-banner glass-panel">
              <div className="active-claim-header">
                <div className="badge badge-rose pulse-pill">
                  <Hourglass size={14} /> Active Reservation in Progress
                </div>
                <div className="claim-timer-box">
                  <Clock size={16} color="#F43F5E" />
                  <span className="timer-text">Pickup Window: <strong>{timeRemaining}</strong></span>
                </div>
              </div>

              <div className="active-claim-body">
                <div className="qr-code-wrapper">
                  <QRCodeSVG 
                    value={activeClaim.qr_code_token} 
                    size={160} 
                    bgColor="#FFFFFF"
                    fgColor="#070B13"
                    level="H"
                    includeMargin={true}
                  />
                  <span className="qr-token-label">Show to Baker at Checkout</span>
                  <div className="qr-token-string">{activeClaim.qr_code_token}</div>
                </div>

                <div className="claim-details-col">
                  <h3 className="claim-bakery-name">{activeClaim.shop_name || 'Boulangerie Partner'}</h3>
                  <p className="claim-bakery-addr">
                    <MapPin size={14} color="#94A3B8" /> {activeClaim.shop_address || 'Paris'}
                  </p>
                  <div className="claim-item-highlight">
                    <span className="claim-item-name">{activeClaim.item_name || 'Surplus Meal'}</span>
                  </div>

                  <div className="claim-steps-list">
                    <div className="step-item">
                      <span className="step-number">1</span>
                      <span>Walk to the bakery before the 20-min countdown expires.</span>
                    </div>
                    <div className="step-item">
                      <span className="step-number">2</span>
                      <span>Show this challenge QR token to the bakery shopkeeper.</span>
                    </div>
                    <div className="step-item">
                      <span className="step-number">3</span>
                      <span>The shopkeeper validates the QR code on their screen to complete handover.</span>
                    </div>
                  </div>

                  <div className="claim-actions-row">
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        fetchNearbyPulses();
                        showToast('Feed refreshed from backend database.');
                      }}
                    >
                      <RefreshCw size={14} /> Refresh Radar
                    </button>
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setActiveClaim(null);
                        showToast('Reservation dismissed from view.');
                      }}
                    >
                      Dismiss View
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Surplus Feed List */}
          <div className="feed-header-row">
            <h3 className="feed-title">
              Available Bakery Surplus Nearby ({pulses.length})
            </h3>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={fetchNearbyPulses}
              disabled={loadingPulses}
            >
              <RefreshCw size={14} className={loadingPulses ? 'spin' : ''} />
              Refresh Radar
            </button>
          </div>

          {loadingPulses ? (
            <div className="loading-card glass-panel">
              <RefreshCw size={28} className="spin" color="#F59E0B" />
              <p>Querying PostgreSQL PostGIS database for boulangeries within 1,000m...</p>
            </div>
          ) : feedError ? (
            <div className="empty-feed-card glass-panel">
              <AlertCircle size={36} color="#EF4444" />
              <h4>Feed Error</h4>
              <p>{feedError}</p>
            </div>
          ) : pulses.length === 0 ? (
            <div className="empty-feed-card glass-panel">
              <Store size={40} color="#64748B" />
              <h4>No Surplus Pulses in this 1 km Area Right Now</h4>
              <p>Bakeries post surplus pulses in real-time between 16:30 and 20:00. Try switching to Le Marais or another zone!</p>
            </div>
          ) : (
            <div className="pulse-cards-list">
              {pulses.map((pulse) => (
                <div key={pulse.pulse_id} className="pulse-card glass-card">
                  <div className="pulse-card-top">
                    <div className="pulse-shop-info">
                      <h4 className="pulse-shop-name">{pulse.shop_name}</h4>
                      <p className="pulse-shop-address">
                        <MapPin size={13} color="#94A3B8" /> {pulse.shop_address}
                      </p>
                    </div>
                    <div className="pulse-badges">
                      <span className="badge badge-indigo">
                        {pulse.distance_meters !== undefined ? `${Math.round(pulse.distance_meters)}m away` : '<1 km'}
                      </span>
                      {pulse.priority_window_active && (
                        <span className="badge badge-amber" title="10-minute priority window active">
                          <Sparkles size={12} /> Priority Window
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pulse-item-content">
                    <h4 className="pulse-item-title">{pulse.item_name}</h4>
                    {pulse.description && (
                      <p className="pulse-item-desc">{pulse.description}</p>
                    )}
                  </div>

                  <div className="pulse-card-footer">
                    <div className="quantity-remaining-pill">
                      <span className="qty-number">{pulse.quantity_remaining}</span>
                      <span className="qty-label">baskets available</span>
                    </div>

                    <button 
                      className="btn btn-primary"
                      onClick={() => handleClaimPulse(pulse)}
                      disabled={claimLoading || pulse.quantity_remaining <= 0 || Boolean(activeClaim)}
                    >
                      <QrCode size={16} />
                      {activeClaim ? 'Active Claim in Progress' : 'Claim Free Meal'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: ID Verification & Information */}
        <div className="portal-side-column">
          {/* Student Verification Card */}
          <div className="verification-card glass-panel">
            <div className="verification-card-header">
              <ShieldCheck size={24} color="#10B981" />
              <div>
                <h4 className="side-card-title">Student Verification</h4>
                <p className="side-card-sub">Privacy-by-Design OCR Scan</p>
              </div>
            </div>

            <p className="verification-body-text">
              Upload your student card or university certificate. Our backend scans valid keywords (<strong>ETUDIANT</strong>, <strong>IZLY</strong>, <strong>current academic year</strong>) and immediately discards the image.
            </p>

            <div className="id-status-row">
              <span className="status-label">Status:</span>
              {user?.is_verified ? (
                <span className="badge badge-emerald">
                  <CheckCircle2 size={13} /> Verified Student
                </span>
              ) : (
                <span className="badge badge-amber">Pending Verification</span>
              )}
            </div>

            <label className="upload-dropzone">
              <Upload size={22} color="#F59E0B" />
              <span className="dropzone-text">
                {uploadingId ? 'Uploading to OCR Service...' : 'Click to Upload Student Card'}
              </span>
              <span className="dropzone-hint">PNG, JPG, or PDF (instant verification)</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleIdUpload}
                disabled={uploadingId}
                style={{ display: 'none' }}
              />
            </label>

            {verificationResult && (
              <div className="ocr-result-box">
                <FileCheck size={16} color="#10B981" />
                <div>
                  <div className="ocr-title">OCR Recognition Status</div>
                  <div className="ocr-keywords">
                    {verificationResult.message}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Legal & Safety Card */}
          <div className="safety-info-card glass-panel">
            <h4 className="side-card-title">French Food Law & Safety</h4>
            <div className="safety-points">
              <div className="safety-item">
                <CheckCircle2 size={14} color="#10B981" />
                <span>Compliant with <strong>Loi Garot</strong> against food waste.</span>
              </div>
              <div className="safety-item">
                <CheckCircle2 size={14} color="#10B981" />
                <span>Allergens and hygiene strictly meet <strong>EU Regulation 852/2004</strong>.</span>
              </div>
              <div className="safety-item">
                <CheckCircle2 size={14} color="#10B981" />
                <span>100% Free & Dignified for verified students.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
