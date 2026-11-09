import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import StudentPortal from './components/StudentPortal';
import ShopkeeperPortal from './components/ShopkeeperPortal';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import {
  api,
  getStoredUser,
  getStoredToken,
  removeStoredToken,
  removeStoredUser,
  setStoredUser,
} from './api';

const VALID_STUDENT_PATHS = [
  '/student/radar',
  '/student/map',
  '/student/verification',
  '/student/history',
  '/student/profile',
];

const VALID_BAKERY_PATHS = [
  '/bakery/pulse',
  '/bakery/validate',
  '/bakery/history',
  '/bakery/tax',
  '/bakery/profile',
];

function resolvePathForUser(pathname, user) {
  if (!user) return '/';
  if (user.role === 'student') {
    return VALID_STUDENT_PATHS.includes(pathname) ? pathname : '/student/radar';
  }
  return VALID_BAKERY_PATHS.includes(pathname) ? pathname : '/bakery/pulse';
}

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState(() =>
    resolvePathForUser(window.location.pathname, getStoredUser())
  );

  // Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState('login');
  const [authRoleChoice, setAuthRoleChoice] = useState('student');

  // Sync browser URL back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(resolvePathForUser(window.location.pathname, user));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  const handleNavigatePage = (nextPath, forUser = user) => {
    const target = resolvePathForUser(nextPath, forUser);
    if (window.location.pathname !== target) {
      window.history.pushState({}, '', target);
    }
    setCurrentPath(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Verify real user session on mount
  useEffect(() => {
    const initSession = async () => {
      const token = getStoredToken();
      if (token) {
        try {
          const profile = await api.getCurrentUser();
          setUser(profile);
          setStoredUser(profile);
          const resolved = resolvePathForUser(window.location.pathname, profile);
          if (window.location.pathname !== resolved) {
            window.history.replaceState({}, '', resolved);
          }
          setCurrentPath(resolved);
        } catch (err) {
          console.warn('Session expired or invalid token:', err);
          removeStoredToken();
          removeStoredUser();
          setUser(null);
        }
      }
      setInitialLoading(false);
    };
    initSession();
  }, []);

  const handleOpenAuth = (tab = 'login', preferredRole = 'student') => {
    setAuthInitialTab(tab);
    setAuthRoleChoice(preferredRole);
    setAuthModalOpen(true);
  };

  const handleLogout = () => {
    removeStoredToken();
    removeStoredUser();
    setUser(null);
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
  };

  const handleAuthSuccess = (authUser) => {
    setUser(authUser);
    const defaultRoute = authUser?.role === 'student' ? '/student/radar' : '/bakery/pulse';
    handleNavigatePage(defaultRoute, authUser);
  };

  if (initialLoading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', color: '#D97706' }}>
          <span style={{ fontSize: '2.5rem' }}>🥖</span>
          <p style={{ marginTop: '12px', fontSize: '1rem', color: '#64748B' }}>
            Connecting to Vif backend...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenAuth={handleOpenAuth}
        currentPath={currentPath}
        onNavigatePage={handleNavigatePage}
        karmaScore={user?.karma_score}
      />

      <main className="main-content">
        {!user ? (
          <LandingPage onOpenAuth={handleOpenAuth} />
        ) : user.role === 'student' ? (
          <StudentPortal
            user={user}
            currentPath={currentPath}
            onNavigatePage={handleNavigatePage}
            onUserUpdate={(updated) => {
              setUser(updated);
              setStoredUser(updated);
            }}
          />
        ) : (
          <ShopkeeperPortal
            user={user}
            currentPath={currentPath}
            onNavigatePage={handleNavigatePage}
            onUserUpdate={(updated) => {
              setUser(updated);
              setStoredUser(updated);
            }}
          />
        )}
      </main>

      <Footer />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authInitialTab}
        initialRole={authRoleChoice}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
