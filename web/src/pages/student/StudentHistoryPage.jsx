import React, { useState } from 'react';
import {
  History,
  RefreshCw,
  Edit3,
  GraduationCap,
  Store,
  Compass,
  MapPin,
  CheckCircle2,
  Hourglass,
  AlertCircle,
  Navigation,
  QrCode,
} from 'lucide-react';

export default function StudentHistoryPage({
  user,
  studentAddress,
  historyData,
  loadingHistory,
  onRefreshHistory,
  onNavigatePage,
  setSelectedRouteTarget,
  setActiveClaim,
  showToast,
}) {
  const [historyFilter, setHistoryFilter] = useState('all');

  return (
    <div className="student-page-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
      {/* Student Complete Dossier & Verification Summary */}
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
            <div className="badge badge-indigo" style={{ marginBottom: '6px' }}>
              <History size={13} /> Complete Student Dossier &amp; Activity Log
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Student Details &amp; Meal Claim History
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '4px' }}>
              All recorded details, student card validity dates, reliability karma, and meal reservations linked to your account.
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
              Refresh History
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigatePage('/student/profile')}
            >
              <Edit3 size={14} />
              Edit Student Profile
            </button>
          </div>
        </div>

        {/* Impact & Karma KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))',
            gap: '12px',
            marginBottom: '22px',
          }}
        >
          <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid #6366F1' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Reservations
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
              {historyData?.total_claims ?? 0}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#6366F1', marginTop: '2px' }}>All-time claimed baskets</div>
          </div>

          <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid #10B981' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
              Meals Collected
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#065F46', marginTop: '4px' }}>
              {historyData?.collected_count ?? 0}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#10B981', marginTop: '2px' }}>Picked up on time (+5 Karma)</div>
          </div>

          <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid #F59E0B' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
              Active / Pending
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#B45309', marginTop: '4px' }}>
              {historyData?.pending_count ?? 0}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#D97706', marginTop: '2px' }}>Awaiting bakery QR scan</div>
          </div>

          <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid #EF4444' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
              Ghosted / Missed
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#991B1B', marginTop: '4px' }}>
              {historyData?.ghosted_count ?? 0}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#EF4444', marginTop: '2px' }}>Expired reservations (-10 Karma)</div>
          </div>

          <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid #0EA5E9' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
              Food Waste Saved
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0369A1', marginTop: '4px' }}>
              {historyData?.estimated_food_saved_kg ?? 0} <span style={{ fontSize: '0.95rem' }}>kg</span>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#0284C7', marginTop: '2px' }}>Loi Garot ecological impact</div>
          </div>

          <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid #8B5CF6' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
              Student Savings
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#5B21B6', marginTop: '4px' }}>
              €{(historyData?.estimated_money_saved_eur ?? 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#7C3AED', marginTop: '2px' }}>Estimated retail value saved</div>
          </div>
        </div>

        {/* All Student Account & Verification Details Grid */}
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
            <GraduationCap size={18} color="#D97706" />
            Registered Student Information &amp; Verification Record
          </h4>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px',
              fontSize: '0.86rem',
            }}
          >
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Full Name</span>
              <strong style={{ color: '#0F172A' }}>
                {historyData?.full_name || user?.full_name || 'Not set (Edit in Profile)'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>University Email</span>
              <strong style={{ color: '#0F172A' }}>{historyData?.email || user?.email}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Student Account UUID</span>
              <strong style={{ color: '#475569', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                {historyData?.student_id || user?.id || '—'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>University / Institution</span>
              <strong style={{ color: '#0F172A' }}>
                {historyData?.university || user?.university || 'EPITECH / Paris University'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Academic Program / Level</span>
              <strong style={{ color: '#0F172A' }}>
                {historyData?.study_level || user?.study_level || 'Not specified'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Phone Number</span>
              <strong style={{ color: '#0F172A' }}>{historyData?.phone || user?.phone || 'Not provided'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Student ID OCR Status</span>
              <span
                className={`badge ${historyData?.is_verified ? 'badge-emerald' : 'badge-amber'}`}
                style={{ marginTop: '2px', display: 'inline-flex' }}
              >
                {historyData?.is_verified
                  ? '✓ Verified Student Card'
                  : `Status: ${historyData?.id_verification_status || 'pending'}`}
              </span>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>
                Card Validity Period (OCR Extracted)
              </span>
              <strong style={{ color: '#0F172A' }}>
                {historyData?.student_card_start_date || historyData?.student_card_end_date
                  ? `${historyData?.student_card_start_date || 'N/A'} → ${historyData?.student_card_end_date || 'N/A'}`
                  : 'Upload student card to extract dates'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>
                Current Location / Default Address
              </span>
              <strong style={{ color: '#0F172A' }}>{historyData?.default_address || studentAddress}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>
                Dietary Preferences &amp; Allergies
              </span>
              <strong style={{ color: '#0F172A' }}>
                {historyData?.dietary_preferences || user?.dietary_preferences || 'None specified'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Reliability Karma Score</span>
              <strong style={{ color: '#D97706' }}>
                {historyData?.karma_score ?? user?.karma_score ?? 50} / 100 pts
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Student Bio / Notes</span>
              <strong style={{ color: '#0F172A' }}>{historyData?.bio || user?.bio || '—'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Claim & Meal Reservation Log */}
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
              Chronological Meal Reservations &amp; Pickups ({historyData?.claims?.length ?? 0})
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#64748B', marginTop: '2px' }}>
              Every basket claimed by you across Paris partner boulangeries, including QR tokens, pickup timestamps, and road map links.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: `All (${historyData?.total_claims ?? 0})` },
              { key: 'pending', label: `Pending (${historyData?.pending_count ?? 0})` },
              { key: 'collected', label: `Collected (${historyData?.collected_count ?? 0})` },
              { key: 'ghosted', label: `Ghosted (${historyData?.ghosted_count ?? 0})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`zone-pill-btn ${historyFilter === tab.key ? 'active' : ''}`}
                onClick={() => setHistoryFilter(tab.key)}
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
              Loading your complete student history from PostgreSQL...
            </p>
          </div>
        ) : !historyData?.claims || historyData.claims.length === 0 ? (
          <div className="empty-feed-card" style={{ padding: '36px', textAlign: 'center' }}>
            <Store size={38} color="#94A3B8" />
            <h4 style={{ marginTop: '10px', color: '#0F172A' }}>No Meal Claims Recorded Yet</h4>
            <p style={{ color: '#64748B', maxWidth: '460px', margin: '6px auto 16px' }}>
              When you claim a free bakery meal from the Surplus Radar, all reservation details, QR tokens, and pickup timestamps will appear here.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigatePage('/student/radar')}
            >
              <Compass size={15} /> Go to Surplus Radar
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {historyData.claims
              .filter((item) => (historyFilter === 'all' ? true : item.status === historyFilter))
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
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                            🥖 {claim.shop_name}
                          </h4>
                          {claim.shop_siret && (
                            <span
                              style={{
                                fontSize: '0.73rem',
                                color: '#64748B',
                                background: '#F1F5F9',
                                padding: '2px 7px',
                                borderRadius: '4px',
                              }}
                            >
                              SIRET: {claim.shop_siret}
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            fontSize: '0.83rem',
                            color: '#475569',
                            margin: '4px 0 0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <MapPin size={13} color="#D97706" />
                          {claim.shop_address || 'Paris Partner Boulangerie'}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {isCollected && (
                          <span className="badge badge-emerald">
                            <CheckCircle2 size={13} /> Collected (+5 Karma)
                          </span>
                        )}
                        {isPending && (
                          <span className="badge badge-amber">
                            <Hourglass size={13} /> Active / Pending Pickup
                          </span>
                        )}
                        {isGhosted && (
                          <span className="badge badge-rose">
                            <AlertCircle size={13} /> Ghosted (-10 Karma)
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        background: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#92400E', fontSize: '0.92rem' }}>
                          {claim.item_name}{' '}
                          <span style={{ fontWeight: 600, color: '#B45309' }}>(Qty: {claim.quantity})</span>
                        </div>
                        {claim.description && (
                          <div style={{ fontSize: '0.8rem', color: '#78350F', marginTop: '2px' }}>
                            {claim.description}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '0.76rem',
                          fontFamily: 'monospace',
                          color: '#475569',
                          background: '#FFFFFF',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        QR Token: <strong>{claim.qr_code_token}</strong>
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
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <span>
                          📅 <strong>Claimed:</strong> {new Date(claim.claimed_at).toLocaleString()}
                        </span>
                        <span>
                          ⏰ <strong>Deadline:</strong>{' '}
                          {new Date(claim.claim_deadline).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {claim.collected_at && (
                          <span style={{ color: '#059669', fontWeight: 600 }}>
                            ✓ Collected at: {new Date(claim.collected_at).toLocaleString()}
                          </span>
                        )}
                        {claim.ghosted_at && (
                          <span style={{ color: '#DC2626', fontWeight: 600 }}>
                            ✕ Ghosted at: {new Date(claim.ghosted_at).toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {claim.latitude && claim.longitude && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setSelectedRouteTarget({
                                pulse_id: claim.pulse_id,
                                shop_name: claim.shop_name,
                                shop_address: claim.shop_address,
                                item_name: claim.item_name,
                                latitude: claim.latitude,
                                longitude: claim.longitude,
                              });
                              onNavigatePage('/student/map');
                              showToast(`Showing street route to ${claim.shop_name} on Map Page!`);
                            }}
                          >
                            <Navigation size={13} />
                            View Route on Map Page
                          </button>
                        )}
                        {isPending && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setActiveClaim({
                                claim_id: claim.claim_id,
                                pulse_id: claim.pulse_id,
                                qr_code_token: claim.qr_code_token,
                                status: claim.status,
                                claim_deadline: claim.claim_deadline,
                                shop_name: claim.shop_name,
                                shop_address: claim.shop_address,
                                item_name: claim.item_name,
                                latitude: claim.latitude,
                                longitude: claim.longitude,
                              });
                              onNavigatePage('/student/radar');
                            }}
                          >
                            <QrCode size={13} />
                            Open Active QR &amp; Route
                          </button>
                        )}
                      </div>
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
