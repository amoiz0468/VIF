import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';

const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  
  // New fields
  const [studentIdImage, setStudentIdImage] = useState(null);
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [siret, setSiret] = useState('');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera permissions to scan your ID!');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setStudentIdImage(result.assets[0].uri);
    }
  };

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Role-specific validation
    if (role === 'student') {
      const allowedDomains = ['.edu', '.eu', '.ac.uk', '.univ'];
      if (!allowedDomains.some(domain => email.toLowerCase().endsWith(domain))) {
        Alert.alert('Invalid Email', 'Students must use a university email address (.edu, .eu, etc.)');
        return;
      }
      if (!studentIdImage) {
        Alert.alert('ID Required', 'Please scan your student ID card to continue.');
        return;
      }
    } else if (role === 'shopkeeper') {
      if (!shopName || !shopAddress) {
        Alert.alert('Details Required', 'Please provide your shop name and address.');
        return;
      }
      if (!siret) {
        Alert.alert('SIRET Required', 'Please provide your SIRET number.');
        return;
      }
      if (!/^\d{14}$/.test(siret)) {
        Alert.alert('Invalid SIRET', 'SIRET number must be exactly 14 digits.');
        return;
      }
    }

    setLoading(true);
    try {
      await client.post('/signup', {
        email,
        password,
        role,
        student_id_url: studentIdImage,
        shop_name: shopName,
        shop_address: shopAddress,
        siret,
      });

      Alert.alert('Success', 'Account created successfully!', [
        { text: 'Login Now', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Signup Failed', error.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.inner}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
          </TouchableOpacity>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the ViF ecosystem</Text>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={role === 'student' ? "University Email" : "Email"}
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <Text style={styles.label}>Select Your Role</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity 
                style={[styles.roleButton, role === 'student' ? styles.roleButtonActive : null]} 
                onPress={() => setRole('student')}
              >
                <Ionicons 
                  name="school-outline" 
                  size={20} 
                  color={role === 'student' ? '#FFFFFF' : '#94A3B8'} 
                />
                <Text style={[styles.roleButtonText, role === 'student' ? styles.roleButtonTextActive : null]}>Student</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.roleButton, role === 'shopkeeper' ? styles.roleButtonActive : null]} 
                onPress={() => setRole('shopkeeper')}
              >
                <Ionicons 
                  name="storefront-outline" 
                  size={20} 
                  color={role === 'shopkeeper' ? '#FFFFFF' : '#94A3B8'} 
                />
                <Text style={[styles.roleButtonText, role === 'shopkeeper' ? styles.roleButtonTextActive : null]}>Shopkeeper</Text>
              </TouchableOpacity>
            </View>

            {/* Dynamic Fields */}
            {role === 'student' ? (
              <View style={styles.dynamicSection}>
                <Text style={styles.label}>Verify Student Identity</Text>
                <TouchableOpacity style={styles.scanButton} onPress={pickImage}>
                  {studentIdImage ? (
                    <Image source={{ uri: studentIdImage }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.scanPlaceholder}>
                      <Ionicons name="camera-outline" size={32} color="#3B82F6" />
                      <Text style={styles.scanText}>Scan ID Card</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.dynamicSection}>
                <Text style={styles.label}>Shop Information</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="business-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Shop Name"
                    placeholderTextColor="#64748B"
                    value={shopName}
                    onChangeText={setShopName}
                  />
                </View>
                <View style={styles.inputWrapper}>
                  <Ionicons name="location-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Shop Address"
                    placeholderTextColor="#64748B"
                    value={shopAddress}
                    onChangeText={setShopAddress}
                  />
                </View>
                <View style={styles.inputWrapper}>
                  <Ionicons name="card-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="SIRET Number (14 digits)"
                    placeholderTextColor="#64748B"
                    value={siret}
                    onChangeText={setSiret}
                    keyboardType="numeric"
                    maxLength={14}
                  />
                </View>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.button, loading ? styles.buttonDisabled : null]} 
              onPress={handleSignup}
              disabled={loading}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Create Account'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.link}>
              <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Login</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    padding: 24,
    paddingTop: 60,
    flexGrow: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 40,
  },
  form: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  label: {
    color: '#F8FAFC',
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
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
    paddingVertical: 16,
    color: '#F8FAFC',
    fontSize: 16,
  },
  roleContainer: {
    flexDirection: 'row',
    marginBottom: 32,
    gap: 12,
  },
  roleButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  roleButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  roleButtonText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
  },
  dynamicSection: {
    marginBottom: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  scanButton: {
    width: '100%',
    height: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    overflow: 'hidden',
  },
  scanPlaceholder: {
    alignItems: 'center',
  },
  scanText: {
    color: '#3B82F6',
    fontWeight: '600',
    marginTop: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    padding: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 24,
  },
  linkText: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 14,
  },
  linkBold: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
});

export default SignupScreen;
