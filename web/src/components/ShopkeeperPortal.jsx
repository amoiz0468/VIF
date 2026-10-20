import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Send, 
  QrCode, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Euro, 
  TrendingUp, 
  MapPin, 
  ShieldCheck, 
  Bell,
  Clock,
  Layers,
  Save,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api';

const QUICK_PRESETS = [
  {
    icon: '🥖',
    name: '10 Baguettes de Tradition',
    qty: 10,
    cost: 0.45,
    desc: 'Baguettes traditionnelles au levain croustillantes, cuites dans l’après-midi.'
  },
  {
    icon: '🥐',
    name: '8 Croissants & Viennoiseries',
    qty: 8,
    cost: 0.50,
    desc: 'Assortiment de croissants pur beurre et pains au chocolat artisanaux.'
  },
  {
    icon: '🥪',
    name: '5 Sandwiches & Quiches du Jour',
    qty: 5,
    cost: 1.25,
    desc: 'Sandwiches baguette frais (jambon, emmental, crudités) et parts de quiche lorraine.'
  },
  {
    icon: '🍰',
    name: '6 Pâtisseries & Tartes',
    qty: 6,
    cost: 1.10,
    desc: 'Tartellettes aux fruits, éclairs chocolat et choux du jour.'
  }
];

export default function ShopkeeperPortal({ user }) {
  // Navigation tab inside Bakery Portal
  const [activeTab, setActiveTab] = useState('pulse'); // 'pulse', 'validate', 'tax', 'settings'

  // Shop details from backend
  const [shopId, setShopId] = useState(null);

  // Pulse posting state
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(5);
  const [isDonation, setIsDonation] = useState(true);
  const [postingPulse, setPostingPulse] = useState(false);
  const [lastPostedPulse, setLastPostedPulse] = useState(null);

  // Validate Claim state
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [validatedClaim, setValidatedClaim] = useState(null);

  // Shop settings & costs
  const [shopAddress, setShopAddress] = useState(user?.shop_address || '28 Rue des Rosiers, 75004 Paris');
  const [lat, setLat] = useState('48.8575');
  const [lng, setLng] = useState('2.3598');
  const [savingSettings, setSavingSettings] = useState(false);

  // Tax Report State
  const [taxYear, setTaxYear] = useState('2026');
  const [taxMonth, setTaxMonth] = useState('10');
  const [generatingReport, setGeneratingReport] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Load shop profile from backend on mount
  useEffect(() => {
    fetchShopProfile();
  }, []);

  const fetchShopProfile = async () => {
    try {
      const res = await api.getOrUpdateShopCosts({
        inventory_costs: {},
        address: null,
        latitude: null,
        longitude: null
      });
      if (res.shop_id) {
        setShopId(res.shop_id);
      }
      if (res.address) {
        setShopAddress(res.address);
      }
      if (res.latitude) {
        setLat(String(res.latitude));
      }
      if (res.longitude) {
        setLng(String(res.longitude));
      }
    } catch (err) {
      console.warn('Shop profile initialization:', err);
    }
  };

  const handleApplyPreset = (preset) => {
    setItemName(preset.name);
    setQuantity(preset.qty);
    setDescription(preset.desc);
    showToast(`Preset "${preset.name}" loaded into form! Ready to broadcast.`);
  };

  const handlePostPulse = async (e) => {
    e?.preventDefault();
    if (!itemName) {
      showToast('Please enter an item name or select a preset.', 'error');
      return;
    }
    setPostingPulse(true);
    try {
      const payload = {
        item_name: itemName,
        description,
        quantity: parseInt(quantity, 10),
        is_donation: isDonation,
      };
      const res = await api.createPulse(payload);
      setLastPostedPulse(res);
      showToast(`Pulse broadcasted live to backend database! ${res.notified_students} students alerted.`);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      setItemName('');
      setDescription('');
    } catch (err) {
      console.error('Backend pulse error:', err);
      showToast(err.message || 'Failed to post surplus pulse.', 'error');
    } finally {
      setPostingPulse(false);
    }
  };

  const handleValidateClaim = async (e) => {
    e?.preventDefault();
    const token = qrTokenInput.trim();
    if (!token) {
      showToast('Please enter or scan a claim QR token.', 'error');
      return;
    }
    setValidating(true);
    try {
      const res = await api.validateClaim(token);
      setValidatedClaim(res);
      showToast('QR Code Verified! Meal collected successfully.');
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 } });
      setQrTokenInput('');
    } catch (err) {
      console.error('Validate claim error:', err);
      showToast(err.message || 'Claim validation failed. Token invalid or expired.', 'error');
    } finally {
      setValidating(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await api.getOrUpdateShopCosts({
        inventory_costs: {
          'Baguette Tradition': { cost_price: 0.45, unit: 'piece', currency: 'EUR' },
          'Croissant': { cost_price: 0.50, unit: 'piece', currency: 'EUR' },
          'Sandwich': { cost_price: 1.25, unit: 'piece', currency: 'EUR' },
        },
        address: shopAddress,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng)
      });
      if (res.shop_id) {
        setShopId(res.shop_id);
      }
      showToast('Shop address and inventory costs successfully saved to backend database!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      showToast(err.message || 'Failed to save shop settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDownloadCerfa = async () => {
    if (!shopId) {
      showToast('Loading shop profile... please try again in a moment.', 'error');
      return;
    }
    setGeneratingReport(true);
    try {
      const blob = await api.generateTaxReport(shopId, parseInt(taxYear, 10), parseInt(taxMonth, 10));
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cerfa_${user?.siret || 'shop'}_${taxYear}_${taxMonth}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToast('Official Cerfa n° 11580*05 PDF generated by backend and downloaded!');
    } catch (err) {
      console.error('Tax report error:', err);
      showToast(err.message || 'Could not compile Cerfa report from backend.', 'error');
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <div className="portal-container">
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Bakery Header Banner */}
      <div className="bakery-header glass-panel">
        <div className="bakery-header-left">
          <div className="badge badge-amber">
            <Store size={14} /> Artisan Bakery Portal
          </div>
          <h2 className="portal-title">{user?.shop_name || 'Boulangerie du Marais'}</h2>
          <p className="portal-desc">
            <MapPin size={14} color="#94A3B8" /> {shopAddress} · SIRET: <code>{user?.siret || '80321458700018'}</code>
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

      {/* Tab Navigation */}
      <div className="bakery-subnav glass-panel">
        <button 
          className={`subnav-tab ${activeTab === 'pulse' ? 'active' : ''}`}
          onClick={() => setActiveTab('pulse')}
        >
          <Send size={16} /> 1-Click Surplus Pulse
        </button>
        <button 
          className={`subnav-tab ${activeTab === 'validate' ? 'active' : ''}`}
          onClick={() => setActiveTab('validate')}
        >
          <QrCode size={16} /> Validate QR Claim
        </button>
        <button 
          className={`subnav-tab ${activeTab === 'tax' ? 'active' : ''}`}
          onClick={() => setActiveTab('tax')}
        >
          <FileText size={16} /> Cerfa Tax Documents
        </button>
        <button 
          className={`subnav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Layers size={16} /> Store & Cost Matrix
        </button>
      </div>

      {/* Tab 1: 1-Click Surplus Pulse */}
      {activeTab === 'pulse' && (
        <div className="tab-pane-content">
          <div className="pulse-composer-grid">
            {/* Quick 1-Click Presets */}
            <div className="glass-panel presets-panel">
              <h3 className="section-title">
                <Sparkles size={18} color="#F59E0B" /> 1-Click French Bakery Presets
              </h3>
              <p className="section-sub">
                No typing required before closing. Click a preset to instantly stage and broadcast to nearby students.
              </p>

              <div className="presets-list">
                {QUICK_PRESETS.map((preset) => (
                  <div 
                    key={preset.name} 
                    className="preset-card glass-card"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <span className="preset-emoji">{preset.icon}</span>
                    <div className="preset-info">
                      <div className="preset-name">{preset.name}</div>
                      <div className="preset-desc">{preset.desc}</div>
                      <div className="preset-meta">
                        <span className="badge badge-amber">{preset.qty} packs</span>
                        <span className="preset-cost">Base cost: €{preset.cost.toFixed(2)}/unit</span>
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

              <form onSubmit={handlePostPulse}>
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
                  {postingPulse ? 'Broadcasting to Backend Database...' : 'Post Surplus Pulse in 1 Tap'}
                </button>
              </form>

              {lastPostedPulse && (
                <div className="last-pulse-alert glass-card">
                  <Bell size={20} color="#10B981" />
                  <div>
                    <div className="pulse-alert-title">Pulse Live in PostgreSQL Database!</div>
                    <div className="pulse-alert-text">
                      Broadcasted <strong>{lastPostedPulse.quantity}x {lastPostedPulse.item_name}</strong> to verified students nearby.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Validate QR Claim */}
      {activeTab === 'validate' && (
        <div className="tab-pane-content">
          <div className="glass-panel validate-panel">
            <div className="validate-header">
              <QrCode size={32} color="#F59E0B" />
              <div>
                <h3 className="section-title">QR Code Challenge Handshake</h3>
                <p className="section-sub">
                  Scan the student’s phone screen or enter their QR challenge token to complete handover.
                </p>
              </div>
            </div>

            <form onSubmit={handleValidateClaim} className="validate-form">
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
                  <button 
                    type="submit" 
                    className="btn btn-success"
                    disabled={validating}
                  >
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
        </div>
      )}

      {/* Tab 3: Cerfa Tax Report & Article 238 bis CGI */}
      {activeTab === 'tax' && (
        <div className="tab-pane-content">
          <div className="tax-grid">
            <div className="glass-panel tax-summary-panel">
              <div className="tax-header-badge-row">
                <span className="badge badge-amber">Official French Law</span>
                <span className="badge badge-emerald">Article 238 bis CGI</span>
              </div>
              <h3 className="section-title">Automated Cerfa n° 11580*05 Tax Receipts</h3>
              <p className="section-sub">
                French legislation grants bakeries a <strong>60% corporate tax deduction</strong> on the cost price of donated surplus food. Vif compiles all verified claims into accountant-ready PDF certificates.
              </p>

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
                  onClick={handleDownloadCerfa}
                  disabled={generatingReport}
                >
                  <Download size={18} />
                  {generatingReport ? 'Compiling Official Cerfa PDF from Database...' : 'Download Official CERFA Tax Receipt (PDF)'}
                </button>
              </div>
            </div>

            <div className="glass-panel tax-legal-panel">
              <h4 className="side-card-title">Legal & Accounting Framework</h4>
              <div className="legal-notes-list">
                <div className="legal-note-item">
                  <ShieldCheck size={18} color="#10B981" />
                  <div>
                    <strong>Cerfa n° 11580*05 Format:</strong> Generated using ReportLab backend service, compliant with DGFiP fiscal reporting standards.
                  </div>
                </div>
                <div className="legal-note-item">
                  <ShieldCheck size={18} color="#10B981" />
                  <div>
                    <strong>OIG Intermediary Anchor:</strong> Donations are validated through a certified Organisme d'Intérêt Général.
                  </div>
                </div>
                <div className="legal-note-item">
                  <ShieldCheck size={18} color="#10B981" />
                  <div>
                    <strong>Direct Accountant Export:</strong> Hand this receipt directly to your expert-comptable for fiscal credit deduction.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Store & Cost Matrix */}
      {activeTab === 'settings' && (
        <div className="tab-pane-content">
          <div className="glass-panel settings-panel">
            <h3 className="section-title">Shop Details & Inventory Cost Matrix</h3>
            <p className="section-sub">
              Tax write-offs are calculated strictly on your production cost price, as required by the French tax code.
            </p>

            <form onSubmit={handleSaveSettings}>
              <div className="form-group">
                <label className="form-label">Bakery Address in Paris</label>
                <div className="input-with-icon">
                  <MapPin size={16} className="input-icon" />
                  <input 
                    type="text" 
                    className="form-input" 
                    value={shopAddress} 
                    onChange={(e) => setShopAddress(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input 
                    type="text" 
                    className="form-input font-mono" 
                    value={lat} 
                    onChange={(e) => setLat(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input 
                    type="text" 
                    className="form-input font-mono" 
                    value={lng} 
                    onChange={(e) => setLng(e.target.value)}
                  />
                </div>
              </div>

              <div className="cost-matrix-table-card glass-card">
                <h4 className="cost-matrix-title">Unit Cost Prices (Base HT)</h4>
                <div className="cost-row">
                  <span>🥖 Baguette Tradition</span>
                  <span className="font-mono">€0.45 / unit</span>
                </div>
                <div className="cost-row">
                  <span>🥐 Croissant & Viennoiseries</span>
                  <span className="font-mono">€0.50 / unit</span>
                </div>
                <div className="cost-row">
                  <span>🥪 Sandwich & Salade</span>
                  <span className="font-mono">€1.25 / unit</span>
                </div>
                <div className="cost-row">
                  <span>🍰 Pâtisserie Fine</span>
                  <span className="font-mono">€1.10 / unit</span>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={savingSettings}
              >
                <Save size={16} />
                {savingSettings ? 'Saving to Database...' : 'Save Coordinates & Cost Matrix'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
