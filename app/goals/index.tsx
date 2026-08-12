import React, { useState, useEffect, useRef } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import {
    View, StyleSheet, ScrollView, TouchableOpacity, Modal,
    TextInput, ActivityIndicator, Alert, FlatList, Dimensions, Image,
    PanResponder
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

const { width, height } = Dimensions.get('window');

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
    const [photoPreviewVisible, setPhotoPreviewVisible] = useState(false);
    const [previewPhotoUri, setPreviewPhotoUri] = useState('');
    const [videoLoading, setVideoLoading] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [bufferingPercentage, setBufferingPercentage] = useState(0);
    const [playbackError, setPlaybackError] = useState<string | null>(null);
    const [shouldPlayVideo, setShouldPlayVideo] = useState(false);
    const [localVideoUri, setLocalVideoUri] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);
    const downloadRef = useRef<FileSystem.DownloadResumable | null>(null);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                return gestureState.dy > 15 && Math.abs(gestureState.dx) < 40;
            },
            onPanResponderRelease: (evt, gestureState) => {
                if (gestureState.dy > 100) {
                    setPhotoPreviewVisible(false);
                    handleCloseVideo();
                }
            },
        })
    ).current;

    const prepareVideo = async (remoteUrl: string) => {
        try {
            setPlaybackError(null);
            setLocalVideoUri(null);
            setBufferingPercentage(0);
            
            if (!remoteUrl.startsWith('http')) {
                setLocalVideoUri(remoteUrl);
                return;
            }

            setDownloading(true);
            setVideoLoading(true);

            const filename = remoteUrl.split('/').filter(Boolean).pop() || 'temp_video.mp4';
            const cleanFilename = filename.includes('.') ? filename : `${filename}.mp4`;
            const localPath = `${FileSystem.cacheDirectory}${cleanFilename}`;

            const fileInfo = await FileSystem.getInfoAsync(localPath);
            if (fileInfo.exists) {
                setDownloading(false);
                setVideoLoading(false);
                setLocalVideoUri(localPath);
                return;
            }

            const downloadInstance = FileSystem.createDownloadResumable(
                remoteUrl,
                localPath,
                {},
                (downloadProgress) => {
                    const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                    setBufferingPercentage(Math.round(progress * 100));
                }
            );
            downloadRef.current = downloadInstance;

            const result = await downloadInstance.downloadAsync();
            if (result && result.uri) {
                setLocalVideoUri(result.uri);
            } else {
                throw new Error("Failed to download video file");
            }
            setDownloading(false);
            setVideoLoading(false);
        } catch (err: any) {
            console.error("Error downloading video:", err);
            setPlaybackError(err.message || String(err));
            setDownloading(false);
            setVideoLoading(false);
        }
    };

    const handleCloseVideo = async () => {
        setVideoPlayerVisible(false);
        setPlaybackError(null);
        setShouldPlayVideo(false);
        setLocalVideoUri(null);
        setDownloading(false);
        if (downloadRef.current) {
            try {
                await downloadRef.current.cancelAsync();
            } catch (e) {
                console.error("Cancel download error:", e);
            }
            downloadRef.current = null;
        }
    };

    const getPhotoUriString = (uriObj: any): string => {
        if (!uriObj) return '';
        let uriStr = '';
        if (typeof uriObj === 'string') uriStr = uriObj;
        else if (typeof uriObj === 'object') {
            uriStr = uriObj.url || uriObj.file_url || uriObj.uri || '';
        }
        if (!uriStr) return '';
        if (uriStr.startsWith('http://')) {
            uriStr = 'https://' + uriStr.substring(7);
        }
        return uriStr.startsWith('http') ? encodeURI(uriStr) : uriStr;
    };

    const getVideoUriString = (uriObj: any): string => {
        if (!uriObj) return '';
        let uriStr = '';
        if (typeof uriObj === 'string') uriStr = uriObj;
        else if (typeof uriObj === 'object') {
            uriStr = uriObj.url || uriObj.file_url || uriObj.uri || '';
        }
        if (!uriStr) return '';
        if (uriStr.startsWith('http://')) {
            uriStr = 'https://' + uriStr.substring(7);
        }
        return uriStr.startsWith('http') ? encodeURI(uriStr) : uriStr;
    };

    const handlePlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setIsBuffering(status.isBuffering);
            if (status.durationMillis) {
                const pct = Math.round((status.playableDurationMillis / status.durationMillis) * 100);
                setBufferingPercentage(Math.min(100, Math.max(0, pct)));
            }
        } else {
            if (status.isBuffering) {
                setIsBuffering(true);
            }
        }
    };

    useEffect(() => {
        if (regNo) {
            handleSearch();
        }
    }, [regNo]);

    const handleSearch = async () => {
        if (!regNo.trim()) return;
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
                        {"\""}{item.comments}{"\""}
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

            <Modal 
                visible={editMode} 
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setEditMode(false)}
            >
                <ThemedView style={styles.modalContainer}>
                    <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                        <ThemedText style={styles.modalTitle}>Goal Details</ThemedText>
                        <TouchableOpacity onPress={() => setEditMode(false)} style={styles.closeBtn}>
                            <Ionicons name="close" size={28} color={textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                        <View style={styles.field}>
                            <ThemedText style={styles.label}>Parents Comments</ThemedText>
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
                                    <TouchableOpacity 
                                        key={`p-${i}`} 
                                        style={styles.mediaThumb} 
                                        onPress={() => { setPreviewPhotoUri(getPhotoUriString(p)); setPhotoPreviewVisible(true); }}
                                    >
                                        <Image source={{ uri: getPhotoUriString(p) }} style={StyleSheet.absoluteFillObject} />
                                    </TouchableOpacity>
                                ))}
                                {editedVideos.map((v, i) => (
                                    <TouchableOpacity 
                                        key={`v-${i}`} 
                                        style={styles.mediaThumb} 
                                        onPress={() => {
                                            const resolvedUri = getVideoUriString(v);
                                            setPlayingVideoUri(resolvedUri);
                                            setVideoPlayerVisible(true);
                                            prepareVideo(resolvedUri);
                                        }}
                                    >
                                        <View style={styles.videoPlayOverlay}><Ionicons name="play" size={30} color="white" /></View>
                                    </TouchableOpacity>
                                ))}
                                
                                {newMedia && (
                                    <TouchableOpacity 
                                        style={[styles.mediaThumb, { borderColor: '#15803d', borderWidth: 2 }]}
                                        onPress={() => {
                                            const isVideo = newMedia.type === 'video' || (newMedia.mimeType && newMedia.mimeType.startsWith('video/'));
                                            if (isVideo) {
                                                setPlayingVideoUri(newMedia.uri);
                                                setVideoPlayerVisible(true);
                                                prepareVideo(newMedia.uri);
                                            } else {
                                                setPreviewPhotoUri(newMedia.uri);
                                                setPhotoPreviewVisible(true);
                                            }
                                        }}
                                    >
                                         <ThemedText style={styles.newTag}>NEW</ThemedText>
                                         {newMedia.type === 'video' || (newMedia.mimeType && newMedia.mimeType.startsWith('video/')) ? (
                                             <View style={styles.videoPlayOverlay}><Ionicons name="play" size={30} color="white" /></View>
                                         ) : (
                                             <Image source={{ uri: newMedia.uri }} style={StyleSheet.absoluteFillObject} />
                                         )}
                                    </TouchableOpacity>
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
                {photoPreviewVisible && (
                    <View 
                        {...panResponder.panHandlers}
                        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'black', zIndex: 1000, justifyContent: 'center', alignItems: 'center' }]}
                    >
                        <TouchableOpacity style={styles.closeVideo} onPress={() => setPhotoPreviewVisible(false)}>
                            <Ionicons name="close-circle" size={40} color="white" />
                        </TouchableOpacity>
                        <Image
                            source={{ uri: getPhotoUriString(previewPhotoUri) }}
                            style={styles.photoPlayer}
                            resizeMode="contain"
                        />
                    </View>
                )}

                {videoPlayerVisible && (
                    <View 
                        {...panResponder.panHandlers}
                        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'black', zIndex: 1000, justifyContent: 'center', alignItems: 'center' }]}
                    >
                        <TouchableOpacity 
                                                            style={styles.closeVideo} 
                                                            onPress={handleCloseVideo}
                                                        >
                                                            <Ionicons name="close-circle" size={40} color="white" />
                                                        </TouchableOpacity>
                                                        {localVideoUri && !playbackError && (
                                                            <Video
                                                                source={{ uri: localVideoUri }}
                                                                resizeMode={ResizeMode.CONTAIN}
                                                                shouldPlay={shouldPlayVideo}
                                                                useNativeControls
                                                                style={styles.videoPlayer}
                                                                onLoadStart={() => {
                                                                    setVideoLoading(true);
                                                                    setIsBuffering(true);
                                                                    setBufferingPercentage(0);
                                                                }}
                                                                onLoad={() => {
                                                                    setVideoLoading(false);
                                                                    setIsBuffering(false);
                                                                    setShouldPlayVideo(true);
                                                                }}
                                                                onError={(err) => {
                                                                    setVideoLoading(false);
                                                                    setIsBuffering(false);
                                                                    setPlaybackError(err);
                                                                    setShouldPlayVideo(false);
                                                                }}
                                                                onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                                                            />
                                                        )}
                                                        {(downloading || videoLoading || isBuffering) && !playbackError && (
                                                            <View style={styles.bufferingContainer}>
                                                                <ActivityIndicator 
                                                                    size="large" 
                                                                    color="#10b981" 
                                                                />
                                                                 <ThemedText style={styles.bufferingText}>
                                                                     {downloading 
                                                                         ? `Downloading... ${bufferingPercentage}%` 
                                                                         : bufferingPercentage > 0 
                                                                             ? `Buffering... ${bufferingPercentage}%` 
                                                                             : 'Buffering...'}
                                                                 </ThemedText>
                                                                 <ThemedText style={{ color: 'gray', fontSize: 10, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 }}>
                                                                     {playingVideoUri}
                                                                 </ThemedText>
                                                            </View>
                                                        )}
                        {playbackError && (
                            <View style={styles.bufferingContainer}>
                                <Ionicons name="alert-circle" size={50} color="#ef4444" />
                                <ThemedText style={styles.bufferingText}>
                                    Failed to load video
                                </ThemedText>
                                <ThemedText style={{ color: '#fca5a5', fontSize: 12, marginTop: 5, textAlign: 'center', paddingHorizontal: 20 }}>
                                    {playbackError}
                                </ThemedText>
                                <ThemedText style={{ color: 'gray', fontSize: 9, marginTop: 15, textAlign: 'center', paddingHorizontal: 20 }}>
                                    URL: {getVideoUriString(playingVideoUri)}
                                </ThemedText>
                            </View>
                        )}
                    </View>
                )}
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
    videoOverlay: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
    videoPlayer: { width: width, height: height * 0.7 },
    photoPlayer: { width: width, height: height * 0.7 },
    closeVideo: { position: 'absolute', top: 60, right: 25, zIndex: 20 },
    bufferingContainer: { position: 'absolute', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    bufferingText: { color: 'white', marginTop: 15, fontSize: 14, fontWeight: '700' }
});
