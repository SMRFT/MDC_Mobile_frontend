import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTheme } from '@/context/ThemeContext';
import { fetchPatientSessionAttendance } from '../scripts/goalsApi';

const { width } = Dimensions.get('window');

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const MONTH_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
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

const THERAPY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    'Applied Behavior Analysis (ABA)': 'bulb-outline',
    'Speech Therapy': 'chatbubbles-outline',
    'Occupational Therapy': 'hand-left-outline',
    'Physiotherapy': 'body-outline',
    'Special Education': 'book-outline',
    'Social Training Class': 'people-outline',
    'Cognitive Therapy': 'flash-outline',
    'Art Therapy': 'color-palette-outline',
    'Only Group Therapy Session': 'people-circle-outline',
    'General': 'medical-outline',
};

interface SessionMatrixGridProps {
    regNo: string;
}

type AttendanceViewMode = 'matrix' | 'daywise' | 'monthwise';

export function SessionMatrixGrid({ regNo }: SessionMatrixGridProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const currentDate = new Date();

    const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-12
    const [selectedDayNumber, setSelectedDayNumber] = useState<number>(() => {
        if (currentDate.getFullYear() === selectedYear && currentDate.getMonth() + 1 === selectedMonth) {
            return currentDate.getDate();
        }
        return 1;
    });
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [viewMode, setViewMode] = useState<AttendanceViewMode>('daywise');
    const [sessionData, setSessionData] = useState<any[]>([]);
    const [annualSessionData, setAnnualSessionData] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [annualLoading, setAnnualLoading] = useState<boolean>(false);
    const [exporting, setExporting] = useState<boolean>(false);

    const headerDateScrollRef = useRef<ScrollView>(null);
    const dayStripScrollRef = useRef<ScrollView>(null);

    const cardBg = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const textColor = useThemeColor({}, 'text');
    const primaryColor = useThemeColor({}, 'primary');

    useEffect(() => {
        loadMonthSessionAttendance();
    }, [regNo, selectedYear, selectedMonth]);

    useEffect(() => {
        if (viewMode === 'monthwise') {
            loadAnnualSessionAttendance();
        }
    }, [regNo, selectedYear, viewMode]);

    // Auto-scroll the date ribbon when selectedDayNumber changes
    useEffect(() => {
        if (viewMode === 'daywise' && dayStripScrollRef.current) {
            const cardWidth = 56;
            const scrollX = Math.max(0, (selectedDayNumber - 3) * cardWidth);
            dayStripScrollRef.current.scrollTo({ x: scrollX, animated: true });
        }
    }, [selectedDayNumber, viewMode]);

    const loadMonthSessionAttendance = async () => {
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

    const loadAnnualSessionAttendance = async () => {
        setAnnualLoading(true);
        try {
            const data = await fetchPatientSessionAttendance(
                regNo,
                undefined,
                selectedYear.toString()
            );
            setAnnualSessionData(data || []);
        } catch (error) {
            console.error("Failed to load annual session attendance:", error);
        } finally {
            setAnnualLoading(false);
        }
    };

    // Days in month calculation
    const daysInMonth = useMemo(() => {
        const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();
        const days = [];
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

        for (let d = 1; d <= totalDays; d++) {
            const dateObj = new Date(selectedYear, selectedMonth - 1, d);
            const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
            const padDay = d.toString().padStart(2, '0');
            const padMonth = selectedMonth.toString().padStart(2, '0');

            days.push({
                dayNumber: d,
                padDay,
                dayName: dayNames[dayOfWeek],
                fullDayName: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
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

    // Active selected day object
    const activeDayObj = useMemo(() => {
        const day = daysInMonth.find(d => d.dayNumber === selectedDayNumber);
        return day || daysInMonth[0] || {
            dayNumber: 1,
            padDay: '01',
            dayName: 'MON',
            fullDayName: 'Monday',
            formattedDate: `01-${selectedMonth.toString().padStart(2, '0')}-${selectedYear}`,
            isoDate: `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`,
            isWeekend: false
        };
    }, [daysInMonth, selectedDayNumber, selectedMonth, selectedYear]);

    // Active selected day's sessions
    const activeDaySessions = useMemo(() => {
        if (!activeDayObj) return [];
        return sessionData.filter(item => {
            let d = item.attendance_date || '';
            if (d.includes('T')) d = d.split('T')[0];
            return d === activeDayObj.isoDate || d === activeDayObj.formattedDate;
        });
    }, [sessionData, activeDayObj]);

    // Active selected day metrics
    const dayMetrics = useMemo(() => {
        const total = activeDaySessions.reduce((acc, s) => acc + (s.sessions_attended || 1), 0);
        const confirmed = activeDaySessions.filter(s => s.is_confirmed).length;
        const unconfirmed = total - confirmed;
        const verifiedPercent = total > 0 ? Math.round((confirmed / total) * 100) : 0;
        const uniqueTherapies = new Set(activeDaySessions.map(s => s.therapy_name).filter(Boolean)).size;

        return { total, confirmed, unconfirmed, verifiedPercent, uniqueTherapies };
    }, [activeDaySessions]);

    // Month-wise annual breakdown
    const monthWiseAnnualSummary = useMemo(() => {
        const dataset = annualSessionData.length > 0 ? annualSessionData : sessionData;
        const summary: Array<{
            monthIndex: number;
            monthName: string;
            shortName: string;
            totalSessions: number;
            confirmedSessions: number;
            unconfirmedSessions: number;
            therapyBreakdown: Record<string, number>;
        }> = [];

        for (let m = 1; m <= 12; m++) {
            const padM = m.toString().padStart(2, '0');
            const prefix1 = `${selectedYear}-${padM}`;
            const prefix2 = `-${padM}-${selectedYear}`;

            const monthRecords = dataset.filter(item => {
                let d = item.attendance_date || '';
                if (d.includes('T')) d = d.split('T')[0];
                return d.startsWith(prefix1) || d.includes(prefix2);
            });

            const confirmed = monthRecords.filter(s => s.is_confirmed).length;
            const unconfirmed = monthRecords.length - confirmed;
            const tMap: Record<string, number> = {};

            monthRecords.forEach(s => {
                const t = s.therapy_name || 'Other';
                tMap[t] = (tMap[t] || 0) + (s.sessions_attended || 1);
            });

            summary.push({
                monthIndex: m,
                monthName: MONTH_NAMES[m - 1],
                shortName: MONTH_SHORT[m - 1],
                totalSessions: monthRecords.length,
                confirmedSessions: confirmed,
                unconfirmedSessions: unconfirmed,
                therapyBreakdown: tMap
            });
        }

        return summary;
    }, [annualSessionData, sessionData, selectedYear]);

    // Total attended across all therapies for the month
    const totalAttendedMonth = useMemo(() => {
        return sessionData.reduce((acc: number, item: any) => acc + (item.sessions_attended || 1), 0);
    }, [sessionData]);

    // Annual total metrics
    const annualMetrics = useMemo(() => {
        const dataset = annualSessionData.length > 0 ? annualSessionData : sessionData;
        const total = dataset.reduce((acc: number, item: any) => acc + (item.sessions_attended || 1), 0);
        const confirmed = dataset.filter((item: any) => item.is_confirmed).length;
        const unconfirmed = total - confirmed;
        const rate = total > 0 ? Math.round((confirmed / total) * 100) : 0;
        return { total, confirmed, unconfirmed, rate };
    }, [annualSessionData, sessionData]);

    // Auto-scroll date strip ribbon to active selected day
    useEffect(() => {
        if (viewMode === 'daywise' && dayStripScrollRef.current) {
            const cardWidth = 56; // 50 width + 6 gap
            const scrollOffset = Math.max(0, (selectedDayNumber - 2) * cardWidth);
            setTimeout(() => {
                dayStripScrollRef.current?.scrollTo({ x: scrollOffset, animated: true });
            }, 100);
        }
    }, [selectedDayNumber, viewMode, selectedMonth, selectedYear]);

    // Handle selecting a specific date from native datepicker
    const handleDateSelected = (date: Date) => {
        const yr = date.getFullYear();
        const mo = date.getMonth() + 1;
        const day = date.getDate();
        if (yr !== selectedYear) setSelectedYear(yr);
        if (mo !== selectedMonth) setSelectedMonth(mo);
        setSelectedDayNumber(day);
    };

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
            {/* Header Month / Year & Action Bar */}
            <View style={[styles.filterBar, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.filterGroup}>
                    <TouchableOpacity 
                        style={styles.arrowBtn}
                        onPress={() => {
                            if (viewMode === 'monthwise') {
                                setSelectedYear(selectedYear - 1);
                            } else {
                                if (selectedMonth === 1) {
                                    setSelectedMonth(12);
                                    setSelectedYear(selectedYear - 1);
                                } else {
                                    setSelectedMonth(selectedMonth - 1);
                                }
                            }
                        }}
                    >
                        <Ionicons name="chevron-back" size={20} color={textColor} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.monthDisplay}
                        onPress={() => setShowDatePicker(true)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="calendar-outline" size={16} color="#6366f1" style={{ marginRight: 6 }} />
                        <ThemedText style={styles.monthText}>
                            {viewMode === 'monthwise' ? `Year ${selectedYear}` : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}
                        </ThemedText>
                        <Ionicons name="caret-down" size={12} color={textSecondary} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.arrowBtn}
                        onPress={() => {
                            if (viewMode === 'monthwise') {
                                setSelectedYear(selectedYear + 1);
                            } else {
                                if (selectedMonth === 12) {
                                    setSelectedMonth(1);
                                    setSelectedYear(selectedYear + 1);
                                } else {
                                    setSelectedMonth(selectedMonth + 1);
                                }
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
                                <Ionicons name="download-outline" size={14} color="white" style={{ marginRight: 4 }} />
                                <ThemedText style={styles.exportBtnText}>CSV</ThemedText>
                            </>
                        )}
                    </TouchableOpacity>
                    {(loading || annualLoading) ? <ActivityIndicator size="small" color="#6366f1" style={{ marginLeft: 8 }} /> : null}
                </View>
            </View>

            {/* View Mode Segment: Day-Wise | Matrix Grid | Month-Wise */}
            <View style={[styles.subModeContainer, { backgroundColor: cardBg, borderColor }]}>
                <TouchableOpacity
                    onPress={() => setViewMode('daywise')}
                    style={[
                        styles.subModeBtn,
                        viewMode === 'daywise' && { backgroundColor: '#4338ca' }
                    ]}
                >
                    <Ionicons 
                        name="calendar-number-outline" 
                        size={13} 
                        color={viewMode === 'daywise' ? 'white' : textSecondary} 
                        style={{ marginRight: 4 }}
                    />
                    <ThemedText 
                        style={[
                            styles.subModeText, 
                            viewMode === 'daywise' ? { color: 'white', fontWeight: '900' } : { color: textSecondary }
                        ]}
                    >
                        Day-Wise
                    </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setViewMode('matrix')}
                    style={[
                        styles.subModeBtn,
                        viewMode === 'matrix' && { backgroundColor: '#4338ca' }
                    ]}
                >
                    <Ionicons 
                        name="grid-outline" 
                        size={13} 
                        color={viewMode === 'matrix' ? 'white' : textSecondary} 
                        style={{ marginRight: 4 }}
                    />
                    <ThemedText 
                        style={[
                            styles.subModeText, 
                            viewMode === 'matrix' ? { color: 'white', fontWeight: '900' } : { color: textSecondary }
                        ]}
                    >
                        Matrix Grid
                    </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setViewMode('monthwise')}
                    style={[
                        styles.subModeBtn,
                        viewMode === 'monthwise' && { backgroundColor: '#4338ca' }
                    ]}
                >
                    <Ionicons 
                        name="stats-chart-outline" 
                        size={13} 
                        color={viewMode === 'monthwise' ? 'white' : textSecondary} 
                        style={{ marginRight: 4 }}
                    />
                    <ThemedText 
                        style={[
                            styles.subModeText, 
                            viewMode === 'monthwise' ? { color: 'white', fontWeight: '900' } : { color: textSecondary }
                        ]}
                    >
                        Month-Wise
                    </ThemedText>
                </TouchableOpacity>
            </View>

            {/* Native / Web DatePicker Modal */}
            {showDatePicker && (
                <DateTimePicker
                    value={new Date(selectedYear, selectedMonth - 1, selectedDayNumber || 1)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                        setShowDatePicker(false);
                        if (date) {
                            handleDateSelected(date);
                        }
                    }}
                />
            )}

            {/* 1. DAY-WISE ATTENDANCE VIEW (Matches Requested Screenshot Exactly) */}
            {viewMode === 'daywise' && (
                <ScrollView 
                    showsVerticalScrollIndicator={false} 
                    style={styles.dayWiseScroll} 
                    contentContainerStyle={styles.dayWiseContent}
                >
                    {/* Top Horizontal Date Ribbon Strip */}
                    <View style={[styles.dateStripContainer, { backgroundColor: cardBg, borderColor }]}>
                        {/* Prev Day Button */}
                        <TouchableOpacity 
                            style={styles.stripNavBtn}
                            onPress={() => {
                                if (selectedDayNumber > 1) {
                                    setSelectedDayNumber(selectedDayNumber - 1);
                                } else if (selectedMonth > 1) {
                                    setSelectedMonth(selectedMonth - 1);
                                    const prevMonthDays = new Date(selectedYear, selectedMonth - 1, 0).getDate();
                                    setSelectedDayNumber(prevMonthDays);
                                }
                            }}
                        >
                            <Ionicons name="chevron-back" size={16} color={textColor} />
                        </TouchableOpacity>

                        {/* Scrollable Date Cards Ribbon */}
                        <ScrollView
                            ref={dayStripScrollRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.dateStripScroll}
                        >
                            {daysInMonth.map((day) => {
                                const isSelected = day.dayNumber === selectedDayNumber;
                                const dayCount = dateCounts[day.isoDate] || dateCounts[day.formattedDate] || 0;

                                return (
                                    <TouchableOpacity
                                        key={day.dayNumber}
                                        style={[
                                            styles.dateCard,
                                            day.isWeekend && styles.dateCardWeekend,
                                            isSelected && styles.dateCardSelected,
                                            {
                                                backgroundColor: isSelected 
                                                    ? '#4b6043' // Exact olive green from screenshot
                                                    : (day.isWeekend ? (resolvedTheme === 'dark' ? '#2d1517' : '#fff5f5') : (resolvedTheme === 'dark' ? '#1e293b' : '#ffffff')),
                                                borderColor: isSelected 
                                                    ? '#4b6043' 
                                                    : (day.isWeekend ? '#fca5a5' : '#e2e8f0')
                                            }
                                        ]}
                                        onPress={() => setSelectedDayNumber(day.dayNumber)}
                                        activeOpacity={0.8}
                                    >
                                        {/* Day Name (e.g. WED) */}
                                        <ThemedText
                                            style={[
                                                styles.dateCardDayName,
                                                day.isWeekend && { color: '#dc2626' },
                                                !day.isWeekend && !isSelected && { color: '#64748b' },
                                                isSelected && { color: '#f1f5f9', fontWeight: '900' }
                                            ]}
                                        >
                                            {day.dayName}
                                        </ThemedText>

                                        {/* Day Number (e.g. 09) */}
                                        <ThemedText
                                            style={[
                                                styles.dateCardDayNum,
                                                day.isWeekend && !isSelected && { color: '#1e293b' },
                                                !day.isWeekend && !isSelected && { color: textColor },
                                                isSelected && { color: '#ffffff', fontWeight: '900' }
                                            ]}
                                        >
                                            {day.padDay}
                                        </ThemedText>

                                        {/* Session Count Pill (e.g. 31 sess or -) */}
                                        <View 
                                            style={[
                                                styles.dateCardBadge,
                                                { 
                                                    backgroundColor: isSelected 
                                                        ? 'rgba(255,255,255,0.22)' 
                                                        : (dayCount > 0 ? (resolvedTheme === 'dark' ? '#14532d' : '#dcfce7') : 'transparent')
                                                }
                                            ]}
                                        >
                                            <ThemedText
                                                style={[
                                                    styles.dateCardBadgeText,
                                                    isSelected && { color: '#ffffff' },
                                                    !isSelected && dayCount > 0 && { color: '#15803d' },
                                                    !isSelected && dayCount === 0 && { color: '#94a3b8' }
                                                ]}
                                            >
                                                {dayCount > 0 ? `${dayCount} sess` : '-'}
                                            </ThemedText>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Next Day Button */}
                        <TouchableOpacity 
                            style={styles.stripNavBtn}
                            onPress={() => {
                                const maxDays = daysInMonth.length;
                                if (selectedDayNumber < maxDays) {
                                    setSelectedDayNumber(selectedDayNumber + 1);
                                } else if (selectedMonth < 12) {
                                    setSelectedMonth(selectedMonth + 1);
                                    setSelectedDayNumber(1);
                                }
                            }}
                        >
                            <Ionicons name="chevron-forward" size={16} color={textColor} />
                        </TouchableOpacity>
                    </View>

                    {/* 3 Summary Stat Cards Row for Mobile */}
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.metricsRow}
                    >
                        {/* 1. TOTAL SESSIONS LOGGED */}
                        <View style={[
                            styles.metricCard, 
                            { 
                                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4', 
                                borderColor: isDark ? 'rgba(16, 185, 129, 0.45)' : '#bbf7d0' 
                            }
                        ]}>
                            <ThemedText style={[
                                styles.metricCardTitle, 
                                { color: isDark ? '#86efac' : '#15803d' }
                            ]}>
                                TOTAL SESSIONS LOGGED
                            </ThemedText>
                            <View style={styles.metricCardBody}>
                                <View style={[
                                    styles.metricIconBox, 
                                    { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#dcfce7' }
                                ]}>
                                    <Ionicons name="pulse" size={18} color={isDark ? '#86efac' : '#15803d'} />
                                </View>
                                <ThemedText style={[
                                    styles.metricCardNumber, 
                                    { color: isDark ? '#ffffff' : '#0f172a' }
                                ]}>
                                    {dayMetrics.total}
                                </ThemedText>
                            </View>
                            <ThemedText style={[
                                styles.metricCardSub, 
                                { color: isDark ? '#a7f3d0' : '#16a34a' }
                            ]}>
                                on {activeDayObj.formattedDate}
                            </ThemedText>
                        </View>

                        {/* 2. CONFIRMED SESSIONS */}
                        <View style={[
                            styles.metricCard, 
                            { 
                                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff', 
                                borderColor: isDark ? 'rgba(59, 130, 246, 0.45)' : '#bfdbfe' 
                            }
                        ]}>
                            <ThemedText style={[
                                styles.metricCardTitle, 
                                { color: isDark ? '#93c5fd' : '#1d4ed8' }
                            ]}>
                                CONFIRMED SESSIONS
                            </ThemedText>
                            <View style={styles.metricCardBody}>
                                <View style={[
                                    styles.metricIconBox, 
                                    { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.25)' : '#dbeafe' }
                                ]}>
                                    <Ionicons name="checkmark-circle-outline" size={18} color={isDark ? '#93c5fd' : '#1d4ed8'} />
                                </View>
                                <ThemedText style={[
                                    styles.metricCardNumber, 
                                    { color: isDark ? '#ffffff' : '#0f172a' }
                                ]}>
                                    {dayMetrics.confirmed}
                                </ThemedText>
                            </View>
                            <ThemedText style={[
                                styles.metricCardSub, 
                                { color: isDark ? '#bfdbfe' : '#2563eb' }
                            ]}>
                                {dayMetrics.verifiedPercent}% verified
                            </ThemedText>
                        </View>

                        {/* 3. PENDING CONFIRMATION */}
                        <View style={[
                            styles.metricCard, 
                            { 
                                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fefce8', 
                                borderColor: isDark ? 'rgba(245, 158, 11, 0.45)' : '#fef08a' 
                            }
                        ]}>
                            <ThemedText style={[
                                styles.metricCardTitle, 
                                { color: isDark ? '#fde68a' : '#854d0e' }
                            ]}>
                                PENDING CONFIRMATION
                            </ThemedText>
                            <View style={styles.metricCardBody}>
                                <View style={[
                                    styles.metricIconBox, 
                                    { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#fef9c3' }
                                ]}>
                                    <Ionicons name="time-outline" size={18} color={isDark ? '#fde047' : '#854d0e'} />
                                </View>
                                <ThemedText style={[
                                    styles.metricCardNumber, 
                                    { color: isDark ? '#ffffff' : '#0f172a' }
                                ]}>
                                    {dayMetrics.unconfirmed}
                                </ThemedText>
                            </View>
                            <ThemedText style={[
                                styles.metricCardSub, 
                                { color: isDark ? '#fef08a' : '#a16207' }
                            ]}>
                                action needed
                            </ThemedText>
                        </View>
                    </ScrollView>

                    {/* Day Sessions List or Empty State */}
                    {activeDaySessions.length === 0 ? (
                        <View style={styles.emptySessionsBox}>
                            <View style={styles.emptyCalendarIconBox}>
                                <Ionicons name="calendar-outline" size={54} color="#cbd5e1" />
                            </View>
                            <ThemedText style={styles.emptySessionsTitle}>
                                No Sessions Logged for {activeDayObj.formattedDate}
                            </ThemedText>
                            <ThemedText style={[styles.emptySessionsSub, { color: textSecondary }]}>
                                There are no attendance sessions logged for this day yet.
                            </ThemedText>
                        </View>
                    ) : (
                        <View style={styles.daySessionsContainer}>
                            <View style={styles.daySessionsHeader}>
                                <ThemedText style={styles.daySessionsTitle}>
                                    Sessions on {activeDayObj.formattedDate} ({activeDayObj.fullDayName})
                                </ThemedText>
                            </View>

                            {activeDaySessions.map((session, sIdx) => {
                                const therapyIcon = THERAPY_ICONS[session.therapy_name] || 'medical-outline';
                                return (
                                    <View 
                                        key={session._id || sIdx} 
                                        style={[
                                            styles.daySessionCard, 
                                            { 
                                                backgroundColor: cardBg, 
                                                borderColor: session.is_confirmed ? '#86efac' : '#fde047'
                                            }
                                        ]}
                                    >
                                        <View style={styles.daySessionCardHeader}>
                                            <View style={styles.daySessionCardTitleBox}>
                                                <View style={[styles.therapyIconCircle, { backgroundColor: '#4338ca15' }]}>
                                                    <Ionicons name={therapyIcon} size={18} color="#4338ca" />
                                                </View>
                                                <ThemedText style={styles.daySessionCardTherapy}>
                                                    {session.therapy_name || 'Therapy'}
                                                </ThemedText>
                                            </View>

                                            <View 
                                                style={[
                                                    styles.sessionStatusBadge, 
                                                    { 
                                                        backgroundColor: session.is_confirmed ? '#dcfce7' : '#fef9c3',
                                                        borderColor: session.is_confirmed ? '#86efac' : '#fde047'
                                                    }
                                                ]}
                                            >
                                                <Ionicons 
                                                    name={session.is_confirmed ? "checkmark-circle" : "time-outline"} 
                                                    size={12} 
                                                    color={session.is_confirmed ? "#15803d" : "#ca8a04"} 
                                                    style={{ marginRight: 4 }}
                                                />
                                                <ThemedText 
                                                    style={[
                                                        styles.sessionStatusText, 
                                                        { color: session.is_confirmed ? "#15803d" : "#ca8a04" }
                                                    ]}
                                                >
                                                    {session.is_confirmed ? 'Confirmed' : 'Pending'}
                                                </ThemedText>
                                            </View>
                                        </View>

                                        <View style={styles.daySessionCardDetailsRow}>
                                            <View style={styles.sessionDetailPill}>
                                                <Ionicons name="time-outline" size={13} color="#b45309" style={{ marginRight: 4 }} />
                                                <ThemedText style={styles.sessionDetailText}>
                                                    Slot: {session.slot_label || session.attended_slot || 'Standard'}
                                                </ThemedText>
                                            </View>

                                            {(session.therapist_name || session.therapist) ? (
                                                <View style={styles.sessionDetailPill}>
                                                    <Ionicons name="person-outline" size={13} color="#4338ca" style={{ marginRight: 4 }} />
                                                    <ThemedText style={styles.sessionDetailText}>
                                                        Therapist: {session.therapist_name || session.therapist}
                                                    </ThemedText>
                                                </View>
                                            ) : null}

                                            {session.confirmed_by_name ? (
                                                <View style={styles.sessionDetailPill}>
                                                    <Ionicons name="shield-checkmark-outline" size={13} color="#15803d" style={{ marginRight: 4 }} />
                                                    <ThemedText style={styles.sessionDetailText}>
                                                        Verified: {session.confirmed_by_name}
                                                    </ThemedText>
                                                </View>
                                            ) : null}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* 2. MATRIX GRID VIEW */}
            {viewMode === 'matrix' && (
                <>
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
                </>
            )}

            {/* 3. MONTH-WISE ANNUAL SUMMARY VIEW */}
            {viewMode === 'monthwise' && (
                <ScrollView showsVerticalScrollIndicator={false} style={styles.monthWiseScroll} contentContainerStyle={styles.monthWiseContent}>
                    {/* Annual Header Metrics Card */}
                    <View style={[styles.annualMetricsCard, { backgroundColor: resolvedTheme === 'dark' ? '#1e1b4b' : '#eff6ff', borderColor: '#bfdbfe' }]}>
                        <View style={styles.annualMetricsHeader}>
                            <Ionicons name="stats-chart" size={20} color="#4338ca" />
                            <ThemedText style={styles.annualMetricsTitle}>
                                Year {selectedYear} Session Attendance Overview
                            </ThemedText>
                        </View>
                        
                        <View style={styles.annualMetricsGrid}>
                            <View style={styles.annualMetricItem}>
                                <ThemedText style={[styles.annualMetricVal, { color: '#4338ca' }]}>
                                    {annualMetrics.total}
                                </ThemedText>
                                <ThemedText style={[styles.annualMetricLabel, { color: textSecondary }]}>
                                    Total Sessions
                                </ThemedText>
                            </View>

                            <View style={styles.annualMetricDivider} />

                            <View style={styles.annualMetricItem}>
                                <ThemedText style={[styles.annualMetricVal, { color: '#15803d' }]}>
                                    {annualMetrics.confirmed}
                                </ThemedText>
                                <ThemedText style={[styles.annualMetricLabel, { color: textSecondary }]}>
                                    Confirmed
                                </ThemedText>
                            </View>

                            <View style={styles.annualMetricDivider} />

                            <View style={styles.annualMetricItem}>
                                <ThemedText style={[styles.annualMetricVal, { color: '#ea580c' }]}>
                                    {annualMetrics.unconfirmed}
                                </ThemedText>
                                <ThemedText style={[styles.annualMetricLabel, { color: textSecondary }]}>
                                    Pending
                                </ThemedText>
                            </View>

                            <View style={styles.annualMetricDivider} />

                            <View style={styles.annualMetricItem}>
                                <ThemedText style={[styles.annualMetricVal, { color: '#2563eb' }]}>
                                    {annualMetrics.rate}%
                                </ThemedText>
                                <ThemedText style={[styles.annualMetricLabel, { color: textSecondary }]}>
                                    Verified Rate
                                </ThemedText>
                            </View>
                        </View>
                    </View>

                    {/* 12-Month Cards Grid */}
                    <View style={styles.monthsGrid}>
                        {monthWiseAnnualSummary.map((mSummary) => {
                            const isSelected = selectedMonth === mSummary.monthIndex;
                            const hasSessions = mSummary.totalSessions > 0;
                            const therapyEntries = Object.entries(mSummary.therapyBreakdown);

                            return (
                                <TouchableOpacity
                                    key={mSummary.monthIndex}
                                    style={[
                                        styles.monthSummaryCard,
                                        { backgroundColor: cardBg, borderColor: isSelected ? '#4338ca' : borderColor },
                                        isSelected && { borderWidth: 2 }
                                    ]}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        setSelectedMonth(mSummary.monthIndex);
                                        setSelectedDayNumber(1);
                                        setViewMode('daywise');
                                    }}
                                >
                                    <View style={styles.monthCardHeader}>
                                        <View style={[styles.monthPill, { backgroundColor: isSelected ? '#4338ca' : (hasSessions ? '#e0e7ff' : '#f1f5f9') }]}>
                                            <ThemedText style={[styles.monthPillText, { color: isSelected ? 'white' : (hasSessions ? '#4338ca' : '#64748b') }]}>
                                                {mSummary.shortName}
                                            </ThemedText>
                                        </View>
                                        <ThemedText style={[styles.monthCardTitle, isSelected && { color: primaryColor }]}>
                                            {mSummary.monthName}
                                        </ThemedText>
                                    </View>

                                    <View style={styles.monthCardCountRow}>
                                        <View style={styles.monthCountBox}>
                                            <ThemedText style={[styles.monthCountNum, { color: hasSessions ? '#4338ca' : textSecondary }]}>
                                                {mSummary.totalSessions}
                                            </ThemedText>
                                            <ThemedText style={[styles.monthCountSub, { color: textSecondary }]}>
                                                Sessions
                                            </ThemedText>
                                        </View>

                                        {hasSessions && (
                                            <View style={styles.monthMiniStats}>
                                                <View style={styles.miniStatRow}>
                                                    <Ionicons name="checkmark-circle" size={12} color="#15803d" />
                                                    <ThemedText style={styles.miniStatConfirmed}>{mSummary.confirmedSessions}</ThemedText>
                                                </View>
                                                {mSummary.unconfirmedSessions > 0 && (
                                                    <View style={styles.miniStatRow}>
                                                        <Ionicons name="time" size={12} color="#ca8a04" />
                                                        <ThemedText style={styles.miniStatPending}>{mSummary.unconfirmedSessions}</ThemedText>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>

                                    {/* Therapies pill tags */}
                                    {therapyEntries.length > 0 ? (
                                        <View style={styles.monthTherapyTags}>
                                            {therapyEntries.slice(0, 2).map(([tName, tCount], tIdx) => (
                                                <View key={tIdx} style={[styles.monthTherapyTag, { backgroundColor: resolvedTheme === 'dark' ? '#334155' : '#f1f5f9' }]}>
                                                    <ThemedText style={styles.monthTherapyTagText} numberOfLines={1}>
                                                        {tName}: {tCount}
                                                    </ThemedText>
                                                </View>
                                            ))}
                                            {therapyEntries.length > 2 && (
                                                <ThemedText style={[styles.moreTherapiesText, { color: primaryColor }]}>
                                                    +{therapyEntries.length - 2} more
                                                </ThemedText>
                                            )}
                                        </View>
                                    ) : (
                                        <ThemedText style={[styles.noSessionMonthText, { color: textSecondary }]}>
                                            No attendance
                                        </ThemedText>
                                    )}

                                    <View style={styles.monthCardFooter}>
                                        <ThemedText style={[styles.viewDayWiseText, { color: primaryColor }]}>
                                            View Day-Wise
                                        </ThemedText>
                                        <Ionicons name="chevron-forward" size={13} color={primaryColor} />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    filterBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderRadius: 16, marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
    filterGroup: { flexDirection: 'row', alignItems: 'center' },
    actionGroup: { flexDirection: 'row', alignItems: 'center' },
    arrowBtn: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)' },
    monthDisplay: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
    monthText: { fontSize: 14, fontWeight: '900' },
    exportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#15803d', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    exportBtnText: { color: 'white', fontSize: 11, fontWeight: '900' },
    
    // Sub Mode Switcher
    subModeContainer: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, padding: 3, borderRadius: 14, borderWidth: 1 },
    subModeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10 },
    subModeText: { fontSize: 12, fontWeight: '700' },

    // Day-Wise Ribbon Strip
    dateStripContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 14, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 18, borderWidth: 1 },
    stripNavBtn: { width: 30, height: 48, justifyContent: 'center', alignItems: 'center' },
    dateStripScroll: { paddingHorizontal: 4, gap: 6 },
    dateCard: { width: 50, height: 68, borderRadius: 12, borderWidth: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    dateCardWeekend: { borderColor: '#fca5a5' },
    dateCardSelected: { elevation: 3 },
    dateCardDayName: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    dateCardDayNum: { fontSize: 15, fontWeight: '900' },
    dateCardBadge: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6 },
    dateCardBadgeText: { fontSize: 9, fontWeight: '800' },

    // Metrics Row (3 Cards)
    metricsRow: { paddingHorizontal: 16, marginBottom: 16, gap: 10 },
    metricCard: { width: 148, minHeight: 98, borderRadius: 16, borderWidth: 1.5, padding: 12, justifyContent: 'space-between' },
    metricCardTitle: { fontSize: 9.5, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 },
    metricCardBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    metricIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    metricCardNumber: { fontSize: 24, fontWeight: '900' },
    metricCardSub: { fontSize: 10.5, fontWeight: '700' },

    // Day-Wise Content List
    dayWiseScroll: { flex: 1 },
    dayWiseContent: { paddingBottom: 50 },
    emptySessionsBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 24 },
    emptyCalendarIconBox: { width: 70, height: 70, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.03)', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
    emptySessionsTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
    emptySessionsSub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },

    daySessionsContainer: { paddingHorizontal: 16 },
    daySessionsHeader: { marginBottom: 10 },
    daySessionsTitle: { fontSize: 14, fontWeight: '900', color: '#64748b', textTransform: 'uppercase' },
    daySessionCard: { borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, elevation: 2 },
    daySessionCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    daySessionCardTitleBox: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
    therapyIconCircle: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    daySessionCardTherapy: { fontSize: 14, fontWeight: '900', flex: 1 },
    sessionStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    sessionStatusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
    daySessionCardDetailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    sessionDetailPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    sessionDetailText: { fontSize: 11, fontWeight: '700' },

    // Top Frozen Header (Matrix)
    topHeaderContainer: { flexDirection: 'row', zIndex: 20, elevation: 5 },
    topLeftCornerCell: { width: 170, height: 48, zIndex: 30, elevation: 6 },
    headerDateScroll: { flex: 1 },

    // Vertically Scrollable Body (Matrix)
    bodyVerticalScroll: { flex: 1 },
    tableFlexContainer: { flexDirection: 'row' },
    fixedLeftContainer: { width: 170, zIndex: 10, elevation: 4 },
    leftDataRow: { height: 110 },
    leftSummaryRow: { height: 58 },
    rightScroll: { flex: 1 },
    tableRow: { flexDirection: 'row' },

    // Cell Styles (Matrix)
    cellTherapyHeader: { width: 170, height: 48, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1 },
    cellDateHeader: { width: 130, height: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    headerText: { fontSize: 13, fontWeight: '900', color: '#64748b' },
    dateHeaderText: { fontSize: 11, fontWeight: '800', color: '#475569' },
    cellTherapy: { width: 170, height: 110, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1 },
    therapyTitleText: { fontSize: 12, fontWeight: '800' },
    cellData: { width: 130, height: 110, padding: 5, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    dashText: { fontSize: 14, fontWeight: '700' },
    sessionCard: { width: '100%', borderRadius: 8, padding: 5, borderWidth: 1, alignItems: 'center' },
    sessionCardUnconfirmed: { backgroundColor: '#fefce8', borderColor: '#fde047' },
    sessionCardConfirmed: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
    badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    badgeText: { fontSize: 8, fontWeight: '900', marginLeft: 3, textTransform: 'uppercase' },
    slotBox: { backgroundColor: '#fef08a', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, marginVertical: 2 },
    slotText: { fontSize: 9, fontWeight: '900', color: '#854d0e' },
    therapistText: { fontSize: 9, fontWeight: '700', color: '#475569', marginTop: 1, textAlign: 'center' },
    cellSummaryHeader: { width: 170, height: 58, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1 },
    summaryTitleText: { fontSize: 12, fontWeight: '900', color: '#0369a1' },
    summarySubtext: { fontSize: 10, fontWeight: '800', color: '#0284c7', marginTop: 2 },
    cellSummary: { width: 130, height: 58, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    summaryValueText: { fontSize: 14, fontWeight: '900', color: '#0369a1' },

    // Month-Wise Styles
    monthWiseScroll: { flex: 1 },
    monthWiseContent: { paddingHorizontal: 16, paddingBottom: 50 },
    annualMetricsCard: { borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1 },
    annualMetricsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    annualMetricsTitle: { fontSize: 14, fontWeight: '900', marginLeft: 8, color: '#4338ca' },
    annualMetricsGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    annualMetricItem: { flex: 1, alignItems: 'center' },
    annualMetricVal: { fontSize: 18, fontWeight: '900' },
    annualMetricLabel: { fontSize: 10, fontWeight: '700', marginTop: 2, textAlign: 'center' },
    annualMetricDivider: { width: 1, height: 24, backgroundColor: 'rgba(0,0,0,0.1)' },
    monthsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
    monthSummaryCard: { width: (width - 44) / 2, borderRadius: 18, padding: 14, borderWidth: 1, elevation: 2 },
    monthCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    monthPill: { width: 34, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    monthPillText: { fontSize: 11, fontWeight: '900' },
    monthCardTitle: { fontSize: 13, fontWeight: '800', flex: 1 },
    monthCardCountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    monthCountBox: {},
    monthCountNum: { fontSize: 20, fontWeight: '900' },
    monthCountSub: { fontSize: 10, fontWeight: '700' },
    monthMiniStats: { alignItems: 'flex-end', gap: 3 },
    miniStatRow: { flexDirection: 'row', alignItems: 'center' },
    miniStatConfirmed: { fontSize: 11, fontWeight: '800', color: '#15803d', marginLeft: 4 },
    miniStatPending: { fontSize: 11, fontWeight: '800', color: '#ca8a04', marginLeft: 4 },
    monthTherapyTags: { gap: 4, marginBottom: 10 },
    monthTherapyTag: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
    monthTherapyTagText: { fontSize: 9, fontWeight: '700', color: '#64748b' },
    moreTherapiesText: { fontSize: 9, fontWeight: '800', marginTop: 2 },
    noSessionMonthText: { fontSize: 11, fontStyle: 'italic', marginBottom: 10 },
    monthCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 8 },
    viewDayWiseText: { fontSize: 11, fontWeight: '800' }
});
