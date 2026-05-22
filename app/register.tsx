import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, TextInput, TouchableOpacity, View, 
  ActivityIndicator, Alert, Dimensions, Image, 
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

import { ThemedText } from '@/components/themed-text';
import Config from '@/constants/Config';
import { useTheme } from '@/context/ThemeContext';

const { width } = Dimensions.get('window');

export default function RegisterScreen() {
    const { resolvedTheme } = useTheme();
    
    const accentColor = '#10b981'; // Emerald Green
    const darkBg = '#0a1220'; 
    const cardBg = '#161d2f'; 
    const inputBg = '#1f2937'; 

    const [regNo, setRegNo] = useState('');
    const [childName, setChildName] = useState('');
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [fetchingName, setFetchingName] = useState(false);
    const [agreed, setAgreed] = useState(false);

    // Fetch child name when registration number is entered
    useEffect(() => {
        const fetchName = async () => {
            if (regNo.length >= 8) { // Typical length for MDC/XXX/202X
                setFetchingName(true);
                try {
                    const response = await axios.get(`${Config.API_BASE_URL}/search/`, {
                        params: { reg_no: regNo }
                    });
                    if (response.data.registration) {
                        setChildName(response.data.registration.name_of_child);
                    }
                } catch (err) {
                    setChildName('');
                } finally {
                    setFetchingName(false);
                }
            } else {
                setChildName('');
            }
        };

        const timer = setTimeout(fetchName, 800);
        return () => clearTimeout(timer);
    }, [regNo]);

    const handleRegister = async () => {
        if (!regNo || !mobile || !password) {
            Alert.alert('Required', 'Please fill in all mandatory fields.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match.');
            return;
        }
        if (!agreed) {
            Alert.alert('Required', 'Please agree to the Terms and Conditions.');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${Config.API_BASE_URL}/register-user/`, {
                reg_no: regNo,
                mobile: mobile,
                email: email,
                password: password,
                name: childName
            });
            Alert.alert('Success', 'Account created successfully! You can now log in.');
            router.replace('/');
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Registration failed. Please try again.';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
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
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.header}>
                         <TouchableOpacity onPress={() => router.replace('/')} style={styles.headerBack}>
                            <Ionicons name="chevron-back" size={28} color={accentColor} />
                         </TouchableOpacity>
                         <View style={[styles.logoCircle, { backgroundColor: accentColor }]}>
                            <Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
                         </View>
                         <ThemedText style={[styles.headerTitle, { color: accentColor }]}>Registration</ThemedText>
                         <ThemedText style={styles.headerSub}>Create your MDC Portal account</ThemedText>
                    </View>

                    <View style={[styles.card, { backgroundColor: cardBg }]}>
                        <View style={styles.inputSection}>
                            <ThemedText style={styles.inputLabel}>REGISTRATION NUMBER *</ThemedText>
                            <View style={[styles.innerInput, { backgroundColor: inputBg }]}>
                               <Ionicons name="card-outline" size={20} color={accentColor} />
                               <TextInput 
                                  style={styles.input} 
                                  placeholder="MDC/XXX/2026" 
                                  placeholderTextColor="#4b5563"
                                  autoCapitalize="characters"
                                  value={regNo}
                                  onChangeText={setRegNo}
                               />
                               {fetchingName && <ActivityIndicator size="small" color={accentColor} />}
                            </View>
                        </View>

                        <View style={styles.inputSection}>
                            <ThemedText style={styles.inputLabel}>CHILD NAME (AUTO-FETCHED)</ThemedText>
                            <View style={[styles.innerInput, { backgroundColor: inputBg, opacity: 0.7 }]}>
                               <Ionicons name="person-outline" size={20} color={accentColor} />
                               <TextInput 
                                  style={styles.input} 
                                  placeholder="Name will appear here" 
                                  placeholderTextColor="#4b5563"
                                  value={childName}
                                  editable={false}
                               />
                            </View>
                        </View>

                        <View style={styles.inputSection}>
                            <ThemedText style={styles.inputLabel}>MOBILE NUMBER *</ThemedText>
                            <View style={[styles.innerInput, { backgroundColor: inputBg }]}>
                               <Ionicons name="call-outline" size={20} color={accentColor} />
                               <TextInput 
                                  style={styles.input} 
                                  placeholder="Contact number" 
                                  placeholderTextColor="#4b5563"
                                  keyboardType="phone-pad"
                                  value={mobile}
                                  onChangeText={setMobile}
                               />
                            </View>
                        </View>

                        <View style={styles.inputSection}>
                            <ThemedText style={styles.inputLabel}>EMAIL (OPTIONAL)</ThemedText>
                            <View style={[styles.innerInput, { backgroundColor: inputBg }]}>
                               <Ionicons name="mail-outline" size={20} color={accentColor} />
                               <TextInput 
                                  style={styles.input} 
                                  placeholder="email@example.com" 
                                  placeholderTextColor="#4b5563"
                                  keyboardType="email-address"
                                  value={email}
                                  onChangeText={setEmail}
                               />
                            </View>
                        </View>

                        <View style={styles.inputSection}>
                            <ThemedText style={styles.inputLabel}>PASSWORD *</ThemedText>
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

                        <View style={styles.inputSection}>
                            <ThemedText style={styles.inputLabel}>CONFIRM PASSWORD *</ThemedText>
                            <View style={[styles.innerInput, { backgroundColor: inputBg }]}>
                               <Ionicons name="shield-checkmark-outline" size={20} color={accentColor} />
                               <TextInput 
                                  style={styles.input} 
                                  placeholder="••••••••" 
                                  placeholderTextColor="#4b5563"
                                  secureTextEntry
                                  value={confirmPassword}
                                  onChangeText={setConfirmPassword}
                               />
                            </View>
                        </View>

                        <View style={styles.agreeRow}>
                            <TouchableOpacity onPress={() => setAgreed(!agreed)} style={[styles.check, agreed && { backgroundColor: accentColor }, { borderColor: accentColor }]}>
                                {agreed && <Ionicons name="checkmark" size={14} color="white" />}
                            </TouchableOpacity>
                            <ThemedText style={styles.agreeText}>
                                I agree to the <ThemedText style={[styles.link, { color: accentColor }]}>Terms and Conditions</ThemedText> of MDC Portal.
                            </ThemedText>
                        </View>

                        <TouchableOpacity style={styles.regBtn} onPress={handleRegister} disabled={loading}>
                            <LinearGradient colors={['#10b981', '#059669']} style={styles.btnGradient}>
                                {loading ? <ActivityIndicator color="white" /> : <ThemedText style={styles.btnText}>Create Account</ThemedText>}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.footerRow}>
                            <ThemedText style={styles.footerTxt}>Already have an account? </ThemedText>
                            <Link href="/" asChild>
                                <TouchableOpacity>
                                    <ThemedText style={[styles.footerLink, { color: accentColor }]}>Login</ThemedText>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingVertical: 60, paddingHorizontal: 25 },
    header: { alignItems: 'center', marginBottom: 35 },
    headerBack: { position: 'absolute', top: 5, left: 0, padding: 10, zIndex: 10 },
    logoCircle: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 15, shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
    logo: { width: 50, height: 50, tintColor: 'white' },
    headerTitle: { fontSize: 32, fontWeight: '900', marginBottom: 5, textAlign: 'center', lineHeight: 40 },
    headerSub: { fontSize: 14, color: '#9ca3af', fontWeight: '600', textAlign: 'center' },
    card: { width: '100%', borderRadius: 35, padding: 30, elevation: 20 },
    inputSection: { marginBottom: 20 },
    inputLabel: { fontSize: 10, fontWeight: '800', color: '#6b7280', marginBottom: 8, letterSpacing: 0.5 },
    innerInput: { flexDirection: 'row', alignItems: 'center', height: 55, borderRadius: 15, paddingHorizontal: 18 },
    input: { flex: 1, height: '100%', marginLeft: 12, fontSize: 14, color: 'white', fontWeight: '600' },
    agreeRow: { flexDirection: 'row', marginVertical: 20 },
    check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, marginRight: 15, justifyContent: 'center', alignItems: 'center' },
    agreeText: { flex: 1, fontSize: 12, color: '#9ca3af', fontWeight: '600', lineHeight: 18 },
    link: { fontWeight: '800' },
    regBtn: { height: 60, borderRadius: 18, overflow: 'hidden', marginTop: 10 },
    btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    btnText: { color: 'white', fontSize: 16, fontWeight: '800' },
    footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
    footerTxt: { color: '#9ca3af', fontWeight: '600', fontSize: 13 },
    footerLink: { fontWeight: '900', fontSize: 13 }
});
