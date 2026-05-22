import React, { useState } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, View, 
  ActivityIndicator, Alert, Dimensions, Image, 
  KeyboardAvoidingView, Platform, ScrollView, Modal, FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Link } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import Config from '@/constants/Config';
import { useTheme } from '@/context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [changePassVisible, setChangePassVisible] = useState(false);

  // Change Password State
  const [cpMobile, setCpMobile] = useState('');
  const [cpOldPass, setCpOldPass] = useState('');
  const [cpNewPass, setCpNewPass] = useState('');
  const [cpConfirmPass, setCpConfirmPass] = useState('');
  const [cpLoading, setCpLoading] = useState(false);
  
  const { resolvedTheme } = useTheme();
  
  const accentColor = '#10b981'; // Emerald Green from photo
  const darkBg = '#0a1220'; // Deep dark blue background
  const cardBg = '#161d2f'; // Card background
  const inputBg = '#1f2937'; // Input background

  const handleFetchProfiles = async () => {
    if (!phone.trim() || phone.length < 10) {
      Alert.alert('Required', 'Please enter a valid Mobile Number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${Config.API_BASE_URL}/search-phone/`, {
        params: { phone: phone, password: password }
      });

      if (response.data.length === 1) {
        handleProfileSelect(response.data[0].registration_number);
      } else {
        setProfiles(response.data);
        setModalVisible(true);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error || 'No patients found for this mobile number.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSelect = async (regNo: string) => {
    setModalVisible(false);
    setLoading(true);
    try {
      const response = await axios.get(`${Config.API_BASE_URL}/search/`, {
        params: { reg_no: regNo }
      });

      router.push({
        pathname: '/details',
        params: { data: JSON.stringify(response.data) }
      });
    } catch (err: any) {
      Alert.alert('Error', 'Failed to fetch details for the selected profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'please contact Admin for further action');
  };

  const handleChangePasswordSubmit = async () => {
    if (!cpMobile || !cpOldPass || !cpNewPass || !cpConfirmPass) {
        Alert.alert('Required', 'Please fill all fields.');
        return;
    }
    if (cpNewPass !== cpConfirmPass) {
        Alert.alert('Error', 'New passwords do not match.');
        return;
    }

    setCpLoading(true);
    try {
        await axios.post(`${Config.API_BASE_URL}/change-password/`, {
            mobile: cpMobile,
            old_password: cpOldPass,
            new_password: cpNewPass
        });
        Alert.alert('Success', 'Password changed successfully!');
        setChangePassVisible(false);
        // Clear state
        setCpMobile(''); setCpOldPass(''); setCpNewPass(''); setCpConfirmPass('');
    } catch (err: any) {
        const msg = err.response?.data?.error || 'Change password failed.';
        Alert.alert('Error', msg);
    } finally {
        setCpLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: darkBg }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={[styles.logoCircle, { backgroundColor: accentColor }]}>
                <Image 
                    source={require('../assets/images/icon.png')} 
                    style={styles.logo} 
                    resizeMode="contain" 
                />
            </View>
            <ThemedText style={[styles.headerTitle, { color: accentColor }]}>MDC Portal</ThemedText>
            <ThemedText style={styles.headerSub}>Patient Care Management</ThemedText>
          </View>

          <View style={[styles.loginCard, { backgroundColor: cardBg }]}>
            <View style={styles.inputSection}>
                <ThemedText style={styles.inputLabel}>MOBILE NUMBER</ThemedText>
                <View style={[styles.innerInput, { backgroundColor: inputBg }]}>
                   <Ionicons name="call-outline" size={20} color={accentColor} />
                   <TextInput 
                      style={styles.input} 
                      placeholder="Enter mobile number" 
                      placeholderTextColor="#4b5563"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                   />
                </View>
            </View>

            <View style={styles.inputSection}>
                <ThemedText style={styles.inputLabel}>PASSWORD</ThemedText>
                <View style={[styles.innerInput, { backgroundColor: inputBg }]}>
                   <Ionicons name="lock-closed-outline" size={20} color={accentColor} />
                   <TextInput 
                      style={styles.input} 
                      placeholder="••••••••" 
                      placeholderTextColor="#4b5563"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                   />
                </View>
            </View>

            <TouchableOpacity style={styles.loginBtn} onPress={handleFetchProfiles} disabled={loading}>
                <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.btnGradient}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <ThemedText style={styles.btnText}>Login</ThemedText>
                    )}
                </LinearGradient>
            </TouchableOpacity>

            <View style={styles.supportRow}>
                <TouchableOpacity onPress={handleForgotPassword}>
                    <ThemedText style={styles.forgotText}>Forgot Password?</ThemedText>
                </TouchableOpacity>
                <View style={styles.dot} />
                <TouchableOpacity onPress={() => setChangePassVisible(true)}>
                    <ThemedText style={styles.forgotText}>Change Password?</ThemedText>
                </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
              <ThemedText style={styles.footerText}>New here? </ThemedText>
              <Link href="/register" asChild>
                <TouchableOpacity>
                   <ThemedText style={[styles.footerLink, { color: accentColor }]}>Create account</ThemedText>
                </TouchableOpacity>
              </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal transparent visible={changePassVisible} animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={[styles.profileSheet, { backgroundColor: cardBg }]}>
                  <ThemedText style={[styles.sheetTitle, { color: accentColor }]}>Change Password</ThemedText>
                  <ThemedText style={styles.sheetSub}>Update your portal access credentials</ThemedText>
                  
                  <View style={styles.inputSection}>
                      <ThemedText style={styles.inputLabel}>MOBILE NUMBER</ThemedText>
                      <View style={[styles.innerInput, { backgroundColor: inputBg }]}>
                          <TextInput 
                              style={styles.input} 
                              placeholder="Registered mobile" 
                              placeholderTextColor="#4b5563"
                              keyboardType="phone-pad"
                              value={cpMobile}
                              onChangeText={setCpMobile}
                          />
                      </View>
                  </View>

                  <View style={styles.inputSection}>
                      <ThemedText style={styles.inputLabel}>CURRENT PASSWORD</ThemedText>
                      <View style={[styles.innerInput, { backgroundColor: inputBg }]}>
                          <TextInput 
                              style={styles.input} 
                              placeholder="••••••••" 
                              placeholderTextColor="#4b5563"
                              secureTextEntry
                              value={cpOldPass}
                              onChangeText={setCpOldPass}
                          />
                      </View>
                  </View>

                  <View style={styles.inputSection}>
                      <ThemedText style={styles.inputLabel}>NEW PASSWORD</ThemedText>
                      <View style={[styles.innerInput, { backgroundColor: inputBg }]}>
                          <TextInput 
                              style={styles.input} 
                              placeholder="••••••••" 
                              placeholderTextColor="#4b5563"
                              secureTextEntry
                              value={cpNewPass}
                              onChangeText={setCpNewPass}
                          />
                      </View>
                  </View>

                  <View style={styles.inputSection}>
                      <ThemedText style={styles.inputLabel}>CONFIRM NEW PASSWORD</ThemedText>
                      <View style={[styles.innerInput, { backgroundColor: inputBg }]}>
                          <TextInput 
                              style={styles.input} 
                              placeholder="••••••••" 
                              placeholderTextColor="#4b5563"
                              secureTextEntry
                              value={cpConfirmPass}
                              onChangeText={setCpConfirmPass}
                          />
                      </View>
                  </View>

                  <TouchableOpacity style={styles.loginBtn} onPress={handleChangePasswordSubmit} disabled={cpLoading}>
                    <LinearGradient colors={['#10b981', '#059669']} style={styles.btnGradient}>
                        {cpLoading ? <ActivityIndicator color="white" /> : <ThemedText style={styles.btnText}>Update Password</ThemedText>}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.closeBtn} onPress={() => setChangePassVisible(false)}>
                      <ThemedText style={{ color: '#4b5563', fontWeight: '700' }}>Cancel</ThemedText>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

      <Modal transparent visible={modalVisible} animationType="fade">
          <View style={styles.modalOverlay}>
              <View style={[styles.profileSheet, { backgroundColor: cardBg }]}>
                  <ThemedText style={[styles.sheetTitle, { color: accentColor }]}>Select Profile</ThemedText>
                  <ThemedText style={styles.sheetSub}>Found multiple records for this number.</ThemedText>
                  
                  <FlatList 
                    data={profiles}
                    keyExtractor={(item) => item.registration_number}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={[styles.profileItem, { backgroundColor: inputBg }]}
                            onPress={() => handleProfileSelect(item.registration_number)}
                        >
                            <View style={[styles.avatar, { backgroundColor: accentColor + '20' }]}>
                                <ThemedText style={{ color: accentColor, fontWeight: '800' }}>{item.name[0]}</ThemedText>
                            </View>
                            <View style={{ flex: 1 }}>
                                <ThemedText style={styles.profileName}>{item.name}</ThemedText>
                                <ThemedText style={styles.profileReg}>{item.registration_number}</ThemedText>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={accentColor} />
                        </TouchableOpacity>
                    )}
                    style={{ maxHeight: height * 0.4 }}
                  />
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                      <ThemedText style={{ color: '#4b5563', fontWeight: '700' }}>Cancel</ThemedText>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingVertical: 80, paddingHorizontal: 30 },
  header: { alignItems: 'center', marginBottom: 50 },
  logoCircle: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 15, shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 8 } },
  logo: { width: 80, height: 80, tintColor: 'white' },
  headerTitle: { fontSize: 36, fontWeight: '900', marginBottom: 5, textAlign: 'center', lineHeight: 44 },
  headerSub: { fontSize: 16, color: '#9ca3af', fontWeight: '600', textAlign: 'center' },
  loginCard: { width: '100%', borderRadius: 40, padding: 35, elevation: 20 },
  inputSection: { marginBottom: 30 },
  inputLabel: { fontSize: 11, fontWeight: '800', color: '#6b7280', marginBottom: 12, letterSpacing: 1 },
  innerInput: { flexDirection: 'row', alignItems: 'center', height: 65, borderRadius: 18, paddingHorizontal: 20 },
  input: { flex: 1, height: '100%', marginLeft: 15, fontSize: 16, color: 'white', fontWeight: '600' },
  loginBtn: { height: 70, borderRadius: 20, overflow: 'hidden', marginTop: 10, elevation: 10, shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 12 },
  btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: 'white', fontSize: 20, fontWeight: '800' },
  supportRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#4b5563', marginHorizontal: 15 },
  forgotText: { color: '#6b7280', fontSize: 14, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 50 },
  footerText: { color: '#9ca3af', fontWeight: '600', fontSize: 15 },
  footerLink: { fontWeight: '900', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 25 },
  profileSheet: { padding: 30, borderRadius: 40 },
  sheetTitle: { fontSize: 26, fontWeight: '900', marginBottom: 8 },
  sheetSub: { fontSize: 14, color: '#9ca3af', marginBottom: 25, fontWeight: '600' },
  profileItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, marginBottom: 15 },
  avatar: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  profileName: { fontSize: 16, fontWeight: '800', color: 'white' },
  profileReg: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  closeBtn: { alignSelf: 'center', marginTop: 15, padding: 5 }
});
