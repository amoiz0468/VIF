import React from 'react';
import {
  Store,
  Send,
  Sparkles,
  MapPin,
  Bell,
  Clock,
  QrCode,
  History,
  Package,
  Edit3,
  Trash2,
  Lock,
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
  costPrice,
  setCostPrice,
  description,
  setDescription,
  postingPulse,
  onPostPulse,
  lastPostedPulse,
  bakeryHistory,
  onDeleteItem,
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
                  placeholder="e.g. Pain de Campagne / 10 Baguettes"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-2" style={{ alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ whiteSpace: 'nowrap' }}>
                    Quantity Available
                  </label>
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

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label
                    className="form-label"
                    style={{ whiteSpace: 'nowrap' }}
                    title="Used strictly for your Cerfa 60% tax deduction report. Students always see €0 (Free)."
                  >
                    🔒 Unit Cost (€ Tax Only)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    className="form-input font-mono"
                    placeholder="0.85"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div
                  className="toggle-donation-box"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span className="toggle-label" style={{ fontSize: '0.82rem' }}>
                    🎓 Student Price: <strong>Free (€0.00)</strong> · Bakery Tax Credit:{' '}
                    <strong style={{ color: '#059669' }}>
                      €{((parseFloat(costPrice) || 0) * (parseInt(quantity, 10) || 0) * 0.6).toFixed(2)}
                    </strong>
                  </span>
                  <span className="badge badge-emerald">60% Tax Write-off</span>
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
                  Visible right now on the Student Surplus Radar within 1,000m. Click &ldquo;Manage Items&rdquo; to edit details, update tax cost price, or delete.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onNavigatePage('/bakery/items')}
                >
                  <Package size={14} /> Manage &amp; Edit Items ({bakeryHistory?.pulses?.length || activePulses.length})
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNavigatePage('/bakery/validate')}
                >
                  <QrCode size={14} /> Validate Student QR
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: '#0F172A', fontSize: '0.96rem' }}>🥖 {p.item_name}</strong>
                      <span className="badge badge-emerald">
                        {p.quantity_remaining} / {p.quantity} left
                      </span>
                    </div>
                    {p.description && (
                      <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
                        {p.description}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: '#B45309',
                        fontWeight: 700,
                        marginTop: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Lock size={12} />
                      <span>
                        Tax Unit Cost: €{Number(p.cost_price ?? 0.85).toFixed(2)} · 60% Write-off: €
                        {Number(p.tax_deduction_value ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '8px',
                      borderTop: '1px solid #F1F5F9',
                    }}
                  >
                    <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                      <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      Expires:{' '}
                      {new Date(p.expires_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                        onClick={() => onNavigatePage('/bakery/items')}
                      >
                        <Edit3 size={12} /> Edit / Price
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.76rem', color: '#DC2626', borderColor: '#FCA5A5' }}
                        onClick={() => onDeleteItem(p.pulse_id, p.item_name)}
                        title="Delete this item"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
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
