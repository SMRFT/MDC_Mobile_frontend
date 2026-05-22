import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, Dimensions, Modal, Image, Alert, Platform, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTheme } from '@/context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function DetailsScreen() {
    const { data } = useLocalSearchParams();
    const patientData = data ? JSON.parse(data as string) : null;
    const { themeMode, setThemeMode, resolvedTheme } = useTheme();

    const [profileVisible, setProfileVisible] = useState(false);
    const [themeMenuVisible, setThemeMenuVisible] = useState(false);

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

    const ageData = parseJSON(registration.age);
    const ageString = typeof ageData === 'object'
        ? `${ageData.year}y ${ageData.months}m ${ageData.days}d`
        : registration.age;

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
                    <TouchableOpacity onPress={() => setProfileVisible(false)} style={styles.closeBtn}>
                        <Ionicons name="close" size={28} color={textSecondary} />
                    </TouchableOpacity>
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
                </ScrollView>
            </ThemedView>
        </Modal>
    );

    const handleLogout = () => {
        if (Platform.OS === 'web') {
            if (confirm("Are you sure you want to logout?")) {
                router.replace('/');
            }
            return;
        }

        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", style: "destructive", onPress: () => router.replace('/') }
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

                        <TouchableOpacity style={[styles.actionCircle, { backgroundColor: '#fee2e2' }]} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={22} color="#ef4444" />
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
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <ThemeDropdown />
            <ProfileModal />
        </ThemedView>
    );
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
});
