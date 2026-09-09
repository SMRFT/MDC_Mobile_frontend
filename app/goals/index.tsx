import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import {
    View, StyleSheet, ScrollView, TouchableOpacity, Modal,
    TextInput, ActivityIndicator, Alert, FlatList, Dimensions, Image,
    PanResponder
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import { searchGoals, updateGoal, uploadFile, deleteGoal } from '../../scripts/goalsApi';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTheme } from '@/context/ThemeContext';

const { width, height } = Dimensions.get('window');

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

const THERAPY_STYLE_MAP: Record<string, { color: string; bg: string; darkBg: string; icon: keyof typeof Ionicons.glyphMap }> = {
    'Occupational Therapy': { color: '#4f46e5', bg: '#eef2ff', darkBg: '#312e81', icon: 'hand-left-outline' },
    'Speech Therapy': { color: '#7c3aed', bg: '#f5f3ff', darkBg: '#4c1d95', icon: 'chatbubbles-outline' },
    'Physiotherapy': { color: '#0d9488', bg: '#f0fdfa', darkBg: '#134e4a', icon: 'body-outline' },
    'Applied Behavior Analysis (ABA)': { color: '#2563eb', bg: '#eff6ff', darkBg: '#1e3a8a', icon: 'bulb-outline' },
    'Special Education': { color: '#15803d', bg: '#f0fdf4', darkBg: '#14532d', icon: 'book-outline' },
    'Social Training Class': { color: '#d97706', bg: '#fffbeb', darkBg: '#78350f', icon: 'people-outline' },
    'Cognitive Therapy': { color: '#e11d48', bg: '#fff1f2', darkBg: '#881337', icon: 'flash-outline' },
    'Art Therapy': { color: '#ea580c', bg: '#fff7ed', darkBg: '#7c2d12', icon: 'color-palette-outline' },
    'General': { color: '#15803d', bg: '#f0fdf4', darkBg: '#14532d', icon: 'checkbox-outline' }
};

const getTherapyInfo = (therapyKey: string) => {
    const name = THERAPY_MAP[therapyKey] || therapyKey || 'General';
    const style = THERAPY_STYLE_MAP[name] || { color: '#15803d', bg: '#f0fdf4', darkBg: '#14532d', icon: 'ribbon-outline' as keyof typeof Ionicons.glyphMap };
    return { name, ...style };
};

const getGoalTherapy = (goal: any, defaultTherapy: string = ''): string => {
    if (typeof goal === 'object' && goal !== null) {
        if (goal.therapy_name) return goal.therapy_name;
        if (goal.therapy) return THERAPY_MAP[goal.therapy] || goal.therapy;
        if (goal.therapy_type) return goal.therapy_type;
        if (goal.department) return goal.department;
    }
    if (defaultTherapy) return THERAPY_MAP[defaultTherapy] || defaultTherapy;
    return 'General';
};

const groupGoalsByTherapy = (goals: any[], defaultTherapy: string = '') => {
    const grouped: Record<string, any[]> = {};
    if (!Array.isArray(goals)) return grouped;

    goals.forEach((g) => {
        const therapyName = getGoalTherapy(g, defaultTherapy);
        if (!grouped[therapyName]) grouped[therapyName] = [];
        grouped[therapyName].push(g);
    });
    return grouped;
};

