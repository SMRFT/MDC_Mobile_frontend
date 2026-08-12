import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTheme } from '@/context/ThemeContext';
import { fetchPatientSessionAttendance } from '../scripts/goalsApi';

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const DEFAULT_THERAPIES = [
    "Applied Behavior Analysis (ABA)",
    "Cognitive Therapy",
    "Occupational Therapy",
    "Speech Therapy",
    "Physiotherapy",
    "Special Education",
    "Social Training Class",
    "Art Therapy"
];

interface SessionMatrixGridProps {
    regNo: string;
}

export function SessionMatrixGrid({ regNo }: SessionMatrixGridProps) {
    const { resolvedTheme } = useTheme();
    const currentDate = new Date();

    const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-12
    const [sessionData, setSessionData] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [exporting, setExporting] = useState<boolean>(false);

    const headerDateScrollRef = useRef<ScrollView>(null);

    const cardBg = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const textColor = useThemeColor({}, 'text');

    useEffect(() => {
        loadSessionAttendance();
    }, [regNo, selectedYear, selectedMonth]);

    const loadSessionAttendance = async () => {
        setLoading(true);
        try {
            const data = await fetchPatientSessionAttendance(
                regNo,
                selectedMonth.toString().padStart(2, '0'),
                selectedYear.toString()
            );
            setSessionData(data || []);
        } catch (error) {
            console.error("Failed to load session attendance:", error);
        } finally {
            setLoading(false);
        }
    };

    // Days in month calculation
    const daysInMonth = useMemo(() => {
        const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();
        const days = [];
        for (let d = 1; d <= totalDays; d++) {
            const dateObj = new Date(selectedYear, selectedMonth - 1, d);
            const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
            const padDay = d.toString().padStart(2, '0');
            const padMonth = selectedMonth.toString().padStart(2, '0');

            days.push({
                dayNumber: d,
                formattedDate: `${padDay}-${padMonth}-${selectedYear}`,
                isoDate: `${selectedYear}-${padMonth}-${padDay}`,
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6
            });
        }
        return days;
    }, [selectedYear, selectedMonth]);

    // Unique Therapies list
    const therapies = useMemo(() => {
        const datasetTherapies = sessionData
            .map((item: any) => item.therapy_name)
            .filter(Boolean);
        const set = new Set([...DEFAULT_THERAPIES, ...datasetTherapies]);
        return Array.from(set);
    }, [sessionData]);

    // Map sessions by therapy and date
    const sessionMap = useMemo(() => {
        const map: Record<string, Record<string, any[]>> = {};

        for (const item of sessionData) {
            const tName = item.therapy_name || 'Other';
            if (!map[tName]) map[tName] = {};

            let dateKey = item.attendance_date || '';
            if (dateKey.includes('T')) dateKey = dateKey.split('T')[0];

            if (!map[tName][dateKey]) map[tName][dateKey] = [];
            map[tName][dateKey].push(item);
        }
        return map;
    }, [sessionData]);

    // Summary count per date
    const dateCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const item of sessionData) {
            let dateKey = item.attendance_date || '';
            if (dateKey.includes('T')) dateKey = dateKey.split('T')[0];
            counts[dateKey] = (counts[dateKey] || 0) + (item.sessions_attended || 1);
        }
        return counts;
    }, [sessionData]);

    // Total attended across all therapies for the month
    const totalAttendedMonth = useMemo(() => {
        return sessionData.reduce((acc: number, item: any) => acc + (item.sessions_attended || 1), 0);
    }, [sessionData]);

    // Export CSV handler
    const handleExportCSV = async () => {
        setExporting(true);
        try {
            const dateHeaders = daysInMonth.map(d => d.formattedDate);
            const headers = ['Therapy', ...dateHeaders];

            const escapeCSV = (val: string) => {
                const str = (val || '').toString().replace(/"/g, '""');
                return `"${str}"`;
            };

            const rows: string[] = [];
            rows.push(headers.map(escapeCSV).join(','));

            for (const therapyName of therapies) {
                const therapySessions = sessionMap[therapyName] || {};
                const rowCells = [therapyName];

                for (const day of daysInMonth) {
                    const dateSessions = therapySessions[day.isoDate] || therapySessions[day.formattedDate] || [];
                    if (dateSessions.length > 0) {
                        const sessionTexts = dateSessions.map(s => {
                            const statusStr = s.is_confirmed ? 'Confirmed' : 'Unconfirmed';
                            const slotStr = s.slot_label || s.attended_slot || 'Slot';
                            const therapistStr = s.therapist_name || s.therapist || '';
                            return `${statusStr} (${slotStr}${therapistStr ? ' - ' + therapistStr : ''})`;
                        }).join(' | ');
                        rowCells.push(sessionTexts);
                    } else {
                        rowCells.push('-');
                    }
                }
                rows.push(rowCells.map(escapeCSV).join(','));
            }

            // Summary Row at bottom
            const summaryRowCells = [`All Therapies (Total Attended: ${totalAttendedMonth})`];
            for (const day of daysInMonth) {
                const count = dateCounts[day.isoDate] || dateCounts[day.formattedDate] || 0;
                summaryRowCells.push(count > 0 ? count.toString() : '0');
            }
            rows.push(summaryRowCells.map(escapeCSV).join(','));

            const csvString = rows.join('\n');
            const filename = `Session_Attendance_${regNo.replace(/\//g, '_')}_${selectedMonth}_${selectedYear}.csv`;

            if (Platform.OS === 'web') {
                const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                const fileUri = `${FileSystem.cacheDirectory}${filename}`;
                await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Session Attendance' });
                } else {
                    Alert.alert("Export Saved", `CSV file generated: ${filename}`);
                }
            }
        } catch (err: any) {
            console.error("Export CSV Error:", err);
            Alert.alert("Error", "Failed to export CSV file.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            {/* Header Filter & Export Bar */}
            <View style={[styles.filterBar, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.filterGroup}>
                    <TouchableOpacity 
                        style={styles.arrowBtn}
                        onPress={() => {
                            if (selectedMonth === 1) {
                                setSelectedMonth(12);
                                setSelectedYear(selectedYear - 1);
                            } else {
                                setSelectedMonth(selectedMonth - 1);
                            }
                        }}
                    >
                        <Ionicons name="chevron-back" size={20} color={textColor} />
                    </TouchableOpacity>

                    <View style={styles.monthDisplay}>
                        <Ionicons name="calendar-outline" size={16} color="#6366f1" style={{ marginRight: 6 }} />
                        <ThemedText style={styles.monthText}>
                            {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                        </ThemedText>
                    </View>

                    <TouchableOpacity 
                        style={styles.arrowBtn}
                        onPress={() => {
                            if (selectedMonth === 12) {
                                setSelectedMonth(1);
                                setSelectedYear(selectedYear + 1);
                            } else {
                                setSelectedMonth(selectedMonth + 1);
                            }
                        }}
                    >
                        <Ionicons name="chevron-forward" size={20} color={textColor} />
                    </TouchableOpacity>
                </View>

                <View style={styles.actionGroup}>
                    <TouchableOpacity 
                        style={[styles.exportBtn, exporting && { opacity: 0.7 }]} 
                        onPress={handleExportCSV}
                        disabled={exporting}
                    >
                        {exporting ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <>
                                <Ionicons name="download-outline" size={15} color="white" style={{ marginRight: 5 }} />
                                <ThemedText style={styles.exportBtnText}>Export CSV</ThemedText>
                            </>
                        )}
                    </TouchableOpacity>
                    {loading ? <ActivityIndicator size="small" color="#6366f1" style={{ marginLeft: 8 }} /> : null}
                </View>
            </View>

            {/* FROZEN TOP HEADER ROW (Corner + Date Headers) */}
            <View style={styles.topHeaderContainer}>
                {/* Frozen Top-Left Corner Box (Therapy Column Header) */}
                <View style={[styles.topLeftCornerCell, { backgroundColor: cardBg, borderColor }]}>
                    <View style={[styles.cellTherapyHeader, { backgroundColor: resolvedTheme === 'dark' ? '#1e293b' : '#f8fafc', borderColor }]}>
                        <ThemedText style={styles.headerText}>Therapy</ThemedText>
                    </View>
                </View>

                {/* Frozen Top Date Headers (Scrolls Horizontally Synced with Body Grid) */}
                <ScrollView 
                    ref={headerDateScrollRef} 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    scrollEnabled={false}
                    style={styles.headerDateScroll}
                >
                    <View style={styles.tableRow}>
                        {daysInMonth.map((day) => (
                            <View 
                                key={day.formattedDate} 
                                style={[
                                    styles.cellDateHeader, 
                                    day.isWeekend 
                                        ? { backgroundColor: resolvedTheme === 'dark' ? '#451a03' : '#fff1f2', borderColor: '#fca5a5' }
                                        : { backgroundColor: resolvedTheme === 'dark' ? '#1e293b' : '#f8fafc', borderColor }
                                ]}
                            >
                                <ThemedText 
                                    style={[
                                        styles.dateHeaderText, 
                                        day.isWeekend && { color: '#e11d48', fontWeight: '900' }
                                    ]}
                                >
                                    {day.formattedDate}
                                </ThemedText>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* VERTICALLY SCROLLABLE BODY CONTAINER */}
            <ScrollView showsVerticalScrollIndicator={true} style={styles.bodyVerticalScroll}>
                <View style={styles.tableFlexContainer}>

                    {/* Fixed Left Column (Frozen Therapy Titles) */}
                    <View style={[styles.fixedLeftContainer, { backgroundColor: cardBg, borderColor }]}>
                        {therapies.map((therapyName) => (
                            <View key={therapyName} style={styles.leftDataRow}>
                                <View style={[styles.cellTherapy, { backgroundColor: cardBg, borderColor }]}>
                                    <ThemedText style={styles.therapyTitleText} numberOfLines={2}>
                                        {therapyName}
                                    </ThemedText>
                                </View>
                            </View>
                        ))}

                        {/* Summary Left Cell (All Therapies + Total Attended) */}
                        <View style={styles.leftSummaryRow}>
                            <View style={[styles.cellSummaryHeader, { backgroundColor: resolvedTheme === 'dark' ? '#0f172a' : '#e0f2fe', borderColor }]}>
                                <ThemedText style={styles.summaryTitleText}>All Therapies</ThemedText>
                                <ThemedText style={styles.summarySubtext}>
                                    Total Attended: {totalAttendedMonth}
                                </ThemedText>
                            </View>
                        </View>
                    </View>

                    {/* Right Horizontally Scrollable Date Grid (Syncs Top Header) */}
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={true} 
                        style={styles.rightScroll}
                        scrollEventThrottle={16}
                        onScroll={(e) => {
                            const x = e.nativeEvent.contentOffset.x;
                            headerDateScrollRef.current?.scrollTo({ x, animated: false });
                        }}
                    >
                        <View>
                            {/* Date Data Cells per Therapy */}
                            {therapies.map((therapyName) => {
                                const therapySessions = sessionMap[therapyName] || {};

                                return (
                                    <View key={therapyName} style={styles.tableRow}>
                                        {daysInMonth.map((day) => {
                                            const dateSessions = therapySessions[day.isoDate] || therapySessions[day.formattedDate] || [];

                                            return (
                                                <View 
                                                    key={`${therapyName}-${day.formattedDate}`}
                                                    style={[
                                                        styles.cellData,
                                                        day.isWeekend 
                                                            ? { backgroundColor: resolvedTheme === 'dark' ? '#1c1917' : '#fff5f5', borderColor }
                                                            : { backgroundColor: cardBg, borderColor }
                                                    ]}
                                                >
                                                    {dateSessions.length > 0 ? (
                                                        dateSessions.map((session, idx) => (
                                                            <View 
                                                                key={session._id || idx}
                                                                style={[
                                                                    styles.sessionCard,
                                                                    session.is_confirmed 
                                                                        ? styles.sessionCardConfirmed 
                                                                        : styles.sessionCardUnconfirmed
                                                                ]}
                                                            >
                                                                {/* Status Badge */}
                                                                <View style={styles.badgeRow}>
                                                                    <Ionicons 
                                                                        name={session.is_confirmed ? "checkmark-circle" : "time-outline"} 
                                                                        size={11} 
                                                                        color={session.is_confirmed ? "#15803d" : "#ca8a04"} 
                                                                    />
                                                                    <ThemedText 
                                                                        style={[
                                                                            styles.badgeText, 
                                                                            { color: session.is_confirmed ? "#15803d" : "#ca8a04" }
                                                                        ]}
                                                                    >
                                                                        {session.is_confirmed ? 'Confirmed' : 'Unconfirmed'}
                                                                    </ThemedText>
                                                                </View>

                                                                {/* Time Slot Box */}
                                                                <View style={styles.slotBox}>
                                                                    <ThemedText style={styles.slotText}>
                                                                        {session.slot_label || session.attended_slot || 'Slot'}
                                                                    </ThemedText>
                                                                </View>

                                                                {/* Therapist Name */}
                                                                <ThemedText style={styles.therapistText} numberOfLines={1}>
                                                                    {session.therapist_name || session.therapist || 'Therapist'}
                                                                </ThemedText>
                                                            </View>
                                                        ))
                                                    ) : (
                                                        <ThemedText style={[styles.dashText, { color: textSecondary }]}>-</ThemedText>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                );
                            })}

                            {/* Summary Date Counts Row (Display Total Attended Below) */}
                            <View style={styles.tableRow}>
                                {daysInMonth.map((day) => {
                                    const count = dateCounts[day.isoDate] || dateCounts[day.formattedDate] || 0;
                                    return (
                                        <View 
                                            key={`summary-${day.formattedDate}`}
                                            style={[styles.cellSummary, { backgroundColor: resolvedTheme === 'dark' ? '#0f172a' : '#e0f2fe', borderColor }]}
                                        >
                                            <ThemedText style={styles.summaryValueText}>
                                                {count > 0 ? count : '-'}
                                            </ThemedText>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </ScrollView>

                </View>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    filterBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderRadius: 16, margin: 16, marginBottom: 8 },
    filterGroup: { flexDirection: 'row', alignItems: 'center' },
    actionGroup: { flexDirection: 'row', alignItems: 'center' },
    arrowBtn: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)' },
    monthDisplay: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
    monthText: { fontSize: 15, fontWeight: '900' },
    exportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#15803d', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    exportBtnText: { color: 'white', fontSize: 12, fontWeight: '900' },
    
    // Top Frozen Header
    topHeaderContainer: { flexDirection: 'row', zIndex: 20, elevation: 5 },
    topLeftCornerCell: { width: 180, height: 48, zIndex: 30, elevation: 6 },
    headerDateScroll: { flex: 1 },

    // Vertically Scrollable Body
    bodyVerticalScroll: { flex: 1 },
    tableFlexContainer: { flexDirection: 'row' },
    fixedLeftContainer: { width: 180, zIndex: 10, elevation: 4 },
    leftDataRow: { height: 110 },
    leftSummaryRow: { height: 58 },
    rightScroll: { flex: 1 },
    tableRow: { flexDirection: 'row' },

    // Cell Styles
    cellTherapyHeader: { width: 180, height: 48, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1 },
    cellDateHeader: { width: 140, height: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    headerText: { fontSize: 13, fontWeight: '900', color: '#64748b' },
    dateHeaderText: { fontSize: 12, fontWeight: '800', color: '#475569' },
    cellTherapy: { width: 180, height: 110, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1 },
    therapyTitleText: { fontSize: 13, fontWeight: '800' },
    cellData: { width: 140, height: 110, padding: 6, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    dashText: { fontSize: 14, fontWeight: '700' },
    sessionCard: { width: '100%', borderRadius: 10, padding: 6, borderWidth: 1, alignItems: 'center' },
    sessionCardUnconfirmed: { backgroundColor: '#fefce8', borderColor: '#fde047' },
    sessionCardConfirmed: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
    badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
    badgeText: { fontSize: 9, fontWeight: '900', marginLeft: 3, textTransform: 'uppercase' },
    slotBox: { backgroundColor: '#fef08a', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, marginVertical: 2 },
    slotText: { fontSize: 10, fontWeight: '900', color: '#854d0e' },
    therapistText: { fontSize: 10, fontWeight: '700', color: '#475569', marginTop: 2, textAlign: 'center' },
    cellSummaryHeader: { width: 180, height: 58, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1 },
    summaryTitleText: { fontSize: 13, fontWeight: '900', color: '#0369a1' },
    summarySubtext: { fontSize: 10, fontWeight: '800', color: '#0284c7', marginTop: 2 },
    cellSummary: { width: 140, height: 58, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    summaryValueText: { fontSize: 15, fontWeight: '900', color: '#0369a1' }
});
