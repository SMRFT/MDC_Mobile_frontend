import React, { useState, useMemo, useEffect } from 'react';
import {
    View, StyleSheet, ScrollView, TouchableOpacity, FlatList,
    Dimensions, StatusBar, ActivityIndicator, RefreshControl, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTheme } from '@/context/ThemeContext';
import { SessionMatrixGrid } from '@/components/SessionMatrixGrid';
import { fetchPatientAttendance } from '@/scripts/goalsApi';
import { TherapyPalette } from '@/constants/theme';

const { height } = Dimensions.get('window');

const parseTherapyDetails = (therapyDetails: any): any[] => {
    if (!therapyDetails) return [];
    if (typeof therapyDetails !== 'string') return Array.isArray(therapyDetails) ? therapyDetails : [];

    try {
        return JSON.parse(therapyDetails);
    } catch (e) {
        // Try parsing if it has single quotes instead of double quotes
        try {
            const doubleQuoted = therapyDetails.replace(/'/g, '"');
            return JSON.parse(doubleQuoted);
        } catch (err) { }

        if (therapyDetails.includes('OrderedDict')) {
            try {
                const matches = [...therapyDetails.matchAll(/OrderedDict\(\[([\s\S]*?)\]\)/g)];
                const list: any[] = [];
                for (const match of matches) {
                    const content = match[1];
                    const pairMatches = [...content.matchAll(/\(['"]([^'"]+)['"]\s*,\s*([\s\S]*?)\)/g)];
                    const obj: any = {};
                    for (const pm of pairMatches) {
                        const key = pm[1];
                        let val: any = pm[2].trim();
                        if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
                            val = val.substring(1, val.length - 1);
                        } else {
                            const num = Number(val);
                            if (!isNaN(num)) {
                                val = num;
                            }
                        }
                        obj[key] = val;
                    }
                    if (Object.keys(obj).length > 0) {
                        list.push(obj);
                    }
                }
                if (list.length > 0) return list;
            } catch (err) {
                console.error("Error parsing OrderedDict therapy_details:", err);
            }
        }
    }
    return [];
};

