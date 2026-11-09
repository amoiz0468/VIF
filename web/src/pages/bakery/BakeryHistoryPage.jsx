import React, { useState } from 'react';
import {
  History,
  RefreshCw,
  Edit3,
  Store,
  CheckCircle2,
  Hourglass,
  AlertCircle,
  Send,
  FileText,
  QrCode,
} from 'lucide-react';

export default function BakeryHistoryPage({
  user,
  shopAddress,
  bakeryHistory,
  loadingHistory,
  onRefreshHistory,
  onQuickValidateToken,
  onNavigatePage,
}) {
  const [claimFilter, setClaimFilter] = useState('all');

  return (
    <div
      className="bakery-page-wrapper"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}
    >
      {/* Bakery Complete Dossier & KPIs */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '18px',
          }}
        >
          <div>
            <div className="badge badge-amber" style={{ marginBottom: '6px' }}>
              <History size={13} /> Bakery Ledger &amp; Donation History
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {bakeryHistory?.shop_name || user?.shop_name || 'Boulangerie Partner'} — Complete Activity History
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '4px' }}>
              All surplus pulses broadcasted, student reservations, QR handshakes, and tax deduction metrics recorded in PostgreSQL.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onRefreshHistory}
              disabled={loadingHistory}
            >
              <RefreshCw size={14} className={loadingHistory ? 'spin' : ''} />
              Refresh Ledger
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigatePage('/bakery/profile')}
            >
              <Edit3 size={14} />
              Edit Store &amp; Cost Matrix
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))',
            gap: '12px',
            marginBottom: '22px',
          }}
        >
          <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid #F59E0B' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Pulses Posted
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
              {bakeryHistory?.total_pulses ?? 0}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#D97706', marginTop: '2px' }}>
              {bakeryHistory?.active_pulses_count ?? 0} currently active
            </div>
          </div>

          <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid #6366F1' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Student Claims
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
              {bakeryHistory?.total_claims ?? 0}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#6366F1', marginTop: '2px' }}>
              All-time reservations
            </div>
          </div>

          <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid #10B981' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
              Collected Handshakes
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#065F46', marginTop: '4px' }}>
              {bakeryHistory?.collected_claims_count ?? 0}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#10B981', marginTop: '2px' }}>
              Verified via QR token
            </div>
          </div>

          <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid #0EA5E9' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
              Pending Pickups
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0369A1', marginTop: '4px' }}>
              {bakeryHistory?.pending_claims_count ?? 0}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#0284C7', marginTop: '2px' }}>
              Students en route
            </div>
          </div>

          <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid #EF4444' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
              Ghosted / Expired
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#991B1B', marginTop: '4px' }}>
              {bakeryHistory?.ghosted_claims_count ?? 0}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#EF4444', marginTop: '2px' }}>
              Auto-restocked to feed
            </div>
          </div>

          <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid #8B5CF6' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
              Est. 60% Tax Credit
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#5B21B6', marginTop: '4px' }}>
              €{(bakeryHistory?.estimated_tax_credit_eur ?? 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#7C3AED', marginTop: '2px' }}>
              Article 238 bis CGI
            </div>
          </div>
        </div>

        {/* Registered Bakery Dossier */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '18px',
          }}
        >
          <h4
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#0F172A',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Store size={18} color="#D97706" />
            Registered Artisan Boulangerie Information
          </h4>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '14px',
              fontSize: '0.86rem',
            }}
          >
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Bakery Name</span>
              <strong style={{ color: '#0F172A' }}>{bakeryHistory?.shop_name || user?.shop_name}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>INSEE SIRET (14 Digits)</span>
              <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>
                {bakeryHistory?.siret || user?.siret}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Shopkeeper Email</span>
              <strong style={{ color: '#0F172A' }}>{bakeryHistory?.email || user?.email}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Paris Street Address</span>
              <strong style={{ color: '#0F172A' }}>{bakeryHistory?.shop_address || shopAddress}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>PostGIS Coordinates</span>
              <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>
                {bakeryHistory?.latitude && bakeryHistory?.longitude
                  ? `${bakeryHistory.latitude.toFixed(5)}°N, ${bakeryHistory.longitude.toFixed(5)}°E`
                  : '48.85750°N, 2.35980°E'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Phone / Contact</span>
              <strong style={{ color: '#0F172A' }}>{bakeryHistory?.phone || user?.phone || 'Not set'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Student Claims & Pickup Log */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '18px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Student Reservations &amp; QR Handshake Log ({bakeryHistory?.claims?.length ?? 0})
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#64748B', marginTop: '2px' }}>
              All student claims placed on your bakery’s surplus pulses.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: `All (${bakeryHistory?.total_claims ?? 0})` },
              { key: 'pending', label: `Pending (${bakeryHistory?.pending_claims_count ?? 0})` },
              { key: 'collected', label: `Collected (${bakeryHistory?.collected_claims_count ?? 0})` },
              { key: 'ghosted', label: `Ghosted (${bakeryHistory?.ghosted_claims_count ?? 0})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`zone-pill-btn ${claimFilter === tab.key ? 'active' : ''}`}
                onClick={() => setClaimFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loadingHistory ? (
          <div className="loading-card" style={{ padding: '32px', textAlign: 'center' }}>
            <RefreshCw size={26} className="spin" color="#F59E0B" />
            <p style={{ marginTop: '10px', color: '#64748B' }}>
              Loading bakery claims and pulses from PostgreSQL...
            </p>
          </div>
        ) : !bakeryHistory?.claims || bakeryHistory.claims.length === 0 ? (
          <div className="empty-feed-card" style={{ padding: '32px', textAlign: 'center' }}>
            <Store size={36} color="#94A3B8" />
            <h4 style={{ marginTop: '10px', color: '#0F172A' }}>No Student Claims Yet</h4>
            <p style={{ color: '#64748B', maxWidth: '460px', margin: '6px auto 16px' }}>
              Broadcast a surplus pulse to alert verified students within 1 km of your bakery.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigatePage('/bakery/pulse')}
            >
              <Send size={14} /> Broadcast Surplus Pulse
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bakeryHistory.claims
              .filter((c) => (claimFilter === 'all' ? true : c.status === claimFilter))
              .map((claim) => {
                const isCollected = claim.status === 'collected';
                const isGhosted = claim.status === 'ghosted';
                const isPending = claim.status === 'pending';

                return (
                  <div
                    key={claim.claim_id}
                    className="glass-card"
                    style={{
                      padding: '16px 20px',
                      borderLeft: `4px solid ${isCollected ? '#10B981' : isGhosted ? '#EF4444' : '#F59E0B'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
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
                      <div>
                        <strong style={{ fontSize: '1.02rem', color: '#0F172A' }}>
                          🥖 {claim.item_name} (Qty: {claim.quantity})
                        </strong>
                        <div style={{ fontSize: '0.83rem', color: '#475569', marginTop: '3px' }}>
                          🎓 Student: <strong>{claim.student_name || claim.student_email}</strong> (
                          {claim.student_email})
                          {claim.student_university ? ` · ${claim.student_university}` : ''}
                        </div>
                      </div>

                      <div>
                        {isCollected && (
                          <span className="badge badge-emerald">
                            <CheckCircle2 size={13} /> Collected
                          </span>
                        )}
                        {isPending && (
                          <span className="badge badge-amber">
                            <Hourglass size={13} /> Pending Pickup
                          </span>
                        )}
                        {isGhosted && (
                          <span className="badge badge-rose">
                            <AlertCircle size={13} /> Ghosted
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                        fontSize: '0.79rem',
                        color: '#64748B',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <span>
                          🔑 <strong>Token:</strong> <code>{claim.qr_code_token}</code>
                        </span>
                        <span>
                          📅 <strong>Claimed:</strong> {new Date(claim.claimed_at).toLocaleString()}
                        </span>
                        {claim.collected_at && (
                          <span style={{ color: '#059669', fontWeight: 600 }}>
                            ✓ Collected: {new Date(claim.collected_at).toLocaleString()}
                          </span>
                        )}
                        {claim.ghosted_at && (
                          <span style={{ color: '#DC2626', fontWeight: 600 }}>
                            ✕ Ghosted: {new Date(claim.ghosted_at).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {isPending && (
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => onQuickValidateToken(claim.qr_code_token)}
                        >
                          <QrCode size={13} /> Validate Pickup Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Broadcasted Pulses History */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Broadcasted Surplus Pulses Log ({bakeryHistory?.pulses?.length ?? 0})
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#64748B', marginTop: '2px' }}>
              All surplus food packages posted by your bakery.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onNavigatePage('/bakery/tax')}
          >
            <FileText size={14} /> Generate Cerfa Tax PDF
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
          }}
        >
          {(bakeryHistory?.pulses || []).map((pulse) => (
            <div
              key={pulse.pulse_id}
              className="glass-card"
              style={{
                padding: '14px 16px',
                borderLeft: `4px solid ${pulse.is_active ? '#10B981' : '#94A3B8'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <strong style={{ fontSize: '0.94rem', color: '#0F172A' }}>{pulse.item_name}</strong>
                <span className={`badge ${pulse.is_active ? 'badge-emerald' : 'badge-indigo'}`}>
                  {pulse.is_active ? `${pulse.quantity_remaining}/${pulse.quantity} Active` : 'Completed'}
                </span>
              </div>
              {pulse.description && (
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
                  {pulse.description}
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '6px' }}>
                Posted: {new Date(pulse.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
