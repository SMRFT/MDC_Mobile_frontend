import React from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const { width } = Dimensions.get('window');

export default function DetailsScreen() {
    const { data } = useLocalSearchParams();
    const patientData = data ? JSON.parse(data as string) : null;

    if (!patientData) return null;

    const { registration, attendance } = patientData;

    const parseJSON = (str: string) => {
        try {
            return JSON.parse(str);
        } catch (e) {
            return str;
        }
    };

    const ageData = parseJSON(registration.age);
    const ageString = typeof ageData === 'object'
        ? `${ageData.year}y ${ageData.months}m ${ageData.days}d`
        : registration.age;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#f8f9ff', '#e0e7ff']}
                style={styles.background}
            />

            <ThemedView style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#3b5998" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <ThemedText type="title" style={styles.headerTitle}>Patient Record</ThemedText>
                    <ThemedText style={styles.regNo}>{registration.registration_number}</ThemedText>
                </View>
            </ThemedView>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <LinearGradient
                        colors={['#6366f1', '#4f46e5']}
                        style={styles.cardGradient}
                    >
                        <View style={styles.profileHeader}>
                            <View style={styles.avatar}>
                                <ThemedText style={styles.avatarText}>{registration.name_of_child[0]}</ThemedText>
                            </View>
                            <View style={styles.profileNames}>
                                <ThemedText type="subtitle" style={styles.childName}>{registration.name_of_child}</ThemedText>
                                <ThemedText style={styles.childAge}>{ageString} • {registration.sex}</ThemedText>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Info Section */}
                <View style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>Parental Information</ThemedText>
                    <View style={styles.infoRow}>
                        <InfoItem label="Mother" value={registration.mother_name} icon="person-outline" />
                        <InfoItem label="Phone" value={registration.mother_phone_number} icon="call-outline" />
                    </View>
                    <View style={styles.infoRow}>
                        <InfoItem label="Father" value={registration.father_name || 'N/A'} icon="person-outline" />
                        <InfoItem label="Phone" value={registration.father_phone_number || 'N/A'} icon="call-outline" />
                    </View>
                </View>

                {/* Address Section */}
                <View style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>Contact & Address</ThemedText>
                    <InfoItem label="Address" value={registration.address} icon="location-outline" />
                    <InfoItem label="Email" value={registration.mail_id} icon="mail-outline" last />
                </View>

                {/* Attendance Section */}
                <View style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>Attendance History</ThemedText>
                    {attendance && attendance.length > 0 ? (
                        attendance.map((item: any, index: number) => (
                            <AttendanceCard key={index} item={item} />
                        ))
                    ) : (
                        <ThemedText style={styles.emptyText}>No attendance records found.</ThemedText>
                    )}
                </View>

                <View style={{ height: 20 }} />

                <TouchableOpacity
                    style={styles.goalsButton}
                    onPress={() => router.push({ pathname: '/goals', params: { regNo: registration.registration_number } })}
                >
                    <LinearGradient
                        colors={['#4c669f', '#3b5998', '#192f6a']}
                        style={styles.goalsButtonGradient}
                    >
                        <Ionicons name="flag-outline" size={24} color="white" style={{ marginRight: 10 }} />
                        <ThemedText style={styles.goalsButtonText}>Goals Assessment</ThemedText>
                    </LinearGradient>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const InfoItem = ({ label, value, icon, last }: any) => (
    <View style={[styles.infoItem, last && { borderBottomWidth: 0 }]}>
        <Ionicons name={icon} size={20} color="#6366f1" style={styles.infoIcon} />
        <View>
            <ThemedText style={styles.infoLabel}>{label}</ThemedText>
            <ThemedText style={styles.infoValue}>{value}</ThemedText>
        </View>
    </View>
);

const AttendanceCard = ({ item }: any) => {
    const therapyDetails = typeof item.therapy_details === 'string'
        ? JSON.parse(item.therapy_details)
        : item.therapy_details;

    return (
        <View style={styles.attendanceCard}>
            <View style={styles.attendanceHeader}>
                <View>
                    <ThemedText style={styles.attendanceDate}>
                        {new Date(item.attendance_date).toLocaleDateString()}
                    </ThemedText>
                    <ThemedText style={styles.sessionNo}>Session #{item.session}</ThemedText>
                </View>
                <View style={styles.amountTag}>
                    <ThemedText style={styles.amountText}>₹{item.total_amount}</ThemedText>
                </View>
            </View>

            <View style={styles.therapyList}>
                {therapyDetails && therapyDetails.map((t: any, i: number) => (
                    <View key={i} style={styles.therapyItem}>
                        <View style={styles.dot} />
                        <ThemedText style={styles.therapyName}>{t.therapy_name}</ThemedText>
                        <ThemedText style={styles.therapyCount}>{t.sesion_per_therapy} sessions</ThemedText>
                    </View>
                ))}
            </View>

            <View style={styles.attendanceFooter}>
                <ThemedText style={styles.statusText}>
                    {item.is_approved ? '✅ Approved' : '⏳ Pending'}
                </ThemedText>
                <ThemedText style={styles.paidText}>
                    {parseFloat(item.total_amount_paid) >= parseFloat(item.total_amount) ? 'Paid' : 'Unpaid'}
                </ThemedText>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: '100%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    backButton: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#f0f4ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        marginLeft: 15,
    },
    headerTitle: {
        fontSize: 24,
        color: '#1e293b',
        fontWeight: '800',
    },
    regNo: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
    },
    scrollContent: {
        padding: 20,
    },
    profileCard: {
        borderRadius: 25,
        overflow: 'hidden',
        marginBottom: 25,
        elevation: 8,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    cardGradient: {
        padding: 25,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    avatarText: {
        fontSize: 32,
        color: '#fff',
        fontWeight: '900',
    },
    profileNames: {
        marginLeft: 20,
    },
    childName: {
        fontSize: 22,
        color: '#fff',
        fontWeight: '800',
    },
    childAge: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 4,
        fontWeight: '600',
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    sectionTitle: {
        fontSize: 18,
        color: '#1e293b',
        marginBottom: 15,
        fontWeight: '700',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    infoItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    infoIcon: {
        marginRight: 12,
    },
    infoLabel: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    infoValue: {
        fontSize: 15,
        color: '#334155',
        fontWeight: '700',
        marginTop: 2,
    },
    attendanceCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    attendanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    attendanceDate: {
        fontSize: 16,
        color: '#1e293b',
        fontWeight: '700',
    },
    sessionNo: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    amountTag: {
        backgroundColor: '#dcfce7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    amountText: {
        color: '#166534',
        fontWeight: '700',
        fontSize: 16,
    },
    therapyList: {
        paddingLeft: 5,
        marginBottom: 15,
    },
    therapyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#6366f1',
        marginRight: 10,
    },
    therapyName: {
        flex: 1,
        fontSize: 14,
        color: '#475569',
        fontWeight: '600',
    },
    therapyCount: {
        fontSize: 12,
        color: '#94a3b8',
    },
    attendanceFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
    },
    paidText: {
        fontSize: 13,
        color: '#6366f1',
        fontWeight: '700',
    },
    emptyText: {
        textAlign: 'center',
        color: '#94a3b8',
        marginTop: 10,
        fontStyle: 'italic',
    },
    goalsButton: {
        borderRadius: 15,
        overflow: 'hidden',
        marginTop: 10,
        elevation: 5,
        shadowColor: '#3b5998',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    goalsButtonGradient: {
        padding: 18,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    goalsButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
