import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Upload,
  FileCheck,
  AlertCircle,
  Calendar,
  Sparkles,
  GraduationCap,
  Compass,
} from 'lucide-react';

export default function StudentVerificationPage({
  user,
  historyData,
  uploadingId,
  verificationResult,
  onIdUpload,
  onNavigatePage,
}) {
  const startDate =
    verificationResult?.extracted_start_date ||
    historyData?.student_card_start_date ||
    user?.student_card_start_date;
  const endDate =
    verificationResult?.extracted_end_date ||
    historyData?.student_card_end_date ||
    user?.student_card_end_date;

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
          <div className="badge badge-emerald" style={{ marginBottom: '6px' }}>
            <ShieldCheck size={13} /> Privacy-by-Design OCR Verification
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Student Identity Card OCR Verification
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '4px' }}>
            Upload your university student card to verify your enrollment for the current academic year and unlock the 10-minute priority surplus window.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onNavigatePage('/student/radar')}
        >
          <Compass size={14} />
          Back to Surplus Radar
        </button>
      </div>

      <div className="portal-grid">
        {/* Left Column: Upload & OCR Status */}
        <div className="portal-main-column">
          <div className="verification-card glass-panel" style={{ padding: '28px' }}>
            <div className="verification-card-header" style={{ marginBottom: '18px' }}>
              <ShieldCheck size={28} color="#10B981" />
              <div>
                <h3 className="side-card-title" style={{ fontSize: '1.2rem' }}>
                  Upload Student ID Card for Instant OCR Scan
                </h3>
                <p className="side-card-sub">
                  Extracts academic year (e.g. 2025-2026), student keywords, and validity dates locally
                </p>
              </div>
            </div>

            <p className="verification-body-text" style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>
              Upload a photo or scan of your student card (e.g., <strong>EPITECH</strong>,{' '}
              <strong>Sorbonne</strong>, <strong>CROUS / IZLY</strong>). Our Tesseract OCR model
              extracts your academic year and validity dates, verifies that your card is active for
              the current year, and immediately discards the raw image in compliance with GDPR.
            </p>

            <div
              className="id-status-row"
              style={{
                padding: '14px 18px',
                background: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                marginBottom: '20px',
              }}
            >
              <span className="status-label" style={{ fontWeight: 700 }}>
                Current Verification Status:
              </span>
              {user?.is_verified ? (
                <span className="badge badge-emerald" style={{ fontSize: '0.85rem', padding: '5px 12px' }}>
                  <CheckCircle2 size={15} /> Verified Student (Priority Window Unlocked)
                </span>
              ) : (
                <span className="badge badge-amber" style={{ fontSize: '0.85rem', padding: '5px 12px' }}>
                  Pending / Unverified ({user?.id_verification_status || 'pending'})
                </span>
              )}
            </div>

            <label className="upload-dropzone" style={{ padding: '36px 24px' }}>
              <Upload size={32} color="#F59E0B" />
              <span className="dropzone-text" style={{ fontSize: '1.02rem', marginTop: '8px' }}>
                {uploadingId ? 'Scanning Student Card with OCR...' : 'Click to Upload Student Card Image'}
              </span>
              <span className="dropzone-hint">
                Supports PNG, JPG, JPEG, or WEBP — Instant academic year validation
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={onIdUpload}
                disabled={uploadingId}
                style={{ display: 'none' }}
              />
            </label>

            {verificationResult && (
              <div
                className="ocr-result-box"
                style={{
                  borderColor: verificationResult.verified ? '#10B981' : '#EF4444',
                  marginTop: '20px',
                  padding: '16px',
                }}
              >
                {verificationResult.verified ? (
                  <FileCheck size={22} color="#10B981" />
                ) : (
                  <AlertCircle size={22} color="#EF4444" />
                )}
                <div style={{ flex: 1 }}>
                  <div
                    className="ocr-title"
                    style={{
                      color: verificationResult.verified ? '#065F46' : '#991B1B',
                      fontSize: '0.96rem',
                      fontWeight: 800,
                    }}
                  >
                    {verificationResult.verified
                      ? 'OCR Verification Successful — Student Card Valid!'
                      : 'OCR Verification Notice'}
                  </div>
                  <div className="ocr-keywords" style={{ marginTop: '4px', fontSize: '0.86rem' }}>
                    {verificationResult.message}
                  </div>
                  {verificationResult.matched_keywords?.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {verificationResult.matched_keywords.map((kw) => (
                        <span key={kw} className="badge badge-indigo" style={{ fontSize: '0.72rem' }}>
                          ✓ {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Extracted Card Details & Legal Standards */}
        <div className="portal-side-column">
          <div className="glass-panel" style={{ padding: '22px', marginBottom: '18px' }}>
            <h4 className="side-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Calendar size={18} color="#D97706" />
              Extracted Card Validity Details
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.86rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748B' }}>Student Status:</span>
                <strong style={{ color: user?.is_verified ? '#059669' : '#D97706' }}>
                  {user?.is_verified ? 'Verified' : user?.id_verification_status || 'Pending'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748B' }}>Academic Start Date:</span>
                <strong style={{ color: '#0F172A' }}>{startDate || 'Not extracted yet'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748B' }}>Academic End Date:</span>
                <strong style={{ color: '#0F172A' }}>{endDate || 'Not extracted yet'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Priority Feed Access:</span>
                <strong style={{ color: user?.is_verified ? '#059669' : '#64748B' }}>
                  {user?.is_verified ? 'Unlocked (First 10 mins)' : 'Requires Verified Card'}
                </strong>
              </div>
            </div>
          </div>

          <div className="safety-info-card glass-panel">
            <h4 className="side-card-title">French Food Law &amp; GDPR Safety</h4>
            <div className="safety-points">
              <div className="safety-item">
                <CheckCircle2 size={14} color="#10B981" />
                <span>
                  Compliant with <strong>Loi Garot</strong> against food waste.
                </span>
              </div>
              <div className="safety-item">
                <CheckCircle2 size={14} color="#10B981" />
                <span>
                  Allergens and hygiene strictly meet <strong>EU Regulation 852/2004</strong>.
                </span>
              </div>
              <div className="safety-item">
                <CheckCircle2 size={14} color="#10B981" />
                <span>
                  <strong>Zero Image Retention:</strong> Card images are processed in-memory and never stored on disk.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
