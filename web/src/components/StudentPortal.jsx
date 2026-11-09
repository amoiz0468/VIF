import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Compass,
  MapPin,
  ShieldCheck,
  History,
  User as UserIcon,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import StudentRadarPage from '../pages/student/StudentRadarPage';
import StudentMapPage from '../pages/student/StudentMapPage';
import StudentVerificationPage from '../pages/student/StudentVerificationPage';
import StudentHistoryPage from '../pages/student/StudentHistoryPage';
import StudentProfilePage from '../pages/student/StudentProfilePage';

const PARIS_ZONES = [
  { name: '40 Rue du Dr Roux (15ème)', lat: 48.8468616, lng: 2.3099973, address: '40 Rue du Docteur Roux, 75015 Paris', desc: 'Pasteur & Vaugirard' },
  { name: 'Le Marais', lat: 48.8575, lng: 2.3598, address: '26 Rue des Rosiers, 75004 Paris', desc: 'Commerces & Cafés' },
  { name: 'Sorbonne / Quartier Latin', lat: 48.8484, lng: 2.3438, address: '47 Boulevard Saint-Germain, 75005 Paris', desc: 'Universités & Écoles' },
  { name: 'Bastille / 11ème', lat: 48.8531, lng: 2.3698, address: '17 Rue Breguet, 75011 Paris', desc: 'Boulangeries Artisanales' },
  { name: 'République', lat: 48.8675, lng: 2.3638, address: '20 Rue Jean-Pierre Timbaud, 75011 Paris', desc: 'Pôle Étudiant & Métro' },
  { name: 'Montparnasse', lat: 48.8421, lng: 2.3219, address: '14 Rue du Départ, 75015 Paris', desc: 'Campus Sud' },
];

export default function StudentPortal({
  user,
  currentPath = '/student/radar',
  onNavigatePage,
  onUserUpdate,
}) {
  // Location state
  const [selectedZone, setSelectedZone] = useState(PARIS_ZONES[0]);
  const [coords, setCoords] = useState({ lat: PARIS_ZONES[0].lat, lng: PARIS_ZONES[0].lng });
  const [studentAddress, setStudentAddress] = useState(PARIS_ZONES[0].address);
  const [addressQuery, setAddressQuery] = useState('');
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [locating, setLocating] = useState(false);

  // Pulses feed state
  const [pulses, setPulses] = useState([]);
  const [loadingPulses, setLoadingPulses] = useState(false);
  const [feedError, setFeedError] = useState(null);

  // Active claim & route state
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

  // Student History state
  const [historyData, setHistoryData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  // Toast notification state
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
        default_address:
          user.default_address || prev.default_address || '40 Rue du Docteur Roux, 75015 Paris',
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

  // Refresh history when navigating to history, profile, or verification page
  useEffect(() => {
    if (
      currentPath === '/student/history' ||
      currentPath === '/student/profile' ||
      currentPath === '/student/verification'
    ) {
      fetchStudentHistory();
    }
  }, [currentPath]);

  // Fetch nearby pulses when coordinates change
  useEffect(() => {
    fetchNearbyPulses();
  }, [coords]);

  // Reverse geocode coordinates into exact street address
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
      () => {
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
      showToast(
        `Meal reserved at ${pulse.shop_name}! Street route & 20-min QR challenge active.`
      );
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
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
        showToast(
          res.message || 'Student ID verified by backend OCR! Priority window unlocked.',
          'success'
        );
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

  const handleApplyDefaultAddressToMap = async () => {
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
        onNavigatePage('/student/map');
      } else {
        showToast('Could not geocode address. Try adding postal code & Paris.', 'error');
      }
    } catch {
      showToast('Failed to locate address.', 'error');
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

      {/* Render the Dedicated Page Component for the Current URL Route */}
      {currentPath === '/student/map' ? (
        <StudentMapPage
          zones={PARIS_ZONES}
          selectedZone={selectedZone}
          coords={coords}
          studentAddress={studentAddress}
          addressQuery={addressQuery}
          setAddressQuery={setAddressQuery}
          searchingAddress={searchingAddress}
          locating={locating}
          onZoneSelect={handleZoneSelect}
          onUseMyLocation={handleUseMyLocation}
          onMapLocationChange={handleMapLocationChange}
          onAddressSearch={handleAddressSearch}
          pulses={pulses}
          loadingPulses={loadingPulses}
          onRefreshPulses={fetchNearbyPulses}
          activeClaim={activeClaim}
          claimLoading={claimLoading}
          onClaimPulse={handleClaimPulse}
          selectedRouteTarget={selectedRouteTarget}
          setSelectedRouteTarget={setSelectedRouteTarget}
          routeInfo={routeInfo}
          setRouteInfo={setRouteInfo}
          onNavigatePage={onNavigatePage}
        />
      ) : currentPath === '/student/verification' ? (
        <StudentVerificationPage
          user={user}
          historyData={historyData}
          uploadingId={uploadingId}
          verificationResult={verificationResult}
          onIdUpload={handleIdUpload}
          onNavigatePage={onNavigatePage}
        />
      ) : currentPath === '/student/history' ? (
        <StudentHistoryPage
          user={user}
          studentAddress={studentAddress}
          historyData={historyData}
          loadingHistory={loadingHistory}
          onRefreshHistory={fetchStudentHistory}
          onNavigatePage={onNavigatePage}
          setSelectedRouteTarget={setSelectedRouteTarget}
          setActiveClaim={setActiveClaim}
          showToast={showToast}
        />
      ) : currentPath === '/student/profile' ? (
        <StudentProfilePage
          user={user}
          studentAddress={studentAddress}
          historyData={historyData}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          savingProfile={savingProfile}
          onSaveProfile={handleSaveProfile}
          onApplyDefaultAddressToMap={handleApplyDefaultAddressToMap}
          uploadingId={uploadingId}
          onIdUpload={handleIdUpload}
          onNavigatePage={onNavigatePage}
        />
      ) : (
        <StudentRadarPage
          user={user}
          zones={PARIS_ZONES}
          selectedZone={selectedZone}
          coords={coords}
          studentAddress={studentAddress}
          addressQuery={addressQuery}
          setAddressQuery={setAddressQuery}
          searchingAddress={searchingAddress}
          locating={locating}
          onZoneSelect={handleZoneSelect}
          onUseMyLocation={handleUseMyLocation}
          onMapLocationChange={handleMapLocationChange}
          onAddressSearch={handleAddressSearch}
          pulses={pulses}
          loadingPulses={loadingPulses}
          feedError={feedError}
          onRefreshPulses={fetchNearbyPulses}
          activeClaim={activeClaim}
          setActiveClaim={setActiveClaim}
          timeRemaining={timeRemaining}
          claimLoading={claimLoading}
          onClaimPulse={handleClaimPulse}
          selectedRouteTarget={selectedRouteTarget}
          setSelectedRouteTarget={setSelectedRouteTarget}
          routeInfo={routeInfo}
          setRouteInfo={setRouteInfo}
          onNavigatePage={onNavigatePage}
          showToast={showToast}
        />
      )}
    </div>
  );
}
