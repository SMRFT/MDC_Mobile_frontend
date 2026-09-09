import React, { useState, useEffect } from 'react';
import {
    View, StyleSheet, ScrollView, TouchableOpacity, Modal,
    TextInput, ActivityIndicator, Alert, FlatList, Dimensions, Platform, StatusBar,
    KeyboardAvoidingView
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
    const isDark = resolvedTheme === 'dark';

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
            'Approved': { bg: isDark ? '#064e3b33' : '#dcfce7', text: '#059669', icon: 'checkmark-circle' },
            'Rejected': { bg: isDark ? '#7f1d1d33' : '#fee2e2', text: '#dc2626', icon: 'close-circle' },
            'Pending': { bg: isDark ? '#78350f33' : '#fef3c7', text: '#d97706', icon: 'time' }
        }[status] || { bg: isDark ? '#78350f33' : '#fef3c7', text: '#d97706', icon: 'time' };

        return (
            <View style={[styles.badge, { backgroundColor: theme.bg }]}>
                <Ionicons name={theme.icon as any} size={12} color={theme.text} style={{ marginRight: 4 }} />
                <ThemedText style={[styles.badgeText, { color: theme.text }]}>{status}</ThemedText>
            </View>
        );
    };

    const renderLeaveItem = ({ item }: { item: any }) => {
        const dateObj = new Date(item.leave_date);
        return (
            <View style={[
                styles.card, 
                { 
                    backgroundColor: cardBg, 
                    borderColor: isDark ? 'rgba(52, 211, 153, 0.2)' : borderColor 
                }
            ]}>
                {/* Left Accent Bar */}
                <LinearGradient
                    colors={['#059669', '#10b981', '#0284c7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.cardAccentBar}
                />

                <View style={styles.cardInner}>
                    <View style={styles.cardHeaderRow}>
                        <View style={[styles.cardDate, { backgroundColor: isDark ? '#1e293b' : '#f0fdf4', borderColor: isDark ? '#064e3b' : '#bbf7d0' }]}>
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
                                <View style={[styles.cardDetail, { borderTopColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                                    {item.leave_reject_comments && (
                                        <View style={styles.rejectBox}>
                                            <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
                                            <ThemedText style={[styles.rejectTxt, { color: '#dc2626' }]}>{item.leave_reject_comments}</ThemedText>
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
                </View>
            </View>
        );
    };

    return (
        <ThemedView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient 
                colors={isDark ? ['#0f172a', '#134e4a', '#064e3b'] : ['#059669', '#10b981', '#047857']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerNav}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                        <Ionicons name="chevron-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <ThemedText style={styles.title}>Leave Management</ThemedText>
                        <ThemedText style={styles.subTitle}>Absence Requests & Approvals</ThemedText>
                    </View>
                    <TouchableOpacity onPress={fetchLeaves} style={styles.iconBtn}>
                        <Ionicons name="refresh-outline" size={20} color="white" />
                    </TouchableOpacity>
                </View>

                {regNo ? (
                    <View style={styles.headerStatsRow}>
                        <View style={styles.patientBadge}>
                            <Ionicons name="medical" size={12} color="#a7f3d0" />
                            <ThemedText style={styles.patientId}>{regNo}</ThemedText>
                        </View>
                        <View style={styles.statCountBadge}>
                            <Ionicons name="time-outline" size={12} color="#fef08a" />
                            <ThemedText style={styles.statCountText}>
                                {leaves.length} {leaves.length === 1 ? 'Request' : 'Requests'}
                            </ThemedText>
                        </View>
                    </View>
                ) : null}
            </LinearGradient>

            <View style={styles.main}>
                <View style={styles.filterBar}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthsScroll}>
                        {MONTHS.map(m => (
                            <TouchableOpacity
                                key={m}
                                onPress={() => setSelectedMonth(m)}
                                style={[
                                    styles.mBtn, 
                                    selectedMonth === m && styles.mBtnActive, 
                                    { backgroundColor: selectedMonth === m ? (isDark ? '#059669' : '#047857') : cardBg, borderColor: selectedMonth === m ? '#10b981' : borderColor }
                                ]}
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
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <LinearGradient
                                    colors={isDark ? ['#1e293b', '#0f172a'] : ['#ecfdf5', '#d1fae5']}
                                    style={styles.emptyIconCircle}
                                >
                                    <Ionicons name="calendar-outline" size={48} color="#059669" />
                                </LinearGradient>
                                <ThemedText style={styles.emptyTitle}>No Leave Requests</ThemedText>
                                <ThemedText style={[styles.emptySub, { color: textSecondary }]}>
                                    Tap the '+' button below to apply for a session leave.
                                </ThemedText>
                            </View>
                        }
                    />
                )}
            </View>

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} activeOpacity={0.88}>
                <LinearGradient 
                    colors={['#10b981', '#059669', '#047857']} 
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={30} color="white" />
                </LinearGradient>
            </TouchableOpacity>

            <Modal visible={modalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.sheet, { backgroundColor: cardBg }]}>
                            <View style={styles.sheetBar} />
                            <View style={styles.sheetHead}>
                                <View>
                                    <ThemedText style={styles.sheetTitle}>Request Session Leave</ThemedText>
                                    <ThemedText style={[styles.sheetSubTitle, { color: textSecondary }]}>
                                        Submit absence date and reason for approval
                                    </ThemedText>
                                </View>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.sheetClose}>
                                    <Ionicons name="close" size={24} color={textColor} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView 
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            >
                                <View style={styles.field}>
                                    <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>DATE OF LEAVE</ThemedText>
                                    <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: borderColor }]}>
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
                                                    fontSize: '15px',
                                                    color: textColor,
                                                    width: '100%',
                                                    outline: 'none',
                                                    fontFamily: 'inherit'
                                                }}
                                            />
                                        ) : (
                                            <>
                                                <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
                                                    <Ionicons name="calendar" size={18} color="#059669" />
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
                                    <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>REASON FOR ABSENCE</ThemedText>
                                    <TextInput
                                        style={[styles.area, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: borderColor, color: textColor }]}
                                        placeholder="Please provide the reason for your absence..."
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
                                    <LinearGradient 
                                        colors={['#10b981', '#059669', '#047857']} 
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.submitGrad}
                                    >
                                        {submitting ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <ThemedText style={styles.submitTxt}>Submit Leave Request</ThemedText>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { 
        paddingTop: Platform.OS === 'ios' ? 60 : 45, 
        paddingHorizontal: 20, 
        paddingBottom: 22, 
        borderBottomLeftRadius: 32, 
        borderBottomRightRadius: 32,
        elevation: 8,
        shadowColor: '#059669',
        shadowOpacity: 0.25,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 6 }
    },
    headerNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '900', color: 'white', letterSpacing: 0.3 },
    subTitle: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    headerStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
        gap: 10,
        flexWrap: 'wrap'
    },
    patientBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
        gap: 6
    },
    patientId: { color: 'white', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    statCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
        gap: 6
    },
    statCountText: { color: 'white', fontWeight: '700', fontSize: 12 },
    main: { flex: 1, marginTop: 12 },
    filterBar: { marginBottom: 12 },
    monthsScroll: { paddingHorizontal: 20, gap: 8 },
    mBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
    mBtnActive: {},
    mTxt: { fontSize: 12.5, fontWeight: '700', color: '#64748b' },
    mTxtActive: { color: 'white', fontWeight: '800' },
    list: { paddingHorizontal: 20, paddingBottom: 100 },
    card: { 
        borderRadius: 24, 
        marginBottom: 16, 
        borderWidth: 1, 
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        position: 'relative',
        overflow: 'hidden'
    },
    cardAccentBar: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: 6,
    },
    cardInner: {
        padding: 16,
        paddingLeft: 20
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start'
    },
    cardDate: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    dateNum: { fontSize: 18, fontWeight: '900', color: '#059669' },
    dateMonth: { fontSize: 10.5, fontWeight: '800', color: '#059669', textTransform: 'uppercase' },
    cardContent: { flex: 1, marginLeft: 14 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardReason: { flex: 1, fontSize: 13.5, fontWeight: '700', marginRight: 10, lineHeight: 19 },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
    badgeText: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
    cardDetail: { marginTop: 10, paddingTop: 8, borderTopWidth: 1 },
    rejectBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 4 },
    rejectTxt: { fontSize: 11.5, flex: 1, fontStyle: 'italic', fontWeight: '600' },
    approvedTxt: { fontSize: 11, fontWeight: '600' },
    fab: { position: 'absolute', bottom: 30, right: 25 },
    fabGradient: { 
        width: 60, 
        height: 60, 
        borderRadius: 30, 
        justifyContent: 'center', 
        alignItems: 'center', 
        elevation: 8, 
        shadowColor: '#059669', 
        shadowOpacity: 0.35, 
        shadowRadius: 12, 
        shadowOffset: { width: 0, height: 6 } 
    },
    empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
    emptyIconCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    emptyTitle: { fontSize: 18, fontWeight: '900' },
    emptySub: { fontSize: 13.5, textAlign: 'center', marginTop: 6, lineHeight: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: height * 0.85 },
    sheetBar: { width: 44, height: 5, backgroundColor: '#cbd5e1', borderRadius: 3, alignSelf: 'center', marginBottom: 14 },
    sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sheetTitle: { fontSize: 20, fontWeight: '900' },
    sheetSubTitle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    sheetClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(100,116,139,0.12)', justifyContent: 'center', alignItems: 'center' },
    field: { marginBottom: 18 },
    fieldLabel: { fontSize: 11.5, fontWeight: '800', marginBottom: 8, letterSpacing: 0.5 },
    inputContainer: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
    datePickerBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
    dateBtnTxt: { fontSize: 15, fontWeight: '700' },
    area: { padding: 14, borderRadius: 16, borderWidth: 1, minHeight: 90, textAlignVertical: 'top', fontSize: 14.5, fontWeight: '600' },
    submit: { borderRadius: 18, overflow: 'hidden', marginTop: 10 },
    submitGrad: { paddingVertical: 16, alignItems: 'center' },
    submitTxt: { color: 'white', fontSize: 15.5, fontWeight: '900' },
});

