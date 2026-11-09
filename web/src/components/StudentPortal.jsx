import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  Flame, 
  AlertCircle, 
  CheckCircle2, 
  QrCode, 
  RefreshCw, 
  Navigation, 
  Upload, 
  Hourglass,
  Store,
  FileCheck,
  Check,
  History,
  User as UserIcon,
  Edit3,
  Award,
  Calendar,
  Mail,
  Phone,
  GraduationCap,
  Heart,
  Save,
  Compass
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import SurplusRadarMap from './SurplusRadarMap';

const PARIS_ZONES = [
  { name: '40 Rue du Dr Roux (15ème)', lat: 48.8468616, lng: 2.3099973, address: '40 Rue du Docteur Roux, 75015 Paris', desc: 'Pasteur & Vaugirard' },
  { name: 'Le Marais', lat: 48.8575, lng: 2.3598, address: '26 Rue des Rosiers, 75004 Paris', desc: 'Commerces & Cafés' },
  { name: 'Sorbonne / Quartier Latin', lat: 48.8484, lng: 2.3438, address: '47 Boulevard Saint-Germain, 75005 Paris', desc: 'Universités & Écoles' },
  { name: 'Bastille / 11ème', lat: 48.8531, lng: 2.3698, address: '17 Rue Breguet, 75011 Paris', desc: 'Boulangeries Artisanales' },
  { name: 'République', lat: 48.8675, lng: 2.3638, address: '20 Rue Jean-Pierre Timbaud, 75011 Paris', desc: 'Pôle Étudiant & Métro' },
  { name: 'Montparnasse', lat: 48.8421, lng: 2.3219, address: '14 Rue du Départ, 75015 Paris', desc: 'Campus Sud' },
];

