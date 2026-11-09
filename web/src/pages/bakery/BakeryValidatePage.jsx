import React from 'react';
import {
  QrCode,
  CheckCircle2,
  Hourglass,
  RefreshCw,
  Send,
  History,
  User as UserIcon,
} from 'lucide-react';

export default function BakeryValidatePage({
  qrTokenInput,
  setQrTokenInput,
  validating,
  validatedClaim,
  onValidateClaim,
  onQuickValidateToken,
  bakeryHistory,
  loadingHistory,
  onRefreshHistory,
  onNavigatePage,
}) {
  const pendingClaims = (bakeryHistory?.claims || []).filter((c) => c.status === 'pending');

  return (
    <div className="bakery-page-wrapper">
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
          <div className="badge badge-amber" style={{ marginBottom: '6px' }}>
            <QrCode size={13} /> Student Pickup Verification
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Validate QR Claim Handshake
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '4px' }}>
            Verify the student’s QR challenge token to complete meal handover, protect student karma, and log the donation to your Cerfa tax ledger.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRefreshHistory}
            disabled={loadingHistory}
          >
            <RefreshCw size={14} className={loadingHistory ? 'spin' : ''} />
            Refresh Pending Queue
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onNavigatePage('/bakery/pulse')}
          >
            <Send size={14} />
            Broadcast New Pulse
          </button>
        </div>
      </div>

      <div className="tab-pane-content">
        <div className="glass-panel validate-panel" style={{ marginBottom: '22px' }}>
          <div className="validate-header">
            <QrCode size={32} color="#F59E0B" />
            <div>
              <h3 className="section-title">QR Code Challenge Handshake</h3>
              <p className="section-sub">
                Scan the student’s phone screen or enter their QR challenge token to complete handover.
              </p>
            </div>
          </div>

          <form onSubmit={onValidateClaim} className="validate-form">
            <div className="form-group">
              <label className="form-label">Student Claim Token (UUID)</label>
              <div className="input-with-action">
                <input
                  type="text"
                  className="form-input token-input font-mono"
                  placeholder="Enter QR token presented by student"
                  value={qrTokenInput}
                  onChange={(e) => setQrTokenInput(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-success" disabled={validating}>
                  <CheckCircle2 size={16} />
                  {validating ? 'Verifying with Backend...' : 'Validate Handshake'}
                </button>
              </div>
            </div>
          </form>

          {validatedClaim && (
            <div className="validated-success-card glass-card">
              <div className="success-icon-col">
                <CheckCircle2 size={36} color="#10B981" />
              </div>
              <div className="success-details-col">
                <h4 className="success-heading">Collection Confirmed by Backend!</h4>
                <p className="success-desc">
                  {validatedClaim.message || 'Claim collected successfully!'}
                </p>
                <div className="success-badges-row">
                  <span className="badge badge-emerald">Status: COLLECTED</span>
                  <span className="badge badge-amber">+1 Meal Added to Cerfa Ledger</span>
                  <span className="badge badge-indigo">Student Karma Protected</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Pending Reservations Queue for This Bakery */}
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
                Pending Student Pickups at Your Bakery ({pendingClaims.length})
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#64748B', marginTop: '2px' }}>
                Students who have reserved a basket and are currently walking to your bakery within their 20-minute window.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onNavigatePage('/bakery/history')}
            >
              <History size={14} /> View All Claims History
            </button>
          </div>

          {pendingClaims.length === 0 ? (
            <div
              style={{
                padding: '28px',
                textAlign: 'center',
                background: '#F8FAFC',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                color: '#64748B',
              }}
            >
              <Hourglass size={28} color="#94A3B8" style={{ marginBottom: '8px' }} />
              <div style={{ fontWeight: 700, color: '#0F172A' }}>No Pending Pickups Right Now</div>
              <div style={{ fontSize: '0.83rem', marginTop: '4px' }}>
                When a student reserves a meal from your bakery, their claim and QR token will appear here for 1-click verification.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingClaims.map((claim) => (
                <div
                  key={claim.claim_id}
                  className="glass-card"
                  style={{
                    padding: '16px 18px',
                    borderLeft: '4px solid #F59E0B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.98rem', color: '#0F172A' }}>
                        🥖 {claim.item_name} (Qty: {claim.quantity})
                      </strong>
                      <span className="badge badge-amber">
                        <Hourglass size={12} /> Awaiting Pickup
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px' }}>
                      <UserIcon size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      Student: <strong>{claim.student_name || claim.student_email}</strong>
                      {claim.student_university ? ` · ${claim.student_university}` : ''}
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        fontFamily: 'monospace',
                        color: '#64748B',
                        marginTop: '4px',
                      }}
                    >
                      QR Token: <strong>{claim.qr_code_token}</strong> · Deadline:{' '}
                      {new Date(claim.claim_deadline).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setQrTokenInput(claim.qr_code_token)}
                    >
                      Fill Token
                    </button>
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      disabled={validating}
                      onClick={() => onQuickValidateToken(claim.qr_code_token)}
                    >
                      <CheckCircle2 size={14} />
                      Validate Pickup Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
