import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import StudentPortal from './components/StudentPortal';
import ShopkeeperPortal from './components/ShopkeeperPortal';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import { api, getStoredUser, getStoredToken, removeStoredToken, removeStoredUser, setStoredUser } from './api';

const VALID_STUDENT_PATHS = [
  '/student/radar',
  '/student/map',
  '/student/verification',
  '/student/history',
  '/student/profile',
];

function resolveStudentPath(pathname) {
  if (VALID_STUDENT_PATHS.includes(pathname)) {
    return pathname;
  }
  return '/student/radar';
}

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState(() =>
    resolveStudentPath(window.location.pathname)
  );

  // Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState('login');
  const [authRoleChoice, setAuthRoleChoice] = useState('student');

  // Sync browser URL back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(resolveStudentPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigatePage = (nextPath) => {
    const target = resolveStudentPath(nextPath);
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
          if (
            profile.role === 'student' &&
            !VALID_STUDENT_PATHS.includes(window.location.pathname)
          ) {
            window.history.replaceState({}, '', '/student/radar');
            setCurrentPath('/student/radar');
          }
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
  };

  const handleAuthSuccess = (authUser) => {
    setUser(authUser);
    if (authUser?.role === 'student') {
      handleNavigatePage('/student/radar');
    }
  };

  if (initialLoading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', color: '#D97706' }}>
          <span style={{ fontSize: '2.5rem' }}>🥖</span>
          <p style={{ marginTop: '12px', fontSize: '1rem', color: '#64748B' }}>Connecting to Vif backend...</p>
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
          <LandingPage 
            onOpenAuth={handleOpenAuth}
          />
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
