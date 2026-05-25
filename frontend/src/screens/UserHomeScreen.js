import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator, 
  RefreshControl, 
  TextInput, 
  Alert, 
  Image, 
  ScrollView 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';

const UserHomeScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('feed'); // 'feed', 'claims', 'verify'
  const [pulses, setPulses] = useState([]);
  const [activeClaim, setActiveClaim] = useState(null);
  
  // Location defaults to Paris for mock purposes
  const [lat, setLat] = useState('48.8566');
  const [lng, setLng] = useState('2.3522');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Identity verification state
  const [idStatus, setIdStatus] = useState('pending'); // 'pending', 'verified', etc.
  const [studentIdImage, setStudentIdImage] = useState(null);

  // Load user profile and initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await fetchUserProfile();
      await fetchNearbyPulses();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await client.get('/users/me');
      setIdStatus(response.data.id_verification_status || 'pending');
    } catch (error) {
      console.error("Failed to load user profile:", error);
    }
  };

  const fetchNearbyPulses = async () => {
    if (!lat || !lng) return;
    try {
      const response = await client.get(`/pulses/nearby`, {
        params: {
          lat: parseFloat(lat),
          lng: parseFloat(lng)
        }
      });
      setPulses(response.data);
    } catch (error) {
      console.error("Failed to fetch nearby pulses:", error);
      Alert.alert('Error', 'Could not fetch nearby marketplace items.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNearbyPulses();
    fetchUserProfile();
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    navigation.replace('Login');
  };

  const handleClaimPulse = async (pulseId) => {
    setSubmitting(true);
    try {
      const response = await client.post('/claims/create', {
        pulse_id: pulseId
      });
      
      setActiveClaim(response.data);
      Alert.alert('Reservation Confirmed', response.data.message);
      setActiveTab('claims');
      fetchNearbyPulses(); // Refresh list to update quantities
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || 'Failed to claim item.';
      Alert.alert('Reservation Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please grant library permissions to upload your ID card.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setStudentIdImage(result.assets[0].uri);
    }
  };

  const handleVerifyId = async () => {
    if (!studentIdImage) {
      Alert.alert('Photo Required', 'Please select a photo of your student ID card.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('upload', {
        uri: studentIdImage,
        name: 'student_id.jpg',
        type: 'image/jpeg'
      });

      const response = await client.post('/student/verify-id', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setIdStatus(response.data.status);
      Alert.alert('Success', response.data.message);
      setStudentIdImage(null);
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || 'Failed to verify student ID.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Render marketplace feed item
  const renderPulseItem = ({ item }) => {
    const isDonation = item.is_donation;
    const distanceKm = (item.distance_meters / 1000).toFixed(2);
    
    return (
      <View style={styles.card}>
        <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.cardGradient}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.item_name}</Text>
              <Text style={styles.shopName}><Ionicons name="storefront" size={13} color="#94A3B8" /> {item.shop_name}</Text>
              <Text style={styles.shopAddress}><Ionicons name="location-outline" size={13} color="#64748B" /> {item.shop_address || 'No Address'}</Text>
            </View>
            <View style={[styles.badge, isDonation ? styles.donationBadge : styles.wholesaleBadge]}>
              <Text style={[styles.badgeText, isDonation ? styles.donationBadgeText : styles.wholesaleBadgeText]}>
                {isDonation ? 'FREE DONATION' : 'WHOLESALE'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.description}>{item.description || 'No description provided.'}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>DISTANCE</Text>
              <Text style={styles.statValue}>{distanceKm} km</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>AVAILABLE</Text>
              <Text style={styles.statValue}>{item.quantity_remaining} Left</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>EXPIRES</Text>
              <Text style={[styles.statValue, styles.expiryValue]}>
                {new Date(item.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          {item.priority_window_active && (
            <View style={styles.priorityBanner}>
              <Ionicons name="shield-checkmark" size={16} color="#F59E0B" />
              <Text style={styles.priorityText}>Priority Window (Verified Students Only)</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.claimBtn, submitting ? styles.btnDisabled : null]}
            onPress={() => handleClaimPulse(item.pulse_id)}
            disabled={submitting}
          >
            <Text style={styles.claimBtnText}>{submitting ? 'Claiming...' : 'Claim & Reserve (1 Qty)'}</Text>
            <Ionicons name="bookmark-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.background} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>ViF Portal</Text>
            <Text style={styles.headerSubtitle}>Student Smart Marketplace</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Tab Selection */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'feed' ? styles.tabActive : null]}
            onPress={() => setActiveTab('feed')}
          >
            <Ionicons name="fast-food-outline" size={20} color={activeTab === 'feed' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'feed' ? styles.tabTextActive : null]}>Feed</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'claims' ? styles.tabActive : null]}
            onPress={() => setActiveTab('claims')}
          >
            <Ionicons name="qr-code-outline" size={20} color={activeTab === 'claims' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'claims' ? styles.tabTextActive : null]}>My Claim</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'verify' ? styles.tabActive : null]}
            onPress={() => setActiveTab('verify')}
          >
            <Ionicons name="id-card-outline" size={20} color={activeTab === 'verify' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === 'verify' ? styles.tabTextActive : null]}>ID Verify</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content Area */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loaderText}>Syncing feed...</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            
            {/* TAB: FEED */}
            {activeTab === 'feed' && (
              <View style={{ flex: 1 }}>
                {/* Geolocation Mocking Banner */}
                <View style={styles.locationBanner}>
                  <Ionicons name="locate-outline" size={18} color="#3B82F6" style={{ marginRight: 6 }} />
                  <Text style={styles.locationLabel}>Location Mocking (Lat/Lng):</Text>
                  <TextInput 
                    style={styles.locationInput}
                    value={lat}
                    onChangeText={setLat}
                    keyboardType="numeric"
                    placeholder="Lat"
                    placeholderTextColor="#64748B"
                  />
                  <TextInput 
                    style={styles.locationInput}
                    value={lng}
                    onChangeText={setLng}
                    keyboardType="numeric"
                    placeholder="Lng"
                    placeholderTextColor="#64748B"
                  />
                  <TouchableOpacity style={styles.locUpdateBtn} onPress={fetchNearbyPulses}>
                    <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={pulses}
                  keyExtractor={(item) => item.pulse_id}
                  renderItem={renderPulseItem}
                  contentContainerStyle={styles.list}
                  refreshControl={
                    <RefreshControl 
                      refreshing={refreshing} 
                      onRefresh={handleRefresh}
                      tintColor="#3B82F6"
                    />
                  }
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Ionicons name="cart-outline" size={60} color="#475569" />
                      <Text style={styles.emptyTitle}>No Food Pulses Nearby</Text>
                      <Text style={styles.emptySub}>No bakeries or restaurants have active surplus offers near your coordinates. Change location to Parisian default (48.8566, 2.3522) to test.</Text>
                    </View>
                  }
                />
              </View>
            )}

            {/* TAB: ACTIVE CLAIMS */}
            {activeTab === 'claims' && (
              <ScrollView contentContainerStyle={styles.claimsTabContainer}>
                {activeClaim ? (
                  <View style={styles.claimCard}>
                    <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.cardGradient}>
                      <Text style={styles.claimTitle}>Active Food Reservation</Text>
                      <Text style={styles.claimSub}>Present the code below to the shopkeeper to collect your items.</Text>

                      {/* Simulated QR Code Graphic */}
                      <View style={styles.qrWrapper}>
                        <View style={styles.qrBox}>
                          <Ionicons name="qr-code" size={140} color="#0F172A" />
                        </View>
                        <Text style={styles.qrCodeText}>{activeClaim.qr_code_token}</Text>
                      </View>

                      <View style={styles.claimDetailBlock}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Claim Status:</Text>
                          <View style={styles.statusBadge}>
                            <Text style={styles.statusBadgeText}>{activeClaim.status.toUpperCase()}</Text>
                          </View>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Deadline:</Text>
                          <Text style={styles.detailValue}>
                            {new Date(activeClaim.claim_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.claimWarning}>
                        <Ionicons name="warning-outline" size={14} color="#EF4444" /> Uncollected reservations within 20 minutes incur a karma penalty. Missing multiple claims locks your account.
                      </Text>

                      <TouchableOpacity 
                        style={styles.cancelClaimBtn}
                        onPress={() => {
                          setActiveClaim(null);
                          Alert.alert('Claim Hidden', 'This claim has been removed from screen. Your reservation still exists in database until expiration.');
                        }}
                      >
                        <Text style={styles.cancelClaimBtnText}>Clear From Screen</Text>
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                ) : (
                  <View style={styles.emptyClaimsBox}>
                    <Ionicons name="receipt-outline" size={64} color="#475569" style={{ marginBottom: 16 }} />
                    <Text style={styles.emptyTitle}>No Active Reservations</Text>
                    <Text style={styles.emptySub}>Go to the Marketplace Feed tab and claim food to generate an active QR token for pickup.</Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* TAB: ID VERIFICATION */}
            {activeTab === 'verify' && (
              <ScrollView contentContainerStyle={styles.verifyTabContainer}>
                <View style={styles.verifyCard}>
                  <Text style={styles.verifyTitle}>Academic Identity Verification</Text>
                  
                  {/* Status Indicator */}
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Verification Status:</Text>
                    <View style={[
                      styles.statusBadgeState, 
                      idStatus === 'verified' ? styles.badgeSuccess : styles.badgePending
                    ]}>
                      <Text style={styles.statusBadgeStateText}>{idStatus.toUpperCase()}</Text>
                    </View>
                  </View>

                  <Text style={styles.verifyDescription}>
                    Verify your academic status by uploading your student ID card. Verified students bypass wait times and access exclusive donation pulses.
                  </Text>

                  <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                    {studentIdImage ? (
                      <Image source={{ uri: studentIdImage }} style={styles.imagePreview} />
                    ) : (
                      <View style={styles.pickerPlaceholder}>
                        <Ionicons name="image-outline" size={48} color="#3B82F6" />
                        <Text style={styles.pickerText}>Select ID Document Card</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {studentIdImage && (
                    <TouchableOpacity 
                      style={[styles.submitVerifyBtn, submitting ? styles.btnDisabled : null]}
                      onPress={handleVerifyId}
                      disabled={submitting}
                    >
                      <Text style={styles.submitVerifyBtnText}>{submitting ? 'Processing OCR Text...' : 'Upload & Verify Card'}</Text>
                      <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}

          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    padding: 8,
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  locationLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginRight: 6,
  },
  locationInput: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 65,
    marginRight: 6,
    fontSize: 12,
    textAlign: 'center',
  },
  locUpdateBtn: {
    marginLeft: 'auto',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  shopName: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  shopAddress: {
    color: '#64748B',
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  donationBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  wholesaleBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  donationBadgeText: {
    color: '#10B981',
  },
  wholesaleBadgeText: {
    color: '#3B82F6',
  },
  description: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  expiryValue: {
    color: '#F59E0B',
  },
  priorityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    gap: 6,
  },
  priorityText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  claimBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  claimBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  claimsTabContainer: {
    padding: 20,
    alignItems: 'center',
  },
  claimCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
  },
  claimTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 6,
  },
  claimSub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  qrWrapper: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  qrBox: {
    marginBottom: 12,
  },
  qrCodeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
    letterSpacing: 0.5,
  },
  claimDetailBlock: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  detailValue: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  claimWarning: {
    color: '#EF4444',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  cancelClaimBtn: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelClaimBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyClaimsBox: {
    alignItems: 'center',
    marginTop: 100,
    paddingHorizontal: 24,
  },
  verifyTabContainer: {
    padding: 20,
  },
  verifyCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  verifyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 10,
  },
  statusBadgeState: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusBadgeStateText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#10B981',
  },
  verifyDescription: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  imagePickerBtn: {
    height: 180,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    marginBottom: 24,
  },
  pickerPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  pickerText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 14,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  submitVerifyBtn: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  submitVerifyBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default UserHomeScreen;
