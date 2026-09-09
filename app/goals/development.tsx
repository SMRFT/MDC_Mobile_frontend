import React, { useState, useEffect, useMemo } from 'react';
import {
    View, StyleSheet, ScrollView, TouchableOpacity, Modal,
    ActivityIndicator, Alert, FlatList, Dimensions, TextInput, Platform
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
import { TherapyPalette, GoalStatusPalette } from '@/constants/theme';

const { width } = Dimensions.get('window');

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; darkBg: string; icon: keyof typeof Ionicons.glyphMap }> = {
    'N': { label: 'Not Started', color: '#64748b', bg: '#f1f5f9', darkBg: '#1e293b', icon: 'ellipse-outline' },
    'E': { label: 'Emerging', color: '#f59e0b', bg: '#fef3c7', darkBg: '#78350f', icon: 'trending-up-outline' },
    'D': { label: 'Developing', color: '#0284c7', bg: '#e0f2fe', darkBg: '#082f49', icon: 'sync-outline' },
    'A': { label: 'Achieved', color: '#10b981', bg: '#d1fae5', darkBg: '#064e3b', icon: 'checkmark-circle-outline' },
    'Not Started': { label: 'Not Started', color: '#64748b', bg: '#f1f5f9', darkBg: '#1e293b', icon: 'ellipse-outline' },
    'Emerging': { label: 'Emerging', color: '#f59e0b', bg: '#fef3c7', darkBg: '#78350f', icon: 'trending-up-outline' },
    'Developing': { label: 'Developing', color: '#0284c7', bg: '#e0f2fe', darkBg: '#082f49', icon: 'sync-outline' },
    'Achieved': { label: 'Achieved', color: '#10b981', bg: '#d1fae5', darkBg: '#064e3b', icon: 'checkmark-circle-outline' },
    'Pending': { label: 'Pending', color: '#64748b', bg: '#f1f5f9', darkBg: '#1e293b', icon: 'time-outline' }
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

const getTherapyStyle = (name: string, isDark: boolean) => {
    const matchedKey = Object.keys(TherapyPalette).find(k => k.toLowerCase() === name.toLowerCase()) as keyof typeof TherapyPalette | undefined;
    if (matchedKey && TherapyPalette[matchedKey]) {
        const item = TherapyPalette[matchedKey];
        return {
            color: item.color,
            bg: isDark ? item.darkBg : item.bg,
            icon: item.icon
        };
    }
    return {
        color: '#4338ca',
        bg: isDark ? '#1e1b4b' : '#e0e7ff',
        icon: 'medical-outline' as const
    };
};

export default function DevelopmentalGoalsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const regNoParam = params.regNo as string;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const [regNo, setRegNo] = useState(regNoParam || '');
    const [goalsList, setGoalsList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedTherapy, setSelectedTherapy] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

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

    // Extract unique therapy types with counts
    const availableTherapies = useMemo(() => {
        const counts: Record<string, number> = {};
        let total = 0;

        goalsList.forEach(item => {
            if (Array.isArray(item.development_goals)) {
                item.development_goals.forEach((g: any) => {
                    const tName = getTherapyName(g) || 'General';
                    counts[tName] = (counts[tName] || 0) + 1;
                    total++;
                });
            }
        });

        const list = Object.keys(counts).map(name => ({
            name,
            count: counts[name]
        }));

        return [{ name: 'All', count: total }, ...list];
    }, [goalsList]);

    // Filter goals list
    const filteredGoalsList = useMemo(() => {
        let result = goalsList;

        if (selectedTherapy !== 'All') {
            result = result.filter(item => {
                if (Array.isArray(item.development_goals)) {
                    return item.development_goals.some((g: any) => getTherapyName(g) === selectedTherapy);
                }
                return false;
            });
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(item => {
                const authorMatch = (item.therapist_name || item.created_by_name || '').toLowerCase().includes(q);
                const dateMatch = (item.date || '').toLowerCase().includes(q);
                const goalsMatch = Array.isArray(item.development_goals) && item.development_goals.some((g: any) => 
                    (g.goal || '').toLowerCase().includes(q) ||
                    (getTherapyName(g) || '').toLowerCase().includes(q) ||
                    (g.therapist_name || '').toLowerCase().includes(q)
                );
                return authorMatch || dateMatch || goalsMatch;
            });
        }

        return result;
    }, [goalsList, selectedTherapy, searchQuery]);

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
                color: '#10b981',
                lightBg: '#dcfce7',
                darkBg: '#064e3b'
            },
            {
                key: 'Developing',
                label: 'Developing',
                count: developing,
                color: '#0284c7',
                lightBg: '#dbeafe',
                darkBg: '#082f49'
            },
            {
                key: 'Emerging',
                label: 'Emerging',
                count: emerging,
                color: '#f59e0b',
                lightBg: '#fef3c7',
                darkBg: '#78350f'
            },
            {
                key: 'Not Started',
                label: 'Not Started',
                count: notStarted,
                color: '#64748b',
                lightBg: '#f1f5f9',
                darkBg: '#1e293b'
            },
        ];

        return { pieChartData: data, totalGoalsCount: total, averageImprovement: avgPercentage };
    }, [filteredGoalsList, selectedTherapy]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        try {
            const d = new Date(clean);
            if (isNaN(d.getTime())) return clean;
            return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
            return clean;
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const info = STATUS_MAP[status] || { label: status, color: '#64748b', bg: '#f1f5f9', darkBg: '#1e293b', icon: 'ellipse-outline' as const };
        return (
            <View style={[styles.statusBadge, { backgroundColor: isDark ? info.darkBg : info.bg }]}>
                <Ionicons name={info.icon} size={11} color={info.color} style={{ marginRight: 4 }} />
                <ThemedText style={[styles.statusText, { color: info.color }]}>{info.label}</ThemedText>
            </View>
        );
    };

    const renderGoalItem = ({ item, index }: { item: any; index: number }) => {
        const allGoals = item.development_goals || [];
        const displayedGoals = selectedTherapy === 'All'
            ? allGoals
            : allGoals.filter((g: any) => getTherapyName(g) === selectedTherapy);

        // Distinct therapies present
        const distinctTherapies = [...new Set(allGoals.map((g: any) => getTherapyName(g)).filter(Boolean))] as string[];
        const therapistDisplay = item.therapist_name || item.created_by_name || item.lastmodified_by_name || '';

        // Calculate achieved count for this record
        const achievedCount = displayedGoals.filter((g: any) => {
            const s = (g?.status || '').toLowerCase();
            return s === 'achieved' || s === 'a';
        }).length;
        const progressPercent = displayedGoals.length > 0 ? Math.round((achievedCount / displayedGoals.length) * 100) : 0;

        return (
            <TouchableOpacity 
                style={[
                    styles.card, 
                    { 
                        backgroundColor: cardBg, 
                        borderColor: isDark ? 'rgba(52, 211, 153, 0.2)' : borderColor 
                    }
                ]} 
                onPress={() => { setSelectedGoal(item); setModalVisible(true); }}
                activeOpacity={0.88}
            >
                {/* Glowing Left Accent */}
                <LinearGradient
                    colors={['#059669', '#10b981', '#4338ca']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.cardAccentBar}
                />

                <View style={styles.cardInner}>
                    {/* Header Row: Date Badge + Therapist Pill */}
                    <View style={styles.cardHeader}>
                        <View style={[styles.dateBadge, { backgroundColor: isDark ? '#1e293b' : '#f0fdf4', borderColor: isDark ? '#064e3b' : '#bbf7d0' }]}>
                            <Ionicons name="calendar" size={13} color="#059669" />
                            <ThemedText style={styles.dateText}>{formatDate(item.date)}</ThemedText>
                        </View>

                        {therapistDisplay ? (
                            <View style={[styles.therapistBadgePill, { backgroundColor: isDark ? '#1e1b4b' : '#eef2ff', borderColor: isDark ? '#312e81' : '#c7d2fe' }]}>
                                <Ionicons name="person-circle" size={14} color="#4f46e5" style={{ marginRight: 4 }} />
                                <ThemedText style={styles.therapistBadgeText} numberOfLines={1}>
                                    {therapistDisplay}
                                </ThemedText>
                            </View>
                        ) : null}

                        <View style={[styles.chevronWrap, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                            <Ionicons name="chevron-forward" size={16} color={primaryColor} />
                        </View>
                    </View>

                    {/* Distinct Therapy Badges */}
                    {distinctTherapies.length > 0 && (
                        <View style={styles.therapyBadgesRow}>
                            {distinctTherapies.map((tName, tIdx) => {
                                const style = getTherapyStyle(tName, isDark);
                                return (
                                    <View key={tIdx} style={[styles.therapyBadgePill, { backgroundColor: style.bg }]}>
                                        <Ionicons name={style.icon} size={11} color={style.color} style={{ marginRight: 4 }} />
                                        <ThemedText style={[styles.therapyBadgePillText, { color: style.color }]}>{tName}</ThemedText>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Progress Micro-Bar */}
                    {displayedGoals.length > 0 && (
                        <View style={styles.progressContainer}>
                            <View style={styles.progressLabelRow}>
                                <ThemedText style={styles.progressLabel}>
                                    Milestones Achieved: {achievedCount}/{displayedGoals.length}
                                </ThemedText>
                                <ThemedText style={[styles.progressPercent, { color: '#059669' }]}>
                                    {progressPercent}%
                                </ThemedText>
                            </View>
                            <View style={[styles.progressBarTrack, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
                                <LinearGradient
                                    colors={['#10b981', '#059669']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
                                />
                            </View>
                        </View>
                    )}

                    {/* Goal Previews */}
                    <View style={styles.cardBody}>
                        {displayedGoals.slice(0, 3).map((g: any, i: number) => {
                            const goalTherapist = g?.therapist_name || g?.employee_name || g?.therapist || therapistDisplay;
                            const tStyle = getTherapyStyle(getTherapyName(g) || 'General', isDark);

                            return (
                                <View key={i} style={[styles.goalRowPreviewContainer, { borderBottomColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                                    <View style={styles.goalRowPreview}>
                                        <View style={[styles.stepCircle, { backgroundColor: isDark ? '#1e1b4b' : '#eff6ff', borderColor: isDark ? '#312e81' : '#bfdbfe' }]}>
                                            <ThemedText style={styles.stepCircleText}>{i + 1}</ThemedText>
                                        </View>
                                        <ThemedText style={styles.previewText} numberOfLines={2}>
                                            {g.goal}
                                        </ThemedText>
                                        <StatusBadge status={g.status} />
                                    </View>

                                    {/* Meta pills row */}
                                    <View style={styles.previewMetaRow}>
                                        {getTherapyName(g) ? (
                                            <View style={[styles.miniBadge, { backgroundColor: tStyle.bg }]}>
                                                <Ionicons name={tStyle.icon} size={9} color={tStyle.color} style={{ marginRight: 3 }} />
                                                <ThemedText style={[styles.miniBadgeText, { color: tStyle.color }]}>{getTherapyName(g)}</ThemedText>
                                            </View>
                                        ) : null}

                                        {getDomainName(g) ? (
                                            <View style={[styles.miniBadge, { backgroundColor: isDark ? '#78350f33' : '#fef3c7' }]}>
                                                <ThemedText style={[styles.miniBadgeText, { color: '#d97706' }]}>{getDomainName(g)}</ThemedText>
                                            </View>
                                        ) : null}

                                        {getLevelName(g) ? (
                                            <View style={[styles.miniBadge, { backgroundColor: isDark ? '#064e3b33' : '#dcfce7' }]}>
                                                <ThemedText style={[styles.miniBadgeText, { color: '#10b981' }]}>{getLevelName(g)}</ThemedText>
                                            </View>
                                        ) : null}

                                        {goalTherapist ? (
                                            <View style={[styles.miniBadge, { backgroundColor: isDark ? '#1e1b4b' : '#eef2ff' }]}>
                                                <Ionicons name="person-circle-outline" size={10} color="#4f46e5" style={{ marginRight: 2 }} />
                                                <ThemedText style={[styles.miniBadgeText, { color: '#4f46e5', fontWeight: '800' }]}>
                                                    {goalTherapist}
                                                </ThemedText>
                                            </View>
                                        ) : null}
                                    </View>
                                </View>
                            );
                        })}

                        {displayedGoals.length > 3 && (
                            <View style={styles.moreGoalsRow}>
                                <ThemedText style={[styles.moreGoalsText, { color: primaryColor }]}>
                                    +{displayedGoals.length - 3} more goals in this record
                                </ThemedText>
                                <Ionicons name="arrow-forward-circle-outline" size={14} color={primaryColor} />
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ThemedView style={styles.container}>
            {/* Header with Emerald Gradient */}
            <LinearGradient 
                colors={isDark ? ['#0f172a', '#134e4a', '#064e3b'] : ['#059669', '#10b981', '#047857']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.nav}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleWrap}>
                        <ThemedText style={styles.title}>Developmental Goals</ThemedText>
                        <ThemedText style={styles.subTitle}>Milestone Progression Tracking</ThemedText>
                    </View>
                    <TouchableOpacity onPress={handleSearch} style={styles.refreshBtn}>
                        <Ionicons name="refresh-outline" size={20} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Patient Reg Pill + Total Metric */}
                <View style={styles.headerStatsRow}>
                    {regNo ? (
                        <View style={styles.regBadge}>
                            <Ionicons name="medical" size={12} color="#a7f3d0" />
                            <ThemedText style={styles.regDisplay}>{regNo}</ThemedText>
                        </View>
                    ) : null}
                    <View style={styles.statCountBadge}>
                        <Ionicons name="sparkles" size={12} color="#fef08a" />
                        <ThemedText style={styles.statCountText}>
                            {totalGoalsCount} {totalGoalsCount === 1 ? 'Goal' : 'Goals'} Tracked
                        </ThemedText>
                    </View>
                </View>

                {/* Search Input Bar */}
                <View style={[styles.searchBarWrap, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.2)' }]}>
                    <Ionicons name="search" size={16} color="white" style={{ opacity: 0.8 }} />
                    <TextInput
                        placeholder="Search by goal, therapist or date..."
                        placeholderTextColor="rgba(255,255,255,0.7)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchInput}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color="white" />
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>

            <View style={styles.main}>
                {/* Therapy Filter Ribbon */}
                {availableTherapies.length > 1 && (
                    <View style={styles.filterSection}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.therapyFilterScroll}
                        >
                            {availableTherapies.map((tab) => {
                                const isSelected = selectedTherapy === tab.name;
                                const tStyle = tab.name === 'All' 
                                    ? { color: '#059669', bg: '#ecfdf5', icon: 'grid-outline' as const }
                                    : getTherapyStyle(tab.name, isDark);

                                return (
                                    <TouchableOpacity
                                        key={tab.name}
                                        onPress={() => setSelectedTherapy(tab.name)}
                                        style={[
                                            styles.therapyFilterBtn,
                                            { 
                                                backgroundColor: isSelected 
                                                    ? (isDark ? '#059669' : '#047857') 
                                                    : (isDark ? '#1e293b' : cardBg), 
                                                borderColor: isSelected 
                                                    ? '#10b981' 
                                                    : borderColor 
                                            }
                                        ]}
                                    >
                                        <Ionicons
                                            name={tab.name === 'All' ? 'grid-outline' : tStyle.icon}
                                            size={13}
                                            color={isSelected ? 'white' : tStyle.color}
                                            style={{ marginRight: 6 }}
                                        />
                                        <ThemedText
                                            style={[
                                                styles.therapyFilterText,
                                                { 
                                                    color: isSelected ? 'white' : textColor, 
                                                    fontWeight: isSelected ? '900' : '700' 
                                                }
                                            ]}
                                        >
                                            {tab.name === 'All' ? 'All Therapies' : tab.name}
                                        </ThemedText>
                                        <View style={[
                                            styles.tabCountPill, 
                                            { backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : (isDark ? '#334155' : '#f1f5f9') }
                                        ]}>
                                            <ThemedText style={[styles.tabCountText, { color: isSelected ? 'white' : textSecondary }]}>
                                                {tab.count}
                                            </ThemedText>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color="#059669" size="large" />
                        <ThemedText style={[styles.loadingText, { color: textSecondary }]}>
                            Fetching developmental milestones...
                        </ThemedText>
                    </View>
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
                                    title="Developmental Progress"
                                    subtitle="Current Milestone Distribution"
                                    data={pieChartData}
                                    totalGoals={totalGoalsCount}
                                    averagePercentage={averageImprovement}
                                    selectedFilter={selectedTherapy}
                                />
                            ) : null
                        }
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <LinearGradient
                                    colors={isDark ? ['#1e293b', '#0f172a'] : ['#ecfdf5', '#d1fae5']}
                                    style={styles.emptyIconCircle}
                                >
                                    <Ionicons name="rocket-outline" size={48} color="#059669" />
                                </LinearGradient>
                                <ThemedText style={styles.emptyTitle}>No Milestones Found</ThemedText>
                                <ThemedText style={[styles.emptySub, { color: textSecondary }]}>
                                    {selectedTherapy !== 'All'
                                        ? `No goals logged under "${selectedTherapy}".`
                                        : 'No developmental goals recorded for this patient yet.'}
                                </ThemedText>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Comprehensive Milestone Details Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <ThemedView style={[styles.modalContent, { backgroundColor: cardBg }]}>
                        <View style={styles.modalHandle} />

                        {/* Modal Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                            <View>
                                <ThemedText style={styles.modalTitle}>Goal Progression Details</ThemedText>
                                <ThemedText style={[styles.modalSubTitle, { color: textSecondary }]}>
                                    {formatDate(selectedGoal?.date)}
                                </ThemedText>
                            </View>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={textColor} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            {/* Therapist & Date Banner */}
                            <View style={[styles.modalMetaContainer, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor }]}>
                                <View style={styles.modalDateInfo}>
                                    <Ionicons name="calendar-outline" size={16} color="#059669" />
                                    <ThemedText style={styles.modalDate}>{formatDate(selectedGoal?.date)}</ThemedText>
                                </View>
                                {(selectedGoal?.therapist_name || selectedGoal?.created_by_name || selectedGoal?.lastmodified_by_name) ? (
                                    <View style={[styles.modalTherapistBadge, { backgroundColor: isDark ? '#1e1b4b' : '#eef2ff', borderColor: isDark ? '#312e81' : '#c7d2fe' }]}>
                                        <Ionicons name="person-circle" size={16} color="#4f46e5" style={{ marginRight: 5 }} />
                                        <ThemedText style={styles.modalTherapistText}>
                                            {selectedGoal?.therapist_name || selectedGoal?.created_by_name || selectedGoal?.lastmodified_by_name}
                                        </ThemedText>
                                    </View>
                                ) : null}
                            </View>

                            <ThemedText style={[styles.sectionLabel, { color: textSecondary }]}>
                                Milestones & Subgoals ({selectedGoal?.development_goals?.length || 0})
                            </ThemedText>
                            
                            {selectedGoal?.development_goals?.map((g: any, i: number) => {
                                const tStyle = getTherapyStyle(getTherapyName(g) || 'General', isDark);
                                const goalTherapist = g?.therapist_name || g?.employee_name || g?.therapist || selectedGoal?.therapist_name || selectedGoal?.author_name || selectedGoal?.created_by_name;

                                return (
                                    <View key={i} style={[styles.detailGoalCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: borderColor }]}>
                                        <View style={styles.goalHeaderRow}>
                                            <View style={[styles.goalNo, { backgroundColor: isDark ? '#064e3b' : '#dcfce7' }]}>
                                                <ThemedText style={{ color: '#059669', fontWeight: '900', fontSize: 13 }}>#{i + 1}</ThemedText>
                                            </View>
                                            <StatusBadge status={g.status} />
                                        </View>
                                        
                                        {/* Tags Row */}
                                        <View style={styles.tagsContainer}>
                                            {getTherapyName(g) ? (
                                                <View style={[styles.tagBadge, { backgroundColor: tStyle.bg }]}>
                                                    <Ionicons name={tStyle.icon} size={12} color={tStyle.color} />
                                                    <ThemedText style={[styles.tagText, { color: tStyle.color }]}>
                                                        {getTherapyName(g)}
                                                    </ThemedText>
                                                </View>
                                            ) : null}

                                            {getDomainName(g) ? (
                                                <View style={[styles.tagBadge, { backgroundColor: isDark ? '#78350f44' : '#fef3c7' }]}>
                                                    <Ionicons name="grid-outline" size={12} color="#d97706" />
                                                    <ThemedText style={[styles.tagText, { color: '#d97706' }]}>
                                                        {getDomainName(g)}
                                                    </ThemedText>
                                                </View>
                                            ) : null}

                                            {getLevelName(g) ? (
                                                <View style={[styles.tagBadge, { backgroundColor: isDark ? '#064e3b44' : '#dcfce7' }]}>
                                                    <Ionicons name="stats-chart-outline" size={12} color="#10b981" />
                                                    <ThemedText style={[styles.tagText, { color: '#10b981' }]}>
                                                        {getLevelName(g)}
                                                    </ThemedText>
                                                </View>
                                            ) : null}

                                            {goalTherapist ? (
                                                <View style={[styles.tagBadge, { backgroundColor: isDark ? '#1e1b4b' : '#eef2ff' }]}>
                                                    <Ionicons name="person-circle-outline" size={13} color="#4f46e5" />
                                                    <ThemedText style={[styles.tagText, { color: '#4f46e5', fontWeight: '800' }]}>
                                                        Therapist: {goalTherapist}
                                                    </ThemedText>
                                                </View>
                                            ) : null}
                                        </View>

                                        <ThemedText style={styles.detailGoalText}>{g.goal}</ThemedText>
                                        
                                        {g.details && (
                                            <View style={[styles.detailsBox, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
                                                <View style={styles.remarksHeader}>
                                                    <Ionicons name="document-text-outline" size={13} color="#059669" />
                                                    <ThemedText style={styles.detailsLabel}>CLINICAL REMARKS & EVALUATION</ThemedText>
                                                </View>
                                                <ThemedText style={[styles.detailsText, { color: textColor }]}>{g.details}</ThemedText>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                            
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </ThemedView>
                </View>
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
    nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { 
        width: 42, 
        height: 42, 
        borderRadius: 21, 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    refreshBtn: {
        width: 42, 
        height: 42, 
        borderRadius: 21, 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    headerTitleWrap: { alignItems: 'center' },
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
    regBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
        gap: 6
    },
    regDisplay: { color: 'white', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
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
    searchBarWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 10 : 6,
        borderRadius: 16,
        gap: 8
    },
    searchInput: {
        flex: 1,
        color: 'white',
        fontSize: 14,
        fontWeight: '600'
    },
    main: { flex: 1, marginTop: 12 },
    filterSection: { marginBottom: 12 },
    therapyFilterScroll: { paddingHorizontal: 20, gap: 8 },
    therapyFilterBtn: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingLeft: 12,
        paddingRight: 6,
        paddingVertical: 8, 
        borderRadius: 16, 
        borderWidth: 1 
    },
    therapyFilterText: { fontSize: 12.5 },
    tabCountPill: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8
    },
    tabCountText: { fontSize: 11, fontWeight: '800' },
    loadingContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    loadingText: { marginTop: 14, fontSize: 14, fontWeight: '600' },
    list: { paddingBottom: 60 },
    card: { 
        borderRadius: 24, 
        marginHorizontal: 20, 
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
    cardHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 12 
    },
    dateBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 10, 
        paddingVertical: 5, 
        borderRadius: 12, 
        borderWidth: 1,
        gap: 6 
    },
    dateText: { fontSize: 12, fontWeight: '800', color: '#059669' },
    therapistBadgePill: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 10, 
        paddingVertical: 5, 
        borderRadius: 12, 
        borderWidth: 1, 
        maxWidth: '48%' 
    },
    therapistBadgeText: { fontSize: 11.5, fontWeight: '800', color: '#4f46e5' },
    chevronWrap: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center'
    },
    therapyBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, gap: 6 },
    therapyBadgePill: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 10, 
        paddingVertical: 4, 
        borderRadius: 10 
    },
    therapyBadgePillText: { fontSize: 11, fontWeight: '800' },
    progressContainer: {
        marginBottom: 14
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6
    },
    progressLabel: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#64748b'
    },
    progressPercent: {
        fontSize: 12,
        fontWeight: '900'
    },
    progressBarTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3
    },
    cardBody: { marginTop: 4 },
    goalRowPreviewContainer: { 
        paddingVertical: 10, 
        borderBottomWidth: 1 
    },
    goalRowPreview: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 6 
    },
    stepCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    stepCircleText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#2563eb'
    },
    previewText: { 
        fontSize: 13.5, 
        fontWeight: '700', 
        flex: 1, 
        marginRight: 10,
        lineHeight: 18
    },
    previewMetaRow: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        marginLeft: 32, 
        marginTop: 2, 
        gap: 6 
    },
    miniBadge: { 
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7, 
        paddingVertical: 3, 
        borderRadius: 8 
    },
    miniBadgeText: { fontSize: 10.5, fontWeight: '700' },
    moreGoalsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        gap: 6
    },
    moreGoalsText: {
        fontSize: 12,
        fontWeight: '800'
    },
    statusBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: 8 
    },
    statusText: { fontSize: 10.5, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3 },
    empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
    emptyIconCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    emptyTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
    emptySub: { fontSize: 13.5, textAlign: 'center', marginTop: 6, lineHeight: 20 },
    
    // Modal Styling
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '90%',
        paddingBottom: 20
    },
    modalHandle: {
        width: 44,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#cbd5e1',
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8
    },
    modalHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 22, 
        paddingVertical: 14, 
        borderBottomWidth: 1 
    },
    modalTitle: { fontSize: 19, fontWeight: '900' },
    modalSubTitle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    closeBtn: { 
        width: 36, 
        height: 36, 
        borderRadius: 18, 
        backgroundColor: 'rgba(100,116,139,0.12)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    modalScroll: { paddingHorizontal: 22, paddingTop: 16 },
    modalMetaContainer: { 
        borderRadius: 18, 
        padding: 14, 
        marginBottom: 20, 
        borderWidth: 1, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        flexWrap: 'wrap', 
        gap: 8 
    },
    modalDateInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    modalDate: { fontSize: 13.5, fontWeight: '800' },
    modalTherapistBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 10, 
        paddingVertical: 5, 
        borderRadius: 12, 
        borderWidth: 1 
    },
    modalTherapistText: { fontSize: 12, fontWeight: '800', color: '#4f46e5' },
    sectionLabel: { 
        fontSize: 12, 
        fontWeight: '900', 
        textTransform: 'uppercase', 
        marginBottom: 14, 
        letterSpacing: 0.8 
    },
    detailGoalCard: { 
        borderRadius: 20, 
        padding: 18, 
        marginBottom: 14, 
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8
    },
    goalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, gap: 6 },
    tagBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 5 },
    tagText: { fontSize: 11, fontWeight: '800' },
    goalNo: { width: 32, height: 32, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    detailGoalText: { fontSize: 15, fontWeight: '700', lineHeight: 22, marginBottom: 12 },
    detailsBox: { 
        borderRadius: 14, 
        padding: 14, 
        borderWidth: 1,
        marginTop: 4 
    },
    remarksHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6
    },
    detailsLabel: { fontSize: 10.5, fontWeight: '900', color: '#059669', letterSpacing: 0.5 },
    detailsText: { fontSize: 13.5, lineHeight: 20, fontWeight: '500' }
});

