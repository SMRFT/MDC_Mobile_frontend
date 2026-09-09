import React, { useState, useEffect } from 'react';
import {
    StyleSheet, ScrollView, View, TouchableOpacity, Dimensions, Modal, Image,
    Alert, Platform, Linking, ActivityIndicator, Text, Switch, Keyboard,
    TouchableWithoutFeedback, KeyboardAvoidingView, TextInput, RefreshControl,
    BackHandler
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTheme } from '@/context/ThemeContext';
import Config from '@/constants/Config';
import { downloadAssessmentReport } from '@/utils/reportDownloader';
import { getUserNotifications, markNotificationAsRead, registerDeviceForPushNotifications, filterNotifications24h, NotificationItem } from '@/utils/notificationService';
import { fetchQnaList, submitQuestion, QnaItem } from '../scripts/qnaApi';
import * as FileSystem from 'expo-file-system/legacy';


const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: { flex: 1 },
    backgroundGrad: { position: 'absolute', left: 0, right: 0, top: 0, height: height },
    header: { paddingTop: 60, paddingHorizontal: 22, paddingBottom: 18, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 10, borderBottomWidth: 1 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    headerIcon: { width: 34, height: 34, marginRight: 10, borderRadius: 8 },
    headerTitle: { fontSize: 22, fontWeight: '900', flex: 1, marginRight: 10 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    actionCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    headerReg: { fontSize: 13, fontWeight: '800', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
    scrollContent: { padding: 22 },
    section: { borderRadius: 24, padding: 20, marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
    sectionTitle: { fontSize: 16, marginBottom: 15, fontWeight: '800' },
    personalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    personalTitle: { fontSize: 16, fontWeight: '900', marginLeft: 10 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
    infoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    infoIcon: { marginRight: 12 },
    infoLabel: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
    infoValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
    childHeroCard: { borderRadius: 24, padding: 18, marginBottom: 16, borderWidth: 1, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
    childHeroRow: { flexDirection: 'row', alignItems: 'center' },
    childAvatarCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    childHeroName: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
    childMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    childMetaPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    childMetaPillText: { fontSize: 11, fontWeight: '800' },
    progressOverviewCard: { borderRadius: 24, padding: 18, marginBottom: 20, borderWidth: 1, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 },
    progressCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
    progressTitle: { fontSize: 16, fontWeight: '900' },
    progressSubtitle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    liveStatusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    pulseDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
    liveStatusText: { fontSize: 10, fontWeight: '900', color: '#10b981', letterSpacing: 0.5 },
    therapyMiniGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    therapyMiniItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 12, borderWidth: 1, gap: 4 },
    therapyMiniText: { fontSize: 11, fontWeight: '800' },
    sectionHeading: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
    gridCard: { width: (width - 44 - 12) / 2, borderRadius: 22, padding: 16, borderWidth: 1, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
    gridIconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    gridCardTitle: { fontSize: 15, fontWeight: '900', lineHeight: 19, marginBottom: 4 },
    gridCardSub: { fontSize: 11, fontWeight: '600', lineHeight: 15, marginBottom: 10 },
    gridCardFooter: { marginTop: 'auto', paddingTop: 4 },
    gridActionLink: { fontSize: 12, fontWeight: '900' },
    secondaryRow: { gap: 10, marginBottom: 10 },
    secondaryCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5 },
    secIconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    secCardTitle: { fontSize: 14, fontWeight: '800' },
    secCardSub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: 20, paddingTop: 110 },
    dropdown: { width: 160, borderRadius: 18, borderWidth: 1, overflow: 'hidden', elevation: 20 },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    dropdownText: { marginLeft: 12, fontSize: 14, fontWeight: '600' },
    profileModalContainer: { flex: 1 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, borderBottomWidth: 1 },
    closeBtn: { padding: 5 },
    modalScroll: { padding: 20 },
    badgeContainer: { position: 'absolute', top: -3, right: -3, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    badgeText: { color: 'white', fontSize: 10, fontWeight: '900' },
    notificationCard: { borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    notiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    notiTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
    notiDate: { fontSize: 11, fontWeight: '600', marginLeft: 8 },
    notiSub: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
    notiFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 8, marginTop: 4 },
    notiBadge: { fontSize: 12, fontWeight: '600' },
    readTimeText: { fontSize: 11, fontWeight: '500' },
});

const InfoItem = ({ label, value, icon, last }: any) => {
    const primaryColor = useThemeColor({}, 'primary');
    const borderColor = useThemeColor({}, 'border');
    const textSecondary = useThemeColor({}, 'textSecondary');

    if (!value || value === 'N/A' || value === 'null' || value === 'undefined' || value.trim?.() === '') {
        return null;
    }

    const handleAction = () => {
        if (label.toLowerCase().includes('phone')) {
            const cleanPhone = value.replace(/[^\d+]/g, '');
            Linking.openURL(`tel:${cleanPhone}`);
        } else if (label.toLowerCase().includes('email')) {
            Linking.openURL(`mailto:${value}`);
        }
    };

    return (
        <TouchableOpacity 
            style={[styles.infoItem, !last && { borderBottomWidth: 1 }, { borderBottomColor: borderColor }]}
            onPress={handleAction}
            activeOpacity={0.7}
        >
            <Ionicons name={icon} size={18} color={primaryColor} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
                <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>{label}</ThemedText>
                <ThemedText style={styles.infoValue} numberOfLines={2}>{value}</ThemedText>
            </View>
            {(label.toLowerCase().includes('phone') || label.toLowerCase().includes('email')) && (
               <Ionicons name="share-outline" size={14} color={primaryColor} style={{ opacity: 0.5 }} />
            )}
        </TouchableOpacity>
    );
};

export default function DetailsScreen() {
    const { data } = useLocalSearchParams();
    const patientData = data ? JSON.parse(data as string) : null;
    const { themeMode, setThemeMode, resolvedTheme } = useTheme();

    const [profileVisible, setProfileVisible] = useState(false);
    const [themeMenuVisible, setThemeMenuVisible] = useState(false);
    const [deactivating, setDeactivating] = useState(false);
    const [downloadingAssessment, setDownloadingAssessment] = useState(false);

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [notificationModalVisible, setNotificationModalVisible] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    // Q&A State
    const [qnaModalVisible, setQnaModalVisible] = useState(false);
    const [qnaList, setQnaList] = useState<QnaItem[]>([]);
    const [loadingQna, setLoadingQna] = useState(false);
    const [refreshingQna, setRefreshingQna] = useState(false);
    const [selectedQnaCategory, setSelectedQnaCategory] = useState('All');
    const [selectedQnaType, setSelectedQnaType] = useState('All');
    const [askQnaModalVisible, setAskQnaModalVisible] = useState(false);
    const [submittingQna, setSubmittingQna] = useState(false);
    const [questionText, setQuestionText] = useState('');
    const [formCategory, setFormCategory] = useState('General');
    const [askedBy, setAskedBy] = useState('');
    const [isPersonal, setIsPersonal] = useState(true);

    const loadNotifications = async (regNo: string, showLoading = true) => {
        if (!regNo) return;
        if (showLoading) setLoadingNotifications(true);
        try {
            const list = await getUserNotifications(regNo);
            setNotifications(filterNotifications24h(list));
        } finally {
            if (showLoading) setLoadingNotifications(false);
        }
    };

    const loadQnaData = async (regNo: string, showLoading = true, cat = selectedQnaCategory, type = selectedQnaType) => {
        if (!regNo) return;
        if (showLoading) setLoadingQna(true);
        try {
            const list = await fetchQnaList(regNo, cat, type);
            setQnaList(list);
        } catch (e) {
            console.error("Error loading Q&A:", e);
        } finally {
            if (showLoading) setLoadingQna(false);
        }
    };

    // Hardware Back Button listener to close active modal or go back
    useEffect(() => {
        const onBackPress = () => {
            if (askQnaModalVisible) {
                Keyboard.dismiss();
                setAskQnaModalVisible(false);
                return true;
            }
            if (qnaModalVisible) {
                setQnaModalVisible(false);
                return true;
            }
            if (notificationModalVisible) {
                setNotificationModalVisible(false);
                setSelectedNotification(null);
                return true;
            }
            if (profileVisible) {
                setProfileVisible(false);
                return true;
            }
            if (themeMenuVisible) {
                setThemeMenuVisible(false);
                return true;
            }
            return false; // allow default back navigation when no modals are active
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [askQnaModalVisible, qnaModalVisible, notificationModalVisible, profileVisible, themeMenuVisible]);

    useEffect(() => {
        const regNo = patientData?.registration?.registration_number;
        if (regNo) {
            // Automatically register device push token on launch
            registerDeviceForPushNotifications(regNo);

            // Initial load of notifications
            loadNotifications(regNo, true);

            // Automatic live background polling every 15 seconds without manual refresh
            const interval = setInterval(() => {
                getUserNotifications(regNo).then(list => setNotifications(list));
            }, 15000);

            return () => clearInterval(interval);
        }
    }, [patientData?.registration?.registration_number]);


    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleNotificationClick = async (item: NotificationItem) => {
        const notiId = item.notification_id || item.id;
        setSelectedNotification(prev => (prev?.notification_id === notiId || prev?.id === notiId ? null : item));
        if (!item.is_read && patientData?.registration?.registration_number) {
            const regNo = patientData.registration.registration_number;
            const res = await markNotificationAsRead(notiId, regNo);
            if (res.success) {
                const readTs = res.read_at || res.read_datetime || new Date().toISOString();
                setNotifications(prev => prev.map(n => 
                    (n.notification_id === notiId || n.id === notiId)
                        ? { ...n, is_read: true, read_datetime: readTs, read_at: readTs }
                        : n
                ));
            }
        }
    };


    const handleDownloadAssessment = (regNo: string) => {
        handleDownloadAssessmentReport(regNo);
    };

    const handleDownloadAssessmentReport = (regNo: string) => {
        downloadAssessmentReport(
            regNo,
            Config.API_BASE_URL,
            () => setDownloadingAssessment(true),
            () => setDownloadingAssessment(false)
        );
    };

    const backgroundColor = useThemeColor({}, 'background');
    const cardColor = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const primaryColor = useThemeColor({}, 'primary');

    if (!patientData) return null;

    const { registration, attendance } = patientData;

    const parseJSON = (str: string) => {
        try {
            return JSON.parse(str);
        } catch (e) {
            return str;
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr === 'N/A') return dateStr;
        return dateStr.split('T')[0];
    };

    const parseAge = (ageStr: any) => {
        if (!ageStr) return null;
        if (typeof ageStr === 'object') return ageStr;
        
        try {
            const parsed = JSON.parse(ageStr);
            if (parsed && typeof parsed === 'object') return parsed;
        } catch (e) {}
        
        if (typeof ageStr === 'string' && ageStr.includes('OrderedDict')) {
            try {
                const matches = [...ageStr.matchAll(/\(['"]([^'"]+)['"]\s*,\s*(\d+)\)/g)];
                const obj: any = {};
                for (const match of matches) {
                    obj[match[1]] = parseInt(match[2], 10);
                }
                if (Object.keys(obj).length > 0) return obj;
            } catch (e) {}
        }
        return null;
    };

    const ageData = parseAge(registration.age);
    const ageString = (() => {
        if (!ageData) return registration.age || 'N/A';
        const yrs = ageData.year || 0;
        const mon = ageData.months || 0;
        const parts = [];
        if (yrs > 0) parts.push(`${yrs} yrs`);
        if (mon > 0) parts.push(`${mon} mon`);
        if (parts.length === 0) {
            if (ageData.days) return `${ageData.days} days`;
            return '0 yrs';
        }
        return parts.join(', ');
    })();

    const clearSavedCredentials = async () => {
        try {
            if (Platform.OS === 'web') {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.removeItem('user_credentials');
                }
                return;
            }
            if (FileSystem.documentDirectory) {
                const credentialsFile = FileSystem.documentDirectory + 'user_credentials.json';
                await FileSystem.deleteAsync(credentialsFile, { idempotent: true });
            }
        } catch (e) {
            console.error("Failed to clear credentials file:", e);
        }
    };

    const handleLogout = () => {
        if (Platform.OS === 'web') {
            if (confirm("Are you sure you want to logout?")) {
                clearSavedCredentials().finally(() => {
                    router.replace('/');
                });
            }
            return;
        }

        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Logout", 
                    style: "destructive", 
                    onPress: () => {
                        clearSavedCredentials().finally(() => {
                            router.replace('/');
                        });
                    } 
                }
            ]
        );
    };

    const handleDeactivateAccount = () => {
        const confirmDeactivate = () => {
            setDeactivating(true);
            axios.post(`${Config.API_BASE_URL}/deactivate-account/`, {
                reg_no: registration.registration_number
            })
            .then(async () => {
                await clearSavedCredentials();
                setProfileVisible(false);
                Alert.alert("Account Deactivated", "Your account has been successfully deactivated.");
                router.replace('/');
            })
            .catch((err) => {
                const msg = err.response?.data?.error || "Failed to deactivate account. Please try again.";
                Alert.alert("Error", msg);
            })
            .finally(() => {
                setDeactivating(false);
            });
        };

        if (Platform.OS === 'web') {
            if (confirm("Are you sure you want to deactivate your account? This action cannot be undone and will log you out.")) {
                confirmDeactivate();
            }
            return;
        }

        Alert.alert(
            "Deactivate Account",
            "Are you sure you want to deactivate your account? This action cannot be undone and you will be logged out immediately.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Deactivate", style: "destructive", onPress: confirmDeactivate }
            ]
        );
    };

    return (
        <ThemedView style={styles.container}>
            <LinearGradient
                colors={resolvedTheme === 'dark' ? ['#0f172a', '#020617'] : ['#f8f9ff', '#e0e7ff']}
                style={styles.backgroundGrad}
            />

            {/* Rebuilt Header */}
            <View style={[styles.header, { backgroundColor: cardColor, borderBottomColor: borderColor }]}>
                <View style={styles.headerTop}>
                    <View style={styles.headerLeft}>
                        <Image 
                            source={require('../assets/images/icon.png')} 
                            style={styles.headerIcon} 
                            resizeMode="contain" 
                        />
                        <ThemedText type="subtitle" style={styles.headerTitle} numberOfLines={1}>
                            {registration.name_of_child}
                        </ThemedText>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity 
                            style={styles.actionCircle} 
                            onPress={() => {
                                loadNotifications(registration.registration_number, notifications.length === 0);
                                setNotificationModalVisible(true);
                            }}
                        >
                            <Ionicons name="notifications-outline" size={24} color={primaryColor} />
                            {unreadCount > 0 && (
                                <View style={styles.badgeContainer}>
                                    <Text style={styles.badgeText}>
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionCircle} onPress={() => setProfileVisible(true)}>
                            <Ionicons name="person-circle-outline" size={26} color={primaryColor} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionCircle} onPress={() => setThemeMenuVisible(true)}>
                            <Ionicons
                                name={themeMode === 'light' ? 'sunny-outline' : themeMode === 'dark' ? 'moon-outline' : 'settings-outline'}
                                size={22}
                                color={primaryColor}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
                <ThemedText style={[styles.headerReg, { color: textSecondary }]}>{registration.registration_number}</ThemedText>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Developmental Progress Journey Card */}
                <View style={[styles.progressOverviewCard, { backgroundColor: resolvedTheme === 'dark' ? '#111827' : '#ffffff', borderColor }]}>
                    <View style={styles.progressCardHeader}>
                        <View style={{ flex: 1 }}>
                            <ThemedText style={styles.progressTitle}>Developmental Journey</ThemedText>
                            <ThemedText style={[styles.progressSubtitle, { color: textSecondary }]}>Active Milestones & Continuous Tracking</ThemedText>
                        </View>
                        <View style={[styles.liveStatusPill, { backgroundColor: '#10b98120', borderColor: '#10b98140' }]}>
                            <View style={[styles.pulseDot, { backgroundColor: '#10b981' }]} />
                            <ThemedText style={styles.liveStatusText}>ACTIVE</ThemedText>
                        </View>
                    </View>

                    <View style={styles.therapyMiniGrid}>
                        <View style={[styles.therapyMiniItem, { backgroundColor: resolvedTheme === 'dark' ? '#1e1b4b' : '#f5f3ff', borderColor: '#8b5cf630' }]}>
                            <Ionicons name="chatbubbles-outline" size={16} color="#8b5cf6" />
                            <ThemedText style={[styles.therapyMiniText, { color: '#8b5cf6' }]}>Speech</ThemedText>
                        </View>
                        <View style={[styles.therapyMiniItem, { backgroundColor: resolvedTheme === 'dark' ? '#1e1b4b' : '#eef2ff', borderColor: '#4f46e530' }]}>
                            <Ionicons name="hand-left-outline" size={16} color="#4f46e5" />
                            <ThemedText style={[styles.therapyMiniText, { color: '#4f46e5' }]}>OT</ThemedText>
                        </View>
                        <View style={[styles.therapyMiniItem, { backgroundColor: resolvedTheme === 'dark' ? '#082f49' : '#f0f9ff', borderColor: '#0284c730' }]}>
                            <Ionicons name="bulb-outline" size={16} color="#0284c7" />
                            <ThemedText style={[styles.therapyMiniText, { color: '#0284c7' }]}>ABA</ThemedText>
                        </View>
                        <View style={[styles.therapyMiniItem, { backgroundColor: resolvedTheme === 'dark' ? '#134e4a' : '#f0fdfa', borderColor: '#0d948830' }]}>
                            <Ionicons name="body-outline" size={16} color="#0d9488" />
                            <ThemedText style={[styles.therapyMiniText, { color: '#0d9488' }]}>Physio</ThemedText>
                        </View>
                    </View>
                </View>

                {/* Main 2-Column Action Tiles Grid */}
                <ThemedText style={[styles.sectionHeading, { color: textSecondary }]}>PRIMARY MODULES</ThemedText>
                
                <View style={styles.actionGrid}>
                    {/* Developmental Goals */}
                    <TouchableOpacity
                        style={[styles.gridCard, { backgroundColor: resolvedTheme === 'dark' ? '#1e1b4b' : '#eef2ff', borderColor: '#6366f140' }]}
                        onPress={() => router.push({ pathname: '/goals/development' as any, params: { regNo: registration.registration_number } })}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={resolvedTheme === 'dark' ? ['#4338ca', '#312e81'] : ['#4f46e5', '#6366f1']}
                            style={styles.gridIconCircle}
                        >
                            <Ionicons name="rocket" size={22} color="white" />
                        </LinearGradient>
                        <ThemedText style={[styles.gridCardTitle, { color: resolvedTheme === 'dark' ? '#c7d2fe' : '#312e81' }]}>
                            Developmental Goals
                        </ThemedText>
                        <ThemedText style={[styles.gridCardSub, { color: textSecondary }]}>
                            Milestones & Target Skills
                        </ThemedText>
                        <View style={styles.gridCardFooter}>
                            <ThemedText style={[styles.gridActionLink, { color: '#4f46e5' }]}>View Goals →</ThemedText>
                        </View>
                    </TouchableOpacity>

                    {/* Developmental Activity */}
                    <TouchableOpacity
                        style={[styles.gridCard, { backgroundColor: resolvedTheme === 'dark' ? '#064e3b' : '#ecfdf5', borderColor: '#10b98140' }]}
                        onPress={() => router.push({ pathname: '/goals', params: { regNo: registration.registration_number } })}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={resolvedTheme === 'dark' ? ['#059669', '#047857'] : ['#10b981', '#059669']}
                            style={styles.gridIconCircle}
                        >
                            <Ionicons name="stats-chart" size={22} color="white" />
                        </LinearGradient>
                        <ThemedText style={[styles.gridCardTitle, { color: resolvedTheme === 'dark' ? '#a7f3d0' : '#065f46' }]}>
                            Developmental Activity
                        </ThemedText>
                        <ThemedText style={[styles.gridCardSub, { color: textSecondary }]}>
                            Daily Logs, Media & Notes
                        </ThemedText>
                        <View style={styles.gridCardFooter}>
                            <ThemedText style={[styles.gridActionLink, { color: '#059669' }]}>View Feed →</ThemedText>
                        </View>
                    </TouchableOpacity>

                    {/* Attendance History */}
                    <TouchableOpacity
                        style={[styles.gridCard, { backgroundColor: resolvedTheme === 'dark' ? '#082f49' : '#f0f9ff', borderColor: '#0284c740' }]}
                        onPress={() => router.push({ pathname: '/attendance' as any, params: { regNo: registration.registration_number, attendance: JSON.stringify(attendance) } })}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={resolvedTheme === 'dark' ? ['#0284c7', '#0369a1'] : ['#0ea5e9', '#0284c7']}
                            style={styles.gridIconCircle}
                        >
                            <Ionicons name="calendar" size={22} color="white" />
                        </LinearGradient>
                        <ThemedText style={[styles.gridCardTitle, { color: resolvedTheme === 'dark' ? '#bae6fd' : '#075985' }]}>
                            Session Attendance
                        </ThemedText>
                        <ThemedText style={[styles.gridCardSub, { color: textSecondary }]}>
                            Monthly Calendar Matrix
                        </ThemedText>
                        <View style={styles.gridCardFooter}>
                            <ThemedText style={[styles.gridActionLink, { color: '#0284c7' }]}>View Matrix →</ThemedText>
                        </View>
                    </TouchableOpacity>

                    {/* Clinician Q&A Forum */}
                    <TouchableOpacity
                        style={[styles.gridCard, { backgroundColor: resolvedTheme === 'dark' ? '#2e1065' : '#f5f3ff', borderColor: '#8b5cf640' }]}
                        onPress={() => {
                            loadQnaData(registration.registration_number, true);
                            setQnaModalVisible(true);
                        }}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={resolvedTheme === 'dark' ? ['#7c3aed', '#5b21b6'] : ['#8b5cf6', '#7c3aed']}
                            style={styles.gridIconCircle}
                        >
                            <Ionicons name="chatbubbles" size={22} color="white" />
                        </LinearGradient>
                        <ThemedText style={[styles.gridCardTitle, { color: resolvedTheme === 'dark' ? '#ddd6fe' : '#5b21b6' }]}>
                            Clinician Q&A
                        </ThemedText>
                        <ThemedText style={[styles.gridCardSub, { color: textSecondary }]}>
                            Ask Doctor & Helpdesk
                        </ThemedText>
                        <View style={styles.gridCardFooter}>
                            <ThemedText style={[styles.gridActionLink, { color: '#7c3aed' }]}>Open Forum →</ThemedText>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Secondary Actions & Reports Row */}
                <ThemedText style={[styles.sectionHeading, { color: textSecondary, marginTop: 15 }]}>REPORTS & SERVICES</ThemedText>
                
                <View style={styles.secondaryRow}>
                    <TouchableOpacity
                        style={[styles.secondaryCard, { backgroundColor: cardColor, borderColor }]}
                        onPress={() => router.push({ pathname: '/assessmentReport' as any, params: { regNo: registration.registration_number } })}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.secIconBox, { backgroundColor: '#0f766e15' }]}>
                            <Ionicons name="analytics" size={20} color="#0f766e" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <ThemedText style={styles.secCardTitle}>Assessment Report</ThemedText>
                            <ThemedText style={[styles.secCardSub, { color: textSecondary }]}>PDF Downloads & Analysis</ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryCard, { backgroundColor: cardColor, borderColor }]}
                        onPress={() => router.push({ pathname: '/leaveform' as any, params: { regNo: registration.registration_number } })}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.secIconBox, { backgroundColor: '#d9770615' }]}>
                            <Ionicons name="time" size={20} color="#d97706" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <ThemedText style={styles.secCardTitle}>Leave Application</ThemedText>
                            <ThemedText style={[styles.secCardSub, { color: textSecondary }]}>Apply & Track Leave Requests</ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryCard, { backgroundColor: cardColor, borderColor }]}
                        onPress={() => router.push({ pathname: '/report' as any, params: { regNo: registration.registration_number } })}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.secIconBox, { backgroundColor: '#be123c15' }]}>
                            <Ionicons name="document-text" size={20} color="#be123c" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <ThemedText style={styles.secCardTitle}>History Recording Sheet</ThemedText>
                            <ThemedText style={[styles.secCardSub, { color: textSecondary }]}>Medical & Assessment History</ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Guardian / Contact Information */}
                <ThemedText style={[styles.sectionHeading, { color: textSecondary, marginTop: 15 }]}>GUARDIAN INFORMATION</ThemedText>
                <View style={[styles.section, { backgroundColor: cardColor, borderColor, borderWidth: 1 }]}>
                    <View style={styles.infoRow}>
                        <InfoItem label="Mother" value={registration.mother_name} icon="woman-outline" />
                        <InfoItem label="Phone" value={registration.mother_phone_number} icon="call-outline" />
                    </View>
                    <View style={styles.infoRow}>
                        <InfoItem label="Father" value={registration.father_name || 'N/A'} icon="man-outline" />
                        <InfoItem label="Phone" value={registration.father_phone_number || 'N/A'} icon="call-outline" last />
                    </View>
                </View>

                <View style={{ height: 50 }} />
            </ScrollView>

            {/* Theme Dropdown Modal */}
            <Modal
                transparent
                visible={themeMenuVisible}
                animationType="fade"
                onRequestClose={() => setThemeMenuVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setThemeMenuVisible(false)}
                >
                    <View style={[styles.dropdown, { backgroundColor: cardColor, borderColor: borderColor }]}>
                        {(['system', 'light', 'dark'] as const).map((mode) => (
                            <TouchableOpacity
                                key={mode}
                                style={[styles.dropdownItem, themeMode === mode && { backgroundColor: primaryColor + '15' }]}
                                onPress={() => {
                                    setThemeMode(mode);
                                    setThemeMenuVisible(false);
                                }}
                            >
                                <Ionicons
                                    name={mode === 'system' ? 'settings-outline' : mode === 'light' ? 'sunny-outline' : 'moon-outline'}
                                    size={18}
                                    color={themeMode === mode ? primaryColor : textSecondary}
                                />
                                <ThemedText style={[styles.dropdownText, themeMode === mode && { color: primaryColor, fontWeight: '700' }]}>
                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </ThemedText>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Profile Modal */}
            <Modal
                visible={profileVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setProfileVisible(false)}
            >
                <ThemedView style={styles.profileModalContainer}>
                    <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                        <ThemedText type="title">MDC Profile</ThemedText>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity 
                                style={{ marginRight: 15, backgroundColor: '#fee2e2', padding: 6, borderRadius: 10 }} 
                                onPress={() => {
                                    setProfileVisible(false);
                                    handleLogout();
                                }}
                            >
                                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setProfileVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={28} color={textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={styles.modalScroll}>
                        {/* Basic Information */}
                        <View style={[styles.section, { backgroundColor: cardColor }]}>
                            <ThemedText type="subtitle" style={styles.sectionTitle}>Basic Information</ThemedText>
                            <InfoItem label="Date of Birth" value={formatDate(registration.dob) || 'N/A'} icon="calendar-outline" />
                            <InfoItem label="Gender" value={registration.sex} icon="transgender-outline" />
                            <InfoItem label="Age" value={ageString} icon="hourglass-outline" last />
                        </View>

                        {/* Personal Information */}
                        <View style={[styles.section, { backgroundColor: cardColor }]}>
                            <ThemedText type="subtitle" style={styles.sectionTitle}>Personal Information</ThemedText>
                            <View style={styles.infoRow}>
                                <InfoItem label="Mother" value={registration.mother_name} icon="person-outline" />
                                <InfoItem label="Mother Phone" value={registration.mother_phone_number} icon="call-outline" />
                            </View>
                            <View style={styles.infoRow}>
                                <InfoItem label="Father" value={registration.father_name || 'N/A'} icon="person-outline" />
                                <InfoItem label="Father Phone" value={registration.father_phone_number || 'N/A'} icon="call-outline" last />
                            </View>
                        </View>

                        {/* Address Information */}
                        <View style={[styles.section, { backgroundColor: cardColor }]}>
                            <ThemedText type="subtitle" style={styles.sectionTitle}>Contact & Address</ThemedText>
                            <InfoItem label="Address" value={registration.address} icon="location-outline" />
                            <InfoItem label="Email" value={registration.mail_id} icon="mail-outline" last />
                        </View>

                        {/* Account Settings */}
                        <View style={[styles.section, { backgroundColor: cardColor, borderColor: '#fee2e2', borderWidth: 1 }]}>
                            <ThemedText type="subtitle" style={[styles.sectionTitle, { color: '#ef4444' }]}>Account Settings</ThemedText>
                            
                            <TouchableOpacity 
                                style={[styles.infoItem, { borderBottomWidth: 0, opacity: deactivating ? 0.6 : 1 }]}
                                onPress={handleDeactivateAccount}
                                disabled={deactivating}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="trash-outline" size={18} color="#ef4444" style={styles.infoIcon} />
                                <View style={{ flex: 1 }}>
                                    <ThemedText style={[styles.infoLabel, { color: '#ef4444' }]}>DEACTIVATE ACCOUNT</ThemedText>
                                    <ThemedText style={[styles.infoValue, { color: textSecondary, fontSize: 13, fontWeight: '500', marginTop: 2 }]} numberOfLines={2}>
                                        Permanently deactivate your portal access
                                    </ThemedText>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color="#ef4444" style={{ opacity: 0.7 }} />
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </ThemedView>
            </Modal>

            {/* Notification Modal */}
            <Modal
                animationType="slide"
                transparent={false}
                visible={notificationModalVisible}
                onRequestClose={() => {
                    setNotificationModalVisible(false);
                    setSelectedNotification(null);
                }}
            >
                <ThemedView style={[styles.profileModalContainer, { backgroundColor }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="notifications" size={24} color={primaryColor} style={{ marginRight: 10 }} />
                            <ThemedText type="title">Notifications</ThemedText>
                        </View>
                        <TouchableOpacity 
                            onPress={() => {
                                setNotificationModalVisible(false);
                                setSelectedNotification(null);
                            }} 
                            style={styles.closeBtn}
                        >
                            <Ionicons name="close" size={26} color={primaryColor} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
                        {loadingNotifications ? (
                            <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 40 }} />
                        ) : notifications.length === 0 ? (
                            <View style={{ alignItems: 'center', marginTop: 60 }}>
                                <Ionicons name="notifications-off-outline" size={48} color={textSecondary} style={{ opacity: 0.5 }} />
                                <ThemedText style={{ marginTop: 16, color: textSecondary, fontSize: 16, fontWeight: '600' }}>
                                    No active notifications
                                </ThemedText>
                            </View>
                        ) : (
                            notifications.map((item) => {
                                const isSelected = selectedNotification?.notification_id === item.notification_id;
                                return (
                                    <TouchableOpacity
                                        key={item.notification_id || item.id}
                                        style={[
                                            styles.notificationCard,
                                            { backgroundColor: cardColor, borderColor: item.is_read ? borderColor : primaryColor },
                                            !item.is_read && { borderWidth: 1.5 }
                                        ]}
                                        onPress={() => handleNotificationClick(item)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.notiHeader}>
                                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                                {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: primaryColor }]} />}
                                                <ThemedText style={[styles.notiTitle, !item.is_read && { fontWeight: '900' }]}>
                                                    {item.title}
                                                </ThemedText>
                                            </View>
                                            <ThemedText style={[styles.notiDate, { color: textSecondary }]}>
                                                {item.created_date ? new Date(item.created_date).toLocaleDateString() : ''}
                                            </ThemedText>
                                        </View>

                                        <ThemedText style={[styles.notiSub, { color: textSecondary }]} numberOfLines={isSelected ? undefined : 2}>
                                            {item.sub}
                                        </ThemedText>

                                        <View style={styles.notiFooter}>
                                            <ThemedText style={[styles.notiBadge, item.is_read ? { color: textSecondary } : { color: primaryColor, fontWeight: '800' }]}>
                                                {item.is_read ? '✓ Read' : '● New'}
                                            </ThemedText>
                                            {item.is_read && (item.read_at || item.read_datetime) && (
                                                <ThemedText style={[styles.readTimeText, { color: textSecondary }]}>
                                                    Read at: {new Date(item.read_at || item.read_datetime!).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </ThemedText>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>
                </ThemedView>
            </Modal>
            {/* Q&A Modal */}
            <Modal
                animationType="slide"
                transparent={false}
                visible={qnaModalVisible}
                onRequestClose={() => {
                    setQnaModalVisible(false);
                }}
            >
                <ThemedView style={[styles.profileModalContainer, { backgroundColor }]}>
                    {/* Header */}
                    <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="chatbubbles" size={24} color={primaryColor} style={{ marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                                <ThemedText type="title">Q&A Forum</ThemedText>
                                <ThemedText style={{ fontSize: 11, color: textSecondary, fontWeight: '600' }}>
                                    Last 7 days • {registration.name_of_child}
                                </ThemedText>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={{ backgroundColor: primaryColor, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 12 }}
                            onPress={() => setAskQnaModalVisible(true)}
                        >
                            <Ionicons name="add" size={18} color="white" />
                            <ThemedText style={{ color: 'white', fontWeight: '800', fontSize: 13, marginLeft: 2 }}>Ask</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => setQnaModalVisible(false)} 
                            style={styles.closeBtn}
                        >
                            <Ionicons name="close" size={26} color={primaryColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Scope Filter Bar (All / Personal / Common) */}
                    <View style={{ flexDirection: 'row', borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.04)', padding: 3, marginHorizontal: 20, marginTop: 12 }}>
                        {['All', 'Personal', 'Common'].map((t) => {
                            const isSelected = selectedQnaType === t;
                            return (
                                <TouchableOpacity
                                    key={t}
                                    style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 7, borderRadius: 12, backgroundColor: isSelected ? primaryColor : 'transparent' }}
                                    onPress={() => {
                                        setSelectedQnaType(t);
                                        loadQnaData(registration.registration_number, true, selectedQnaCategory, t);
                                    }}
                                >
                                    <Ionicons
                                        name={t === 'Personal' ? 'lock-closed-outline' : t === 'Common' ? 'earth-outline' : 'layers-outline'}
                                        size={13}
                                        color={isSelected ? 'white' : textSecondary}
                                        style={{ marginRight: 4 }}
                                    />
                                    <ThemedText style={{ fontSize: 12, color: isSelected ? 'white' : textSecondary, fontWeight: isSelected ? '800' : '600' }}>
                                        {t === 'All' ? 'All Questions' : t}
                                    </ThemedText>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Category Scroll */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, marginHorizontal: 20, maxHeight: 36 }}>
                        {['All', 'General', 'Therapy', 'Medical', 'Behavioral', 'Daily Care'].map((cat) => {
                            const isSelected = selectedQnaCategory === cat;
                            return (
                                <TouchableOpacity
                                    key={cat}
                                    style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: isSelected ? primaryColor : borderColor, backgroundColor: isSelected ? primaryColor + '20' : cardColor, marginRight: 6 }}
                                    onPress={() => {
                                        setSelectedQnaCategory(cat);
                                        loadQnaData(registration.registration_number, true, cat, selectedQnaType);
                                    }}
                                >
                                    <ThemedText style={{ fontSize: 12, color: isSelected ? primaryColor : textSecondary, fontWeight: isSelected ? '800' : '500' }}>
                                        {cat}
                                    </ThemedText>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Main Content List */}
                    <ScrollView
                        contentContainerStyle={styles.modalScroll}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshingQna}
                                onRefresh={async () => {
                                    setRefreshingQna(true);
                                    await loadQnaData(registration.registration_number, false);
                                    setRefreshingQna(false);
                                }}
                                colors={[primaryColor]}
                                tintColor={primaryColor}
                            />
                        }
                    >
                        {loadingQna && !refreshingQna ? (
                            <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 40 }} />
                        ) : qnaList.length === 0 ? (
                            <View style={{ alignItems: 'center', marginTop: 50, paddingHorizontal: 20 }}>
                                <Ionicons name="chatbubbles-outline" size={48} color={textSecondary} style={{ opacity: 0.4 }} />
                                <ThemedText style={{ marginTop: 14, fontSize: 16, fontWeight: '800' }}>No Questions Found</ThemedText>
                                <ThemedText style={{ marginTop: 6, fontSize: 13, textAlign: 'center', color: textSecondary }}>
                                    No questions submitted within the last week matching your filter.
                                </ThemedText>
                                <TouchableOpacity
                                    style={{ backgroundColor: primaryColor, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, marginTop: 16 }}
                                    onPress={() => setAskQnaModalVisible(true)}
                                >
                                    <Ionicons name="help-circle-outline" size={18} color="white" style={{ marginRight: 6 }} />
                                    <ThemedText style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>Ask a Question</ThemedText>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            qnaList.map((item) => {
                                const isAnswered = item.status?.toLowerCase() === 'answered' || (item.answers && item.answers.length > 0);
                                const isPersonalQ = item.is_personal !== false;
                                const createdStr = item.created_date ? new Date(item.created_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

                                return (
                                    <View key={item.qa_id || item._id || item.id} style={[styles.notificationCard, { backgroundColor: cardColor, borderColor: borderColor }]}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                                {/* Scope Badge */}
                                                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1, backgroundColor: isPersonalQ ? '#e0e7ff' : '#f0fdf4', borderColor: isPersonalQ ? '#6366f1' : '#22c55e' }}>
                                                    <Ionicons name={isPersonalQ ? 'lock-closed' : 'earth'} size={10} color={isPersonalQ ? '#4338ca' : '#15803d'} style={{ marginRight: 3 }} />
                                                    <ThemedText style={{ fontSize: 10, fontWeight: '800', color: isPersonalQ ? '#4338ca' : '#15803d' }}>
                                                        {isPersonalQ ? 'Personal' : 'Common'}
                                                    </ThemedText>
                                                </View>
                                                {/* Category Badge */}
                                                <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: primaryColor + '15' }}>
                                                    <ThemedText style={{ fontSize: 10, fontWeight: '800', color: primaryColor, textTransform: 'uppercase' }}>
                                                        {item.category || 'General'}
                                                    </ThemedText>
                                                </View>
                                                {/* Status Badge */}
                                                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: isAnswered ? '#dcfce7' : '#fef3c7' }}>
                                                    <ThemedText style={{ fontSize: 10, fontWeight: '800', color: isAnswered ? '#166534' : '#b45309' }}>
                                                        {isAnswered ? 'Answered' : 'Pending'}
                                                    </ThemedText>
                                                </View>
                                            </View>

                                            <ThemedText style={{ fontSize: 11, fontWeight: '700', color: textSecondary }}>
                                                {item.qa_id} {createdStr ? `• ${createdStr}` : ''}
                                            </ThemedText>
                                        </View>

                                        {/* Question Text */}
                                        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: isPersonalQ ? '#4f46e5' : '#059669', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginTop: 2 }}>
                                                <Text style={{ color: 'white', fontWeight: '900', fontSize: 12 }}>Q</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <ThemedText style={{ fontSize: 14, fontWeight: '700', lineHeight: 20 }}>
                                                    {item.question}
                                                </ThemedText>
                                                {item.asked_by ? (
                                                    <ThemedText style={{ fontSize: 11, marginTop: 2, color: textSecondary }}>
                                                        Asked by: {item.asked_by}
                                                    </ThemedText>
                                                ) : null}
                                            </View>
                                        </View>

                                        {/* Answers */}
                                        {item.answers && item.answers.length > 0 ? (
                                            <View style={{ borderRadius: 12, borderWidth: 1, padding: 10, backgroundColor: primaryColor + '08', borderColor: primaryColor + '20' }}>
                                                <ThemedText style={{ fontSize: 11, fontWeight: '800', color: primaryColor, marginBottom: 4 }}>
                                                    RESPONSES ({item.answers.length})
                                                </ThemedText>
                                                {item.answers.map((ans, idx) => {
                                                    const ansText = typeof ans === 'string' ? ans : (ans.answer || ans.text || JSON.stringify(ans));
                                                    const ansBy = typeof ans === 'object' ? (ans.answered_by || ans.by || 'Doctor / Therapist') : 'Medical Staff';
                                                    return (
                                                        <View key={idx} style={{ marginTop: idx > 0 ? 6 : 0, paddingTop: idx > 0 ? 6 : 0, borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: borderColor }}>
                                                            <ThemedText style={{ fontSize: 13, lineHeight: 18 }}>{ansText}</ThemedText>
                                                            <ThemedText style={{ fontSize: 10, fontWeight: '700', color: primaryColor, marginTop: 3 }}>
                                                                ✓ {ansBy}
                                                            </ThemedText>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        ) : (
                                            <ThemedText style={{ fontSize: 11, fontStyle: 'italic', color: textSecondary, marginTop: 4 }}>
                                                Awaiting staff response
                                            </ThemedText>
                                        )}
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>
                </ThemedView>

                {/* Sub-Modal: Ask a Question */}
                <Modal
                    visible={askQnaModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => {
                        Keyboard.dismiss();
                        setAskQnaModalVisible(false);
                    }}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={{ flex: 1, width: '100%', justifyContent: 'flex-end' }}>
                                <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                                    <View style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, backgroundColor: cardColor, width: '100%' }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                            <ThemedText type="title" style={{ fontSize: 18, fontWeight: '800' }}>
                                                Ask a Question
                                            </ThemedText>
                                            <TouchableOpacity 
                                                onPress={() => {
                                                    Keyboard.dismiss();
                                                    setAskQnaModalVisible(false);
                                                }} 
                                                style={{ padding: 4 }}
                                            >
                                                <Ionicons name="close" size={24} color={textSecondary} />
                                            </TouchableOpacity>
                                        </View>

                                        <ScrollView 
                                            style={{ maxHeight: height * 0.60 }} 
                                            showsVerticalScrollIndicator={false}
                                            keyboardShouldPersistTaps="handled"
                                        >
                                            {/* Type Toggle */}
                                            <ThemedText style={{ fontSize: 11, fontWeight: '800', color: textSecondary, marginBottom: 6 }}>QUESTION TYPE</ThemedText>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: borderColor, backgroundColor: backgroundColor, marginBottom: 10 }}>
                                                <View style={{ flex: 1, paddingRight: 8 }}>
                                                    <ThemedText style={{ fontWeight: '800', fontSize: 13 }}>
                                                        {isPersonal ? 'Personal Question' : 'Common Question'}
                                                    </ThemedText>
                                                    <ThemedText style={{ fontSize: 11, color: textSecondary }}>
                                                        {isPersonal ? 'Private to care team' : 'Visible in public Q&A'}
                                                    </ThemedText>
                                                </View>
                                                <Switch
                                                    value={isPersonal}
                                                    onValueChange={setIsPersonal}
                                                    trackColor={{ false: '#10b981', true: '#6366f1' }}
                                                    thumbColor="white"
                                                />
                                            </View>

                                            {/* Category */}
                                            <ThemedText style={{ fontSize: 11, fontWeight: '800', color: textSecondary, marginBottom: 6 }}>CATEGORY</ThemedText>
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                                                {['General', 'Therapy', 'Medical', 'Behavioral', 'Daily Care'].map((cat) => (
                                                    <TouchableOpacity
                                                        key={cat}
                                                        style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: formCategory === cat ? primaryColor : borderColor, backgroundColor: formCategory === cat ? primaryColor : 'transparent' }}
                                                        onPress={() => setFormCategory(cat)}
                                                    >
                                                        <ThemedText style={{ fontSize: 12, fontWeight: '600', color: formCategory === cat ? 'white' : textSecondary }}>
                                                            {cat}
                                                        </ThemedText>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>

                                            {/* Name */}
                                            <ThemedText style={{ fontSize: 11, fontWeight: '800', color: textSecondary, marginBottom: 6 }}>YOUR NAME (OPTIONAL)</ThemedText>
                                            <TextInput
                                                style={{ borderRadius: 12, borderWidth: 1, borderColor: borderColor, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, backgroundColor: backgroundColor, color: textSecondary, marginBottom: 10 }}
                                                placeholder="e.g. Parent / Guardian"
                                                placeholderTextColor={textSecondary}
                                                value={askedBy}
                                                onChangeText={setAskedBy}
                                            />

                                            {/* Question */}
                                            <ThemedText style={{ fontSize: 11, fontWeight: '800', color: textSecondary, marginBottom: 6 }}>YOUR QUESTION *</ThemedText>
                                            <TextInput
                                                style={{ borderRadius: 12, borderWidth: 1, borderColor: borderColor, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, backgroundColor: backgroundColor, color: textSecondary, minHeight: 90, textAlignVertical: 'top' }}
                                                placeholder="Type your question..."
                                                placeholderTextColor={textSecondary}
                                                multiline
                                                numberOfLines={4}
                                                value={questionText}
                                                onChangeText={setQuestionText}
                                            />
                                        </ScrollView>

                                        <TouchableOpacity
                                            style={{ backgroundColor: primaryColor, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 16, marginTop: 14, opacity: submittingQna ? 0.7 : 1 }}
                                            onPress={async () => {
                                                if (!questionText.trim()) {
                                                    Alert.alert("Required", "Please type a question.");
                                                    return;
                                                }
                                                setSubmittingQna(true);
                                                try {
                                                    await submitQuestion({
                                                        question: questionText.trim(),
                                                        category: formCategory,
                                                        asked_by: askedBy.trim() || 'Parent/Guardian',
                                                        registration_number: registration.registration_number,
                                                        patient_name: registration.name_of_child,
                                                        is_personal: isPersonal,
                                                    });
                                                    Alert.alert("Submitted", "Your question was submitted successfully.");
                                                    setQuestionText('');
                                                    setAskQnaModalVisible(false);
                                                    Keyboard.dismiss();
                                                    loadQnaData(registration.registration_number, false);
                                                } catch (e) {
                                                    Alert.alert("Error", "Could not submit question.");
                                                } finally {
                                                    setSubmittingQna(false);
                                                }
                                            }}
                                            disabled={submittingQna}
                                        >
                                            {submittingQna ? (
                                                <ActivityIndicator color="white" />
                                            ) : (
                                                <ThemedText style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>Submit Question</ThemedText>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </TouchableWithoutFeedback>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </Modal>
            </Modal>
        </ThemedView>
    );
}
