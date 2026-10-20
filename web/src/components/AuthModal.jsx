import React, { useState, useEffect } from 'react';
import { 
  X, 
  GraduationCap, 
  Store, 
  Mail, 
  Lock, 
  Building, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api';

export default function AuthModal({ 
  isOpen, 
  onClose, 
  initialTab = 'login', 
  initialRole = 'student',
  onAuthSuccess 
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'login' or 'signup'
  const [role, setRole] = useState(initialRole); // 'student' or 'shopkeeper'
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentIdUrl, setStudentIdUrl] = useState('https://storage.vif.fr/default-student-card.jpg');
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [siret, setSiret] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    setActiveTab(initialTab);
    setRole(initialRole);
    setError(null);
    setSuccessMsg(null);
  }, [isOpen, initialTab, initialRole]);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.login(loginEmail.trim(), loginPassword);
      setSuccessMsg('Signed in successfully!');
      setTimeout(() => {
        onAuthSuccess(data.user);
        onClose();
      }, 400);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Frontend validation matching backend requirements
    if (role === 'student') {
      const allowedDomains = ['.edu', '.eu', '.ac.uk', '.univ'];
      if (!allowedDomains.some(d => email.trim().toLowerCase().endsWith(d))) {
        setError('Students must register with an academic email address (.edu, .eu, .ac.uk, .univ)');
        setLoading(false);
        return;
      }
    } else {
      if (!siret || siret.trim().length !== 14 || !/^\d+$/.test(siret.trim())) {
        setError('French SIRET must be exactly 14 digits.');
        setLoading(false);
        return;
      }
      if (!shopName.trim() || !shopAddress.trim()) {
        setError('Shop name and address are required.');
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        email: email.trim(),
        password,
        role,
        ...(role === 'student' ? { student_id_url: studentIdUrl } : { shop_name: shopName.trim(), shop_address: shopAddress.trim(), siret: siret.trim() })
      };

      await api.signup(payload);
      // Auto login after signup
      const data = await api.login(email.trim(), password);
      setSuccessMsg('Account created successfully! Welcome to Vif.');
      setTimeout(() => {
        onAuthSuccess(data.user);
        onClose();
      }, 500);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="modal-header-icon">
            <span style={{ fontSize: '1.8rem' }}>🥖</span>
          </div>
          <h2 className="modal-title">
            {activeTab === 'login' ? 'Welcome Back to Vif' : 'Join the Real-Time Food Bridge'}
          </h2>
          <p className="modal-desc">
            {activeTab === 'login'
              ? 'Sign in to access real-time surplus or manage your bakery donations.'
              : 'Sign up to rescue food or reduce bakery surplus with tax relief.'}
          </p>

          <div className="auth-tab-switch">
            <button 
              className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => { setActiveTab('login'); setError(null); }}
            >
              Sign In
            </button>
            <button 
              className={`auth-tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => { setActiveTab('signup'); setError(null); }}
            >
              Create Account
            </button>
          </div>
        </div>

        {error && (
          <div className="alert-box alert-error">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert-box alert-success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="name@university.edu or contact@boulangerie.fr" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="••••••••" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required 
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Authenticating with Backend...' : 'Sign In to Vif'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="auth-form">
            <div className="role-selector-cards">
              <div 
                className={`role-select-box ${role === 'student' ? 'selected' : ''}`}
                onClick={() => setRole('student')}
              >
                <GraduationCap size={24} color="#6366F1" />
                <div>
                  <div className="role-name">Student (Étudiant)</div>
                  <div className="role-sub">Access free food & QR claims</div>
                </div>
              </div>

              <div 
                className={`role-select-box ${role === 'shopkeeper' ? 'selected' : ''}`}
                onClick={() => setRole('shopkeeper')}
              >
                <Store size={24} color="#F59E0B" />
                <div>
                  <div className="role-name">Bakery (Boulangerie)</div>
                  <div className="role-sub">Post surplus & get tax receipts</div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                {role === 'student' ? 'Academic Email' : 'Business Email'}
              </label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder={role === 'student' ? 'etudiant@epitech.eu or name@univ-paris1.fr' : 'contact@boulangerie-artisanale.fr'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              {role === 'student' && (
                <span className="field-hint">Must end with .edu, .eu, .ac.uk, or .univ</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="At least 8 characters" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>

            {role === 'shopkeeper' && (
              <>
                <div className="form-group">
                  <label className="form-label">Shop / Boulangerie Name</label>
                  <div className="input-with-icon">
                    <Building size={16} className="input-icon" />
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Boulangerie du Marais" 
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Shop Address in Paris</label>
                  <div className="input-with-icon">
                    <MapPin size={16} className="input-icon" />
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 28 Rue des Rosiers, 75004 Paris" 
                      value={shopAddress}
                      onChange={(e) => setShopAddress(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">SIRET Number (14 digits)</label>
                  <div className="input-with-icon">
                    <FileText size={16} className="input-icon" />
                    <input 
                      type="text" 
                      maxLength={14}
                      className="form-input font-mono" 
                      placeholder="80321458700018" 
                      value={siret}
                      onChange={(e) => setSiret(e.target.value)}
                      required 
                    />
                  </div>
                  <span className="field-hint">Validated automatically with the French INSEE Sirene registry</span>
                </div>
              </>
            )}

            {role === 'student' && (
              <div className="form-group">
                <label className="form-label">Student ID Verification</label>
                <div className="upload-preview-box">
                  <ShieldCheck size={20} color="#10B981" />
                  <span className="upload-preview-text">Privacy-by-design OCR verification</span>
                  <span className="badge badge-emerald">Ready</span>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Creating Account in Database...' : `Register as ${role === 'student' ? 'Student' : 'Bakery'}`}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
