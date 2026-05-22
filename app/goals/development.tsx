import React, { useState, useEffect } from 'react';
import {
    View, StyleSheet, ScrollView, TouchableOpacity, Modal,
    TextInput, ActivityIndicator, Alert, FlatList, Dimensions, Image
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { searchDevelopmentalGoals } from '../../scripts/goalsApi';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTheme } from '@/context/ThemeContext';

const { width } = Dimensions.get('window');

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

    // Theme tokens
    const backgroundColor = useThemeColor({}, 'background');
    const cardBg = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const textColor = useThemeColor({}, 'text');
    const primaryColor = useThemeColor({}, 'primary');

    useEffect(() => {
        if (regNoParam) {
            handleSearch();
        }
    }, [regNoParam]);

    const handleSearch = async () => {
        if (!regNo.trim()) {
            Alert.alert("Required", "Please enter a registration number");
            return;
        }
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

    const renderGoalItem = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={[styles.card, { backgroundColor: cardBg, borderColor: borderColor }]} 
            onPress={() => { setSelectedGoal(item); setModalVisible(true); }}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.dateBadge, { backgroundColor: resolvedTheme === 'dark' ? '#334155' : '#eff6ff' }]}>
                    <Ionicons name="calendar-outline" size={14} color="#2563eb" />
                    <ThemedText style={styles.dateText}>{formatDate(item.date)}</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={borderColor} />
            </View>

            <View style={styles.cardBody}>
                <ThemedText style={styles.previewLabel}>Goals ({item.development_goals?.length || 0})</ThemedText>
                {item.development_goals?.slice(0, 3).map((g: any, i: number) => (
                    <View key={i} style={styles.goalRowPreview}>
                        <View style={styles.goalInfo}>
                            <View style={[styles.dot, { backgroundColor: STATUS_MAP[g.status]?.color || '#cbd5e1' }]} />
                            <ThemedText style={styles.previewText} numberOfLines={1}>
                                {g.goal}
                            </ThemedText>
                        </View>
                        <StatusBadge status={g.status} />
                    </View>
                ))}
            </View>
        </TouchableOpacity>
    );

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
                    <ThemedText style={styles.title}>Developmental</ThemedText>
                    <View style={{ width: 44 }} />
                </View>
            </LinearGradient>

            <View style={styles.main}>
                <View style={[styles.searchBox, { backgroundColor: cardBg }]}>
                    <TextInput
                        style={[styles.input, { color: textColor, backgroundColor: resolvedTheme === 'dark' ? '#334155' : '#f8fafc', borderColor: borderColor }]}
                        placeholder="Search Registration No..."
                        placeholderTextColor="#94a3b8"
                        value={regNo}
                        onChangeText={setRegNo}
                    />
                    <TouchableOpacity style={[styles.searchBtn, { backgroundColor: '#4338ca' }]} onPress={handleSearch}>
                        <Ionicons name="search" size={20} color="white" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator style={{ marginTop: 50 }} color="#4338ca" size="large" />
                ) : (
                    <FlatList
                        data={goalsList}
                        renderItem={renderGoalItem}
                        keyExtractor={(item, index) => index.toString()}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Ionicons name="rocket-outline" size={80} color={borderColor} />
                                <ThemedText style={[styles.emptyTitle, { color: textSecondary }]}>No Records Found.</ThemedText>
                                <ThemedText style={[styles.emptySub, { color: textSecondary }]}>Search for a patient to see their developmental progress.</ThemedText>
                            </View>
                        }
                    />
                )}
            </View>

            <Modal visible={modalVisible} animationType="slide">
                <ThemedView style={styles.modalContainer}>
                    <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                        <ThemedText style={styles.modalTitle}>Progress Details</ThemedText>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                            <Ionicons name="close" size={28} color={textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                        <View style={styles.modalDateInfo}>
                            <Ionicons name="calendar" size={18} color={primaryColor} />
                            <ThemedText style={styles.modalDate}>{formatDate(selectedGoal?.date)}</ThemedText>
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
    header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 45, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
    nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '900', color: 'white' },
    regDisplay: { color: 'white', textAlign: 'center', marginTop: 15, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
    main: { flex: 1, marginTop: -25 },
    searchBox: { marginHorizontal: 20, borderRadius: 20, padding: 10, flexDirection: 'row', elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    input: { flex: 1, height: 50, borderRadius: 15, paddingHorizontal: 15, borderWidth: 1, fontWeight: '700' },
    searchBtn: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    list: { padding: 20, paddingBottom: 50 },
    card: { borderRadius: 24, padding: 20, marginBottom: 18, borderLeftWidth: 8, borderLeftColor: '#4338ca', elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    dateBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    dateText: { fontSize: 12, fontWeight: '800', marginLeft: 6, color: '#2563eb' },
    cardBody: { marginBottom: 5 },
    previewLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 },
    goalRowPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
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
    modalDateInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
    modalDate: { fontSize: 16, fontWeight: '800', marginLeft: 10 },
    sectionLabel: { fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1 },
    detailGoalCard: { borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1 },
    goalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    goalNo: { width: 28, height: 28, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    detailGoalText: { fontSize: 16, fontWeight: '700', lineHeight: 22, marginBottom: 12 },
    detailsBox: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12 },
    detailsLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', marginBottom: 5 },
    detailsText: { fontSize: 14, color: '#64748b', fontStyle: 'italic', lineHeight: 20 }
});
