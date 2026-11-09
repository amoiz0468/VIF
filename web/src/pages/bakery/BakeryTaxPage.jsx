import React from 'react';
import {
  FileText,
  Download,
  ShieldCheck,
  Store,
  Send,
} from 'lucide-react';

export default function BakeryTaxPage({
  user,
  shopAddress,
  taxYear,
  setTaxYear,
  taxMonth,
  setTaxMonth,
  generatingReport,
  onDownloadCerfa,
  bakeryHistory,
  onNavigatePage,
}) {
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
          <div className="badge badge-emerald" style={{ marginBottom: '6px' }}>
            <FileText size={13} /> Article 238 bis CGI · Official Fiscal Certificates
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Cerfa n° 11580*05 Tax Documents
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '4px' }}>
            Generate and download official French tax deduction receipts for your bakery’s verified student meal donations.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onNavigatePage('/bakery/pulse')}
        >
          <Send size={14} />
          Back to Surplus Pulse
        </button>
      </div>

      <div className="tab-pane-content">
        <div className="tax-grid">
          <div className="glass-panel tax-summary-panel">
            <div className="tax-header-badge-row">
              <span className="badge badge-amber">Official French Law</span>
              <span className="badge badge-emerald">Article 238 bis CGI</span>
            </div>
            <h3 className="section-title">Automated Cerfa n° 11580*05 Tax Receipts</h3>
            <p className="section-sub">
              French legislation grants bakeries a <strong>60% corporate tax deduction</strong> on
              the cost price of donated surplus food. Vif compiles all verified claims for{' '}
              <strong>{user?.shop_name || 'your bakery'}</strong> (SIRET:{' '}
              <code>{user?.siret}</code>) into accountant-ready PDF certificates.
            </p>

            {/* Quick Tax Metrics Preview */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '10px',
                margin: '16px 0',
                padding: '12px',
                background: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div>
                <div style={{ fontSize: '0.73rem', color: '#64748B' }}>Verified Pickups</div>
                <strong style={{ fontSize: '1.2rem', color: '#0F172A' }}>
                  {bakeryHistory?.collected_claims_count ?? 0} meals
                </strong>
              </div>
              <div>
                <div style={{ fontSize: '0.73rem', color: '#64748B' }}>Tax Credit Rate</div>
                <strong style={{ fontSize: '1.2rem', color: '#059669' }}>60% HT</strong>
              </div>
              <div>
                <div style={{ fontSize: '0.73rem', color: '#64748B' }}>Est. Fiscal Credit</div>
                <strong style={{ fontSize: '1.2rem', color: '#5B21B6' }}>
                  €{(bakeryHistory?.estimated_tax_credit_eur ?? 0).toFixed(2)}
                </strong>
              </div>
            </div>

            <div className="tax-download-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Tax Year</label>
                  <select
                    className="form-select"
                    value={taxYear}
                    onChange={(e) => setTaxYear(e.target.value)}
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Month</label>
                  <select
                    className="form-select"
                    value={taxMonth}
                    onChange={(e) => setTaxMonth(e.target.value)}
                  >
                    <option value="11">November</option>
                    <option value="10">October</option>
                    <option value="9">September</option>
                    <option value="8">August</option>
                    <option value="7">July</option>
                    <option value="6">June</option>
                    <option value="5">May</option>
                  </select>
                </div>
              </div>

              <button
                className="btn btn-primary btn-block btn-lg"
                onClick={onDownloadCerfa}
                disabled={generatingReport}
              >
                <Download size={18} />
                {generatingReport
                  ? 'Compiling Official Cerfa PDF from Database...'
                  : 'Download Official CERFA Tax Receipt (PDF)'}
              </button>
            </div>
          </div>

          <div className="glass-panel tax-legal-panel">
            <h4 className="side-card-title">Legal &amp; Accounting Framework</h4>
            <div className="legal-notes-list">
              <div className="legal-note-item">
                <ShieldCheck size={18} color="#10B981" />
                <div>
                  <strong>Cerfa n° 11580*05 Format:</strong> Generated using ReportLab backend
                  service, compliant with DGFiP fiscal reporting standards.
                </div>
              </div>
              <div className="legal-note-item">
                <ShieldCheck size={18} color="#10B981" />
                <div>
                  <strong>OIG Intermediary Anchor:</strong> Donations are validated through a
                  certified Organisme d&apos;Intérêt Général.
                </div>
              </div>
              <div className="legal-note-item">
                <ShieldCheck size={18} color="#10B981" />
                <div>
                  <strong>Direct Accountant Export:</strong> Hand this receipt directly to your
                  expert-comptable for fiscal credit deduction.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

