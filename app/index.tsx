import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, Image, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import axios from 'axios';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Config from '@/constants/Config';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [regNo, setRegNo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!regNo.trim()) {
      Alert.alert('Required', 'Please enter a Registration Number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${Config.API_BASE_URL}/search/`, {
        params: { reg_no: regNo }
      });

      // Navigate to details screen with the data
      router.push({
        pathname: '/details',
        params: { data: JSON.stringify(response.data) }
      });
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error || 'Failed to fetch details. Please check the registration number.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4c669f', '#3b5998', '#192f6a']}
        style={styles.background}
      />

      <ThemedView style={styles.content}>
        <View style={styles.liquidLogoContainer}>
          <View style={styles.liquidCircle1} />
          <View style={styles.liquidCircle2} />
          <ThemedText type="title" style={styles.title}>Milestone</ThemedText>
          <ThemedText style={styles.subtitle}>Patient Portal</ThemedText>
        </View>

        <View style={styles.card}>
          <ThemedText type="subtitle" style={styles.label}>Registration Number</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="e.g. MDC/169/2026"
            placeholderTextColor="#999"
            value={regNo}
            onChangeText={setRegNo}
            autoCapitalize="characters"
          />

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            <LinearGradient
              colors={['#00c6ff', '#0072ff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Fetch Details</ThemedText>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ThemedText style={styles.footer}>© 2026 milestone Development Center</ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liquidLogoContainer: {
    alignItems: 'center',
    marginBottom: 50,
    position: 'relative',
  },
  liquidCircle1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -40,
    left: -60,
  },
  liquidCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -20,
    right: -40,
  },
  title: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 18,
    marginTop: 5,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 30,
    padding: 30,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  label: {
    color: '#333',
    marginBottom: 15,
    fontSize: 16,
  },
  input: {
    height: 60,
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    paddingHorizontal: 20,
    fontSize: 18,
    color: '#333',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#eee',
  },
  loginButton: {
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  }
});
