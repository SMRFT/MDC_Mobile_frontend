import React, { useState, useMemo } from 'react';
import {
    View, StyleSheet, ScrollView, TouchableOpacity, FlatList,
    Dimensions, StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTheme } from '@/context/ThemeContext';

const { height } = Dimensions.get('window');

const parseTherapyDetails = (therapyDetails: any): any[] => {
    if (!therapyDetails) return [];
    if (typeof therapyDetails !== 'string') return therapyDetails;

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
    const { resolvedTheme } = useTheme();

    const backgroundColor = useThemeColor({}, 'background');
    const cardBg = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const textColor = useThemeColor({}, 'text');
    const primaryColor = useThemeColor({}, 'primary');

    const years = useMemo(() => {
        const uniqueYears = [...new Set(initialAttendance.map((item: any) =>
            new Date(item.attendance_date).getFullYear().toString()
        ))];
        const sorted = (uniqueYears as string[]).sort((a, b) => parseInt(b) - parseInt(a));
        return ['All', ...sorted];
    }, [initialAttendance]);

    const [selectedYear, setSelectedYear] = useState('All');

    const filteredAttendance = useMemo(() => {
        let filtered = initialAttendance;
        if (selectedYear !== 'All') {
            filtered = filtered.filter((item: any) =>
                new Date(item.attendance_date).getFullYear().toString() === selectedYear
            );
        }
        return filtered.sort((a: any, b: any) =>
            new Date(b.attendance_date).getTime() - new Date(a.attendance_date).getTime()
        );
    }, [initialAttendance, selectedYear]);

    const SummaryCard = () => {
        const totalSessions = initialAttendance.length;
        const totalPaid = initialAttendance.reduce((acc: number, item: any) =>
            acc + (parseFloat(item.total_amount_paid) || 0), 0);

        return (
            <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
                <View style={styles.summaryItem}>
                    <ThemedText style={styles.summaryVal}>{totalSessions}</ThemedText>
                    <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>Total Sessions</ThemedText>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: borderColor }]} />
                <View style={styles.summaryItem}>
                    <ThemedText style={styles.summaryVal}>₹{totalPaid.toLocaleString()}</ThemedText>
                    <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>Total Paid</ThemedText>
                </View>
            </View>
        );
    };

    const AttendanceItem = ({ item }: { item: any }) => {
        const dateObj = new Date(item.attendance_date);
        const therapyDetails = parseTherapyDetails(item.therapy_details);

        const isPaid = parseFloat(item.total_amount_paid) >= parseFloat(item.total_amount);

        return (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderColor }]}>
                <View style={styles.cardHeader}>
                    <View style={styles.dateInfo}>
                        <View style={[styles.dateBox, { backgroundColor: resolvedTheme === 'dark' ? '#334155' : '#f5f3ff', borderColor: borderColor }]}>
                            <ThemedText style={[styles.dateNum, { color: primaryColor }]}>{dateObj.getDate()}</ThemedText>
                            <ThemedText style={[styles.dateMonth, { color: primaryColor }]}>
                                {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                            </ThemedText>
                        </View>
                        <View style={styles.dateTextInfo}>
                            <ThemedText style={styles.yearText}>{dateObj.getFullYear()}</ThemedText>
                            <ThemedText style={[styles.sessionText, { color: textSecondary }]}># {item.session}</ThemedText>
                        </View>
                    </View>
                    <View style={[styles.paymentBadge, { backgroundColor: isPaid ? '#ecfdf5' : '#fff7ed' }]}>
                        <Ionicons
                            name={isPaid ? "checkmark-circle" : "alert-circle"}
                            size={14}
                            color={isPaid ? "#059669" : "#c2410c"}
                            style={{ marginRight: 5 }}
                        />
                        <ThemedText style={[styles.paymentText, { color: isPaid ? '#059669' : '#c2410c' }]}>
                            {isPaid ? 'Paid' : 'Unpaid'}
                        </ThemedText>
                    </View>
                </View>

                <View style={[styles.therapyContainer, { backgroundColor: resolvedTheme === 'dark' ? '#334155' : '#f8fafc' }]}>
                    {therapyDetails && therapyDetails.map((t: any, i: number) => (
                        <View key={i} style={styles.therapyRow}>
                            <View style={[styles.therapyDot, { backgroundColor: primaryColor }]} />
                            <ThemedText style={styles.therapyName}>{t.therapy_name}</ThemedText>
                            <View style={[styles.countBadge, { backgroundColor: cardBg, borderColor: borderColor }]}>
                                <ThemedText style={[styles.therapyCount, { color: textSecondary }]}>{t.sesion_per_therapy}</ThemedText>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={[styles.cardFooter, { borderTopColor: borderColor }]}>
                    <View style={styles.finGroup}>
                        <ThemedText style={[styles.finLabel, { color: textSecondary }]}>Cost</ThemedText>
                        <ThemedText style={styles.finVal}>₹{item.total_amount}</ThemedText>
                    </View>
                    <View style={styles.finGroup}>
                        <ThemedText style={[styles.finLabel, { textAlign: 'right', color: textSecondary }]}>Received</ThemedText>
                        <ThemedText style={[styles.finVal, { color: '#059669', textAlign: 'right' }]}>₹{item.total_amount_paid}</ThemedText>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <ThemedView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={resolvedTheme === 'dark' ? ['#0f172a', '#1e293b'] : ['#6366f1', '#4f46e5']} style={styles.header}>
                <View style={styles.navBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={26} color="white" />
                    </TouchableOpacity>
                    <ThemedText style={styles.title}>History</ThemedText>
                    <View style={{ width: 40 }} />
                </View>
                <ThemedText style={styles.patientId}>{regNo}</ThemedText>
                <SummaryCard />
            </LinearGradient>

            <View style={styles.main}>
                <View style={styles.filterSection}>
                    <View style={styles.filterHeader}>
                        <Ionicons name="filter" size={18} color={textSecondary} />
                        <ThemedText style={[styles.filterTitle, { color: textSecondary }]}>Year Review</ThemedText>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearScroll}>
                        {years.map((y: string) => (
                            <TouchableOpacity
                                key={y}
                                onPress={() => setSelectedYear(y)}
                                style={[styles.yBtn, selectedYear === y && styles.yBtnActive, { backgroundColor: cardBg, borderColor: borderColor }]}
                            >
                                <ThemedText style={[styles.yTxt, selectedYear === y && styles.yTxtActive]}>{y}</ThemedText>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <FlatList
                    data={filteredAttendance}
                    renderItem={AttendanceItem}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="document-text-outline" size={80} color={borderColor} />
                            <ThemedText style={[styles.emptyTitle, { color: textSecondary }]}>Empty History</ThemedText>
                            <ThemedText style={[styles.emptySub, { color: textSecondary }]}>No attendance records found for this selection.</ThemedText>
                        </View>
                    }
                />
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 60, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 44, height: 44, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '900', color: 'white' },
    patientId: { color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 10, fontWeight: '700', fontSize: 13, textTransform: 'uppercase' },
    summaryCard: { position: 'absolute', bottom: -30, left: 24, right: 24, borderRadius: 25, height: 90, flexDirection: 'row', elevation: 12, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 15, shadowOffset: { width: 0, height: 10 } },
    summaryItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    summaryVal: { fontSize: 22, fontWeight: '900' },
    summaryLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    summaryDivider: { width: 1, height: '50%', alignSelf: 'center' },
    main: { flex: 1, marginTop: 65 },
    filterSection: { paddingHorizontal: 24, marginBottom: 20 },
    filterHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    filterTitle: { fontSize: 12, fontWeight: '900', marginLeft: 8, textTransform: 'uppercase' },
    yearScroll: { paddingRight: 10 },
    yBtn: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 14, marginRight: 10, borderWidth: 1 },
    yBtnActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
    yTxt: { fontSize: 14, fontWeight: '700', color: '#64748b' },
    yTxtActive: { color: 'white' },
    list: { padding: 20, paddingBottom: 50 },
    card: { borderRadius: 24, padding: 20, marginBottom: 18, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    dateInfo: { flexDirection: 'row', alignItems: 'center' },
    dateBox: { width: 55, height: 55, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    dateNum: { fontSize: 20, fontWeight: '900' },
    dateMonth: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    dateTextInfo: { marginLeft: 15 },
    yearText: { fontSize: 17, fontWeight: '900' },
    sessionText: { fontSize: 13, fontWeight: '700' },
    paymentBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    paymentText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    therapyContainer: { borderRadius: 20, padding: 18, marginBottom: 20 },
    therapyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    therapyDot: { width: 6, height: 6, borderRadius: 3, marginRight: 12 },
    therapyName: { flex: 1, fontSize: 15, fontWeight: '700' },
    countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
    therapyCount: { fontSize: 10, fontWeight: '800' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 20 },
    finGroup: { flex: 1 },
    finLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
    finVal: { fontSize: 18, fontWeight: '900' },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyTitle: { fontSize: 18, fontWeight: '900', marginTop: 15 },
    emptySub: { fontSize: 14, textAlign: 'center', marginTop: 5, paddingHorizontal: 40 },
});