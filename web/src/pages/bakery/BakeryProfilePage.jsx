import React from 'react';
import {
  User as UserIcon,
  Store,
  MapPin,
  Save,
  Phone,
  Mail,
  Edit3,
  CheckCircle2,
  Navigation,
  History,
  Lock,
} from 'lucide-react';

export default function BakeryProfilePage({
  user,
  ownerName,
  setOwnerName,
  ownerEmail,
  setOwnerEmail,
  shopName,
  setShopName,
  shopAddress,
  setShopAddress,
  shopPhone,
  setShopPhone,
  shopBio,
  setShopBio,
  lat,
  setLat,
  lng,
  setLng,
  newPassword,
  setNewPassword,
  costBaguettes,
  setCostBaguettes,
  costCroissants,
  setCostCroissants,
  costSandwiches,
  setCostSandwiches,
  costPatisseries,
  setCostPatisseries,
  savingSettings,
  onSaveSettings,
  onGeocodeAddress,
  onNavigatePage,
}) {
  return (
    <div className="bakery-page-wrapper">
      <div className="portal-grid" style={{ marginBottom: '28px' }}>
        <div className="portal-main-column">
          <div className="glass-panel" style={{ padding: '26px' }}>
            <div style={{ marginBottom: '20px' }}>
              <div className="badge badge-amber" style={{ marginBottom: '6px' }}>
                <Edit3 size={13} /> Dedicated Bakery Profile Page
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Edit Bakery Profile, Location &amp; Tax Cost Matrix
              </h2>
              <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '4px' }}>
                Update your bakery name, manager contact details, Paris street address, GPS coordinates, and base unit costs for Cerfa tax deductions.
              </p>
            </div>

            <form
              onSubmit={onSaveSettings}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label
                    className="form-label"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Store size={14} color="#D97706" /> Bakery Commercial Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Boulangerie Thierry Marx"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label
                    className="form-label"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <UserIcon size={14} color="#D97706" /> Baker / Manager Full Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Chef Thierry Marx"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label
                    className="form-label"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Mail size={14} color="#D97706" /> Bakery Account Email
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="bakery@vif-bakery.fr"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label
                    className="form-label"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Phone size={14} color="#D97706" /> Bakery Phone Number
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. +33 1 42 78 12 34"
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label
                  className="form-label"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <MapPin size={14} color="#D97706" /> Bakery Street Address in Paris
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: 1, minWidth: '220px' }}
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={onGeocodeAddress}
                  >
                    <Navigation size={14} /> Auto-Detect GPS Coordinates
                  </button>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Latitude (WGS84)</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Longitude (WGS84)</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Bakery Bio / Pickup Instructions for Students</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="e.g. Ask at the left counter before 19:30 closing. Bring your own tote bag!"
                  value={shopBio}
                  onChange={(e) => setShopBio(e.target.value)}
                />
              </div>

              {/* Editable Unit Cost Prices Matrix */}
              <div className="cost-matrix-table-card glass-card" style={{ padding: '18px', marginBottom: 0 }}>
                <h4 className="cost-matrix-title" style={{ marginBottom: '12px' }}>
                  🔒 Default Unit Production Cost Prices (Bakery Only · For Cerfa 60% Write-Off)
                </h4>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    alignItems: 'end',
                  }}
                >
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">🥖 Baguette (€ / unit)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      className="form-input font-mono"
                      value={costBaguettes}
                      onChange={(e) => setCostBaguettes(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">🥐 Croissant (€ / unit)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      className="form-input font-mono"
                      value={costCroissants}
                      onChange={(e) => setCostCroissants(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">🥪 Sandwich (€ / unit)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      className="form-input font-mono"
                      value={costSandwiches}
                      onChange={(e) => setCostSandwiches(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">🍰 Pâtisserie (€ / unit)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      className="form-input font-mono"
                      value={costPatisseries}
                      onChange={(e) => setCostPatisseries(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ paddingTop: '8px', borderTop: '1px solid #F1F5F9', marginBottom: 0 }}>
                <label
                  className="form-label"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Lock size={14} color="#D97706" /> Change Bakery Account Password (Optional)
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Leave blank to keep current password (min. 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onNavigatePage('/bakery/history')}
                >
                  <History size={16} /> View Bakery History
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingSettings}>
                  <Save size={16} />
                  {savingSettings
                    ? 'Saving Profile...'
                    : 'Save Bakery Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Live Bakery Profile Summary Card */}
        <div className="portal-side-column">
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.35rem',
                  flexShrink: 0,
                }}
              >
                🥖
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                  {shopName || user?.shop_name}
                </h4>
                <span className="badge badge-emerald" style={{ marginTop: '4px' }}>
                  <CheckCircle2 size={12} /> INSEE Verified Artisan
                </span>
              </div>
            </div>

            <div
              style={{
                fontSize: '0.83rem',
                color: '#334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '14px',
                background: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div>
                <strong>Manager:</strong> {ownerName || user?.full_name || 'Artisan Baker'}
              </div>
              <div>
                <strong>SIRET:</strong> <code>{user?.siret}</code>
              </div>
              <div>
                <strong>Address:</strong> {shopAddress}
              </div>
              <div>
                <strong>Coordinates:</strong> {lat}°N, {lng}°E
              </div>
              <div>
                <strong>Phone:</strong> {shopPhone || 'Not set'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
