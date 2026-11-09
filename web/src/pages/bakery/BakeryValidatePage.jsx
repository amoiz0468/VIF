import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  QrCode,
  CheckCircle2,
  Hourglass,
  RefreshCw,
  Send,
  History,
  User as UserIcon,
  Camera,
  CameraOff,
  Upload,
  AlertCircle,
  SwitchCamera,
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

  // Camera QR Scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [cameraError, setCameraError] = useState(null);
  const [detectedBanner, setDetectedBanner] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const fileInputRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleDecodedToken = useCallback(
    async (rawText) => {
      const cleaned = (rawText || '').trim();
      if (!cleaned) return;
      stopCamera();
      setQrTokenInput(cleaned);
      setDetectedBanner(`QR Code Scanned: ${cleaned}`);
      await onQuickValidateToken(cleaned);
    },
    [onQuickValidateToken, setQrTokenInput, stopCamera]
  );

  const decodeFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(decodeFrame);
      return;
    }

    // 1. Try native BarcodeDetector if available in browser
    if ('BarcodeDetector' in window) {
      try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const codes = await detector.detect(video);
        if (codes && codes.length > 0 && codes[0].rawValue) {
          await handleDecodedToken(codes[0].rawValue);
          return;
        }
      } catch {
        // Fallback to jsQR canvas below
      }
    }

    // 2. Fallback to jsQR canvas frame decoding
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (typeof window.jsQR === 'function') {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qrResult = window.jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      if (qrResult && qrResult.data) {
        await handleDecodedToken(qrResult.data);
        return;
      }
    }

    animFrameRef.current = requestAnimationFrame(decodeFrame);
  }, [handleDecodedToken]);

  const startCamera = async (preferredMode = facingMode) => {
    setCameraError(null);
    setDetectedBanner(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Camera API is not available in this browser context. You can also upload a QR screenshot or click Validate on the pending claim below.'
      );
      return;
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: preferredMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        // Fallback to any available webcam
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      setCameraActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play().catch(() => {});
          animFrameRef.current = requestAnimationFrame(decodeFrame);
        }
      }, 80);
    } catch (err) {
      console.error('Camera permission error:', err);
      setCameraError(
        'Could not access camera. Please allow camera permission in your browser address bar, or upload a QR image.'
      );
      setCameraActive(false);
    }
  };

  const handleToggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (cameraActive) {
      startCamera(nextMode);
    }
  };

  const handleScanImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError(null);
    setDetectedBanner(null);

    try {
      const bitmap = await createImageBitmap(file);

      // 1. Try native BarcodeDetector first
      if ('BarcodeDetector' in window) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const results = await detector.detect(bitmap);
          if (results && results.length > 0 && results[0].rawValue) {
            await handleDecodedToken(results[0].rawValue);
            e.target.value = '';
            return;
          }
        } catch {
          // Continue to jsQR fallback
        }
      }

      // 2. Fallback to jsQR
      const canvas = canvasRef.current || document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      ctx.drawImage(bitmap, 0, 0);

      if (typeof window.jsQR === 'function') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrResult = window.jsQR(imageData.data, imageData.width, imageData.height);
        if (qrResult && qrResult.data) {
          await handleDecodedToken(qrResult.data);
          e.target.value = '';
          return;
        }
      }

      setCameraError('No valid QR code found in the uploaded image. Please try again.');
    } catch (err) {
      console.error('QR image scan error:', err);
      setCameraError('Could not read QR image file.');
    }
    e.target.value = '';
  };

  return (
    <div className="bakery-page-wrapper">
      {/* Hidden canvas for QR frame decoding */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleScanImageUpload}
      />

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
            Scan the student’s QR code with your camera or enter their challenge token to complete meal handover and log the donation to your Cerfa tax ledger.
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              paddingBottom: '18px',
              marginBottom: '18px',
              borderBottom: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <QrCode size={24} color="#D97706" />
              </div>
              <div>
                <h3 className="section-title" style={{ marginBottom: '4px' }}>
                  QR Code Challenge Handshake
                </h3>
                <p className="section-sub" style={{ marginBottom: 0 }}>
                  Open the live camera scanner to scan the student’s phone screen, upload a QR image, or enter the token manually.
                </p>
              </div>
            </div>

            {/* Camera Controls */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {!cameraActive ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => startCamera()}
                >
                  <Camera size={15} />
                  Open Camera QR Scanner
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleToggleCameraFacing}
                    title="Switch Front / Rear Camera"
                  >
                    <SwitchCamera size={15} />
                    Flip Camera
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                    onClick={stopCamera}
                  >
                    <CameraOff size={15} />
                    Stop Camera
                  </button>
                </>
              )}

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={15} />
                Scan QR Image
              </button>
            </div>
          </div>

          {/* Live Camera Viewport */}
          {cameraActive && (
            <div
              style={{
                marginTop: '16px',
                marginBottom: '18px',
                padding: '16px',
                background: '#0F172A',
                borderRadius: '14px',
                border: '2px solid #F59E0B',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  maxWidth: '520px',
                  color: '#F8FAFC',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: '#10B981',
                      boxShadow: '0 0 8px #10B981',
                    }}
                  />
                  Live Camera QR Scanner Active — Point at Student QR Code
                </span>
                <span style={{ color: '#FBBF24', fontSize: '0.76rem' }}>Auto-validates on scan</span>
              </div>

              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: '520px',
                  aspectRatio: '4 / 3',
                  background: '#020617',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {/* QR Target Frame Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '18%',
                    border: '2px dashed rgba(245, 158, 11, 0.9)',
                    borderRadius: '16px',
                    boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.38)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: '10px',
                  }}
                >
                  <span
                    style={{
                      background: 'rgba(15, 23, 42, 0.85)',
                      color: '#FDE68A',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '999px',
                    }}
                  >
                    Align Student QR Code inside box
                  </span>
                </div>
              </div>
            </div>
          )}

          {cameraError && (
            <div
              style={{
                marginTop: '14px',
                marginBottom: '14px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#B91C1C',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{cameraError}</span>
            </div>
          )}

          {detectedBanner && (
            <div
              style={{
                marginTop: '14px',
                marginBottom: '14px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#065F46',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{detectedBanner}</span>
            </div>
          )}

          <form onSubmit={onValidateClaim} className="validate-form">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ marginBottom: '6px' }}>
                Student Claim Token (UUID)
              </label>
              <div
                className="input-with-action"
                style={{ display: 'flex', alignItems: 'stretch', gap: '12px' }}
              >
                <input
                  type="text"
                  className="form-input token-input font-mono"
                  placeholder="Scan with camera above or paste student QR token"
                  value={qrTokenInput}
                  onChange={(e) => setQrTokenInput(e.target.value)}
                  style={{ flex: 1, height: '48px' }}
                  required
                />
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={validating}
                  style={{
                    height: '48px',
                    padding: '0 22px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle2 size={16} />
                  {validating ? 'Verifying...' : 'Validate Handshake'}
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
