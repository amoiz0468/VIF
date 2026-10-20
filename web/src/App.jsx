import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import StudentPortal from './components/StudentPortal';
import ShopkeeperPortal from './components/ShopkeeperPortal';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import { api, getStoredUser, getStoredToken, removeStoredToken, removeStoredUser, setStoredUser } from './api';

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [initialLoading, setInitialLoading] = useState(true);

  // Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState('login');
  const [authRoleChoice, setAuthRoleChoice] = useState('student');

  // Verify real user session on mount
  useEffect(() => {
    const initSession = async () => {
      const token = getStoredToken();
      if (token) {
        try {
          const profile = await api.getCurrentUser();
          setUser(profile);
          setStoredUser(profile);
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
  };

  const handleAuthSuccess = (authUser) => {
    setUser(authUser);
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
            onUserUpdate={(updated) => setUser(updated)} 
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
