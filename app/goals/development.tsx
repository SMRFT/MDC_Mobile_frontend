import React, { useState, useEffect, useMemo } from 'react';
import {
    View, StyleSheet, ScrollView, TouchableOpacity, Modal,
    ActivityIndicator, Alert, FlatList, Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { searchDevelopmentalGoals } from '../../scripts/goalsApi';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTheme } from '@/context/ThemeContext';
import PieChartCard, { PieChartSliceData } from '@/components/PieChartCard';

const STATUS_MAP: any = {
    'N': { label: 'Not Started', color: '#64748b', bg: '#f1f5f9' },
    'E': { label: 'Emerging', color: '#d97706', bg: '#fef3c7' },
    'D': { label: 'Developing', color: '#2563eb', bg: '#dbeafe' },
    'A': { label: 'Achieved', color: '#15803d', bg: '#dcfce7' },
    'Not Started': { label: 'Not Started', color: '#64748b', bg: '#f1f5f9' },
    'Emerging': { label: 'Emerging', color: '#d97706', bg: '#fef3c7' },
    'Developing': { label: 'Developing', color: '#2563eb', bg: '#dbeafe' },
    'Achieved': { label: 'Achieved', color: '#15803d', bg: '#dcfce7' },
    'Pending': { label: 'Pending', color: '#64748b', bg: '#f1f5f9' }
};

const THERAPY_MAP: Record<string, string> = {
    'THP001': 'Occupational Therapy',
    'THP002': 'Physiotherapy',
    'THP003': 'Speech Therapy',
    'THP004': 'Applied Behavior Analysis (ABA)',
    'THP005': 'Special Education',
    'THP006': 'Social Training Class',
    'THP007': 'Only Group Therapy Session',
    'THP008': 'Curriculum Class',
    'THP009': 'Cognitive Therapy',
    'THP010': 'Online Therapy (Speech)'
};

const DOMAIN_MAP: Record<string, string> = {
    'AT001': 'Social Skills',
    'AT002': 'Cognition',
    'AT003': 'Play',
    'AT004': 'Behaviour',
    'AT005': 'Social Skills - Adult or Peers'
};

const LEVEL_MAP: Record<string, string> = {
    'LVL01': 'Level 1',
    'LVL02': 'Level 2',
    'LVL03': 'Level 3',
    'LVL04': 'Level 4'
};

const getTherapyName = (g: any) => {
    if (g?.therapy_name && g.therapy_name !== g.therapy) return g.therapy_name;
    return THERAPY_MAP[g?.therapy] || g?.therapy_name || g?.therapy || '';
};

const getDomainName = (g: any) => {
    if (g?.domain_name && g.domain_name !== g.domain) return g.domain_name;
    return DOMAIN_MAP[g?.domain] || g?.domain_name || g?.domain || '';
};

const getLevelName = (g: any) => {
    if (g?.level_name && g.level_name !== g.level) return g.level_name;
    return LEVEL_MAP[g?.level] || g?.level_name || g?.level || '';
};

