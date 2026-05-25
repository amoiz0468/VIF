import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import client from '../api/client';

const AdminHomeScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('validate'); // 'validate', 'pulse', 'profile', 'tax'
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Shop details
  const [shopId, setShopId] = useState(null);
  const [siret, setSiret] = useState('');
  
  // Validate claim state
  const [claimToken, setClaimToken] = useState('');

  // Create pulse state
  const [pulseName, setPulseName] = useState('');
  const [pulseDesc, setPulseDesc] = useState('');
  const [pulseQty, setPulseQty] = useState('');
  const [pulseHours, setPulseHours] = useState('4'); // Default 4 hours expiry
  const [isDonation, setIsDonation] = useState(true);

  // Shop profile & costs state
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [itemName, setItemName] = useState('Main Inventory Item');
  const [itemCost, setItemCost] = useState('1.50');
  const [itemUnit, setItemUnit] = useState('piece');

  // Tax Report state
  const [taxYear, setTaxYear] = useState('2026');
  const [taxMonth, setTaxMonth] = useState('5');
  const [taxReportData, setTaxReportData] = useState(null);

  useEffect(() => {
    fetchShopDetails();
  }, []);

  const fetchShopDetails = async () => {
    setLoading(true);
    try {
      // Retrieve/Initialize shop record and fetch current coordinates/address/costs
      const response = await client.post('/shopkeeper/inventory-costs', {
        inventory_costs: {},
        latitude: null,
        longitude: null,
        address: null
      });

      const shop = response.data;
      setShopId(shop.shop_id);
      setSiret(shop.siret);
      if (shop.address) setAddress(shop.address);
      if (shop.latitude) setLat(shop.latitude.toString());
      if (shop.longitude) setLng(shop.longitude.toString());
      
      // Load inventory cost if available
      const costKeys = Object.keys(shop.inventory_costs);
      if (costKeys.length > 0) {
        const key = costKeys[0];
        setItemName(key);
        setItemCost(shop.inventory_costs[key].cost_price.toString());
        setItemUnit(shop.inventory_costs[key].unit || 'piece');
      }
    } catch (error) {
      console.error("Failed to load shop details:", error);
      Alert.alert('Initialization Failed', 'Could not retrieve shop profile info.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    navigation.replace('Login');
  };

  // 1. VALIDATE CLAIM
  const handleValidateClaim = async () => {
    if (!claimToken) {
      Alert.alert('Error', 'Please enter a claim code.');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await client.post('/validate-claim', {
        qr_code_token: claimToken.trim()
      });
      
      Alert.alert('Claim Validated!', response.data.message || 'The food claim was processed successfully.');
      setClaimToken('');
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || 'Failed to validate claim code.';
      Alert.alert('Validation Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // 2. CREATE SURPLUS PULSE
  const handleCreatePulse = async () => {
    if (!pulseName || !pulseQty || !pulseHours) {
      Alert.alert('Error', 'Please fill in item name, quantity, and expiry duration.');
      return;
    }

    setSubmitting(true);
    try {
      const expireTime = new Date();
      expireTime.setHours(expireTime.getHours() + parseInt(pulseHours));

      const response = await client.post('/pulses', {
        item_name: pulseName,
        description: pulseDesc,
        is_donation: isDonation,
        quantity: parseInt(pulseQty),
        expires_at: expireTime.toISOString()
      });

      Alert.alert('Pulse Published!', `Surplus listed! Notified ${response.data.notified_students || 0} nearby students.`);
      setPulseName('');
      setPulseDesc('');
      setPulseQty('');
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || 'Failed to publish surplus food pulse.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // 3. UPDATE SHOP & COSTS
  const handleUpdateShop = async () => {
    if (!itemName || !itemCost) {
      Alert.alert('Error', 'Please enter inventory item cost details.');
      return;
    }

    setSubmitting(true);
    try {
      const costsPayload = {
        [itemName]: {
          cost_price: parseFloat(itemCost),
          unit: itemUnit,
          currency: 'EUR'
        }
      };

      const response = await client.post('/shopkeeper/inventory-costs', {
        inventory_costs: costsPayload,
        latitude: lat ? parseFloat(lat) : null,
        longitude: lng ? parseFloat(lng) : null,
        address: address || null
      });

      Alert.alert('Success', 'Shop details and inventory costs updated.');
      setShopId(response.data.shop_id);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update shop inventory costs.');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. GENERATE TAX REPORT
  const handleGenerateTaxReport = async () => {
    if (!shopId) {
      Alert.alert('Shop Required', 'Please configure your Shop Profile first.');
      return;
    }

    setSubmitting(true);
    setTaxReportData(null);
    try {
      const response = await client.post(`/shops/${shopId}/tax-report/${taxYear}/${taxMonth}`);
      
      // Because backend returns FileResponse containing the PDF,
      // we read headers to obtain report statistics.
      const donatedVal = response.headers['x-total-donated-value'] || '0.00';
      setTaxReportData({
        fileName: `cerfa_${siret}_${taxYear}_${taxMonth.padStart(2, '0')}.pdf`,
        donatedValue: parseFloat(donatedVal),
        period: `${taxMonth.padStart(2, '0')}/${taxYear}`
      });

      Alert.alert('Report Generated', 'CERFA Tax exemption receipt compiled successfully.');
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || 'Failed to generate tax report. Ensure you have collected donations in this month.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.background} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>ViF Shopkeeper</Text>
              <Text style={styles.headerSubtitle}>Owner Dashboard • SIRET: {siret || 'N/A'}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {/* Navigation Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'validate' ? styles.tabActive : null]}
              onPress={() => setActiveTab('validate')}
            >
              <Ionicons name="scan-outline" size={18} color={activeTab === 'validate' ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[styles.tabText, activeTab === 'validate' ? styles.tabTextActive : null]}>Validate</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'pulse' ? styles.tabActive : null]}
              onPress={() => setActiveTab('pulse')}
            >
              <Ionicons name="send-outline" size={18} color={activeTab === 'pulse' ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[styles.tabText, activeTab === 'pulse' ? styles.tabTextActive : null]}>Pulse</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'profile' ? styles.tabActive : null]}
              onPress={() => setActiveTab('profile')}
            >
              <Ionicons name="storefront-outline" size={18} color={activeTab === 'profile' ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[styles.tabText, activeTab === 'profile' ? styles.tabTextActive : null]}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'tax' ? styles.tabActive : null]}
              onPress={() => setActiveTab('tax')}
            >
              <Ionicons name="document-text-outline" size={18} color={activeTab === 'tax' ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[styles.tabText, activeTab === 'tax' ? styles.tabTextActive : null]}>Tax</Text>
            </TouchableOpacity>
          </View>

          {/* Main Area */}
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loaderText}>Syncing store profile...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent}>

              {/* TAB: VALIDATE CLAIM */}
              {activeTab === 'validate' && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Validate Reservation</Text>
                  <Text style={styles.cardDesc}>
                    Type or scan the 6-character/UUID claim token shown by the student to verify reservation status and complete collection.
                  </Text>

                  <View style={styles.inputWrapper}>
                    <Ionicons name="qr-code-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input}
                      placeholder="Enter claim code / QR token"
                      placeholderTextColor="#64748B"
                      value={claimToken}
                      onChangeText={setClaimToken}
                      autoCapitalize="none"
                    />
                  </View>

                  <TouchableOpacity 
                    style={[styles.btn, submitting ? styles.btnDisabled : null]}
                    onPress={handleValidateClaim}
                    disabled={submitting}
                  >
                    <LinearGradient colors={['#10B981', '#059669']} style={styles.btnGradient}>
                      <Text style={styles.btnText}>{submitting ? 'Verifying...' : 'Validate & Mark Collected'}</Text>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {/* TAB: CREATE PULSE */}
              {activeTab === 'pulse' && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Create surplus Pulse</Text>
                  <Text style={styles.cardDesc}>
                    List surplus items on the marketplace. Verified students within 1km will be notified instantly.
                  </Text>

                  <Text style={styles.label}>Surplus Item Name</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput 
                      style={styles.input}
                      placeholder="e.g. Croissant Box / Bread Basket"
                      placeholderTextColor="#64748B"
                      value={pulseName}
                      onChangeText={setPulseName}
                    />
                  </View>

                  <Text style={styles.label}>Description</Text>
                  <View style={[styles.inputWrapper, { height: 100 }]}>
                    <TextInput 
                      style={[styles.input, { height: '100%', textAlignVertical: 'top' }]}
                      placeholder="Detail condition, pickup times or allergy notices..."
                      placeholderTextColor="#64748B"
                      value={pulseDesc}
                      onChangeText={setPulseDesc}
                      multiline
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Quantity</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput 
                          style={styles.input}
                          placeholder="e.g. 5"
                          placeholderTextColor="#64748B"
                          value={pulseQty}
                          onChangeText={pulseQty => setPulseQty(pulseQty.replace(/[^0-9]/g, ''))}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={styles.label}>Expiry (Hours)</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput 
                          style={styles.input}
                          placeholder="e.g. 4"
                          placeholderTextColor="#64748B"
                          value={pulseHours}
                          onChangeText={pulseHours => setPulseHours(pulseHours.replace(/[^0-9]/g, ''))}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>

                  <Text style={styles.label}>Surplus Offer Type</Text>
                  <View style={styles.toggleRow}>
                    <TouchableOpacity 
                      style={[styles.toggleBtn, isDonation ? styles.toggleActive : null]}
                      onPress={() => setIsDonation(true)}
                    >
                      <Text style={[styles.toggleText, isDonation ? styles.toggleTextActive : null]}>FREE DONATION</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.toggleBtn, !isDonation ? styles.toggleActive : null]}
                      onPress={() => setIsDonation(false)}
                    >
                      <Text style={[styles.toggleText, !isDonation ? styles.toggleTextActive : null]}>WHOLESALE MARKET</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity 
                    style={[styles.btn, submitting ? styles.btnDisabled : null]}
                    onPress={handleCreatePulse}
                    disabled={submitting}
                  >
                    <LinearGradient colors={['#10B981', '#059669']} style={styles.btnGradient}>
                      <Text style={styles.btnText}>{submitting ? 'Publishing...' : 'Publish Food Pulse'}</Text>
                      <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {/* TAB: SHOP INFO & COSTS */}
              {activeTab === 'profile' && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Shop Profile & Metrics</Text>
                  <Text style={styles.cardDesc}>
                    Update coordinates (lat/lng) so students can locate you, and configure inventory costs for calculating CERFA tax exemptions.
                  </Text>

                  <Text style={styles.label}>Shop Physical Address</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput 
                      style={styles.input}
                      placeholder="e.g. 45 Rue Vaugirard, Paris"
                      placeholderTextColor="#64748B"
                      value={address}
                      onChangeText={setAddress}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Latitude</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput 
                          style={styles.input}
                          placeholder="e.g. 48.8566"
                          placeholderTextColor="#64748B"
                          value={lat}
                          onChangeText={setLat}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={styles.label}>Longitude</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput 
                          style={styles.input}
                          placeholder="e.g. 2.3522"
                          placeholderTextColor="#64748B"
                          value={lng}
                          onChangeText={setLng}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>

                  <Text style={styles.sectionHeader}>Inventory Cost Pricing</Text>

                  <Text style={styles.label}>Item Name</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput 
                      style={styles.input}
                      placeholder="e.g. Croissant Box"
                      placeholderTextColor="#64748B"
                      value={itemName}
                      onChangeText={setItemName}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Cost Price (€)</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput 
                          style={styles.input}
                          placeholder="e.g. 1.50"
                          placeholderTextColor="#64748B"
                          value={itemCost}
                          onChangeText={setItemCost}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={styles.label}>Unit Metric</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput 
                          style={styles.input}
                          placeholder="e.g. piece / kg"
                          placeholderTextColor="#64748B"
                          value={itemUnit}
                          onChangeText={setItemUnit}
                        />
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={[styles.btn, submitting ? styles.btnDisabled : null]}
                    onPress={handleUpdateShop}
                    disabled={submitting}
                  >
                    <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.btnGradient}>
                      <Text style={styles.btnText}>{submitting ? 'Updating...' : 'Save Profile & Costs'}</Text>
                      <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {/* TAB: TAX REPORT */}
              {activeTab === 'tax' && (
                <View style={{ gap: 20 }}>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Monthly Tax Reports</Text>
                    <Text style={styles.cardDesc}>
                      Generate and compile official CERFA 11580*05 tax exemption reports for corporate tax deductions on donation transactions.
                    </Text>

                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Year</Text>
                        <View style={styles.inputWrapper}>
                          <TextInput 
                            style={styles.input}
                            placeholder="e.g. 2026"
                            placeholderTextColor="#64748B"
                            value={taxYear}
                            onChangeText={setTaxYear}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                      <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.label}>Month</Text>
                        <View style={styles.inputWrapper}>
                          <TextInput 
                            style={styles.input}
                            placeholder="e.g. 5"
                            placeholderTextColor="#64748B"
                            value={taxMonth}
                            onChangeText={setTaxMonth}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity 
                      style={[styles.btn, submitting ? styles.btnDisabled : null]}
                      onPress={handleGenerateTaxReport}
                      disabled={submitting}
                    >
                      <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.btnGradient}>
                        <Text style={styles.btnText}>{submitting ? 'Compiling PDF...' : 'Generate CERFA Report'}</Text>
                        <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  {/* Tax Report Result Cards */}
                  {taxReportData && (
                    <View style={styles.reportCard}>
                      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.cardGradient}>
                        <View style={styles.reportHeader}>
                          <Ionicons name="checkmark-done-circle" size={32} color="#10B981" />
                          <Text style={styles.reportTitle}>Compilation Completed</Text>
                        </View>

                        <Text style={styles.reportSubtitle}>CERFA document compiled and saved on backend.</Text>

                        <View style={styles.reportGrid}>
                          <View style={styles.gridRow}>
                            <Text style={styles.gridLabel}>Period:</Text>
                            <Text style={styles.gridValue}>{taxReportData.period}</Text>
                          </View>
                          <View style={styles.gridRow}>
                            <Text style={styles.gridLabel}>Total Donated Value:</Text>
                            <Text style={[styles.gridValue, { color: '#10B981' }]}>€{taxReportData.donatedValue.toFixed(2)}</Text>
                          </View>
                          <View style={styles.gridRow}>
                            <Text style={styles.gridLabel}>File Compiled:</Text>
                            <Text style={styles.gridFileValue} numberOfLines={1}>{taxReportData.fileName}</Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </View>
                  )}
                </View>
              )}

            </ScrollView>
          )}
        </KeyboardAvoidingView>
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
    fontSize: 26,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
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
    padding: 6,
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#10B981',
  },
  tabText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 10,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  loaderText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 16,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 24,
  },
  label: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    color: '#F8FAFC',
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
  },
  btn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    padding: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
    gap: 6,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleActive: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 12,
  },
  toggleTextActive: {
    color: '#10B981',
  },
  sectionHeader: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 16,
  },
  reportCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardGradient: {
    padding: 20,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  reportSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 16,
  },
  reportGrid: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  gridValue: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  gridFileValue: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: 'bold',
    maxWidth: '50%',
  },
});

export default AdminHomeScreen;
