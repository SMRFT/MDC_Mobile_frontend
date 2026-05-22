import React, { useState, useEffect } from 'react';
import {
    View, StyleSheet, ScrollView, TouchableOpacity, Modal,
    TextInput, ActivityIndicator, Alert, FlatList, Dimensions, Platform, StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { searchLeaves, createLeave } from '../../scripts/leaveApi';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTheme } from '@/context/ThemeContext';

const { width, height } = Dimensions.get('window');

const MONTHS = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function LeaveDashboard() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const regNo = params.regNo as string;
    const { resolvedTheme } = useTheme();

    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState('All');

    const cardBg = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const textColor = useThemeColor({}, 'text');

    // Form state
    const [leaveDate, setLeaveDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [leaveReason, setLeaveReason] = useState('');

    useEffect(() => {
        if (regNo) {
            fetchLeaves();
        }
    }, [regNo, selectedMonth]);

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const monthValue = selectedMonth === 'All' ? 'All' : MONTHS.indexOf(selectedMonth).toString();
            const currentYear = new Date().getFullYear().toString();
            const data = await searchLeaves(regNo, monthValue, currentYear);
            setLeaves(data);
        } catch (error) {
            console.error("Fetch error:", error);
            Alert.alert("Error", "Could not synchronize with the server.");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestLeave = async () => {
        if (!leaveReason.trim()) {
            Alert.alert("Reason Required", "Please provide a reason for your leave request.");
            return;
        }

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        if (leaveDate.getFullYear() < currentYear || 
           (leaveDate.getFullYear() === currentYear && leaveDate.getMonth() < currentMonth)) {
            Alert.alert("Invalid Date", "Requests can only be submitted for the current month or future months.");
            return;
        }

        const year = leaveDate.getFullYear();
        const month = String(leaveDate.getMonth() + 1).padStart(2, '0');
        const day = String(leaveDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        setSubmitting(true);
        try {
            await createLeave({
                registration_number: regNo,
                leave_date: dateStr,
                leave_reason: leaveReason,
                leave_status: 'Pending'
            });
            Alert.alert("Success", "Your leave request has been submitted for review.");
            setModalVisible(false);
            setLeaveReason('');
            fetchLeaves();
        } catch (error: any) {
            const msg = error.response?.data?.error || "Submission failed. Please try again.";
            Alert.alert("Error", msg);
        } finally {
            setSubmitting(false);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const theme = {
            'Approved': { bg: '#ecfdf5', text: '#059669', icon: 'checkmark-circle' },
            'Rejected': { bg: '#fef2f2', text: '#dc2626', icon: 'close-circle' },
            'Pending': { bg: '#fffbeb', text: '#d97706', icon: 'time' }
        }[status] || { bg: '#fffbeb', text: '#d97706', icon: 'time' };

        return (
            <View style={[styles.badge, { backgroundColor: theme.bg }]}>
                <Ionicons name={theme.icon as any} size={14} color={theme.text} style={{ marginRight: 4 }} />
                <ThemedText style={[styles.badgeText, { color: theme.text }]}>{status}</ThemedText>
            </View>
        );
    };

    const renderLeaveItem = ({ item }: { item: any }) => {
        const dateObj = new Date(item.leave_date);
        return (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderColor }]}>
                <View style={[styles.cardDate, { backgroundColor: resolvedTheme === 'dark' ? '#334155' : '#ecfdf5', borderColor: borderColor }]}>
                    <ThemedText style={styles.dateNum}>{dateObj.getDate()}</ThemedText>
                    <ThemedText style={styles.dateMonth}>
                        {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                    </ThemedText>
                </View>
                <View style={styles.cardContent}>
                    <View style={styles.cardTop}>
                        <ThemedText style={styles.cardReason} numberOfLines={2}>{item.leave_reason}</ThemedText>
                        <StatusBadge status={item.leave_status} />
                    </View>
                    
                    {(item.leave_reject_comments || item.leave_approved_date) && (
                        <View style={[styles.cardDetail, { borderTopColor: borderColor }]}>
                            {item.leave_reject_comments && (
                                <View style={styles.rejectBox}>
                                    <Ionicons name="alert-circle-outline" size={16} color={textSecondary} />
                                    <ThemedText style={[styles.rejectTxt, { color: textSecondary }]}>{item.leave_reject_comments}</ThemedText>
                                </View>
                            )}
                            {item.leave_approved_date && (
                                <ThemedText style={[styles.approvedTxt, { color: textSecondary }]}>
                                    Verified: {new Date(item.leave_approved_date).toLocaleDateString()}
                                </ThemedText>
                            )}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <ThemedView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={resolvedTheme === 'dark' ? ['#0f172a', '#1e293b'] : ['#059669', '#10b981']} style={styles.header}>
                <View style={styles.headerNav}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                        <Ionicons name="chevron-back" size={26} color="white" />
                    </TouchableOpacity>
                    <ThemedText style={styles.title}>Leave Management</ThemedText>
                    <View style={{ width: 40 }} />
                </View>
                <View style={[styles.patientBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <ThemedText style={styles.patientId}>{regNo}</ThemedText>
                </View>
            </LinearGradient>

            <View style={styles.main}>
                <View style={[styles.filterBar, { backgroundColor: cardBg }]}>
                    <ThemedText style={styles.sectionTitle}>History & Status</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.months}>
                        {MONTHS.map(m => (
                            <TouchableOpacity
                                key={m}
                                onPress={() => setSelectedMonth(m)}
                                style={[styles.mBtn, selectedMonth === m && styles.mBtnActive, { backgroundColor: resolvedTheme === 'dark' ? '#334155' : '#f1f5f9' }]}
                            >
                                <ThemedText style={[styles.mTxt, selectedMonth === m && styles.mTxtActive]}>{m}</ThemedText>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {loading ? (
                    <ActivityIndicator style={{ marginTop: 50 }} color="#059669" size="large" />
                ) : (
                    <FlatList
                        data={leaves}
                        renderItem={renderLeaveItem}
                        keyExtractor={(item, index) => index.toString()}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Ionicons name="calendar-outline" size={80} color={borderColor} />
                                <ThemedText style={[styles.emptyTitle, { color: textSecondary }]}>No Records</ThemedText>
                                <ThemedText style={[styles.emptySub, { color: textSecondary }]}>Select a different month or request a new leave.</ThemedText>
                            </View>
                        }
                    />
                )}
            </View>

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <LinearGradient colors={['#10b981', '#059669']} style={styles.fabGradient}>
                    <Ionicons name="add" size={30} color="white" />
                </LinearGradient>
            </TouchableOpacity>

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.sheet, { backgroundColor: cardBg }]}>
                        <View style={styles.sheetBar} />
                        <View style={styles.sheetHead}>
                            <ThemedText style={styles.sheetTitle}>New Request</ThemedText>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.sheetClose}>
                                <Ionicons name="close" size={24} color={textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.field}>
                                <ThemedText style={styles.fieldLabel}>Date of Leave</ThemedText>
                                <View style={[styles.inputContainer, { backgroundColor: resolvedTheme === 'dark' ? '#334155' : '#f8fafc', borderColor: borderColor }]}>
                                    {Platform.OS === 'web' ? (
                                        <input
                                            type="date"
                                            value={leaveDate.toISOString().split('T')[0]}
                                            min={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => setLeaveDate(new Date(e.target.value))}
                                            style={{
                                                padding: '14px',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                fontSize: '16px',
                                                color: textColor,
                                                width: '100%',
                                                outline: 'none',
                                                fontFamily: 'inherit'
                                            }}
                                        />
                                    ) : (
                                        <>
                                            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
                                                <Ionicons name="calendar" size={20} color="#059669" />
                                                <ThemedText style={styles.dateBtnTxt}>{leaveDate.toLocaleDateString()}</ThemedText>
                                            </TouchableOpacity>
                                            {showDatePicker && (
                                                <DateTimePicker
                                                    value={leaveDate}
                                                    mode="date"
                                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                                    onChange={(event, selectedDate) => {
                                                        setShowDatePicker(false);
                                                        if (selectedDate) {
                                                            setLeaveDate(selectedDate);
                                                        }
                                                    }}
                                                    minimumDate={new Date()}
                                                />
                                            )}
                                        </>
                                    )}
                                </View>
                            </View>

                            <View style={styles.field}>
                                <ThemedText style={styles.fieldLabel}>Reason for Absence</ThemedText>
                                <TextInput
                                    style={[styles.area, { backgroundColor: resolvedTheme === 'dark' ? '#334155' : '#f8fafc', borderColor: borderColor, color: textColor }]}
                                    placeholder="Briefly explain your reason..."
                                    value={leaveReason}
                                    onChangeText={setLeaveReason}
                                    multiline
                                    numberOfLines={4}
                                    placeholderTextColor="#94a3b8"
                                />
                            </View>

                            <TouchableOpacity 
                                style={[styles.submit, submitting && { opacity: 0.7 }]} 
                                onPress={handleRequestLeave}
                                disabled={submitting}
                            >
                                <LinearGradient colors={['#10b981', '#059669']} style={styles.submitGrad}>
                                    {submitting ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <ThemedText style={styles.submitTxt}>Submit Request</ThemedText>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 55, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
    headerNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '900', color: 'white' },
    patientBadge: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 15 },
    patientId: { color: 'white', fontWeight: '700', fontSize: 13 },
    main: { flex: 1, marginTop: -15 },
    filterBar: { marginHorizontal: 18, borderRadius: 22, padding: 20, elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, shadowOffset: { width: 0, height: 5 } },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 15 },
    months: { flexDirection: 'row' },
    mBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginRight: 8 },
    mBtnActive: { backgroundColor: '#059669' },
    mTxt: { fontSize: 12, fontWeight: '600', color: '#64748b' },
    mTxtActive: { color: 'white' },
    list: { padding: 20, paddingBottom: 100 },
    card: { borderRadius: 18, padding: 16, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, elevation: 2 },
    cardDate: { width: 55, height: 55, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    dateNum: { fontSize: 18, fontWeight: '900', color: '#059669' },
    dateMonth: { fontSize: 10, fontWeight: '700', color: '#10b981', textTransform: 'uppercase' },
    cardContent: { flex: 1, marginLeft: 15 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardReason: { flex: 1, fontSize: 14, fontWeight: '700', marginRight: 10 },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    cardDetail: { marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
    rejectBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    rejectTxt: { fontSize: 12, marginLeft: 5, flex: 1, fontStyle: 'italic' },
    approvedTxt: { fontSize: 11, fontWeight: '500' },
    fab: { position: 'absolute', bottom: 30, right: 25 },
    fabGradient: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#059669', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 15 },
    emptySub: { fontSize: 14, textAlign: 'center', marginTop: 5, paddingHorizontal: 40 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: height * 0.8 },
    sheetBar: { width: 40, height: 5, backgroundColor: '#e2e8f0', borderRadius: 10, alignSelf: 'center', marginBottom: 15 },
    sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    sheetTitle: { fontSize: 22, fontWeight: '900' },
    sheetClose: { padding: 5 },
    field: { marginBottom: 20 },
    fieldLabel: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
    inputContainer: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
    datePickerBtn: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    dateBtnTxt: { marginLeft: 10, fontSize: 16, fontWeight: '600' },
    area: { padding: 14, borderRadius: 14, borderWidth: 1, minHeight: 100, textAlignVertical: 'top', fontSize: 15 },
    submit: { borderRadius: 15, overflow: 'hidden', marginTop: 10 },
    submitGrad: { paddingVertical: 18, alignItems: 'center' },
    submitTxt: { color: 'white', fontSize: 16, fontWeight: '800' },
});