export default function AttendanceHistory() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const regNo = params.regNo as string;
    const initialAttendance = params.attendance ? JSON.parse(params.attendance as string) : [];
    const [attendanceList, setAttendanceList] = useState<any[]>(initialAttendance);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const backgroundColor = useThemeColor({}, 'background');
    const cardBg = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const textColor = useThemeColor({}, 'text');
    const primaryColor = useThemeColor({}, 'primary');

    const loadAttendance = async (isPullRefresh = false) => {
        if (!regNo) return;
        if (isPullRefresh) setRefreshing(true);
        else if (attendanceList.length === 0) setLoading(true);

        try {
            const data = await fetchPatientAttendance(regNo);
            if (data && Array.isArray(data)) {
                setAttendanceList(data);
            }
        } catch (error) {
            console.error("Failed to load patient attendance:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadAttendance();
    }, [regNo]);

    const years = useMemo(() => {
        const uniqueYears = [...new Set(attendanceList.map((item: any) =>
            new Date(item.attendance_date).getFullYear().toString()
        ))];
        const sorted = (uniqueYears as string[]).sort((a, b) => parseInt(b) - parseInt(a));
        return ['All', ...sorted];
    }, [attendanceList]);

    const [selectedYear, setSelectedYear] = useState('All');
    const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');

    const filteredAttendance = useMemo(() => {
        let filtered = attendanceList;
        if (selectedYear !== 'All') {
            filtered = filtered.filter((item: any) =>
                new Date(item.attendance_date).getFullYear().toString() === selectedYear
            );
        }
        return filtered.sort((a: any, b: any) =>
            new Date(b.attendance_date).getTime() - new Date(a.attendance_date).getTime()
        );
    }, [attendanceList, selectedYear]);

    const AttendanceItem = ({ item }: { item: any }) => {
        const dateObj = new Date(item.attendance_date);
        const therapyDetails = parseTherapyDetails(item.therapy_details);

        const isPaid = parseFloat(item.total_amount_paid) >= parseFloat(item.total_amount);

        return (
            <View style={[
                styles.card, 
                { 
                    backgroundColor: cardBg, 
                    borderColor: isDark ? 'rgba(52, 211, 153, 0.2)' : borderColor 
                }
            ]}>
                {/* Accent Bar */}
                <LinearGradient
                    colors={['#059669', '#10b981', '#4338ca']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.cardAccentBar}
                />

                <View style={styles.cardInner}>
                    <View style={styles.cardHeader}>
                        <View style={styles.dateInfo}>
                            <View style={[styles.dateBox, { backgroundColor: isDark ? '#1e293b' : '#f0fdf4', borderColor: isDark ? '#064e3b' : '#bbf7d0' }]}>
                                <ThemedText style={styles.dateNum}>{dateObj.getDate()}</ThemedText>
                                <ThemedText style={styles.dateMonth}>
                                    {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                                </ThemedText>
                            </View>
                            <View style={styles.dateTextInfo}>
                                <ThemedText style={styles.yearText}>{dateObj.getFullYear()}</ThemedText>
                                <View style={[styles.sessionPill, { backgroundColor: isDark ? '#1e1b4b' : '#eef2ff' }]}>
                                    <Ionicons name="sparkles" size={11} color="#4f46e5" style={{ marginRight: 3 }} />
                                    <ThemedText style={styles.sessionText}>Session #{item.session}</ThemedText>
                                </View>
                            </View>
                        </View>
                        <View style={[styles.paymentBadge, { backgroundColor: isPaid ? (isDark ? '#064e3b33' : '#dcfce7') : (isDark ? '#7c2d1233' : '#fee2e2') }]}>
                            <Ionicons
                                name={isPaid ? "checkmark-circle" : "alert-circle"}
                                size={13}
                                color={isPaid ? "#059669" : "#dc2626"}
                                style={{ marginRight: 4 }}
                            />
                            <ThemedText style={[styles.paymentText, { color: isPaid ? '#059669' : '#dc2626' }]}>
                                {isPaid ? 'Paid' : 'Unpaid'}
                            </ThemedText>
                        </View>
                    </View>

                    <View style={[styles.therapyContainer, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor }]}>
                        {therapyDetails && therapyDetails.map((t: any, i: number) => (
                            <View key={i} style={styles.therapyRow}>
                                <View style={[styles.therapyDot, { backgroundColor: primaryColor }]} />
                                <ThemedText style={styles.therapyName}>{t.therapy_name}</ThemedText>
                                <View style={[styles.countBadge, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor }]}>
                                    <ThemedText style={[styles.therapyCount, { color: primaryColor }]}>
                                        {t.sesion_per_therapy} {t.sesion_per_therapy === 1 ? 'Slot' : 'Slots'}
                                    </ThemedText>
                                </View>
                            </View>
                        ))}
                    </View>

                    <View style={[styles.cardFooter, { borderTopColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                        <View style={styles.finGroup}>
                            <ThemedText style={[styles.finLabel, { color: textSecondary }]}>Session Fee</ThemedText>
                            <ThemedText style={styles.finVal}>₹{item.total_amount}</ThemedText>
                        </View>
                        <View style={styles.finGroup}>
                            <ThemedText style={[styles.finLabel, { textAlign: 'right', color: textSecondary }]}>Amount Received</ThemedText>
                            <ThemedText style={[styles.finVal, { color: '#059669', textAlign: 'right' }]}>₹{item.total_amount_paid}</ThemedText>
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
                <View style={styles.navBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <ThemedText style={styles.title}>Attendance History</ThemedText>
                        <ThemedText style={styles.subTitle}>Session Records & Fee Status</ThemedText>
                    </View>
                    <TouchableOpacity onPress={() => loadAttendance(false)} style={styles.refreshBtn}>
                        <Ionicons name="refresh-outline" size={20} color="white" />
                    </TouchableOpacity>
                </View>

                {regNo ? (
                    <View style={styles.regBadgeWrap}>
                        <View style={styles.patientBadge}>
                            <Ionicons name="medical" size={12} color="#a7f3d0" />
                            <ThemedText style={styles.patientId}>{regNo}</ThemedText>
                        </View>
                        <View style={styles.statCountBadge}>
                            <Ionicons name="calendar-outline" size={12} color="#fef08a" />
                            <ThemedText style={styles.statCountText}>
                                {attendanceList.length} Total Sessions
                            </ThemedText>
                        </View>
                    </View>
                ) : null}
            </LinearGradient>

            <View style={styles.main}>
                <View style={[styles.viewToggleContainer, { backgroundColor: cardBg, borderColor }]}>
                    <TouchableOpacity
                        onPress={() => setViewMode('matrix')}
                        style={[styles.toggleBtn, viewMode === 'matrix' && styles.toggleBtnActive]}
                    >
                        <Ionicons name="grid-outline" size={15} color={viewMode === 'matrix' ? 'white' : textSecondary} />
                        <ThemedText style={[styles.toggleText, viewMode === 'matrix' && styles.toggleTextActive]}>
                            Matrix Grid
                        </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setViewMode('list')}
                        style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
                    >
                        <Ionicons name="list-outline" size={15} color={viewMode === 'list' ? 'white' : textSecondary} />
                        <ThemedText style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
                            Card List
                        </ThemedText>
                    </TouchableOpacity>
                </View>

                {viewMode === 'matrix' ? (
                    <SessionMatrixGrid regNo={regNo} />
                ) : (
                    <>
                        <View style={styles.filterSection}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearScroll}>
                                {years.map((y: string) => (
                                    <TouchableOpacity
                                        key={y}
                                        onPress={() => setSelectedYear(y)}
                                        style={[
                                            styles.yBtn, 
                                            selectedYear === y && styles.yBtnActive, 
                                            { backgroundColor: selectedYear === y ? (isDark ? '#059669' : '#047857') : cardBg, borderColor: selectedYear === y ? '#10b981' : borderColor }
                                        ]}
                                    >
                                        <Ionicons 
                                            name="calendar" 
                                            size={13} 
                                            color={selectedYear === y ? 'white' : textSecondary} 
                                            style={{ marginRight: 5 }} 
                                        />
                                        <ThemedText style={[styles.yTxt, selectedYear === y && styles.yTxtActive]}>
                                            {y === 'All' ? 'All Years' : y}
                                        </ThemedText>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <FlatList
                            data={filteredAttendance}
                            renderItem={AttendanceItem}
                            keyExtractor={(item, index) => item._id || item.id || index.toString()}
                            contentContainerStyle={styles.list}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={() => loadAttendance(true)} />
                            }
                            ListEmptyComponent={
                                <View style={styles.empty}>
                                    <LinearGradient
                                        colors={isDark ? ['#1e293b', '#0f172a'] : ['#ecfdf5', '#d1fae5']}
                                        style={styles.emptyIconCircle}
                                    >
                                        <Ionicons name="document-text-outline" size={48} color="#059669" />
                                    </LinearGradient>
                                    <ThemedText style={styles.emptyTitle}>No Attendance Records</ThemedText>
                                    <ThemedText style={[styles.emptySub, { color: textSecondary }]}>No attendance data found for this selection.</ThemedText>
                                </View>
                            }
                        />
                    </>
                )}
            </View>
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
    navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    refreshBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '900', color: 'white', letterSpacing: 0.3 },
    subTitle: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    regBadgeWrap: {
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
    viewToggleContainer: { 
        flexDirection: 'row', 
        marginHorizontal: 20, 
        marginBottom: 12, 
        padding: 4, 
        borderRadius: 18, 
        borderWidth: 1 
    },
    toggleBtn: { 
        flex: 1, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        paddingVertical: 9, 
        borderRadius: 14 
    },
    toggleBtnActive: { backgroundColor: '#059669' },
    toggleText: { fontSize: 12.5, fontWeight: '800', marginLeft: 6, color: '#64748b' },
    toggleTextActive: { color: 'white' },
    filterSection: { marginBottom: 12 },
    yearScroll: { paddingHorizontal: 20, gap: 8 },
    yBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
    yBtnActive: {},
    yTxt: { fontSize: 12.5, fontWeight: '700', color: '#64748b' },
    yTxtActive: { color: 'white', fontWeight: '800' },
    list: { paddingHorizontal: 20, paddingBottom: 60 },
    card: { 
        borderRadius: 24, 
        marginBottom: 16, 
        elevation: 3, 
        shadowColor: '#000', 
        shadowOpacity: 0.05, 
        shadowRadius: 10, 
        shadowOffset: { width: 0, height: 4 }, 
        borderWidth: 1,
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
        padding: 18,
        paddingLeft: 22
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    dateInfo: { flexDirection: 'row', alignItems: 'center' },
    dateBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    dateNum: { fontSize: 18, fontWeight: '900', color: '#059669' },
    dateMonth: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', color: '#059669' },
    dateTextInfo: { marginLeft: 12 },
    yearText: { fontSize: 15, fontWeight: '900' },
    sessionPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 3 },
    sessionText: { fontSize: 11, fontWeight: '800', color: '#4f46e5' },
    paymentBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    paymentText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3 },
    therapyContainer: { borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1 },
    therapyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    therapyDot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
    therapyName: { flex: 1, fontSize: 13.5, fontWeight: '700' },
    countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    therapyCount: { fontSize: 10.5, fontWeight: '800' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 12 },
    finGroup: { flex: 1 },
    finLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 3, letterSpacing: 0.5 },
    finVal: { fontSize: 16, fontWeight: '900' },
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
});