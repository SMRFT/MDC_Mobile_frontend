import React, { useState, useEffect } from 'react';
import {
    View, StyleSheet, ScrollView, TouchableOpacity, Modal,
    TextInput, ActivityIndicator, Alert, FlatList, Dimensions, Image
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { searchGoals, updateGoal, uploadFile, deleteGoal } from '../../scripts/goalsApi';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTheme } from '@/context/ThemeContext';

const { width } = Dimensions.get('window');

export default function GoalsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const regNoParam = params.regNo as string;
    const { resolvedTheme } = useTheme();

    const [regNo, setRegNo] = useState(regNoParam || '');
    const [goalsList, setGoalsList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<any>(null);
    const [editMode, setEditMode] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Theme tokens
    const backgroundColor = useThemeColor({}, 'background');
    const cardBg = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const textSecondary = useThemeColor({}, 'textSecondary');
    const textColor = useThemeColor({}, 'text');
    const primaryColor = useThemeColor({}, 'primary');

    // Edit state
    const [editedComments, setEditedComments] = useState('');
    const [editedRecommendations, setEditedRecommendations] = useState('');
    const [editedGoals, setEditedGoals] = useState<any[]>([]);
    const [editedPhotos, setEditedPhotos] = useState<any[]>([]);
    const [editedVideos, setEditedVideos] = useState<any[]>([]);
    const [newMedia, setNewMedia] = useState<any>(null);
    const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
    const [playingVideoUri, setPlayingVideoUri] = useState('');

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
            const data = await searchGoals(regNo);
            setGoalsList(data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to fetch assessment records.");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectGoal = (goal: any) => {
        setSelectedGoal(goal);
        setEditedComments(goal.comments || '');
        setEditedRecommendations(goal.recommendations || '');
        setEditedGoals(goal.goals || []);
        setEditedPhotos(Array.isArray(goal.goalsphoto) ? goal.goalsphoto : []);
        setEditedVideos(Array.isArray(goal.goalsvideo) ? goal.goalsvideo : []);
        setEditMode(true);
    };

    const pickMedia = async (type: 'Images' | 'Videos') => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: type === 'Images' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setNewMedia(result.assets[0]);
        }
    };

    const handleSave = async () => {
        if (!selectedGoal) return;
        setUploading(true);
        try {
            let updatedPhotos = [...editedPhotos];
            let updatedVideos = [...editedVideos];

            if (newMedia) {
                const uploadResp = await uploadFile(newMedia);
                if (uploadResp && uploadResp.file_url) {
                    const isVideo = newMedia.type === 'video' || (newMedia.mimeType && newMedia.mimeType.startsWith('video/'));
                    const newEntry = { url: uploadResp.file_url, id: uploadResp.file_id };
                    if (isVideo) updatedVideos.push(newEntry);
                    else updatedPhotos.push(newEntry);
                }
            }

            await updateGoal(selectedGoal._id, {
                comments: editedComments,
                recommendations: editedRecommendations,
                goals: editedGoals,
                goalsphoto: updatedPhotos,
                goalsvideo: updatedVideos
            });

            Alert.alert("Success", "Assessment has been updated.");
            setEditMode(false);
            setNewMedia(null);
            handleSearch();
        } catch (error) {
            Alert.alert("Error", "Failed to update record.");
        } finally {
            setUploading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    };

    const renderGoalItem = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={[styles.card, { backgroundColor: cardBg, borderColor: borderColor }]} 
            onPress={() => handleSelectGoal(item)}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.dateBadge, { backgroundColor: resolvedTheme === 'dark' ? '#334155' : '#f0fdf4' }]}>
                    <Ionicons name="calendar-outline" size={14} color="#15803d" />
                    <ThemedText style={styles.dateText}>{formatDate(item.date)}</ThemedText>
                </View>
                <View style={[styles.deadlineBadge, { backgroundColor: '#fff7ed' }]}>
                    <ThemedText style={styles.deadlineText}>Review: {formatDate(item.deadline)}</ThemedText>
                </View>
            </View>

            <View style={styles.cardBody}>
                <ThemedText style={styles.previewLabel}>Key Goals</ThemedText>
                {item.goals?.slice(0, 3).map((g: any, i: number) => (
                    <View key={i} style={styles.previewRow}>
                        <View style={[styles.dot, { backgroundColor: '#15803d' }]} />
                        <ThemedText style={styles.previewText} numberOfLines={1}>
                            {typeof g === 'string' ? g : (g.task || g.goal)}
                        </ThemedText>
                    </View>
                ))}
            </View>

            {item.comments && (
                <View style={[styles.commentBox, { borderTopColor: borderColor }]}>
                    <ThemedText style={[styles.commentText, { color: textSecondary }]} numberOfLines={2}>
                        "{item.comments}"
                    </ThemedText>
                </View>
            )}

            <View style={styles.cardFooter}>
                <View style={styles.mediaIndicators}>
                    {item.goalsphoto?.length > 0 && (
                        <View style={styles.mIndicator}><Ionicons name="image" size={14} color={textSecondary} /><ThemedText style={styles.mCount}>{item.goalsphoto.length}</ThemedText></View>
                    )}
                    {item.goalsvideo?.length > 0 && (
                        <View style={styles.mIndicator}><Ionicons name="videocam" size={14} color={textSecondary} /><ThemedText style={styles.mCount}>{item.goalsvideo.length}</ThemedText></View>
                    )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={borderColor} />
            </View>
        </TouchableOpacity>
    );

    return (
        <ThemedView style={styles.container}>
            <LinearGradient 
                colors={resolvedTheme === 'dark' ? ['#0f172a', '#1e293b'] : ['#15803d', '#10b981']} 
                style={styles.header}
            >
                <View style={styles.nav}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={26} color="white" />
                    </TouchableOpacity>
                    <ThemedText style={styles.title}>Goals Assessment</ThemedText>
                    <View style={{ width: 44 }} />
                </View>
                <ThemedText style={styles.regDisplay}>{regNo}</ThemedText>
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
                    <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                        <Ionicons name="search" size={20} color="white" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator style={{ marginTop: 50 }} color="#15803d" size="large" />
                ) : (
                    <FlatList
                        data={goalsList}
                        renderItem={renderGoalItem}
                        keyExtractor={(item, index) => index.toString()}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Ionicons name="clipboard-outline" size={80} color={borderColor} />
                                <ThemedText style={[styles.emptyTitle, { color: textSecondary }]}>No Goals Found.</ThemedText>
                                {/* <ThemedText style={[styles.emptySub, { color: textSecondary }]}>No Goals Found.</ThemedText> */}
                            </View>
                        }
                    />
                )}
            </View>

            <Modal visible={editMode} animationType="slide">
                <ThemedView style={styles.modalContainer}>
                    <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                        <ThemedText style={styles.modalTitle}>Goal Details</ThemedText>
                        <TouchableOpacity onPress={() => setEditMode(false)} style={styles.closeBtn}>
                            <Ionicons name="close" size={28} color={textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                        <View style={styles.field}>
                            <ThemedText style={styles.label}>Clinician Comments</ThemedText>
                            <TextInput
                                style={[styles.textArea, { backgroundColor: resolvedTheme === 'dark' ? '#334155' : '#f8fafc', borderColor: borderColor, color: textColor }]}
                                multiline
                                value={editedComments}
                                onChangeText={setEditedComments}
                                placeholder="Add progress notes..."
                                placeholderTextColor="#94a3b8"
                            />
                        </View>

                        <View style={styles.field}>
                            <ThemedText style={styles.label}>Recommendations</ThemedText>
                            <View style={[styles.readOnlyBox, { backgroundColor: resolvedTheme === 'dark' ? '#0f172a' : '#f1f5f9' }]}>
                                <ThemedText style={styles.readOnlyText}>{editedRecommendations || "No recommendations provided."}</ThemedText>
                            </View>
                        </View>

                        <View style={styles.field}>
                            <ThemedText style={styles.label}>Assessment Goals</ThemedText>
                            {editedGoals.map((g, i) => (
                                <View key={i} style={[styles.goalItem, { backgroundColor: resolvedTheme === 'dark' ? '#0f172a' : '#f1f5f9' }]}>
                                    <View style={[styles.dot, { backgroundColor: '#15803d', marginTop: 8 }]} />
                                    <ThemedText style={styles.goalText}>{typeof g === 'string' ? g : (g.task || g.goal)}</ThemedText>
                                </View>
                            ))}
                        </View>

                        <View style={styles.field}>
                            <ThemedText style={styles.label}>Media Evidence</ThemedText>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                                {editedPhotos.map((p, i) => (
                                    <Image key={`p-${i}`} source={{ uri: p.url || p }} style={styles.mediaThumb} />
                                ))}
                                {editedVideos.map((v, i) => (
                                    <TouchableOpacity 
                                        key={`v-${i}`} 
                                        style={styles.mediaThumb} 
                                        onPress={() => { setPlayingVideoUri(v.url || v); setVideoPlayerVisible(true); }}
                                    >
                                        <View style={styles.videoPlayOverlay}><Ionicons name="play" size={30} color="white" /></View>
                                    </TouchableOpacity>
                                ))}
                                
                                {newMedia && (
                                    <View style={[styles.mediaThumb, { borderColor: '#15803d', borderWidth: 2 }]}>
                                         <ThemedText style={styles.newTag}>NEW</ThemedText>
                                         <Ionicons name={newMedia.type === 'video' ? 'videocam' : 'image'} size={30} color="#15803d" />
                                    </View>
                                )}

                                <TouchableOpacity style={styles.addMediaBtn} onPress={() => pickMedia('Images')}>
                                    <Ionicons name="camera-outline" size={24} color="#15803d" />
                                    <ThemedText style={styles.addMediaTxt}>Photo</ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.addMediaBtn} onPress={() => pickMedia('Videos')}>
                                    <Ionicons name="videocam-outline" size={24} color="#15803d" />
                                    <ThemedText style={styles.addMediaTxt}>Video</ThemedText>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity 
                            style={[styles.saveBtn, uploading && { opacity: 0.7 }]} 
                            onPress={handleSave}
                            disabled={uploading}
                        >
                            <LinearGradient colors={['#15803d', '#10b981']} style={styles.saveGrad}>
                                {uploading ? <ActivityIndicator color="white" /> : <ThemedText style={styles.saveText}>Save Assessment</ThemedText>}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.deleteBtn} 
                            onPress={() => {
                                Alert.alert(
                                    "Delete Record",
                                    "This action cannot be undone. All associated media will also be removed.",
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        { text: "Delete Permanently", style: "destructive", onPress: async () => {
                                            if (!selectedGoal) return;
                                            try {
                                                await deleteGoal(selectedGoal._id);
                                                Alert.alert("Deleted", "Assessment removed.");
                                                setEditMode(false);
                                                handleSearch();
                                            } catch (e) {
                                                Alert.alert("Error", "Could not delete record.");
                                            }
                                        }}
                                    ]
                                );
                            }}
                        >
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                            <ThemedText style={styles.deleteText}>Delete Record</ThemedText>
                        </TouchableOpacity>
                    </View>
                </ThemedView>
            </Modal>

            <Modal visible={videoPlayerVisible} animationType="fade" transparent>
                <View style={styles.videoOverlay}>
                    <TouchableOpacity style={styles.closeVideo} onPress={() => setVideoPlayerVisible(false)}>
                        <Ionicons name="close-circle" size={40} color="white" />
                    </TouchableOpacity>
                    <Video
                        source={{ uri: playingVideoUri }}
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay
                        useNativeControls
                        style={styles.videoPlayer}
                    />
                </View>
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
    searchBtn: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#15803d', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    list: { padding: 20, paddingBottom: 50 },
    card: { borderRadius: 24, padding: 20, marginBottom: 18, borderWidth: 1, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    dateBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    dateText: { fontSize: 12, fontWeight: '800', marginLeft: 6, color: '#15803d' },
    deadlineBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    deadlineText: { fontSize: 11, fontWeight: '800', color: '#c2410c' },
    cardBody: { marginBottom: 15 },
    previewLabel: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 },
    previewRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
    previewText: { fontSize: 14, fontWeight: '700' },
    commentBox: { paddingTop: 12, borderTopWidth: 1, marginBottom: 12 },
    commentText: { fontSize: 13, fontStyle: 'italic', fontWeight: '500' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    mediaIndicators: { flexDirection: 'row' },
    mIndicator: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
    mCount: { fontSize: 12, fontWeight: '800', marginLeft: 5 },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyTitle: { fontSize: 18, fontWeight: '900', marginTop: 15 },
    emptySub: { fontSize: 14, textAlign: 'center', marginTop: 5, paddingHorizontal: 40 },
    modalContainer: { flex: 1 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
    modalTitle: { fontSize: 20, fontWeight: '900' },
    closeBtn: { padding: 5 },
    modalScroll: { padding: 20 },
    field: { marginBottom: 25 },
    label: { fontSize: 14, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 },
    textArea: { height: 120, borderRadius: 18, borderWidth: 1, padding: 15, fontSize: 16, textAlignVertical: 'top', fontWeight: '600' },
    readOnlyBox: { padding: 15, borderRadius: 18 },
    readOnlyText: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
    goalItem: { flexDirection: 'row', padding: 15, borderRadius: 15, marginBottom: 10 },
    goalText: { flex: 1, fontSize: 14, fontWeight: '700', marginLeft: 12, lineHeight: 20 },
    mediaScroll: { flexDirection: 'row' },
    mediaThumb: { width: 100, height: 100, borderRadius: 18, marginRight: 12, overflow: 'hidden', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    videoPlayOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    addMediaBtn: { width: 100, height: 100, borderRadius: 18, borderStyle: 'dashed', borderWidth: 2, borderColor: '#15803d', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    addMediaTxt: { fontSize: 10, fontWeight: '800', color: '#15803d', marginTop: 5 },
    newTag: { position: 'absolute', top: 8, right: 8, backgroundColor: '#15803d', color: 'white', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, fontSize: 8, fontWeight: '900', zIndex: 10 },
    modalFooter: { padding: 20 },
    saveBtn: { borderRadius: 18, overflow: 'hidden' },
    saveGrad: { paddingVertical: 18, alignItems: 'center' },
    saveText: { color: 'white', fontSize: 16, fontWeight: '900' },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15, padding: 15, borderRadius: 18, borderWidth: 1, borderColor: '#fee2e2' },
    deleteText: { marginLeft: 10, color: '#ef4444', fontWeight: '800' },
    videoOverlay: { flex: 1, backgroundColor: 'black' },
    videoPlayer: { flex: 1 },
    closeVideo: { position: 'absolute', top: 60, right: 25, zIndex: 20 }
});
