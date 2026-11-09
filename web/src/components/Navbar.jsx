import React from 'react';
import {
  Store,
  GraduationCap,
  LogOut,
  Sparkles,
  ShieldCheck,
  Flame,
  Compass,
  MapPin,
  History,
  User as UserIcon,
} from 'lucide-react';

const STUDENT_PAGES = [
  { path: '/student/radar', label: 'Surplus Radar', icon: Compass },
  { path: '/student/map', label: 'Live Map & Routes', icon: MapPin },
  { path: '/student/verification', label: 'ID Verification', icon: ShieldCheck },
  { path: '/student/history', label: 'History', icon: History },
  { path: '/student/profile', label: 'Profile', icon: UserIcon },
];

export default function Navbar({
  user,
  onLogout,
  onOpenAuth,
  currentPath = '/student/radar',
  onNavigatePage,
  karmaScore = 50,
}) {
  return (
    <header className="navbar glass-panel">
      <div className="navbar-left">
        <div
          className="logo-container"
          style={{ cursor: 'pointer' }}
          onClick={() => user?.role === 'student' && onNavigatePage && onNavigatePage('/student/radar')}
        >
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
        {user && user.role === 'student' ? (
          <nav
            aria-label="Student Portal Pages"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
              background: '#F8FAFC',
              padding: '4px 6px',
              borderRadius: '999px',
              border: '1px solid #E2E8F0',
            }}
          >
            {STUDENT_PAGES.map((page) => {
              const Icon = page.icon;
              const isActive = currentPath === page.path;
              return (
                <button
                  key={page.path}
                  type="button"
                  onClick={() => onNavigatePage && onNavigatePage(page.path)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 13px',
                    borderRadius: '999px',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: isActive
                      ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                      : 'transparent',
                    color: isActive ? '#FFFFFF' : '#475569',
                    boxShadow: isActive ? '0 2px 8px rgba(217, 119, 6, 0.28)' : 'none',
                  }}
                >
                  <Icon size={14} />
                  <span>{page.label}</span>
                </button>
              );
            })}
          </nav>
        ) : (
          user && (
            <div className="role-indicator-badge">
              <span className="badge badge-amber">
                <Store size={15} /> Bakery Portal
              </span>
            </div>
          )
        )}
      </div>

      <div className="navbar-right">
        {user ? (
          <div className="user-profile-bar">
            {user.role === 'student' ? (
              <div
                className="karma-badge-pill"
                title="Karma Score: Ghosting drops -10 points. Keep above 30 to claim meals."
              >
                <Flame size={15} className="karma-flame-icon" />
                <span className="karma-text">
                  Karma: <strong>{user.karma_score ?? karmaScore}</strong>/100
                </span>
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
              <span
                className="user-email-text"
                style={{ cursor: user.role === 'student' ? 'pointer' : 'default' }}
                onClick={() => user.role === 'student' && onNavigatePage && onNavigatePage('/student/profile')}
                title={user.role === 'student' ? 'Open Student Profile Page' : undefined}
              >
                {user.full_name || user.email}
              </span>
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