export default function DevelopmentalGoalsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const regNoParam = params.regNo as string;
    const { resolvedTheme } = useTheme();

    const [regNo, setRegNo] = useState(regNoParam || '');
    const [goalsList, setGoalsList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedTherapy, setSelectedTherapy] = useState('All');

    // Theme tokens
    const backgroundColor = useThemeColor({}, 'background');
    const cardBg = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const textColor = useThemeColor({}, 'text');
    const primaryColor = useThemeColor({}, 'primary');

    useEffect(() => {
        if (regNo) {
            handleSearch();
        }
    }, [regNo]);

    const handleSearch = async () => {
        if (!regNo.trim()) return;
        setLoading(true);
        try {
            const data = await searchDevelopmentalGoals(regNo);
            setGoalsList(data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to fetch developmental records.");
        } finally {
            setLoading(false);
        }
    };

    // Extract unique therapy types
    const availableTherapies = useMemo(() => {
        const set = new Set<string>();
        goalsList.forEach(item => {
            if (Array.isArray(item.development_goals)) {
                item.development_goals.forEach((g: any) => {
                    const tName = getTherapyName(g);
                    if (tName) set.add(tName);
                });
            }
        });
        return ['All', ...Array.from(set)];
    }, [goalsList]);

    // Filter goals list
    const filteredGoalsList = useMemo(() => {
        if (selectedTherapy === 'All') return goalsList;
        return goalsList.filter(item => {
            if (Array.isArray(item.development_goals)) {
                return item.development_goals.some((g: any) => getTherapyName(g) === selectedTherapy);
            }
            return false;
        });
    }, [goalsList, selectedTherapy]);

    // Calculate Pie Chart metrics and status distribution
    const { pieChartData, totalGoalsCount, averageImprovement } = useMemo(() => {
        let achieved = 0;
        let developing = 0;
        let emerging = 0;
        let notStarted = 0;
        let totalPercent = 0;
        let goalsWithPercent = 0;

        filteredGoalsList.forEach(item => {
            const goals = Array.isArray(item.development_goals) ? item.development_goals : [];
            const activeGoals = selectedTherapy === 'All' 
                ? goals 
                : goals.filter((g: any) => getTherapyName(g) === selectedTherapy);

            activeGoals.forEach((g: any) => {
                const s = (g?.status || '').toLowerCase().trim();
                if (s === 'achieved' || s === 'a') achieved++;
                else if (s === 'developing' || s === 'd') developing++;
                else if (s === 'emerging' || s === 'e') emerging++;
                else notStarted++;

                if (typeof g?.percentage === 'number') {
                    totalPercent += g.percentage;
                    goalsWithPercent++;
                }
            });
        });

        const total = achieved + developing + emerging + notStarted;
        const avgPercentage = goalsWithPercent > 0 ? (totalPercent / goalsWithPercent) : undefined;

        const data: PieChartSliceData[] = [
            {
                key: 'Achieved',
                label: 'Achieved',
                count: achieved,
                color: '#15803d',
                lightBg: '#dcfce7',
                darkBg: '#14532d'
            },
            {
                key: 'Developing',
                label: 'Developing',
                count: developing,
                color: '#2563eb',
                lightBg: '#dbeafe',
                darkBg: '#1e3a8a'
            },
            {
                key: 'Emerging',
                label: 'Emerging',
                count: emerging,
                color: '#d97706',
                lightBg: '#fef3c7',
                darkBg: '#78350f'
            },
            {
                key: 'Not Started',
                label: 'Not Started',
                count: notStarted,
                color: '#64748b',
                lightBg: '#f1f5f9',
                darkBg: '#334155'
            },
        ];

        return { pieChartData: data, totalGoalsCount: total, averageImprovement: avgPercentage };
    }, [filteredGoalsList, selectedTherapy]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const info = STATUS_MAP[status] || { label: status, color: '#64748b', bg: '#f1f5f9' };
        return (
            <View style={[styles.statusBadge, { backgroundColor: info.bg }]}>
                <ThemedText style={[styles.statusText, { color: info.color }]}>{info.label}</ThemedText>
            </View>
        );
    };

    const renderGoalItem = ({ item }: { item: any }) => {
        const allGoals = item.development_goals || [];
        const displayedGoals = selectedTherapy === 'All'
            ? allGoals
            : allGoals.filter((g: any) => getTherapyName(g) === selectedTherapy);

        // Therapies present in this record
        const distinctTherapies = [...new Set(allGoals.map((g: any) => getTherapyName(g)).filter(Boolean))] as string[];
        const therapistDisplay = item.therapist_name || item.created_by_name || item.lastmodified_by_name || '';

        return (
            <TouchableOpacity 
                style={[styles.card, { backgroundColor: cardBg, borderColor: borderColor }]} 
                onPress={() => { setSelectedGoal(item); setModalVisible(true); }}
                activeOpacity={0.85}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.dateBadge, { backgroundColor: resolvedTheme === 'dark' ? '#1e1b4b' : '#eff6ff', borderColor: '#bfdbfe' }]}>
                        <Ionicons name="calendar-outline" size={14} color="#2563eb" />
                        <ThemedText style={styles.dateText}>{formatDate(item.date)}</ThemedText>
                    </View>

                    {therapistDisplay ? (
                        <View style={[styles.therapistBadgePill, { backgroundColor: resolvedTheme === 'dark' ? '#1e1b4b' : '#eff6ff', borderColor: '#bfdbfe' }]}>
                            <Ionicons name="person-circle-outline" size={14} color="#4338ca" style={{ marginRight: 4 }} />
                            <ThemedText style={styles.therapistBadgeText} numberOfLines={1}>
                                {therapistDisplay}
                            </ThemedText>
                        </View>
                    ) : null}

                    <Ionicons name="chevron-forward" size={18} color={primaryColor} />
                </View>

                {/* Therapy Badges */}
                {distinctTherapies.length > 0 && (
                    <View style={styles.therapyBadgesRow}>
                        {distinctTherapies.map((tName, tIdx) => (
                            <View key={tIdx} style={[styles.therapyBadgePill, { backgroundColor: resolvedTheme === 'dark' ? '#312e81' : '#e0e7ff', borderColor: '#818cf8' }]}>
                                <Ionicons name="medical-outline" size={11} color="#4338ca" style={{ marginRight: 4 }} />
                                <ThemedText style={styles.therapyBadgePillText}>{tName}</ThemedText>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.cardBody}>
                    <ThemedText style={styles.previewLabel}>
                        Goals ({displayedGoals.length})
                    </ThemedText>
                    {displayedGoals.slice(0, 3).map((g: any, i: number) => (
                        <View key={i} style={styles.goalRowPreviewContainer}>
                            <View style={styles.goalRowPreview}>
                                <View style={styles.goalInfo}>
                                    <View style={[styles.dot, { backgroundColor: STATUS_MAP[g.status]?.color || '#cbd5e1' }]} />
                                    <ThemedText style={styles.previewText} numberOfLines={1}>
                                        {g.goal}
                                    </ThemedText>
                                </View>
                                <StatusBadge status={g.status} />
                            </View>
                            {(getTherapyName(g) || getDomainName(g) || getLevelName(g) || g.therapist_name || item.therapist_name) ? (
                                <View style={styles.previewMetaRow}>
                                    {[
                                        getTherapyName(g),
                                        getDomainName(g),
                                        getLevelName(g)
                                    ].filter(Boolean).map((meta: string, metaIdx: number) => (
                                        <View key={metaIdx} style={[styles.miniBadge, { backgroundColor: resolvedTheme === 'dark' ? '#334155' : '#f1f5f9' }]}>
                                            <ThemedText style={styles.miniBadgeText}>{meta}</ThemedText>
                                        </View>
                                    ))}
                                    {(g.therapist_name || item.therapist_name || therapistDisplay) ? (
                                        <View style={[styles.miniBadge, { backgroundColor: resolvedTheme === 'dark' ? '#312e81' : '#e0e7ff', flexDirection: 'row', alignItems: 'center' }]}>
                                            <Ionicons name="person-circle-outline" size={10} color="#4338ca" style={{ marginRight: 2 }} />
                                            <ThemedText style={[styles.miniBadgeText, { color: '#4338ca', fontWeight: '700' }]}>
                                                {g.therapist_name || item.therapist_name || therapistDisplay}
                                            </ThemedText>
                                        </View>
                                    ) : null}
                                </View>
                            ) : null}
                        </View>
                    ))}
                    {displayedGoals.length > 3 && (
                        <ThemedText style={{ fontSize: 11, fontWeight: '800', color: primaryColor, marginLeft: 18, marginTop: 4 }}>
                            +{displayedGoals.length - 3} more goals...
                        </ThemedText>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ThemedView style={styles.container}>
            <LinearGradient 
                colors={resolvedTheme === 'dark' ? ['#1e1b4b', '#312e81'] : ['#4338ca', '#6366f1']} 
                style={styles.header}
            >
                <View style={styles.nav}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={26} color="white" />
                    </TouchableOpacity>
                    <ThemedText style={styles.title}>Developmental Goals</ThemedText>
                    <View style={{ width: 44 }} />
                </View>
                {regNo ? <ThemedText style={styles.regDisplay}>{regNo}</ThemedText> : null}
            </LinearGradient>

            <View style={styles.main}>
                {/* Therapy Filter Tabs */}
                {availableTherapies.length > 1 && (
                    <View style={styles.filterSection}>
                        <View style={styles.filterHeader}>
                            <Ionicons name="filter" size={15} color={textSecondary} />
                            <ThemedText style={[styles.filterTitle, { color: textSecondary }]}>
                                Filter by Therapy Type
                            </ThemedText>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.therapyFilterScroll}
                        >
                            {availableTherapies.map((tKey) => {
                                const isSelected = selectedTherapy === tKey;
                                return (
                                    <TouchableOpacity
                                        key={tKey}
                                        onPress={() => setSelectedTherapy(tKey)}
                                        style={[
                                            styles.therapyFilterBtn,
                                            { backgroundColor: isSelected ? '#4338ca' : cardBg, borderColor: isSelected ? '#4338ca' : borderColor }
                                        ]}
                                    >
                                        <Ionicons
                                            name={tKey === 'All' ? 'grid-outline' : 'medical-outline'}
                                            size={13}
                                            color={isSelected ? 'white' : '#4338ca'}
                                            style={{ marginRight: 5 }}
                                        />
                                        <ThemedText
                                            style={[
                                                styles.therapyFilterText,
                                                { color: isSelected ? 'white' : textColor, fontWeight: isSelected ? '900' : '700' }
                                            ]}
                                        >
                                            {tKey === 'All' ? 'All Therapies' : tKey}
                                        </ThemedText>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {loading ? (
                    <ActivityIndicator style={{ marginTop: 50 }} color="#4338ca" size="large" />
                ) : (
                    <FlatList
                        data={filteredGoalsList}
                        renderItem={renderGoalItem}
                        keyExtractor={(item, index) => item._id || index.toString()}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                            goalsList.length > 0 ? (
                                <PieChartCard
                                    title="Developmental Improvement"
                                    subtitle="Goals Status Distribution"
                                    data={pieChartData}
                                    totalGoals={totalGoalsCount}
                                    averagePercentage={averageImprovement}
                                    selectedFilter={selectedTherapy}
                                />
                            ) : null
                        }
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Ionicons name="rocket-outline" size={80} color={borderColor} />
                                <ThemedText style={[styles.emptyTitle, { color: textSecondary }]}>No Records Found.</ThemedText>
                                <ThemedText style={[styles.emptySub, { color: textSecondary }]}>
                                    {selectedTherapy !== 'All'
                                        ? `No goals found for "${selectedTherapy}".`
                                        : 'No developmental progress records available.'}
                                </ThemedText>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Modal */}
            <Modal visible={modalVisible} animationType="slide">
                <ThemedView style={styles.modalContainer}>
                    <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                        <ThemedText style={styles.modalTitle}>Progress Details</ThemedText>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                            <Ionicons name="close" size={28} color={textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                        <View style={[styles.modalMetaContainer, { backgroundColor: cardBg, borderColor }]}>
                            <View style={styles.modalDateInfo}>
                                <Ionicons name="calendar" size={16} color={primaryColor} />
                                <ThemedText style={styles.modalDate}>{formatDate(selectedGoal?.date)}</ThemedText>
                            </View>
                            {(selectedGoal?.therapist_name || selectedGoal?.created_by_name || selectedGoal?.lastmodified_by_name) ? (
                                <View style={[styles.modalTherapistBadge, { backgroundColor: resolvedTheme === 'dark' ? '#1e1b4b' : '#eff6ff', borderColor: '#bfdbfe' }]}>
                                    <Ionicons name="person-circle" size={16} color="#4338ca" style={{ marginRight: 5 }} />
                                    <ThemedText style={styles.modalTherapistText}>
                                        Therapist: {selectedGoal?.therapist_name || selectedGoal?.created_by_name || selectedGoal?.lastmodified_by_name}
                                    </ThemedText>
                                </View>
                            ) : null}
                        </View>

                        <ThemedText style={styles.sectionLabel}>Goal Progression</ThemedText>
                        
                        {selectedGoal?.development_goals?.map((g: any, i: number) => (
                            <View key={i} style={[styles.detailGoalCard, { backgroundColor: cardBg, borderColor: borderColor }]}>
                                <View style={styles.goalHeaderRow}>
                                    <View style={[styles.goalNo, { backgroundColor: primaryColor + '15' }]}>
                                        <ThemedText style={{ color: primaryColor, fontWeight: '900', fontSize: 12 }}>{i+1}</ThemedText>
                                    </View>
                                    <StatusBadge status={g.status} />
                                </View>
                                
                                <View style={styles.tagsContainer}>
                                    {getTherapyName(g) ? (
                                        <View style={[styles.tagBadge, { backgroundColor: resolvedTheme === 'dark' ? '#1e293b' : '#e0e7ff' }]}>
                                            <Ionicons name="medical-outline" size={12} color="#4338ca" />
                                            <ThemedText style={[styles.tagText, { color: '#4338ca' }]}>
                                                {getTherapyName(g)}
                                            </ThemedText>
                                        </View>
                                    ) : null}

                                    {getDomainName(g) ? (
                                        <View style={[styles.tagBadge, { backgroundColor: resolvedTheme === 'dark' ? '#1e293b' : '#fef3c7' }]}>
                                            <Ionicons name="grid-outline" size={12} color="#b45309" />
                                            <ThemedText style={[styles.tagText, { color: '#b45309' }]}>
                                                {getDomainName(g)}
                                            </ThemedText>
                                        </View>
                                    ) : null}

                                    {getLevelName(g) ? (
                                        <View style={[styles.tagBadge, { backgroundColor: resolvedTheme === 'dark' ? '#1e293b' : '#dcfce7' }]}>
                                            <Ionicons name="stats-chart-outline" size={12} color="#15803d" />
                                            <ThemedText style={[styles.tagText, { color: '#15803d' }]}>
                                                {getLevelName(g)}
                                            </ThemedText>
                                        </View>
                                    ) : null}

                                    {(() => {
                                        const goalTherapist = g?.therapist_name || g?.employee_name || g?.therapist || selectedGoal?.therapist_name || selectedGoal?.author_name || selectedGoal?.created_by_name;
                                        if (!goalTherapist) return null;
                                        return (
                                            <View style={[styles.tagBadge, { backgroundColor: resolvedTheme === 'dark' ? '#312e81' : '#e0e7ff' }]}>
                                                <Ionicons name="person-circle-outline" size={13} color="#4338ca" />
                                                <ThemedText style={[styles.tagText, { color: '#4338ca', fontWeight: '800' }]}>
                                                    Therapist: {goalTherapist}
                                                </ThemedText>
                                            </View>
                                        );
                                    })()}
                                </View>

                                <ThemedText style={styles.detailGoalText}>{g.goal}</ThemedText>
                                
                                {g.details && (
                                    <View style={styles.detailsBox}>
                                        <ThemedText style={styles.detailsLabel}>REMARKS / DETAILS</ThemedText>
                                        <ThemedText style={styles.detailsText}>{g.details}</ThemedText>
                                    </View>
                                )}
                            </View>
                        ))}
                        
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </ThemedView>
            </Modal>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '900', color: 'white' },
    regDisplay: { color: 'white', textAlign: 'center', marginTop: 15, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
    main: { flex: 1, marginTop: 10 },
    filterSection: { paddingHorizontal: 20, marginBottom: 12 },
    filterHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    filterTitle: { fontSize: 11, fontWeight: '900', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    therapyFilterScroll: { paddingRight: 10 },
    therapyFilterBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, marginRight: 8, borderWidth: 1 },
    therapyFilterText: { fontSize: 13 },
    list: { paddingBottom: 50 },
    card: { borderRadius: 24, padding: 20, marginHorizontal: 20, marginBottom: 18, borderLeftWidth: 8, borderLeftColor: '#4338ca', elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    dateBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
    dateText: { fontSize: 12, fontWeight: '800', marginLeft: 6, color: '#2563eb' },
    therapistBadgePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, maxWidth: '52%' },
    therapistBadgeText: { fontSize: 11, fontWeight: '800', color: '#4338ca' },
    therapyBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10, gap: 6 },
    therapyBadgePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
    therapyBadgePillText: { fontSize: 11, fontWeight: '800', color: '#4338ca' },
    cardBody: { marginBottom: 5 },
    previewLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 },
    goalRowPreviewContainer: { marginBottom: 10 },
    goalRowPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    previewMetaRow: { flexDirection: 'row', flexWrap: 'wrap', marginLeft: 18, marginTop: 2 },
    miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 6, marginBottom: 4 },
    miniBadgeText: { fontSize: 10, fontWeight: '700', color: '#64748b' },
    goalInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    previewText: { fontSize: 14, fontWeight: '700' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyTitle: { fontSize: 18, fontWeight: '900', marginTop: 15 },
    emptySub: { fontSize: 14, textAlign: 'center', marginTop: 8, color: '#94a3b8', paddingHorizontal: 40 },
    modalContainer: { flex: 1 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
    modalTitle: { fontSize: 20, fontWeight: '900' },
    closeBtn: { padding: 5 },
    modalScroll: { padding: 20 },
    modalMetaContainer: { borderRadius: 16, padding: 14, marginBottom: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
    modalDateInfo: { flexDirection: 'row', alignItems: 'center' },
    modalDate: { fontSize: 14, fontWeight: '800', marginLeft: 8 },
    modalTherapistBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
    modalTherapistText: { fontSize: 12, fontWeight: '800', color: '#4338ca' },
    sectionLabel: { fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1 },
    detailGoalCard: { borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1 },
    goalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, marginTop: 4 },
    tagBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginRight: 8, marginBottom: 6 },
    tagText: { fontSize: 11, fontWeight: '800', marginLeft: 5 },
    goalNo: { width: 28, height: 28, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    detailGoalText: { fontSize: 16, fontWeight: '700', lineHeight: 22, marginBottom: 12 },
    detailsBox: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12 },
    detailsLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', marginBottom: 5 },
    detailsText: { fontSize: 14, color: '#64748b', fontStyle: 'italic', lineHeight: 20 }
});
