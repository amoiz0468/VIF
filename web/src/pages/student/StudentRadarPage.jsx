import React from 'react';
import {
  MapPin,
  Clock,
  Sparkles,
  Flame,
  AlertCircle,
  CheckCircle2,
  QrCode,
  RefreshCw,
  Navigation,
  Hourglass,
  Store,
  ShieldCheck,
  History,
  User as UserIcon,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function StudentRadarPage({
  user,
  zones,
  selectedZone,
  coords,
  studentAddress,
  addressQuery,
  setAddressQuery,
  searchingAddress,
  locating,
  onZoneSelect,
  onUseMyLocation,
  onMapLocationChange,
  onAddressSearch,
  pulses,
  loadingPulses,
  feedError,
  onRefreshPulses,
  activeClaim,
  setActiveClaim,
  timeRemaining,
  claimLoading,
  onClaimPulse,
  selectedRouteTarget,
  setSelectedRouteTarget,
  routeInfo,
  setRouteInfo,
  onNavigatePage,
  showToast,
}) {
  return (
    <div className="student-page-wrapper">
      {/* Hero Sub-header */}
      <div className="portal-header glass-panel">
        <div className="portal-header-content">
          <div className="badge badge-emerald">
            <span className="live-indicator"></span> Live Surplus Radar (&lt;1000m)
          </div>
          <h2 className="portal-title">Real-Time Bakery Meals for Students</h2>
          <p className="portal-desc">
            Boulangeries in Paris post their surplus before closing. Claim a meal in one click,
            follow the street route on the map, and show your QR code within 20 minutes.
          </p>
        </div>

        {/* Karma Score Card */}
        <div className="karma-stat-card glass-card">
          <div className="karma-header-row">
            <span className="karma-card-title">Reliability Karma</span>
            <Flame size={18} color="#F59E0B" />
          </div>
          <div className="karma-score-number">
            {user?.karma_score ?? 50}
            <span>/100</span>
          </div>
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

      {/* Location Selector & Exact Address Bar */}
      <div
        className="location-toolbar glass-panel"
        style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px', marginBottom: '20px' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div className="location-toolbar-left">
            <MapPin size={18} color="#F59E0B" />
            <span className="location-label">Zone:</span>
            <div className="zone-pills">
              {zones.map((zone) => (
                <button
                  key={zone.name}
                  className={`zone-pill-btn ${selectedZone.name === zone.name ? 'active' : ''}`}
                  onClick={() => onZoneSelect(zone)}
                >
                  {zone.name}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={onUseMyLocation}
              disabled={locating}
            >
              <Navigation size={14} />
              {locating ? 'Locating...' : 'Use Live GPS'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigatePage('/student/map')}
            >
              <MapPin size={14} />
              Open Full Map Page
            </button>
          </div>
        </div>

        {/* Exact Street Address Display & Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            paddingTop: '10px',
            borderTop: '1px solid #F1F5F9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', color: '#0F172A' }}>
            <span className="badge badge-indigo" style={{ padding: '3px 8px' }}>
              🎓 Exact Student Location
            </span>
            <strong>{studentAddress}</strong>
            <span style={{ color: '#64748B', fontSize: '0.76rem' }}>
              ({coords.lat.toFixed(5)}°N, {coords.lng.toFixed(5)}°E)
            </span>
          </div>

          <form
            onSubmit={onAddressSearch}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1', maxWidth: '340px' }}
          >
            <input
              type="text"
              className="form-input"
              placeholder="Enter exact street (e.g. 40 rue du Dr Roux, Paris)..."
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={searchingAddress}
              style={{ height: '32px', padding: '0 12px', whiteSpace: 'nowrap' }}
            >
              {searchingAddress ? '...' : 'Set Address'}
            </button>
          </form>
        </div>
      </div>

      {/* Active Claim Spotlight (If present) */}
      {activeClaim && (
        <div className="active-claim-banner glass-panel" style={{ marginBottom: '22px' }}>
          <div className="active-claim-header">
            <div className="badge badge-rose pulse-pill">
              <Hourglass size={14} /> Active Reservation in Progress
            </div>
            <div className="claim-timer-box">
              <Clock size={16} color="#F43F5E" />
              <span className="timer-text">
                Pickup Window: <strong>{timeRemaining}</strong>
              </span>
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
              {routeInfo && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '12px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#065F46',
                  }}
                >
                  <span>🚶 {routeInfo.walkMinutes} min walk</span>
                  <span>·</span>
                  <span>🚲 {routeInfo.bikeMinutes} min bike</span>
                  <span>·</span>
                  <span>📏 {routeInfo.distanceMeters}m via road (see green route on map)</span>
                </div>
              )}
              <div className="claim-item-highlight">
                <span className="claim-item-name">{activeClaim.item_name || 'Surplus Meal'}</span>
              </div>

              <div className="claim-steps-list">
                <div className="step-item">
                  <span className="step-number">1</span>
                  <span>Follow the green road route on the map before the 20-min timer expires.</span>
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
                  className="btn btn-primary btn-sm"
                  onClick={() => onNavigatePage('/student/map')}
                >
                  <Navigation size={14} /> Open Full Road Map & Directions
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    onRefreshPulses();
                    showToast('Feed refreshed from backend database.');
                  }}
                >
                  <RefreshCw size={14} /> Refresh Radar
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setActiveClaim(null);
                    setSelectedRouteTarget(null);
                    setRouteInfo(null);
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
      <div className="feed-header-row" style={{ marginTop: '10px' }}>
        <h3 className="feed-title">Available Bakery Surplus Nearby ({pulses.length})</h3>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onRefreshPulses}
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
          <p>
            Bakeries post surplus pulses in real-time between 16:30 and 20:00. Try switching to Le
            Marais or another zone!
          </p>
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
                    {pulse.distance_meters !== undefined
                      ? `${Math.round(pulse.distance_meters)}m away`
                      : '<1 km'}
                  </span>
                  <span
                    className="badge badge-emerald"
                    title="Estimated walking time from your location"
                  >
                    🚶 ~{Math.max(1, Math.round((pulse.distance_meters || 300) / 80))} min walk
                  </span>
                  {pulse.priority_window_active && (
                    <span
                      className="badge badge-amber"
                      title="10-minute priority window active"
                    >
                      <Sparkles size={12} /> Priority Window
                    </span>
                  )}
                </div>
              </div>

              <div className="pulse-item-content">
                <h4 className="pulse-item-title">{pulse.item_name}</h4>
                {pulse.description && <p className="pulse-item-desc">{pulse.description}</p>}
              </div>

              <div className="pulse-card-footer">
                <div className="quantity-remaining-pill">
                  <span className="qty-number">{pulse.quantity_remaining}</span>
                  <span className="qty-label">baskets available</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSelectedRouteTarget(pulse);
                      onNavigatePage('/student/map');
                    }}
                    title="Open dedicated Map Page with street road route and travel time"
                  >
                    <Navigation size={14} />
                    Route on Map
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => onClaimPulse(pulse)}
                    disabled={
                      claimLoading || pulse.quantity_remaining <= 0 || Boolean(activeClaim)
                    }
                  >
                    <QrCode size={16} />
                    {activeClaim ? 'Active Claim in Progress' : 'Claim Free Meal'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

