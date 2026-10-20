import React from 'react';
import { 
  UtensilsCrossed, 
  Store, 
  GraduationCap, 
  LogOut, 
  Sparkles, 
  ShieldCheck, 
  Flame, 
  HeartHandshake,
  HelpCircle
} from 'lucide-react';

export default function Navbar({ 
  user, 
  onLogout, 
  onOpenAuth, 
  activeRole, 
  onSwitchRole, 
  onQuickLogin,
  karmaScore = 50 
}) {
  return (
    <header className="navbar glass-panel">
      <div className="navbar-left">
        <div className="logo-container">
          <div className="logo-icon-pulse">
            <span className="logo-emoji">🥖</span>
            <div className="pulse-ring"></div>
          </div>
          <div>
            <div className="logo-text-row">
              <h1 className="logo-title">Vif</h1>
              <span className="badge badge-amber">Paris Pilot</span>
            </div>
            <p className="logo-subtitle">The Real-Time Student Food Bridge</p>
          </div>
        </div>
      </div>

      <div className="navbar-center">
        {user && (
          <div className="role-indicator-badge">
            {user.role === 'student' ? (
              <span className="badge badge-indigo">
                <GraduationCap size={15} /> Student Workspace
              </span>
            ) : (
              <span className="badge badge-amber">
                <Store size={15} /> Bakery Portal
              </span>
            )}
          </div>
        )}
      </div>

      <div className="navbar-right">
        {user ? (
          <div className="user-profile-bar">
            {user.role === 'student' ? (
              <div className="karma-badge-pill" title="Karma Score: Ghosting drops -10 points. Keep above 30 to claim meals.">
                <Flame size={15} className="karma-flame-icon" />
                <span className="karma-text">Karma: <strong>{user.karma_score ?? karmaScore}</strong>/100</span>
                {user.is_verified ? (
                  <span className="verified-icon" title="Student ID Verified">
                    <ShieldCheck size={14} color="#10B981" />
                  </span>
                ) : (
                  <span className="unverified-pill">Pending ID</span>
                )}
              </div>
            ) : (
              <div className="bakery-badge-pill">
                <Store size={15} color="#F59E0B" />
                <span className="bakery-name-text">
                  {user.shop_name || 'Boulangerie Parisienne'}
                </span>
                <span className="siret-pill">SIRET: {user.siret?.slice(0, 9)}...</span>
              </div>
            )}

            <div className="user-account-dropdown">
              <span className="user-email-text">{user.email}</span>
              <button 
                className="btn btn-secondary btn-icon-only" 
                onClick={onLogout} 
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="auth-buttons">
            <button className="btn btn-secondary" onClick={() => onOpenAuth('login')}>
              Log In
            </button>
            <button className="btn btn-primary" onClick={() => onOpenAuth('signup')}>
              <Sparkles size={16} /> Register
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
