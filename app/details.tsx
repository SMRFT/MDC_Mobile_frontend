import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, Dimensions, Modal, Image, Alert, Platform, Linking, ActivityIndicator, Text } from 'react-native';
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
import { getUserNotifications, markNotificationAsRead, registerDeviceForPushNotifications, NotificationItem } from '@/utils/notificationService';
import * as FileSystem from 'expo-file-system/legacy';


const { width, height } = Dimensions.get('window');

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

    const loadNotifications = async (regNo: string) => {
        if (!regNo) return;
        setLoadingNotifications(true);
        const list = await getUserNotifications(regNo);
        setNotifications(list);
        setLoadingNotifications(false);
    };

    useEffect(() => {
        const regNo = patientData?.registration?.registration_number;
        if (regNo) {
            // Automatically register device push token on launch
            registerDeviceForPushNotifications(regNo);

            // Initial load of notifications
            loadNotifications(regNo);

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

    const ThemeDropdown = () => (
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
    );

    const ProfileModal = () => (
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
    );

    const handleLogout = () => {
        const clearSavedCredentials = async () => {
            try {
                const credentialsFile = FileSystem.documentDirectory + 'user_credentials.json';
                await FileSystem.deleteAsync(credentialsFile, { idempotent: true });
            } catch (e) {
                console.error("Failed to clear credentials file:", e);
            }
        };

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
                try {
                    const credentialsFile = FileSystem.documentDirectory + 'user_credentials.json';
                    await FileSystem.deleteAsync(credentialsFile, { idempotent: true });
                } catch (e) {
                    console.error("Failed to clear credentials file:", e);
                }
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
                                loadNotifications(registration.registration_number);
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
                {/* Simplified Personal Info Display */}
                <View style={[styles.section, { backgroundColor: cardColor }]}>
                    <View style={styles.personalHeader}>
                        <Ionicons name="people-outline" size={22} color={primaryColor} />
                        <ThemedText type="subtitle" style={styles.personalTitle}>Personal Information</ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                        <InfoItem label="Mother" value={registration.mother_name} icon="woman-outline" />
                        <InfoItem label="Phone" value={registration.mother_phone_number} icon="call-outline" />
                    </View>
                    <View style={styles.infoRow}>
                        <InfoItem label="Father" value={registration.father_name || 'N/A'} icon="man-outline" />
                        <InfoItem label="Phone" value={registration.father_phone_number || 'N/A'} icon="call-outline" last />
                    </View>
                </View>

                {/* Dashboard Buttons */}
                <View style={styles.buttonStack}>
                    <TouchableOpacity
                        style={[styles.dashboardBtn, { backgroundColor: '#4338ca' }]}
                        onPress={() => router.push({ pathname: '/goals', params: { regNo: registration.registration_number } })}
                    >
                        <View style={styles.btnIcon}>
                            <Ionicons name="stats-chart" size={24} color="white" />
                        </View>
                        <ThemedText style={styles.btnText}>Goals Assessment</ThemedText>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.dashboardBtn, { backgroundColor: '#4f46e5' }]}
                        onPress={() => router.push({ pathname: '/goals/development' as any, params: { regNo: registration.registration_number } })}
                    >
                        <View style={styles.btnIcon}>
                            <Ionicons name="rocket" size={24} color="white" />
                        </View>
                        <ThemedText style={styles.btnText}>Developmental Goals</ThemedText>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.dashboardBtn, { backgroundColor: '#15803d' }]}
                        onPress={() => router.push({ pathname: '/leaveform' as any, params: { regNo: registration.registration_number } })}
                    >
                        <View style={styles.btnIcon}>
                            <Ionicons name="calendar" size={24} color="white" />
                        </View>
                        <ThemedText style={styles.btnText}>Leave Dashboard</ThemedText>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.dashboardBtn, { backgroundColor: '#d97706' }]}
                        onPress={() => router.push({ pathname: '/attendance' as any, params: { regNo: registration.registration_number, attendance: JSON.stringify(attendance) } })}
                    >
                        <View style={styles.btnIcon}>
                            <Ionicons name="time" size={24} color="white" />
                        </View>
                        <ThemedText style={styles.btnText}>Attendance History</ThemedText>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.dashboardBtn, { backgroundColor: '#0f766e' }]}
                        onPress={() => router.push({ pathname: '/report' as any, params: { regNo: registration.registration_number } })}
                    >
                        <View style={styles.btnIcon}>
                            <Ionicons name="document-text" size={24} color="white" />
                        </View>
                        <ThemedText style={styles.btnText}>History Report</ThemedText>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.dashboardBtn, { backgroundColor: '#0369a1', marginTop: 12 }]}
                        onPress={() => router.push({ pathname: '/assessmentReport' as any, params: { regNo: registration.registration_number } })}
                    >
                        <View style={styles.btnIcon}>
                            <Ionicons name="analytics" size={24} color="white" />
                        </View>
                        <ThemedText style={styles.btnText}>Assessment Report</ThemedText>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <ThemeDropdown />
            <ProfileModal />
            <NotificationModal />
        </ThemedView>
    );

    function NotificationModal() {
        return (
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
        );
    }
}


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
    buttonStack: { marginTop: 5 },
    dashboardBtn: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 22, marginBottom: 15, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12 },
    btnIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    btnText: { flex: 1, color: 'white', fontSize: 17, fontWeight: '900' },
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