function GoalVideoPlayer({ uri }: { uri: string }) {
    const player = useVideoPlayer(uri, (p) => {
        p.loop = false;
        p.play();
    });

    return (
        <VideoView
            player={player}
            style={styles.videoPlayer}
            nativeControls={true}
            allowsPictureInPicture={true}
            contentFit="contain"
            fullscreenOptions={{ enable: true }}
        />
    );
}

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
    const [selectedTherapy, setSelectedTherapy] = useState('All');

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

    // Extract all unique therapy types across all records
    const availableTherapies = useMemo(() => {
        const set = new Set<string>();
        goalsList.forEach(item => {
            const defaultT = item.therapy_name || THERAPY_MAP[item.therapy] || item.therapy;
            if (defaultT) set.add(defaultT);
            if (Array.isArray(item.goals)) {
                item.goals.forEach((g: any) => {
                    const t = getGoalTherapy(g, defaultT);
                    if (t) set.add(t);
                });
            }
        });
        return ['All', ...Array.from(set)];
    }, [goalsList]);

    // Filter goalsList based on selected therapy tab
    const filteredGoalsList = useMemo(() => {
        if (selectedTherapy === 'All') return goalsList;
        return goalsList.filter(item => {
            const defaultT = item.therapy_name || THERAPY_MAP[item.therapy] || item.therapy;
            if (defaultT === selectedTherapy) return true;
            if (Array.isArray(item.goals)) {
                return item.goals.some((g: any) => getGoalTherapy(g, defaultT) === selectedTherapy);
            }
            return false;
        });
    }, [goalsList, selectedTherapy]);

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

            Alert.alert("Success", "Developmental Activity has been updated.");
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

    const renderGoalItem = ({ item }: { item: any }) => {
        const defaultTherapy = item.therapy_name || THERAPY_MAP[item.therapy] || item.therapy || '';
        const groupedGoals = groupGoalsByTherapy(item.goals || [], defaultTherapy);
        const therapyKeys = Object.keys(groupedGoals);
        const authorDisplay = item.therapist_name || item.author_name || item.created_by_name || item.lastmodified_by_name || '';

        // Filter groups if a specific therapy is selected
        const displayedGroups = selectedTherapy === 'All'
            ? groupedGoals
            : { [selectedTherapy]: groupedGoals[selectedTherapy] || [] };

        return (
            <TouchableOpacity 
                style={[styles.card, { backgroundColor: cardBg, borderColor: borderColor }]} 
                onPress={() => handleSelectGoal(item)}
                activeOpacity={0.85}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1, marginRight: 8 }}>
                        <View style={[styles.dateBadge, { backgroundColor: resolvedTheme === 'dark' ? '#14532d' : '#f0fdf4', borderColor: '#86efac' }]}>
                            <Ionicons name="calendar-outline" size={14} color="#15803d" />
                            <ThemedText style={styles.dateText}>{formatDate(item.date)}</ThemedText>
                        </View>

                        {authorDisplay ? (
                            <View style={[styles.authorBadgePill, { backgroundColor: resolvedTheme === 'dark' ? '#14532d' : '#f0fdf4', borderColor: '#86efac' }]}>
                                <Ionicons name="person-circle-outline" size={13} color="#15803d" style={{ marginRight: 4 }} />
                                <ThemedText style={styles.authorBadgePillText} numberOfLines={1}>
                                    Therapist: {authorDisplay}
                                </ThemedText>
                            </View>
                        ) : null}
                    </View>

                    {item.deadline ? (
                        <View style={[styles.deadlineBadge, { backgroundColor: resolvedTheme === 'dark' ? '#451a03' : '#fff7ed', borderColor: '#fdba74' }]}>
                            <Ionicons name="time-outline" size={12} color="#ea580c" style={{ marginRight: 4 }} />
                            <ThemedText style={styles.deadlineText}>Review: {formatDate(item.deadline)}</ThemedText>
                        </View>
                    ) : null}
                </View>

                {/* Therapy Badges summary row */}
                {therapyKeys.length > 0 && (
                    <View style={styles.therapyBadgesRow}>
                        {therapyKeys.map((tKey) => {
                            const tInfo = getTherapyInfo(tKey);
                            return (
                                <View
                                    key={tKey}
                                    style={[
                                        styles.therapyBadgePill,
                                        { backgroundColor: resolvedTheme === 'dark' ? tInfo.darkBg : tInfo.bg, borderColor: tInfo.color + '40' }
                                    ]}
                                >
                                    <Ionicons name={tInfo.icon} size={12} color={tInfo.color} style={{ marginRight: 4 }} />
                                    <ThemedText style={[styles.therapyBadgePillText, { color: tInfo.color }]}>
                                        {tInfo.name}
                                    </ThemedText>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Grouped Activities List */}
                <View style={styles.cardBody}>
                    {Object.entries(displayedGroups).map(([therapyName, activities]) => {
                        if (!activities || activities.length === 0) return null;
                        const tInfo = getTherapyInfo(therapyName);

                        return (
                            <View key={therapyName} style={styles.therapyGroupSection}>
                                <View style={styles.therapyGroupHeader}>
                                    <View style={[styles.therapyGroupIconBox, { backgroundColor: tInfo.color + '15' }]}>
                                        <Ionicons name={tInfo.icon} size={14} color={tInfo.color} />
                                    </View>
                                    <ThemedText style={[styles.therapyGroupTitle, { color: tInfo.color }]}>
                                        {tInfo.name}
                                    </ThemedText>
                                    <View style={[styles.countBadge, { backgroundColor: cardBg, borderColor }]}>
                                        <ThemedText style={[styles.countBadgeText, { color: textSecondary }]}>
                                            {activities.length}
                                        </ThemedText>
                                    </View>
                                </View>

                                {activities.slice(0, 3).map((g: any, i: number) => {
                                    const taskText = typeof g === 'string' ? g : (g.task || g.goal || g.description || '');
                                    const domainName = g?.domain_name || g?.domain;
                                    const goalTherapist = g?.therapist_name || g?.therapist || item.therapist_name || authorDisplay;

                                    return (
                                        <View key={i} style={styles.activityItemRow}>
                                            <View style={[styles.dot, { backgroundColor: tInfo.color }]} />
                                            <View style={{ flex: 1 }}>
                                                <ThemedText style={styles.activityText} numberOfLines={2}>
                                                    {taskText}
                                                </ThemedText>
                                                <View style={styles.activityMetaRow}>
                                                    {domainName ? (
                                                        <ThemedText style={[styles.domainTagText, { color: textSecondary }]}>
                                                            Domain: {domainName}
                                                        </ThemedText>
                                                    ) : null}
                                                    {goalTherapist ? (
                                                        <View style={[styles.therapistTag, { backgroundColor: resolvedTheme === 'dark' ? '#14532d25' : '#f0fdf4', borderColor: '#86efac' }]}>
                                                            <Ionicons name="person-outline" size={11} color="#15803d" style={{ marginRight: 3 }} />
                                                            <ThemedText style={styles.therapistTagText} numberOfLines={1}>
                                                                Therapist: {goalTherapist}
                                                            </ThemedText>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}

                                {activities.length > 3 && (
                                    <ThemedText style={[styles.moreActivitiesText, { color: tInfo.color }]}>
                                        +{activities.length - 3} more activities...
                                    </ThemedText>
                                )}
                            </View>
                        );
                    })}
                </View>

                {item.comments ? (
                    <View style={[styles.commentBox, { borderTopColor: borderColor }]}>
                        <Ionicons name="chatbox-ellipses-outline" size={13} color={textSecondary} style={{ marginRight: 6 }} />
                        <ThemedText style={[styles.commentText, { color: textSecondary }]} numberOfLines={2}>
                            {"\""}{item.comments}{"\""}
                        </ThemedText>
                    </View>
                ) : null}

                <View style={styles.cardFooter}>
                    <View style={styles.mediaIndicators}>
                        {item.goalsphoto?.length > 0 && (
                            <View style={styles.mIndicator}>
                                <Ionicons name="image" size={14} color="#15803d" />
                                <ThemedText style={styles.mCount}>{item.goalsphoto.length}</ThemedText>
                            </View>
                        )}
                        {item.goalsvideo?.length > 0 && (
                            <View style={styles.mIndicator}>
                                <Ionicons name="videocam" size={14} color="#2563eb" />
                                <ThemedText style={styles.mCount}>{item.goalsvideo.length}</ThemedText>
                            </View>
                        )}
                    </View>
                    <View style={styles.detailsBtnContainer}>
                        <ThemedText style={[styles.detailsBtnText, { color: primaryColor }]}>View Details</ThemedText>
                        <Ionicons name="chevron-forward" size={16} color={primaryColor} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

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
                    <ThemedText style={styles.title}>Developmental Activity</ThemedText>
                    <View style={{ width: 44 }} />
                </View>
                <ThemedText style={styles.regDisplay}>{regNo}</ThemedText>
            </LinearGradient>

            <View style={styles.main}>
                {/* Therapy Category Horizontal Filter Bar */}
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
                                const tInfo = getTherapyInfo(tKey);

                                return (
                                    <TouchableOpacity
                                        key={tKey}
                                        onPress={() => setSelectedTherapy(tKey)}
                                        style={[
                                            styles.therapyFilterBtn,
                                            { backgroundColor: isSelected ? '#15803d' : cardBg, borderColor: isSelected ? '#15803d' : borderColor }
                                        ]}
                                    >
                                        <Ionicons
                                            name={tKey === 'All' ? 'grid-outline' : tInfo.icon}
                                            size={14}
                                            color={isSelected ? 'white' : tInfo.color}
                                            style={{ marginRight: 6 }}
                                        />
                                        <ThemedText
                                            style={[
                                                styles.therapyFilterText,
                                                { color: isSelected ? 'white' : textColor, fontWeight: isSelected ? '900' : '700' }
                                            ]}
                                        >
                                            {tKey === 'All' ? 'All Activities' : tInfo.name}
                                        </ThemedText>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {loading ? (
                    <ActivityIndicator style={{ marginTop: 50 }} color="#15803d" size="large" />
                ) : (
                    <FlatList
                        data={filteredGoalsList}
                        renderItem={renderGoalItem}
                        keyExtractor={(item, index) => item._id || index.toString()}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Ionicons name="clipboard-outline" size={80} color={borderColor} />
                                <ThemedText style={[styles.emptyTitle, { color: textSecondary }]}>
                                    No Activities Found
                                </ThemedText>
                                <ThemedText style={[styles.emptySub, { color: textSecondary }]}>
                                    {selectedTherapy !== 'All' 
                                        ? `No activities found under "${selectedTherapy}".`
                                        : 'No developmental activity records available for this child.'}
                                </ThemedText>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Goal / Activity Details Modal */}
            <Modal 
                visible={editMode} 
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setEditMode(false)}
            >
                <ThemedView style={styles.modalContainer}>
                    <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                        <View style={{ flex: 1 }}>
                            <ThemedText style={styles.modalTitle}>Activity Details</ThemedText>
                            {selectedGoal && (
                                <View style={styles.modalMetaRow}>
                                    <View style={styles.modalDateBadge}>
                                        <Ionicons name="calendar-outline" size={13} color={primaryColor} style={{ marginRight: 4 }} />
                                        <ThemedText style={{ fontSize: 12, color: textColor, fontWeight: '700' }}>
                                            Date: {formatDate(selectedGoal.date)}
                                        </ThemedText>
                                    </View>
                                    {(selectedGoal.therapist_name || selectedGoal.author_name || selectedGoal.created_by_name || selectedGoal.lastmodified_by_name) ? (
                                        <View style={[styles.authorBadgePill, { backgroundColor: resolvedTheme === 'dark' ? '#14532d' : '#f0fdf4', borderColor: '#86efac' }]}>
                                            <Ionicons name="person" size={12} color="#15803d" style={{ marginRight: 4 }} />
                                            <ThemedText style={styles.authorBadgePillText}>
                                                Therapist: {selectedGoal.therapist_name || selectedGoal.author_name || selectedGoal.created_by_name || selectedGoal.lastmodified_by_name}
                                            </ThemedText>
                                        </View>
                                    ) : null}
                                </View>
                            )}
                        </View>
                        <TouchableOpacity onPress={() => setEditMode(false)} style={styles.closeBtn}>
                            <Ionicons name="close" size={28} color={textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                        {/* Grouped Activities inside Modal */}
                        <View style={styles.field}>
                            <ThemedText style={styles.label}>Developmental Activities by Therapy</ThemedText>
                            {(() => {
                                const defaultT = selectedGoal?.therapy_name || THERAPY_MAP[selectedGoal?.therapy] || selectedGoal?.therapy || '';
                                const grouped = groupGoalsByTherapy(editedGoals, defaultT);

                                if (Object.keys(grouped).length === 0) {
                                    return (
                                        <View style={[styles.readOnlyBox, { backgroundColor: resolvedTheme === 'dark' ? '#0f172a' : '#f1f5f9' }]}>
                                            <ThemedText style={styles.readOnlyText}>No activities listed.</ThemedText>
                                        </View>
                                    );
                                }

                                return Object.entries(grouped).map(([tName, actList]) => {
                                    const tInfo = getTherapyInfo(tName);
                                    return (
                                        <View key={tName} style={[styles.modalTherapyCard, { backgroundColor: resolvedTheme === 'dark' ? '#1e293b' : '#f8fafc', borderColor }]}>
                                            <View style={styles.modalTherapyHeader}>
                                                <View style={[styles.therapyGroupIconBox, { backgroundColor: tInfo.color + '20' }]}>
                                                    <Ionicons name={tInfo.icon} size={16} color={tInfo.color} />
                                                </View>
                                                <ThemedText style={[styles.modalTherapyTitle, { color: tInfo.color }]}>
                                                    {tInfo.name}
                                                </ThemedText>
                                                <View style={[styles.countBadge, { backgroundColor: cardBg, borderColor }]}>
                                                    <ThemedText style={[styles.countBadgeText, { color: textSecondary }]}>
                                                        {actList.length}
                                                    </ThemedText>
                                                </View>
                                            </View>

                                            {actList.map((g, i) => {
                                                const taskText = typeof g === 'string' ? g : (g.task || g.goal || g.description || '');
                                                const domain = g?.domain_name || g?.domain;
                                                const goalTherapist = g?.therapist_name || g?.therapist || selectedGoal?.therapist_name || selectedGoal?.author_name || selectedGoal?.created_by_name || '';

                                                return (
                                                    <View key={i} style={[styles.goalItem, { backgroundColor: cardBg, borderColor }]}>
                                                        <View style={[styles.dot, { backgroundColor: tInfo.color, marginTop: 7 }]} />
                                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                                            <ThemedText style={styles.goalText}>{taskText}</ThemedText>
                                                            <View style={styles.modalGoalMetaRow}>
                                                                {domain ? (
                                                                    <ThemedText style={[styles.domainTagText, { color: textSecondary }]}>
                                                                        Domain: {domain}
                                                                    </ThemedText>
                                                                ) : null}
                                                                {goalTherapist ? (
                                                                    <View style={[styles.modalTherapistPill, { backgroundColor: resolvedTheme === 'dark' ? '#14532d30' : '#f0fdf4', borderColor: '#86efac' }]}>
                                                                        <Ionicons name="person-circle-outline" size={12} color="#15803d" style={{ marginRight: 4 }} />
                                                                        <ThemedText style={styles.modalTherapistPillText}>
                                                                            Therapist: {goalTherapist}
                                                                        </ThemedText>
                                                                    </View>
                                                                ) : null}
                                                            </View>
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    );
                                });
                            })()}
                        </View>

                        <View style={styles.field}>
                            <ThemedText style={styles.label}>Parents Comments & Notes</ThemedText>
                            <TextInput
                                style={[
                                    styles.textArea,
                                    { backgroundColor: resolvedTheme === 'dark' ? '#334155' : '#f8fafc', borderColor: borderColor, color: textColor }
                                ]}
                                multiline
                                value={editedComments}
                                onChangeText={setEditedComments}
                                placeholder="Add home observation notes or progress feedback..."
                                placeholderTextColor="#94a3b8"
                            />
                        </View>

                        <View style={styles.field}>
                            <ThemedText style={styles.label}>Therapist Recommendations</ThemedText>
                            <View style={[styles.readOnlyBox, { backgroundColor: resolvedTheme === 'dark' ? '#0f172a' : '#f1f5f9' }]}>
                                <ThemedText style={styles.readOnlyText}>
                                    {editedRecommendations || "No specific recommendations provided."}
                                </ThemedText>
                            </View>
                        </View>

                        <View style={styles.field}>
                            <ThemedText style={styles.label}>Media Evidence & Documentation</ThemedText>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                                {editedPhotos.map((p, i) => (
                                    <TouchableOpacity 
                                        key={`p-${i}`} 
                                        style={styles.mediaThumb} 
                                        onPress={() => { setPreviewPhotoUri(getPhotoUriString(p)); setPhotoPreviewVisible(true); }}
                                    >
                                        <Image source={{ uri: getPhotoUriString(p) }} style={StyleSheet.absoluteFill} />
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
                                             <Image source={{ uri: newMedia.uri }} style={StyleSheet.absoluteFill} />
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
                                {uploading ? <ActivityIndicator color="white" /> : <ThemedText style={styles.saveText}>Save Changes</ThemedText>}
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
                        style={[StyleSheet.absoluteFill, { backgroundColor: 'black', zIndex: 1000, justifyContent: 'center', alignItems: 'center' }]}
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
                        style={[StyleSheet.absoluteFill, { backgroundColor: 'black', zIndex: 1000, justifyContent: 'center', alignItems: 'center' }]}
                    >
                        <TouchableOpacity 
                            style={styles.closeVideo} 
                            onPress={handleCloseVideo}
                        >
                            <Ionicons name="close-circle" size={40} color="white" />
                        </TouchableOpacity>
                        {localVideoUri && !playbackError && (
                            <GoalVideoPlayer uri={localVideoUri} />
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
    filterSection: { paddingHorizontal: 20, marginBottom: 12 },
    filterHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    filterTitle: { fontSize: 11, fontWeight: '900', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    therapyFilterScroll: { paddingRight: 10 },
    therapyFilterBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, marginRight: 8, borderWidth: 1 },
    therapyFilterText: { fontSize: 13 },
    list: { padding: 20, paddingBottom: 50 },
    card: { borderRadius: 24, padding: 20, marginBottom: 18, borderWidth: 1, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    dateBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
    dateText: { fontSize: 12, fontWeight: '800', marginLeft: 6, color: '#15803d' },
    authorBadgePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1, maxWidth: '65%' },
    authorBadgePillText: { fontSize: 11, fontWeight: '800', color: '#15803d' },
    modalMetaRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    modalDateBadge: { flexDirection: 'row', alignItems: 'center' },
    deadlineBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
    deadlineText: { fontSize: 11, fontWeight: '800', color: '#c2410c' },
    therapyBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, gap: 6 },
    therapyBadgePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
    therapyBadgePillText: { fontSize: 11, fontWeight: '800' },
    cardBody: { marginBottom: 15 },
    therapyGroupSection: { marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
    therapyGroupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    therapyGroupIconBox: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    therapyGroupTitle: { fontSize: 13, fontWeight: '900', flex: 1 },
    countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
    countBadgeText: { fontSize: 11, fontWeight: '800' },
    activityItemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, paddingLeft: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, marginRight: 10, marginTop: 6 },
    activityText: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
    activityMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    therapistTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
    therapistTagText: { fontSize: 10, fontWeight: '700', color: '#15803d' },
    domainTagText: { fontSize: 11, fontWeight: '600' },
    moreActivitiesText: { fontSize: 11, fontWeight: '800', marginLeft: 16, marginTop: 4 },
    modalGoalMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    modalTherapistPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
    modalTherapistPillText: { fontSize: 11, fontWeight: '800', color: '#15803d' },
    commentBox: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, marginBottom: 12 },
    commentText: { fontSize: 13, fontStyle: 'italic', fontWeight: '500', flex: 1 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    mediaIndicators: { flexDirection: 'row' },
    mIndicator: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
    mCount: { fontSize: 12, fontWeight: '800', marginLeft: 5 },
    detailsBtnContainer: { flexDirection: 'row', alignItems: 'center' },
    detailsBtnText: { fontSize: 13, fontWeight: '800', marginRight: 4 },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyTitle: { fontSize: 18, fontWeight: '900', marginTop: 15 },
    emptySub: { fontSize: 14, textAlign: 'center', marginTop: 5, paddingHorizontal: 40 },
    modalContainer: { flex: 1 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
    modalTitle: { fontSize: 20, fontWeight: '900' },
    closeBtn: { padding: 5 },
    modalScroll: { padding: 20 },
    field: { marginBottom: 25 },
    label: { fontSize: 13, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 },
    modalTherapyCard: { borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1 },
    modalTherapyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    modalTherapyTitle: { fontSize: 14, fontWeight: '900', flex: 1 },
    textArea: { height: 120, borderRadius: 18, borderWidth: 1, padding: 15, fontSize: 16, textAlignVertical: 'top', fontWeight: '600' },
    readOnlyBox: { padding: 15, borderRadius: 18 },
    readOnlyText: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
    goalItem: { flexDirection: 'row', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
    goalText: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 20 },
    mediaScroll: { flexDirection: 'row' },
    mediaThumb: { width: 100, height: 100, borderRadius: 18, marginRight: 12, overflow: 'hidden', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    videoPlayOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
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
