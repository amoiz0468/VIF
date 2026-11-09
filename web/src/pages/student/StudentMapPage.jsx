import React from 'react';
import {
  MapPin,
  Navigation,
  QrCode,
  Compass,
  Clock,
  Store,
  RefreshCw,
} from 'lucide-react';
import SurplusRadarMap from '../../components/SurplusRadarMap';

export default function StudentMapPage({
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
  onRefreshPulses,
  activeClaim,
  claimLoading,
  onClaimPulse,
  selectedRouteTarget,
  setSelectedRouteTarget,
  routeInfo,
  setRouteInfo,
  onNavigatePage,
}) {
  return (
    <div className="student-page-wrapper">
      {/* Page Header */}
      <div
        className="glass-panel"
        style={{
          padding: '22px 24px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <div className="badge badge-indigo" style={{ marginBottom: '6px' }}>
            <Compass size={13} /> Live Street Map & Road Route Planner
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Exact Student & Boulangerie Locations Map
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '4px' }}>
            View your exact street position, explore database partner bakeries within 1 km, and calculate walking/cycling routes and travel times.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRefreshPulses}
            disabled={loadingPulses}
          >
            <RefreshCw size={14} className={loadingPulses ? 'spin' : ''} />
            Refresh DB Bakeries
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onNavigatePage('/student/radar')}
          >
            <Store size={14} />
            Back to Surplus Feed
          </button>
        </div>
      </div>

      {/* Location & Exact Street Search Bar */}
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
            <span className="location-label">Paris Zone:</span>
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
          <button
            className="btn btn-outline btn-sm"
            onClick={onUseMyLocation}
            disabled={locating}
          >
            <Navigation size={14} />
            {locating ? 'Locating...' : 'Use Live GPS'}
          </button>
        </div>

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
            style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1', maxWidth: '360px' }}
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

      {/* Main Interactive Map */}
      <SurplusRadarMap
        studentCoords={coords}
        studentAddress={studentAddress}
        pulses={pulses}
        selectedZoneName={selectedZone.name}
        onClaimPulse={onClaimPulse}
        onLocationChange={onMapLocationChange}
        activeClaim={activeClaim}
        selectedRouteTarget={selectedRouteTarget}
        onClearRouteTarget={() => setSelectedRouteTarget(null)}
        onRouteCalculated={setRouteInfo}
        claimLoading={claimLoading}
      />

      {/* Quick Route Selector Cards Below Map */}
      <div className="glass-panel" style={{ padding: '20px', marginTop: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px' }}>
          Select a Nearby Database Boulangerie to Preview Street Route & Travel Time ({pulses.length})
        </h3>

        {pulses.length === 0 ? (
          <p style={{ color: '#64748B', fontSize: '0.86rem', margin: 0 }}>
            No database bakeries within 1 km of this pin. Switch zones above or drag your blue student pin on the map.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '12px',
            }}
          >
            {pulses.map((pulse) => {
              const isSelected =
                (selectedRouteTarget && selectedRouteTarget.pulse_id === pulse.pulse_id) ||
                (activeClaim && activeClaim.pulse_id === pulse.pulse_id);

              return (
                <div
                  key={pulse.pulse_id}
                  className="glass-card"
                  style={{
                    padding: '14px 16px',
                    border: isSelected ? '2px solid #059669' : '1px solid #E2E8F0',
                    background: isSelected ? '#ECFDF5' : '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#0F172A' }}>🥖 {pulse.shop_name}</strong>
                      <span className="badge badge-emerald">
                        🚶 ~{Math.max(1, Math.round((pulse.distance_meters || 300) / 80))} min
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '3px' }}>
                      📍 {pulse.shop_address} ({Math.round(pulse.distance_meters || 0)}m)
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#D97706', marginTop: '6px' }}>
                      {pulse.item_name} ({pulse.quantity_remaining} left)
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1 }}
                      onClick={() => setSelectedRouteTarget(pulse)}
                    >
                      <Navigation size={13} />
                      {isSelected ? 'Showing Route' : 'Show Road Route'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={claimLoading || pulse.quantity_remaining <= 0 || Boolean(activeClaim)}
                      onClick={() => onClaimPulse(pulse)}
                    >
                      <QrCode size={13} />
                      Claim
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
