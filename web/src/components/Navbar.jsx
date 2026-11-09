import React from 'react';
import {
  Store,
  LogOut,
  Sparkles,
  ShieldCheck,
  Flame,
  Compass,
  MapPin,
  History,
  User as UserIcon,
  Send,
  Package,
  QrCode,
  FileText,
} from 'lucide-react';

const STUDENT_PAGES = [
  { path: '/student/radar', label: 'Surplus Radar', shortLabel: 'Radar', icon: Compass },
  { path: '/student/map', label: 'Live Map & Routes', shortLabel: 'Map', icon: MapPin, featured: true },
  { path: '/student/verification', label: 'ID Verification', shortLabel: 'Verify ID', icon: ShieldCheck },
  { path: '/student/history', label: 'History', shortLabel: 'History', icon: History },
  { path: '/student/profile', label: 'Profile', shortLabel: 'Profile', icon: UserIcon },
];

const BAKERY_PAGES = [
  { path: '/bakery/pulse', label: 'Surplus Pulse', shortLabel: 'Pulse', icon: Send },
  { path: '/bakery/items', label: 'Manage Items', shortLabel: 'Items', icon: Package },
  { path: '/bakery/validate', label: 'Validate QR', shortLabel: 'Scan QR', icon: QrCode, featured: true },
  { path: '/bakery/history', label: 'Bakery History', shortLabel: 'History', icon: History },
  { path: '/bakery/tax', label: 'Cerfa Tax Docs', shortLabel: 'Tax Docs', icon: FileText },
  { path: '/bakery/profile', label: 'Bakery Profile', shortLabel: 'Profile', icon: UserIcon },
];

export default function Navbar({
  user,
  onLogout,
  onOpenAuth,
  currentPath = '/student/radar',
  onNavigatePage,
  karmaScore = 50,
}) {
  const navPages =
    user?.role === 'student'
      ? STUDENT_PAGES
      : user?.role === 'shopkeeper'
      ? BAKERY_PAGES
      : [];

  const homePath = user?.role === 'student' ? '/student/radar' : '/bakery/pulse';
  const profilePath = user?.role === 'student' ? '/student/profile' : '/bakery/profile';

  const topLeftBadgeText =
    user?.role === 'shopkeeper'
      ? user?.shop_name || 'Boulangerie Partner'
      : user?.role === 'student'
      ? user?.full_name || 'Student Portal'
      : 'Paris Pilot';

  return (
    <>
      <header className="navbar glass-panel">
        <div className="navbar-left">
          <div
            className="logo-container"
            style={{ cursor: user ? 'pointer' : 'default' }}
            onClick={() => user && onNavigatePage && onNavigatePage(homePath)}
          >
            <div className="logo-icon-pulse">
              <span className="logo-emoji">🥖</span>
              <div className="pulse-ring"></div>
            </div>
            <div>
              <div className="logo-text-row">
                <h1 className="logo-title">Vif</h1>
                <span
                  className="badge badge-amber"
                  style={{
                    maxWidth: '210px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textTransform: user?.role === 'shopkeeper' ? 'none' : 'uppercase',
                  }}
                  title={topLeftBadgeText}
                >
                  {user?.role === 'shopkeeper' && <Store size={12} />}
                  {topLeftBadgeText}
                </span>
              </div>
              <p className="logo-subtitle">The Real-Time Student Food Bridge</p>
            </div>
          </div>
        </div>

        {/* Desktop Center Page Navigation */}
        <div className="navbar-center desktop-only-nav">
          {user && navPages.length > 0 && (
            <nav
              aria-label="Portal Pages"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexWrap: 'wrap',
                justifyContent: 'center',
                background: '#F8FAFC',
                padding: '4px 6px',
                borderRadius: '999px',
                border: '1px solid #E2E8F0',
              }}
            >
              {navPages.map((page) => {
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
                      padding: '6px 12px',
                      borderRadius: '999px',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
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
          )}
        </div>

        {/* Right Side Action Controls (No Email Displayed) */}
        <div className="navbar-right">
          {user ? (
            <div className="user-profile-bar">
              {user.role === 'student' && (
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
              )}

              <button
                className="btn btn-secondary btn-icon-only"
                onClick={onLogout}
                title="Sign out"
                style={{ padding: '8px 11px', borderRadius: '10px' }}
              >
                <LogOut size={16} />
              </button>
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

      {/* Mobile Floating Bottom Dock Navbar (Like Reference Screenshot) */}
      {user && navPages.length > 0 && (
        <nav className="mobile-bottom-dock" aria-label="Mobile Bottom Navigation">
          <div className="mobile-bottom-dock-inner">
            {navPages.map((page) => {
              const Icon = page.icon;
              const isActive = currentPath === page.path;
              const isFeatured = Boolean(page.featured);
              return (
                <button
                  key={page.path}
                  type="button"
                  onClick={() => onNavigatePage && onNavigatePage(page.path)}
                  className={`mobile-dock-item ${isActive ? 'active' : ''} ${
                    isFeatured ? 'featured' : ''
                  }`}
                >
                  <div className="mobile-dock-icon-wrap">
                    <Icon size={isFeatured ? 19 : 18} />
                    {isFeatured && <span className="mobile-dock-live-dot" />}
                  </div>
                  <span className="mobile-dock-label">{page.shortLabel || page.label}</span>
                  {isActive && <span className="mobile-dock-active-dot" />}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
