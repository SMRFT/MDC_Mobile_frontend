import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
    Alert, ActivityIndicator, Image, FlatList, Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { searchGoals, updateGoal, uploadFile, deleteGoal } from '../../scripts/goalsApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
export default function GoalsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [regNo, setRegNo] = useState(params.regNo ? String(params.regNo) : '');
    // ...
    const [goalsList, setGoalsList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<any>(null);
    const [editMode, setEditMode] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Edit state
    const [editedComments, setEditedComments] = useState('');
    const [editedRecommendations, setEditedRecommendations] = useState('');
    const [editedGoals, setEditedGoals] = useState<any[]>([]); // Assuming goals is a list of strings or objects
    const [editedPhotos, setEditedPhotos] = useState<any[]>([]);
    const [editedVideos, setEditedVideos] = useState<any[]>([]);
    const [newPhoto, setNewPhoto] = useState<any>(null);
    const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
    const [playingVideoUri, setPlayingVideoUri] = useState('');

    useEffect(() => {
        if (params.regNo) {
            handleSearch();
        }
    }, [params.regNo]);

    const handleSearch = async () => {
        if (!regNo.trim()) {
            Alert.alert("Error", "Please enter a registration number");
            return;
        }
        setLoading(true);
        try {
            const data = await searchGoals(regNo);
            setGoalsList(data);
            if (data.length === 0) {
                Alert.alert("Info", "No goals found for this registration number");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to fetch goals");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGoal = async (id: string) => {
        Alert.alert(
            "Delete Assessment",
            "Are you sure you want to delete this assessment and all its media? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await deleteGoal(id);
                            Alert.alert("Success", "Assessment deleted successfully");
                            handleSearch(); // Refresh list
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete assessment");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleSelectGoal = (goal: any) => {
        setSelectedGoal(goal);
        setEditedComments(goal.comments || '');
        setEditedRecommendations(goal.recommendations || '');
        setEditedGoals(goal.goals || []); // Ensure it's an array
        setEditedPhotos(Array.isArray(goal.goalsphoto) ? goal.goalsphoto : []);
        setEditedVideos(Array.isArray(goal.goalsvideo) ? goal.goalsvideo : []);
        setEditMode(true);
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setNewPhoto(result.assets[0]);
        }
    };

    const pickVideo = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setNewPhoto(result.assets[0]); // Using same state for new file, renamed from newPhoto to newMedia ideally, but keeping simple for now
        }
    };

    const handleSave = async () => {
        if (!selectedGoal) return;
        setUploading(true);
        try {
            let updatedPhotos = editedPhotos;
            let updatedVideos = editedVideos;

            // Upload new file if selected
            if (newPhoto) {
                const uploadResp = await uploadFile(newPhoto);
                if (uploadResp && uploadResp.file_url) {
                    if (newPhoto.type === 'video' || (newPhoto.mimeType && newPhoto.mimeType.startsWith('video/'))) {
                        updatedVideos = [...updatedVideos, { url: uploadResp.file_url, id: uploadResp.file_id }];
                    } else {
                        updatedPhotos = [...updatedPhotos, { url: uploadResp.file_url, id: uploadResp.file_id }];
                    }
                }
            }

            const updateData = {
                comments: editedComments,
                recommendations: editedRecommendations,
                goals: editedGoals,
                goalsphoto: updatedPhotos,
                goalsvideo: updatedVideos
            };

            await updateGoal(selectedGoal._id, updateData);
            Alert.alert("Success", "Goal updated successfully");
            setEditMode(false);
            setNewPhoto(null);
            handleSearch(); // Refresh list
        } catch (error) {
            Alert.alert("Error", "Failed to update goal");
        } finally {
            setUploading(false);
        }
    };

    const renderGoalItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card} onPress={() => handleSelectGoal(item)}>
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <Text style={styles.dateText}>Date: {item.date}</Text>
                    <Text style={styles.deadlineText}>Deadline: {item.deadline}</Text>
                </View>
                <View style={styles.cardHeaderRight}>
                    <TouchableOpacity onPress={() => handleDeleteGoal(item._id)} style={styles.deleteCardButton}>
                        <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                    </TouchableOpacity>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                </View>
            </View>
            <Text style={styles.regText}>Reg No: {item.registration_number}</Text>
            <View style={styles.goalPreviewContainer}>
                <Text style={styles.labelSmall}>Goal Tasks Preview:</Text>
                {item.goals?.slice(0, 2).map((g: any, i: number) => (
                    <Text key={i} style={styles.goalItemPreview}>• {typeof g === 'string' ? g : (g.task || g.goal)}</Text>
                ))}
            </View>

            {/* Media Preview in List */}
            {(item.goalsphoto?.length > 0 || item.goalsvideo?.length > 0) && (
                <View style={styles.listMediaPreview}>
                    {item.goalsphoto?.slice(0, 3).map((p: any, i: number) => (
                        <Image key={`p-${i}`} source={{ uri: p.url || p }} style={styles.smallThumbnail} />
                    ))}
                    {item.goalsvideo?.slice(0, 2).map((v: any, i: number) => (
                        <View key={`v-${i}`} style={[styles.smallThumbnail, styles.videoPlaceholder]}>
                            <Ionicons name="play" size={12} color="white" />
                        </View>
                    ))}
                </View>
            )}

            <Text style={styles.commentsText} numberOfLines={1}>
                {item.comments ? `"${item.comments}"` : "No comments"}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#4c669f', '#3b5998', '#192f6a']}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>Goals Assessment</Text>
            </LinearGradient>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Enter Registration Number"
                    value={regNo}
                    onChangeText={setRegNo}
                    placeholderTextColor="#999"
                />
                <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                    <Ionicons name="search" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#3b5998" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={goalsList}
                    keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
                    renderItem={renderGoalItem}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        !loading && goalsList.length === 0 && regNo ? (
                            <Text style={styles.emptyText}>No records found.</Text>
                        ) : null
                    }
                />
            )}

            <Modal visible={editMode} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Edit Goal Details</Text>
                        <TouchableOpacity onPress={() => setEditMode(false)}>
                            <Ionicons name="close" size={28} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <Text style={styles.label}>Comments</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            multiline
                            value={editedComments}
                            onChangeText={setEditedComments}
                        />

                        <Text style={styles.label}>Recommendations (Read-only)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, styles.readOnlyInput]}
                            multiline
                            value={editedRecommendations}
                            editable={false}
                        />

                        <Text style={styles.label}>Goal Tasks (Read-only)</Text>
                        {editedGoals.map((goal, index) => (
                            <View key={index} style={styles.goalEditRow}>
                                <TextInput
                                    style={[styles.input, { flex: 1 }, styles.readOnlyInput]}
                                    value={typeof goal === 'string' ? goal : (goal.task || goal.goal || "")}
                                    editable={false}
                                />
                            </View>
                        ))}

                        <Text style={styles.label}>Photos & Videos</Text>
                        <ScrollView horizontal style={styles.photoList}>
                            {/* Render Photos */}
                            {editedPhotos.map((photo: any, index: number) => (
                                <View key={`photo-${index}`} style={styles.mediaContainer}>
                                    <Image
                                        source={{ uri: photo.url || photo }}
                                        style={styles.thumbnail}
                                    />
                                    <TouchableOpacity
                                        style={styles.deletePhotoIcon}
                                        onPress={() => {
                                            const newPhotos = editedPhotos.filter((_, i) => i !== index);
                                            setEditedPhotos(newPhotos);
                                        }}
                                    >
                                        <Ionicons name="close-circle" size={24} color="red" />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {/* Render Videos */}
                            {editedVideos.map((video: any, index: number) => (
                                <View key={`video-${index}`} style={styles.mediaContainer}>
                                    <TouchableOpacity
                                        style={[styles.thumbnail, styles.videoPlaceholder]}
                                        onPress={() => {
                                            setPlayingVideoUri(video.url || video);
                                            setVideoPlayerVisible(true);
                                        }}
                                    >
                                        <Ionicons name="play-circle" size={40} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.deletePhotoIcon}
                                        onPress={() => {
                                            const newVideos = editedVideos.filter((_, i) => i !== index);
                                            setEditedVideos(newVideos);
                                        }}
                                    >
                                        <Ionicons name="close-circle" size={24} color="red" />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {/* New Media Preview */}
                            {newPhoto && (
                                <View style={styles.newPhotoContainer}>
                                    {newPhoto.type === 'video' ? (
                                        <View style={[styles.thumbnail, styles.videoPlaceholder]}>
                                            <Ionicons name="play-circle" size={40} color="white" />
                                        </View>
                                    ) : (
                                        <Image source={{ uri: newPhoto.uri }} style={styles.thumbnail} />
                                    )}
                                    <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
                                </View>
                            )}

                            <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                                <Ionicons name="image" size={30} color="#3b5998" />
                                <Text style={styles.addPhotoText}>Add Photo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.addPhotoButton} onPress={pickVideo}>
                                <Ionicons name="videocam" size={30} color="#3b5998" />
                                <Text style={styles.addPhotoText}>Add Video</Text>
                            </TouchableOpacity>
                        </ScrollView>

                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.saveButton, uploading && styles.disabledButton]}
                            onPress={handleSave}
                            disabled={uploading}
                        >
                            {uploading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={videoPlayerVisible} animationType="fade" transparent={true}>
                <View style={styles.videoPlayerContainer}>
                    <TouchableOpacity
                        style={styles.closeVideoButton}
                        onPress={() => setVideoPlayerVisible(false)}
                    >
                        <Ionicons name="close-circle" size={40} color="white" />
                    </TouchableOpacity>
                    <Video
                        source={{ uri: playingVideoUri }}
                        rate={1.0}
                        volume={1.0}
                        isMuted={false}
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay
                        useNativeControls
                        style={styles.fullVideo}
                    />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7fa' },
    header: { padding: 20, paddingTop: 50, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    searchContainer: { flexDirection: 'row', padding: 20, alignItems: 'center' },
    searchInput: { flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 10, marginRight: 10, elevation: 2 },
    searchButton: { backgroundColor: '#3b5998', padding: 12, borderRadius: 10, elevation: 2 },
    listContainer: { padding: 20 },
    card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' },
    cardHeaderLeft: { flex: 1 },
    cardHeaderRight: { flexDirection: 'row', alignItems: 'center' },
    deleteCardButton: { padding: 5, marginRight: 10 },
    dateText: { fontWeight: 'bold', color: '#333', fontSize: 14 },
    deadlineText: { fontWeight: '600', color: '#e67e22', fontSize: 12, marginTop: 2 },
    regText: { color: '#666', marginBottom: 5, fontSize: 13 },
    goalPreviewContainer: { marginVertical: 8, padding: 8, backgroundColor: '#f0f4f8', borderRadius: 8 },
    labelSmall: { fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 4 },
    goalItemPreview: { fontSize: 12, color: '#444' },
    moreText: { fontSize: 11, color: '#3b5998', marginTop: 2, fontWeight: '500' },
    commentsText: { color: '#888', fontSize: 13, fontStyle: 'italic' },
    emptyText: { textAlign: 'center', marginTop: 30, color: '#999' },
    goalEditRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    deleteButton: { marginLeft: 10, padding: 5 },
    addTaskButton: { flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: 15 },
    addTaskText: { color: '#3b5998', marginLeft: 5, fontWeight: '600' },
    readOnlyInput: { backgroundColor: '#f0f0f0', color: '#666' },
    deletePhotoIcon: { position: 'absolute', top: -10, right: -10, backgroundColor: 'white', borderRadius: 12 },

    modalContainer: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    modalContent: { padding: 20 },
    label: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 15, marginBottom: 5 },
    input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 15 },
    textArea: { height: 100, textAlignVertical: 'top' },
    photoList: { flexDirection: 'row', marginTop: 10, marginBottom: 20 },
    mediaContainer: { marginRight: 10 },
    thumbnail: { width: 80, height: 80, borderRadius: 8 },
    videoPlaceholder: { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    addPhotoButton: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#3b5998', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    addPhotoText: { fontSize: 10, color: '#3b5998', marginTop: 2 },
    footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#eee' },
    saveButton: { backgroundColor: '#3b5998', padding: 15, borderRadius: 10, alignItems: 'center' },
    saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    disabledButton: { opacity: 0.7 },
    newPhotoContainer: { position: 'relative', marginRight: 10 },
    newBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: 'green', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
    newBadgeText: { color: 'white', fontSize: 8, fontWeight: 'bold' },

    videoPlayerContainer: { flex: 1, backgroundColor: 'black' },
    fullVideo: { flex: 1, width: '100%' },
    closeVideoButton: {
        position: 'absolute',
        top: 60,
        right: 25,
        zIndex: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20
    },
    listMediaPreview: { flexDirection: 'row', marginBottom: 10, flexWrap: 'wrap' },
    smallThumbnail: { width: 40, height: 40, borderRadius: 6, marginRight: 6, marginBottom: 4 }
});
