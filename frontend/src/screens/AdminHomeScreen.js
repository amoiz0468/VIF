import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import client from '../api/client';

const AdminHomeScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddItem = async () => {
    if (!name || !description || !price) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await client.post('/items', {
        name,
        description,
        price: parseFloat(price),
      });

      Alert.alert('Success', 'Item listed successfully on ViF!');
      setName('');
      setDescription('');
      setPrice('');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.background} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.inner}>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>ViF Admin</Text>
                <Text style={styles.headerSubtitle}>Inventory Management</Text>
              </View>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>List New Item</Text>
              
              <Text style={styles.label}>Product Name</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Premium Wireless Headphones"
                  placeholderTextColor="#64748B"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <Text style={styles.label}>Description</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your product in detail..."
                  placeholderTextColor="#64748B"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={5}
                />
              </View>

              <Text style={styles.label}>Price ($)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#64748B"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity 
                style={[styles.button, loading ? styles.buttonDisabled : null]} 
                onPress={handleAddItem}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>{loading ? 'Processing...' : 'Publish to ViF'}</Text>
                  <Ionicons name="rocket-outline" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={24} color="#3B82F6" />
              <Text style={styles.infoText}>
                Items added here will be immediately visible to all students on the marketplace.
              </Text>
            </View>
          </ScrollView>
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
  inner: {
    padding: 24,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
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
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: 28,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 24,
  },
  label: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  input: {
    padding: 16,
    color: '#F8FAFC',
    fontSize: 16,
  },
  textAreaWrapper: {
    height: 140,
  },
  textArea: {
    height: '100%',
    textAlignVertical: 'top',
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    gap: 12,
  },
  infoText: {
    color: '#94A3B8',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});

export default AdminHomeScreen;