export default function StudentPortal({ user, onUserUpdate }) {
  // Location
  const [selectedZone, setSelectedZone] = useState(PARIS_ZONES[0]);
  const [coords, setCoords] = useState({ lat: PARIS_ZONES[0].lat, lng: PARIS_ZONES[0].lng });
  const [studentAddress, setStudentAddress] = useState(PARIS_ZONES[0].address);
  const [addressQuery, setAddressQuery] = useState('');
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [locating, setLocating] = useState(false);

  // Pulses feed
  const [pulses, setPulses] = useState([]);
  const [loadingPulses, setLoadingPulses] = useState(false);
  const [feedError, setFeedError] = useState(null);

  // Active claim state
  const [activeClaim, setActiveClaim] = useState(() => {
    const saved = localStorage.getItem('vif_active_claim');
    return saved ? JSON.parse(saved) : null;
  });
  const [timeRemaining, setTimeRemaining] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [selectedRouteTarget, setSelectedRouteTarget] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  // Verification upload state
  const [uploadingId, setUploadingId] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // Active workspace tab: 'radar' | 'history' | 'profile'
  const [activeTab, setActiveTab] = useState('radar');

  // Student History state
  const [historyData, setHistoryData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');

  // Student Profile Edit state
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    university: user?.university || '',
    study_level: user?.study_level || '',
    dietary_preferences: user?.dietary_preferences || '',
    default_address: user?.default_address || '40 Rue du Docteur Roux, 75015 Paris',
    bio: user?.bio || '',
    new_password: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Toast / notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Sync profileForm when user prop updates
  useEffect(() => {
    if (user) {
      setProfileForm((prev) => ({
        ...prev,
        full_name: user.full_name ?? prev.full_name ?? '',
        email: user.email ?? prev.email ?? '',
        phone: user.phone ?? prev.phone ?? '',
        university: user.university ?? prev.university ?? '',
        study_level: user.study_level ?? prev.study_level ?? '',
        dietary_preferences: user.dietary_preferences ?? prev.dietary_preferences ?? '',
        default_address: user.default_address || prev.default_address || '40 Rue du Docteur Roux, 75015 Paris',
        bio: user.bio ?? prev.bio ?? '',
      }));
    }
  }, [user]);

  const fetchStudentHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.getStudentHistory();
      setHistoryData(data);
      if (data && onUserUpdate) {
        onUserUpdate({
          ...user,
          email: data.email,
          full_name: data.full_name,
          phone: data.phone,
          university: data.university,
          study_level: data.study_level,
          dietary_preferences: data.dietary_preferences,
          default_address: data.default_address,
          bio: data.bio,
          karma_score: data.karma_score,
          is_verified: data.is_verified,
          id_verification_status: data.id_verification_status,
          student_card_start_date: data.student_card_start_date,
          student_card_end_date: data.student_card_end_date,
        });
      }
    } catch (err) {
      console.error('Failed to fetch student history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchStudentHistory();
  }, []);

  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'profile') {
      fetchStudentHistory();
    }
  }, [activeTab]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        full_name: profileForm.full_name,
        email: profileForm.email,
        phone: profileForm.phone,
        university: profileForm.university,
        study_level: profileForm.study_level,
        dietary_preferences: profileForm.dietary_preferences,
        default_address: profileForm.default_address,
        bio: profileForm.bio,
      };
      if (profileForm.new_password && profileForm.new_password.trim()) {
        payload.new_password = profileForm.new_password.trim();
      }
      const updatedUser = await api.updateStudentProfile(payload);
      if (onUserUpdate) {
        onUserUpdate(updatedUser);
      }
      setProfileForm((prev) => ({ ...prev, new_password: '' }));
      showToast('Student profile updated and saved to database!', 'success');
      fetchStudentHistory();
    } catch (err) {
      console.error('Profile update failed:', err);
      showToast(err.message || 'Could not update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Fetch nearby pulses when coordinates change
  useEffect(() => {
    fetchNearbyPulses();
  }, [coords]);

  // Reverse geocode coordinates into exact street address (e.g. "40 Rue du Docteur Roux, 75015 Paris")
  const reverseGeocode = async (lat, lng) => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=fr`
      );
      if (!resp.ok) return;
      const data = await resp.json();
      const addr = data.address || {};
      const num = addr.house_number || '';
      const road = addr.road || addr.pedestrian || addr.suburb || '';
      const postcode = addr.postcode || '75015';
      const city = addr.city || addr.town || 'Paris';

      let exactAddr = '';
      if (num && road) {
        exactAddr = `${num} ${road}, ${postcode} ${city}`;
      } else if (road) {
        exactAddr = `${road}, ${postcode} ${city}`;
      } else if (data.display_name) {
        exactAddr = data.display_name.split(',').slice(0, 3).join(', ');
      }
      if (exactAddr) {
        setStudentAddress(exactAddr);
      }
    } catch (e) {
      console.warn('Reverse geocoding skipped:', e);
    }
  };

  // Auto-detect exact GPS on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCoords({ lat: latitude, lng: longitude });
          setSelectedZone({ name: 'Exact GPS Location', lat: latitude, lng: longitude });
          reverseGeocode(latitude, longitude);
        },
        () => {
          // Keep default 40 Rue du Docteur Roux, 75015 Paris if permission declined
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  // Persist active claim
  useEffect(() => {
    if (activeClaim) {
      localStorage.setItem('vif_active_claim', JSON.stringify(activeClaim));
    } else {
      localStorage.removeItem('vif_active_claim');
    }
  }, [activeClaim]);

  // Countdown timer for active claim
  useEffect(() => {
    if (!activeClaim || !activeClaim.claim_deadline) return;

    const timer = setInterval(() => {
      const deadline = new Date(activeClaim.claim_deadline).getTime();
      const now = new Date().getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        clearInterval(timer);
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeClaim]);

  const fetchNearbyPulses = async () => {
    setLoadingPulses(true);
    setFeedError(null);
    try {
      const data = await api.getNearbyPulses(coords.lat, coords.lng);
      const list = Array.isArray(data) ? data : [];
      setPulses(list);

      // If activeClaim exists without coordinates, enrich it from matching pulse
      if (activeClaim && (!activeClaim.latitude || !activeClaim.longitude)) {
        const matched = list.find(
          (p) => p.pulse_id === activeClaim.pulse_id || p.shop_name === activeClaim.shop_name
        );
        if (matched && matched.latitude && matched.longitude) {
          setActiveClaim((prev) => ({
            ...prev,
            latitude: matched.latitude,
            longitude: matched.longitude,
            distance_meters: matched.distance_meters,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch nearby pulses from backend:', err);
      setFeedError(err.message || 'Could not connect to nearby feed.');
      setPulses([]);
    } finally {
      setLoadingPulses(false);
    }
  };

  const handleZoneSelect = (zone) => {
    setSelectedZone(zone);
    setCoords({ lat: zone.lat, lng: zone.lng });
    if (zone.address) {
      setStudentAddress(zone.address);
    } else {
      reverseGeocode(zone.lat, zone.lng);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setSelectedZone({ name: 'My Current Location (GPS)', lat: latitude, lng: longitude });
        await reverseGeocode(latitude, longitude);
        setLocating(false);
        showToast('Locked onto your exact GPS street address!');
      },
      (err) => {
        console.error(err);
        setLocating(false);
        showToast('Could not fetch GPS. Using 40 Rue du Docteur Roux, 75015 Paris.', 'error');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleMapLocationChange = async (lat, lng) => {
    setCoords({ lat, lng });
    setSelectedZone({ name: 'Custom Map Pin', lat, lng });
    await reverseGeocode(lat, lng);
    showToast('Student pin moved! Radar updated to new street address.');
  };

  const handleAddressSearch = async (e) => {
    e.preventDefault();
    const q = addressQuery.trim();
    if (!q) return;
    setSearchingAddress(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1&accept-language=fr`
      );
      const results = await resp.json();
      if (Array.isArray(results) && results.length > 0) {
        const hit = results[0];
        const lat = parseFloat(hit.lat);
        const lng = parseFloat(hit.lon);
        setCoords({ lat, lng });
        setSelectedZone({ name: q, lat, lng });
        await reverseGeocode(lat, lng);
        setAddressQuery('');
        showToast(`Location set to ${hit.display_name.split(',').slice(0, 2).join(', ')}`);
      } else {
        showToast('Could not find that street address. Try adding "Paris".', 'error');
      }
    } catch (err) {
      console.error('Address search failed:', err);
      showToast('Error searching address.', 'error');
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleClaimPulse = async (pulse) => {
    if (activeClaim) {
      showToast('You already have an active reservation! Collect it first.', 'error');
      return;
    }
    setClaimLoading(true);
    try {
      const res = await api.createClaim(pulse.pulse_id);
      setActiveClaim({
        ...res,
        shop_name: pulse.shop_name,
        shop_address: pulse.shop_address,
        item_name: pulse.item_name,
        latitude: pulse.latitude,
        longitude: pulse.longitude,
        distance_meters: pulse.distance_meters,
      });
      setSelectedRouteTarget(null);
      showToast(`Meal reserved at ${pulse.shop_name}! Street route & 20-min QR challenge active.`);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
      fetchNearbyPulses();
      fetchStudentHistory();
    } catch (err) {
      console.error('API createClaim error:', err);
      showToast(err.message || 'Could not create reservation.', 'error');
    } finally {
      setClaimLoading(false);
    }
  };

  const handleIdUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(true);
    try {
      const res = await api.verifyStudentId(file);
      setVerificationResult(res);
      if (res.verified) {
        showToast(res.message || 'Student ID verified by backend OCR! Priority window unlocked.', 'success');
        if (onUserUpdate) {
          onUserUpdate({ ...user, is_verified: true, id_verification_status: 'verified' });
        }
      } else {
        showToast(res.message || 'Card verification failed.', 'error');
        if (onUserUpdate) {
          onUserUpdate({ ...user, is_verified: false, id_verification_status: res.status });
        }
      }
      fetchNearbyPulses();
      fetchStudentHistory();
    } catch (err) {
      console.error('ID upload failed:', err);
      showToast(err.message || 'Failed to verify ID card.', 'error');
    } finally {
      setUploadingId(false);
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

      {/* Hero Sub-header */}
      <div className="portal-header glass-panel">
        <div className="portal-header-content">
          <div className="badge badge-emerald">
            <span className="live-indicator"></span> Live Surplus Radar (&lt;1000m)
          </div>
          <h2 className="portal-title">Real-Time Bakery Meals for Students</h2>
          <p className="portal-desc">
            Boulangeries in Paris post their surplus before closing. 
            Claim a meal in one click, show your QR code within 20 minutes, and eat for free.
          </p>
        </div>

        {/* Karma Score Card */}
        <div className="karma-stat-card glass-card">
          <div className="karma-header-row">
            <span className="karma-card-title">Reliability Karma</span>
            <Flame size={18} color="#F59E0B" />
          </div>
          <div className="karma-score-number">{user?.karma_score ?? 50}<span>/100</span></div>
          <div className="karma-progress-bar">
            <div 
              className="karma-progress-fill" 
              style={{ width: `${Math.min(100, user?.karma_score ?? 50)}%` }}
            ></div>
          </div>
          <p className="karma-explanation">
            Keep karma above 30. Ghosting a reservation deducts 10 points. Timely pickups preserve access!
          </p>
        </div>
      </div>

      {/* Student Workspace Navigation Bar: Radar | History | Profile */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 18px',
          marginBottom: '22px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('radar')}
            className={`btn btn-sm ${activeTab === 'radar' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', fontSize: '0.88rem' }}
          >
            <Compass size={16} />
            Live Surplus Radar & Map
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', fontSize: '0.88rem' }}
          >
            <History size={16} />
            Student History & Details
            {historyData?.total_claims !== undefined && (
              <span
                style={{
                  background: activeTab === 'history' ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                  color: activeTab === 'history' ? '#FFF' : '#0F172A',
                  padding: '1px 7px',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {historyData.total_claims}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`btn btn-sm ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', fontSize: '0.88rem' }}
          >
            <UserIcon size={16} />
            My Profile & Edit
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: '#475569' }}>
          <span>
            👤 <strong>{user?.full_name || user?.email?.split('@')[0] || 'Student'}</strong>
          </span>
          {user?.university && (
            <>
              <span>·</span>
              <span>🎓 {user.university}</span>
            </>
          )}
          <span>·</span>
          {user?.is_verified ? (
            <span className="badge badge-emerald" style={{ padding: '2px 8px' }}>Verified Card</span>
          ) : (
            <span className="badge badge-amber" style={{ padding: '2px 8px' }}>Unverified</span>
          )}
        </div>
      </div>

      {/* TAB 2: STUDENT HISTORY & COMPLETE DETAILS */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
          {/* Student Complete Dossier & Verification Summary */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
              <div>
                <div className="badge badge-indigo" style={{ marginBottom: '6px' }}>
                  <History size={13} /> Complete Student Dossier & Activity Log
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Student Details & Meal Claim History
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '4px' }}>
                  All recorded details, student card validity dates, reliability karma, and meal reservations linked to your account.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={fetchStudentHistory}
                  disabled={loadingHistory}
                >
                  <RefreshCw size={14} className={loadingHistory ? 'spin' : ''} />
                  Refresh History
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setActiveTab('profile')}
                >
                  <Edit3 size={14} />
                  Edit Student Profile
                </button>
              </div>
            </div>

            {/* Impact & Karma KPI Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))',
                gap: '12px',
                marginBottom: '22px',
              }}
            >
              <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid #6366F1' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Total Reservations</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                  {historyData?.total_claims ?? 0}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#6366F1', marginTop: '2px' }}>All-time claimed baskets</div>
              </div>

              <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid #10B981' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Meals Collected</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#065F46', marginTop: '4px' }}>
                  {historyData?.collected_count ?? 0}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#10B981', marginTop: '2px' }}>Picked up on time (+5 Karma)</div>
              </div>

              <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid #F59E0B' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Active / Pending</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#B45309', marginTop: '4px' }}>
                  {historyData?.pending_count ?? 0}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#D97706', marginTop: '2px' }}>Awaiting bakery QR scan</div>
              </div>

              <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid #EF4444' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Ghosted / Missed</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#991B1B', marginTop: '4px' }}>
                  {historyData?.ghosted_count ?? 0}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#EF4444', marginTop: '2px' }}>Expired reservations (-10 Karma)</div>
              </div>

              <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid #0EA5E9' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Food Waste Saved</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0369A1', marginTop: '4px' }}>
                  {historyData?.estimated_food_saved_kg ?? 0} <span style={{ fontSize: '0.95rem' }}>kg</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: '#0284C7', marginTop: '2px' }}>Loi Garot ecological impact</div>
              </div>

              <div className="glass-card" style={{ padding: '14px 16px', borderLeft: '4px solid #8B5CF6' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Student Savings</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#5B21B6', marginTop: '4px' }}>
                  €{(historyData?.estimated_money_saved_eur ?? 0).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#7C3AED', marginTop: '2px' }}>Estimated retail value saved</div>
              </div>
            </div>

            {/* All Student Account & Verification Details Grid */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '18px',
              }}
            >
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GraduationCap size={18} color="#D97706" />
                Registered Student Information & Verification Record
              </h4>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '14px',
                  fontSize: '0.86rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Full Name</span>
                  <strong style={{ color: '#0F172A' }}>{historyData?.full_name || user?.full_name || 'Not set (Edit in Profile)'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>University Email</span>
                  <strong style={{ color: '#0F172A' }}>{historyData?.email || user?.email}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Student Account UUID</span>
                  <strong style={{ color: '#475569', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    {historyData?.student_id || user?.id || '—'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>University / Institution</span>
                  <strong style={{ color: '#0F172A' }}>{historyData?.university || user?.university || 'EPITECH / Paris University'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Academic Program / Level</span>
                  <strong style={{ color: '#0F172A' }}>{historyData?.study_level || user?.study_level || 'Not specified'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Phone Number</span>
                  <strong style={{ color: '#0F172A' }}>{historyData?.phone || user?.phone || 'Not provided'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Student ID OCR Status</span>
                  <span className={`badge ${historyData?.is_verified ? 'badge-emerald' : 'badge-amber'}`} style={{ marginTop: '2px', display: 'inline-flex' }}>
                    {historyData?.is_verified ? '✓ Verified Student Card' : `Status: ${historyData?.id_verification_status || 'pending'}`}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Card Validity Period (OCR Extracted)</span>
                  <strong style={{ color: '#0F172A' }}>
                    {historyData?.student_card_start_date || historyData?.student_card_end_date
                      ? `${historyData?.student_card_start_date || 'N/A'} → ${historyData?.student_card_end_date || 'N/A'}`
                      : 'Upload student card to extract dates'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Current Location / Default Address</span>
                  <strong style={{ color: '#0F172A' }}>{historyData?.default_address || studentAddress}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Dietary Preferences & Allergies</span>
                  <strong style={{ color: '#0F172A' }}>{historyData?.dietary_preferences || user?.dietary_preferences || 'None specified'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Reliability Karma Score</span>
                  <strong style={{ color: '#D97706' }}>{historyData?.karma_score ?? user?.karma_score ?? 50} / 100 pts</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Student Bio / Notes</span>
                  <strong style={{ color: '#0F172A' }}>{historyData?.bio || user?.bio || '—'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Complete Claim & Meal Reservation Log */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Chronological Meal Reservations & Pickups ({historyData?.claims?.length ?? 0})
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#64748B', marginTop: '2px' }}>
                  Every basket claimed by you across Paris partner boulangeries, including QR tokens, pickup timestamps, and road map links.
                </p>
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { key: 'all', label: `All (${historyData?.total_claims ?? 0})` },
                  { key: 'pending', label: `Pending (${historyData?.pending_count ?? 0})` },
                  { key: 'collected', label: `Collected (${historyData?.collected_count ?? 0})` },
                  { key: 'ghosted', label: `Ghosted (${historyData?.ghosted_count ?? 0})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`zone-pill-btn ${historyFilter === tab.key ? 'active' : ''}`}
                    onClick={() => setHistoryFilter(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingHistory ? (
              <div className="loading-card" style={{ padding: '32px', textAlign: 'center' }}>
                <RefreshCw size={26} className="spin" color="#F59E0B" />
                <p style={{ marginTop: '10px', color: '#64748B' }}>Loading your complete student history from PostgreSQL...</p>
              </div>
            ) : !historyData?.claims || historyData.claims.length === 0 ? (
              <div className="empty-feed-card" style={{ padding: '36px', textAlign: 'center' }}>
                <Store size={38} color="#94A3B8" />
                <h4 style={{ marginTop: '10px', color: '#0F172A' }}>No Meal Claims Recorded Yet</h4>
                <p style={{ color: '#64748B', maxWidth: '460px', margin: '6px auto 16px' }}>
                  When you claim a free bakery meal from the Surplus Radar, all reservation details, QR tokens, and pickup timestamps will appear here.
                </p>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setActiveTab('radar')}>
                  <Compass size={15} /> Go to Surplus Radar
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {historyData.claims
                  .filter((item) => (historyFilter === 'all' ? true : item.status === historyFilter))
                  .map((claim) => {
                    const isCollected = claim.status === 'collected';
                    const isGhosted = claim.status === 'ghosted';
                    const isPending = claim.status === 'pending';

                    return (
                      <div
                        key={claim.claim_id}
                        className="glass-card"
                        style={{
                          padding: '16px 20px',
                          borderLeft: `4px solid ${isCollected ? '#10B981' : isGhosted ? '#EF4444' : '#F59E0B'}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                🥖 {claim.shop_name}
                              </h4>
                              {claim.shop_siret && (
                                <span style={{ fontSize: '0.73rem', color: '#64748B', background: '#F1F5F9', padding: '2px 7px', borderRadius: '4px' }}>
                                  SIRET: {claim.shop_siret}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: '0.83rem', color: '#475569', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <MapPin size={13} color="#D97706" />
                              {claim.shop_address || 'Paris Partner Boulangerie'}
                            </p>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {isCollected && (
                              <span className="badge badge-emerald">
                                <CheckCircle2 size={13} /> Collected (+5 Karma)
                              </span>
                            )}
                            {isPending && (
                              <span className="badge badge-amber">
                                <Hourglass size={13} /> Active / Pending Pickup
                              </span>
                            )}
                            {isGhosted && (
                              <span className="badge badge-rose">
                                <AlertCircle size={13} /> Ghosted (-10 Karma)
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          style={{
                            background: '#FFFBEB',
                            border: '1px solid #FDE68A',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '10px',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: '#92400E', fontSize: '0.92rem' }}>
                              {claim.item_name} <span style={{ fontWeight: 600, color: '#B45309' }}>(Qty: {claim.quantity})</span>
                            </div>
                            {claim.description && (
                              <div style={{ fontSize: '0.8rem', color: '#78350F', marginTop: '2px' }}>{claim.description}</div>
                            )}
                          </div>
                          <div style={{ fontSize: '0.76rem', fontFamily: 'monospace', color: '#475569', background: '#FFFFFF', padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                            QR Token: <strong>{claim.qr_code_token}</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', fontSize: '0.79rem', color: '#64748B' }}>
                          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <span>
                              📅 <strong>Claimed:</strong> {new Date(claim.claimed_at).toLocaleString()}
                            </span>
                            <span>
                              ⏰ <strong>Deadline:</strong> {new Date(claim.claim_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {claim.collected_at && (
                              <span style={{ color: '#059669', fontWeight: 600 }}>
                                ✓ Collected at: {new Date(claim.collected_at).toLocaleString()}
                              </span>
                            )}
                            {claim.ghosted_at && (
                              <span style={{ color: '#DC2626', fontWeight: 600 }}>
                                ✕ Ghosted at: {new Date(claim.ghosted_at).toLocaleString()}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            {claim.latitude && claim.longitude && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setSelectedRouteTarget({
                                    pulse_id: claim.pulse_id,
                                    shop_name: claim.shop_name,
                                    shop_address: claim.shop_address,
                                    item_name: claim.item_name,
                                    latitude: claim.latitude,
                                    longitude: claim.longitude,
                                  });
                                  setActiveTab('radar');
                                  showToast(`Showing street route to ${claim.shop_name} on map!`);
                                }}
                              >
                                <Navigation size={13} />
                                View Route on Map
                              </button>
                            )}
                            {isPending && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                  setActiveClaim({
                                    claim_id: claim.claim_id,
                                    pulse_id: claim.pulse_id,
                                    qr_code_token: claim.qr_code_token,
                                    status: claim.status,
                                    claim_deadline: claim.claim_deadline,
                                    shop_name: claim.shop_name,
                                    shop_address: claim.shop_address,
                                    item_name: claim.item_name,
                                    latitude: claim.latitude,
                                    longitude: claim.longitude,
                                  });
                                  setActiveTab('radar');
                                }}
                              >
                                <QrCode size={13} />
                                Open Active QR & Route
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: STUDENT PROFILE & EDIT SECTION */}
      {activeTab === 'profile' && (
        <div className="portal-grid" style={{ marginBottom: '28px' }}>
          <div className="portal-main-column">
            <div className="glass-panel" style={{ padding: '26px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div className="badge badge-indigo" style={{ marginBottom: '6px' }}>
                  <Edit3 size={13} /> Editable Student Profile
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Edit Your Student Profile & Preferences
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#64748B', marginTop: '4px' }}>
                  Keep your academic details, contact information, default Paris address, and dietary needs up to date.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserIcon size={14} color="#D97706" /> Full Name
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Muhammad Abdul MOIZ"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={14} color="#D97706" /> University Email (.edu, .eu, .ac.uk, .univ)
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="student@epitech.eu"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <GraduationCap size={14} color="#D97706" /> University / School
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. EPITECH Paris"
                      value={profileForm.university}
                      onChange={(e) => setProfileForm({ ...profileForm, university: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Award size={14} color="#D97706" /> Academic Program / Year
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Master 1 / Promo 2026"
                      value={profileForm.study_level}
                      onChange={(e) => setProfileForm({ ...profileForm, study_level: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={14} color="#D97706" /> Phone Number
                    </label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. +33 6 12 34 56 78"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Heart size={14} color="#D97706" /> Dietary Preferences & Allergies
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Vegetarian, Halal, No peanuts"
                      value={profileForm.dietary_preferences}
                      onChange={(e) => setProfileForm({ ...profileForm, dietary_preferences: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} color="#D97706" /> Default Paris Street Address (for Surplus Radar)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flex: '1', minWidth: '240px' }}
                      placeholder="e.g. 40 Rue du Docteur Roux, 75015 Paris"
                      value={profileForm.default_address}
                      onChange={(e) => setProfileForm({ ...profileForm, default_address: e.target.value })}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={async () => {
                        const q = (profileForm.default_address || '').trim();
                        if (!q) return;
                        try {
                          const resp = await fetch(
                            `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1&accept-language=fr`
                          );
                          const results = await resp.json();
                          if (Array.isArray(results) && results.length > 0) {
                            const lat = parseFloat(results[0].lat);
                            const lng = parseFloat(results[0].lon);
                            setCoords({ lat, lng });
                            setStudentAddress(q);
                            setSelectedZone({ name: q, lat, lng });
                            showToast(`Radar map pin updated to ${q}`);
                          } else {
                            showToast('Could not geocode address. Try adding postal code & Paris.', 'error');
                          }
                        } catch {
                          showToast('Failed to locate address.', 'error');
                        }
                      }}
                    >
                      <Navigation size={14} /> Apply to Radar Map
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Student Bio / Notes for Bakeries</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Short note about yourself, campus schedule, or favorite bakery items..."
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group" style={{ paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                  <label className="form-label">Change Account Password (Optional)</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Leave blank to keep current password (min. 6 characters)"
                    value={profileForm.new_password}
                    onChange={(e) => setProfileForm({ ...profileForm, new_password: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setActiveTab('history')}
                  >
                    View Student History
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingProfile}
                  >
                    <Save size={16} />
                    {savingProfile ? 'Saving Profile...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column in Profile Tab: Live Student Card Preview & OCR Upload */}
          <div className="portal-side-column">
            <div className="glass-panel" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                  }}
                >
                  {(profileForm.full_name || user?.email || 'S')[0].toUpperCase()}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                    {profileForm.full_name || 'Student Profile'}
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                    {profileForm.university || 'University Student'} {profileForm.study_level ? `· ${profileForm.study_level}` : ''}
                  </p>
                </div>
              </div>

              <div style={{ fontSize: '0.83rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                <div><strong>Email:</strong> {profileForm.email || user?.email}</div>
                <div><strong>Phone:</strong> {profileForm.phone || 'Not set'}</div>
                <div><strong>Address:</strong> {profileForm.default_address || studentAddress}</div>
                <div><strong>Dietary:</strong> {profileForm.dietary_preferences || 'Standard'}</div>
                <div>
                  <strong>Card Validity:</strong>{' '}
                  {historyData?.student_card_start_date || user?.student_card_start_date
                    ? `${historyData?.student_card_start_date || user?.student_card_start_date} to ${historyData?.student_card_end_date || user?.student_card_end_date}`
                    : 'Upload student ID below'}
                </div>
              </div>

              {/* Student Verification Upload inside Profile as well */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>Student ID Card OCR</span>
                  {user?.is_verified ? (
                    <span className="badge badge-emerald"><CheckCircle2 size={12} /> Verified</span>
                  ) : (
                    <span className="badge badge-amber">Pending</span>
                  )}
                </div>

                <label className="upload-dropzone" style={{ padding: '16px' }}>
                  <Upload size={20} color="#F59E0B" />
                  <span className="dropzone-text" style={{ fontSize: '0.84rem' }}>
                    {uploadingId ? 'Scanning Card with OCR...' : 'Re-upload / Update Student ID Card'}
                  </span>
                  <span className="dropzone-hint">Auto-extracts academic year & validity</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIdUpload}
                    disabled={uploadingId}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'radar' && (
      <div className="portal-grid">
        {/* Left Column: Nearby Pulses Feed */}
        <div className="portal-main-column">
          {/* Location Selector Bar */}
          <div className="location-toolbar glass-panel" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div className="location-toolbar-left">
                <MapPin size={18} color="#F59E0B" />
                <span className="location-label">Zone:</span>
                <div className="zone-pills">
                  {PARIS_ZONES.map((zone) => (
                    <button
                      key={zone.name}
                      className={`zone-pill-btn ${selectedZone.name === zone.name ? 'active' : ''}`}
                      onClick={() => handleZoneSelect(zone)}
                    >
                      {zone.name}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                className="btn btn-outline btn-sm"
                onClick={handleUseMyLocation}
                disabled={locating}
              >
                <Navigation size={14} />
                {locating ? 'Locating...' : 'Use Live GPS'}
              </button>
            </div>

            {/* Exact Street Address Display & Search */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', color: '#0F172A' }}>
                <span className="badge badge-indigo" style={{ padding: '3px 8px' }}>🎓 Exact Student Location</span>
                <strong>{studentAddress}</strong>
                <span style={{ color: '#64748B', fontSize: '0.76rem' }}>
                  ({coords.lat.toFixed(5)}°N, {coords.lng.toFixed(5)}°E)
                </span>
              </div>

              <form onSubmit={handleAddressSearch} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1', maxWidth: '340px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter exact street (e.g. 40 rue du Dr Roux, Paris)..."
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={searchingAddress} style={{ height: '32px', padding: '0 12px', whiteSpace: 'nowrap' }}>
                  {searchingAddress ? '...' : 'Set Address'}
                </button>
              </form>
            </div>
          </div>

          {/* Active Claim Spotlight (If present) */}
          {activeClaim && (
            <div className="active-claim-banner glass-panel">
              <div className="active-claim-header">
                <div className="badge badge-rose pulse-pill">
                  <Hourglass size={14} /> Active Reservation in Progress
                </div>
                <div className="claim-timer-box">
                  <Clock size={16} color="#F43F5E" />
                  <span className="timer-text">Pickup Window: <strong>{timeRemaining}</strong></span>
                </div>
              </div>

              <div className="active-claim-body">
                <div className="qr-code-wrapper">
                  <QRCodeSVG 
                    value={activeClaim.qr_code_token} 
                    size={160} 
                    bgColor="#FFFFFF"
                    fgColor="#070B13"
                    level="H"
                    includeMargin={true}
                  />
                  <span className="qr-token-label">Show to Baker at Checkout</span>
                  <div className="qr-token-string">{activeClaim.qr_code_token}</div>
                </div>

                <div className="claim-details-col">
                  <h3 className="claim-bakery-name">{activeClaim.shop_name || 'Boulangerie Partner'}</h3>
                  <p className="claim-bakery-addr">
                    <MapPin size={14} color="#94A3B8" /> {activeClaim.shop_address || 'Paris'}
                  </p>
                  {routeInfo && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '12px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: '#065F46'
                    }}>
                      <span>🚶 {routeInfo.walkMinutes} min walk</span>
                      <span>·</span>
                      <span>🚲 {routeInfo.bikeMinutes} min bike</span>
                      <span>·</span>
                      <span>📏 {routeInfo.distanceMeters}m via road (see green route on map below)</span>
                    </div>
                  )}
                  <div className="claim-item-highlight">
                    <span className="claim-item-name">{activeClaim.item_name || 'Surplus Meal'}</span>
                  </div>

                  <div className="claim-steps-list">
                    <div className="step-item">
                      <span className="step-number">1</span>
                      <span>Walk to the bakery before the 20-min countdown expires.</span>
                    </div>
                    <div className="step-item">
                      <span className="step-number">2</span>
                      <span>Show this challenge QR token to the bakery shopkeeper.</span>
                    </div>
                    <div className="step-item">
                      <span className="step-number">3</span>
                      <span>The shopkeeper validates the QR code on their screen to complete handover.</span>
                    </div>
                  </div>

                  <div className="claim-actions-row">
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        fetchNearbyPulses();
                        showToast('Feed refreshed from backend database.');
                      }}
                    >
                      <RefreshCw size={14} /> Refresh Radar
                    </button>
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setActiveClaim(null);
                          setSelectedRouteTarget(null);
                          setRouteInfo(null);
                          showToast('Reservation dismissed from view.');
                        }}
                      >
                        Dismiss View
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Geofence Map: Exact Locations of Student & Boulangeries */}
            <SurplusRadarMap 
              studentCoords={coords}
              studentAddress={studentAddress}
              pulses={pulses}
              selectedZoneName={selectedZone.name}
              onClaimPulse={handleClaimPulse}
              onLocationChange={handleMapLocationChange}
              activeClaim={activeClaim}
              selectedRouteTarget={selectedRouteTarget}
              onClearRouteTarget={() => setSelectedRouteTarget(null)}
              onRouteCalculated={setRouteInfo}
              claimLoading={claimLoading}
            />

          {/* Surplus Feed List */}
          <div className="feed-header-row">
            <h3 className="feed-title">
              Available Bakery Surplus Nearby ({pulses.length})
            </h3>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={fetchNearbyPulses}
              disabled={loadingPulses}
            >
              <RefreshCw size={14} className={loadingPulses ? 'spin' : ''} />
              Refresh Radar
            </button>
          </div>

          {loadingPulses ? (
            <div className="loading-card glass-panel">
              <RefreshCw size={28} className="spin" color="#F59E0B" />
              <p>Querying PostgreSQL PostGIS database for boulangeries within 1,000m...</p>
            </div>
          ) : feedError ? (
            <div className="empty-feed-card glass-panel">
              <AlertCircle size={36} color="#EF4444" />
              <h4>Feed Error</h4>
              <p>{feedError}</p>
            </div>
          ) : pulses.length === 0 ? (
            <div className="empty-feed-card glass-panel">
              <Store size={40} color="#64748B" />
              <h4>No Surplus Pulses in this 1 km Area Right Now</h4>
              <p>Bakeries post surplus pulses in real-time between 16:30 and 20:00. Try switching to Le Marais or another zone!</p>
            </div>
          ) : (
            <div className="pulse-cards-list">
              {pulses.map((pulse) => (
                <div key={pulse.pulse_id} className="pulse-card glass-card">
                  <div className="pulse-card-top">
                    <div className="pulse-shop-info">
                      <h4 className="pulse-shop-name">{pulse.shop_name}</h4>
                      <p className="pulse-shop-address">
                        <MapPin size={13} color="#94A3B8" /> {pulse.shop_address}
                      </p>
                    </div>
                    <div className="pulse-badges">
                      <span className="badge badge-indigo">
                        {pulse.distance_meters !== undefined ? `${Math.round(pulse.distance_meters)}m away` : '<1 km'}
                      </span>
                      <span className="badge badge-emerald" title="Estimated walking time from your location">
                        🚶 ~{Math.max(1, Math.round((pulse.distance_meters || 300) / 80))} min walk
                      </span>
                      {pulse.priority_window_active && (
                        <span className="badge badge-amber" title="10-minute priority window active">
                          <Sparkles size={12} /> Priority Window
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pulse-item-content">
                    <h4 className="pulse-item-title">{pulse.item_name}</h4>
                    {pulse.description && (
                      <p className="pulse-item-desc">{pulse.description}</p>
                    )}
                  </div>

                  <div className="pulse-card-footer">
                    <div className="quantity-remaining-pill">
                      <span className="qty-number">{pulse.quantity_remaining}</span>
                      <span className="qty-label">baskets available</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedRouteTarget(pulse)}
                        title="Show street road route and travel time on the map"
                      >
                        <Navigation size={14} />
                        Route on Map
                      </button>
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleClaimPulse(pulse)}
                        disabled={claimLoading || pulse.quantity_remaining <= 0 || Boolean(activeClaim)}
                      >
                        <QrCode size={16} />
                        {activeClaim ? 'Active Claim in Progress' : 'Claim Free Meal'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: ID Verification & Information */}
        <div className="portal-side-column">
          {/* Student Verification Card */}
          <div className="verification-card glass-panel">
            <div className="verification-card-header">
              <ShieldCheck size={24} color="#10B981" />
              <div>
                <h4 className="side-card-title">Student Verification</h4>
                <p className="side-card-sub">Privacy-by-Design OCR Scan</p>
              </div>
            </div>

            <p className="verification-body-text">
              Upload your student card or university certificate. Our backend scans valid keywords (<strong>ETUDIANT</strong>, <strong>IZLY</strong>, <strong>current academic year</strong>) and immediately discards the image.
            </p>

            <div className="id-status-row">
              <span className="status-label">Status:</span>
              {user?.is_verified ? (
                <span className="badge badge-emerald">
                  <CheckCircle2 size={13} /> Verified Student
                </span>
              ) : (
                <span className="badge badge-amber">Pending Verification</span>
              )}
            </div>

            <label className="upload-dropzone">
              <Upload size={22} color="#F59E0B" />
              <span className="dropzone-text">
                {uploadingId ? 'Uploading to OCR Service...' : 'Click to Upload Student Card'}
              </span>
              <span className="dropzone-hint">PNG, JPG, or PDF (instant verification)</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleIdUpload}
                disabled={uploadingId}
                style={{ display: 'none' }}
              />
            </label>

            {verificationResult && (
              <div className="ocr-result-box" style={{ borderColor: verificationResult.verified ? '#10B981' : '#EF4444' }}>
                {verificationResult.verified ? (
                  <FileCheck size={18} color="#10B981" />
                ) : (
                  <AlertCircle size={18} color="#EF4444" />
                )}
                <div>
                  <div className="ocr-title" style={{ color: verificationResult.verified ? '#10B981' : '#EF4444' }}>
                    {verificationResult.verified ? 'OCR Verification Successful' : 'OCR Verification Notice'}
                  </div>
                  <div className="ocr-keywords">
                    {verificationResult.message}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Legal & Safety Card */}
          <div className="safety-info-card glass-panel">
            <h4 className="side-card-title">French Food Law & Safety</h4>
            <div className="safety-points">
              <div className="safety-item">
                <CheckCircle2 size={14} color="#10B981" />
                <span>Compliant with <strong>Loi Garot</strong> against food waste.</span>
              </div>
              <div className="safety-item">
                <CheckCircle2 size={14} color="#10B981" />
                <span>Allergens and hygiene strictly meet <strong>EU Regulation 852/2004</strong>.</span>
              </div>
              <div className="safety-item">
                <CheckCircle2 size={14} color="#10B981" />
                <span>100% Free & Dignified for verified students.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
