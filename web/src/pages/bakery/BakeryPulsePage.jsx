import React from 'react';
import {
  Store,
  Send,
  Sparkles,
  MapPin,
  Bell,
  Clock,
  CheckCircle2,
  QrCode,
  History,
} from 'lucide-react';

export default function BakeryPulsePage({
  user,
  shopAddress,
  presets,
  onApplyPreset,
  itemName,
  setItemName,
  quantity,
  setQuantity,
  description,
  setDescription,
  postingPulse,
  onPostPulse,
  lastPostedPulse,
  bakeryHistory,
  onNavigatePage,
}) {
  const activePulses = (bakeryHistory?.pulses || []).filter((p) => p.is_active);

  return (
    <div className="bakery-page-wrapper">
      {/* Bakery Header Banner */}
      <div className="bakery-header glass-panel">
        <div className="bakery-header-left">
          <div className="badge badge-amber">
            <Store size={14} /> Artisan Bakery Portal
          </div>
          <h2 className="portal-title">{user?.shop_name || 'Boulangerie du Marais'}</h2>
          <p className="portal-desc">
            <MapPin size={14} color="#94A3B8" /> {shopAddress} · SIRET:{' '}
            <code>{user?.siret || '80321458700018'}</code>
          </p>
        </div>

        {/* Tax Metric Highlights */}
        <div className="tax-summary-cards">
          <div className="tax-metric-card glass-card">
            <div className="tax-metric-label">Legal Deduction</div>
            <div className="tax-metric-value text-emerald">60%</div>
            <span className="tax-metric-sub">Article 238 bis CGI</span>
          </div>

          <div className="tax-metric-card glass-card">
            <div className="tax-metric-label">Report Format</div>
            <div className="tax-metric-value">Cerfa</div>
            <span className="tax-metric-sub">n° 11580*05</span>
          </div>
        </div>
      </div>

      {/* 1-Click Surplus Pulse Composer */}
      <div className="tab-pane-content">
        <div className="pulse-composer-grid">
          {/* Quick 1-Click Presets */}
          <div className="glass-panel presets-panel">
            <h3 className="section-title">
              <Sparkles size={18} color="#F59E0B" /> 1-Click French Bakery Presets
            </h3>
            <p className="section-sub">
              No typing required before closing. Click a preset to instantly stage and broadcast to
              nearby students.
            </p>

            <div className="presets-list">
              {presets.map((preset) => (
                <div
                  key={preset.name}
                  className="preset-card glass-card"
                  onClick={() => onApplyPreset(preset)}
                >
                  <span className="preset-emoji">{preset.icon}</span>
                  <div className="preset-info">
                    <div className="preset-name">{preset.name}</div>
                    <div className="preset-desc">{preset.desc}</div>
                    <div className="preset-meta">
                      <span className="badge badge-amber">{preset.qty} packs</span>
                      <span className="preset-cost">
                        Base cost: €{preset.cost.toFixed(2)}/unit
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Surplus Broadcast Form */}
          <div className="glass-panel composer-panel">
            <h3 className="section-title">Broadcast Surplus Pulse</h3>
            <p className="section-sub">
              Students within 1 km receive a push alert immediately.
            </p>

            <form onSubmit={onPostPulse}>
              <div className="form-group">
                <label className="form-label">Item / Package Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 10 Baguettes Traditionnelles"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Quantity Available</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="form-input"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Donation Type</label>
                  <div className="toggle-donation-box">
                    <span className="toggle-label">Free Student Meal</span>
                    <span className="badge badge-emerald">60% Tax Write-off</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description / Storage Notes (Optional)</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="e.g. Baked at 16:30. Fresh and crispy, ideal for dinner."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                disabled={postingPulse}
              >
                <Send size={18} />
                {postingPulse
                  ? 'Broadcasting to Backend Database...'
                  : 'Post Surplus Pulse in 1 Tap'}
              </button>
            </form>

            {lastPostedPulse && (
              <div className="last-pulse-alert glass-card">
                <Bell size={20} color="#10B981" />
                <div>
                  <div className="pulse-alert-title">Pulse Live in PostgreSQL Database!</div>
                  <div className="pulse-alert-text">
                    Broadcasted{' '}
                    <strong>
                      {lastPostedPulse.quantity}x {lastPostedPulse.item_name}
                    </strong>{' '}
                    to verified students nearby.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Pulses Currently Live for This Bakery */}
        {activePulses.length > 0 && (
          <div className="glass-panel" style={{ padding: '22px', marginTop: '22px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '14px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Live Surplus Pulses Currently Active at Your Bakery ({activePulses.length})
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '2px' }}>
                  Visible right now on the Student Surplus Radar within 1,000m.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNavigatePage('/bakery/validate')}
                >
                  <QrCode size={14} /> Validate Student QR
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => onNavigatePage('/bakery/history')}
                >
                  <History size={14} /> View Full History
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '12px',
              }}
            >
              {activePulses.map((p) => (
                <div
                  key={p.pulse_id}
                  className="glass-card"
                  style={{
                    padding: '14px 16px',
                    borderLeft: '4px solid #10B981',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: '#0F172A', fontSize: '0.94rem' }}>{p.item_name}</strong>
                    <span className="badge badge-emerald">
                      {p.quantity_remaining} / {p.quantity} left
                    </span>
                  </div>
                  {p.description && (
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{p.description}</div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px' }}>
                    <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    Expires: {new Date(p.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
