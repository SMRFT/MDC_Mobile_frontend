
import { Platform } from 'react-native';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const searchGoals = async (regNo: string) => {
    try {
        const response = await axios.get(`${API_URL}/goals/`, {
            params: { reg_no: regNo }
        });
        return response.data;
    } catch (error: any) {
        if (error.response && error.response.status === 404) {
            return [];
        }
        console.error("Error fetching goals:", error);
        throw error;
    }
};

export const searchDevelopmentalGoals = async (regNo: string) => {
    try {
        const response = await axios.get(`${API_URL}/developmental-goals/`, {
            params: { reg_no: regNo }
        });
        return response.data;
    } catch (error: any) {
        if (error.response && error.response.status === 404) {
            return [];
        }
        console.error("Error fetching developmental goals:", error);
        throw error;
    }
};

export const uploadFile = async (file: any) => {
    try {
        const formData = new FormData();

        // Ensure uri is valid and type is inferred if missing
        const fileType = file.mimeType || (file.type === 'video' ? 'video/mp4' : 'image/jpeg');
        const fileName = file.fileName || file.name || (file.type === 'video' ? 'video.mp4' : 'photo.jpg');

        if (Platform.OS === 'web') {
            const response = await fetch(file.uri);
            const blob = await response.blob();
            formData.append('file', blob, fileName);
        } else {
            // React Native expects { uri, name, type } for file uploads
            const filePayload = {
                uri: file.uri,
                type: fileType,
                name: fileName,
            };
            console.log("Uploading file payload:", filePayload);
            formData.append('file', filePayload as any);
        }

        const response = await fetch(`${API_URL}/upload/`, {
            method: 'POST',
            body: formData,
            // Header Content-Type: multipart/form-data is not set explicitly
            // so that fetch can generate the boundary automatically.
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.status} ${errorText}`);
        }

        return await response.json(); // Should return { file_id, file_url }
    } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
    }
}

export const updateGoal = async (id: string, data: any) => {
    try {
        const response = await axios.put(`${API_URL}/goals/update/${id}/`, data);
        return response.data;
    } catch (error) {
        console.error("Error updating goal:", error);
        throw error;
    }
};
export const deleteGoal = async (id: string) => {
    try {
        const response = await axios.delete(`${API_URL}/goals/update/${id}/`);
        return response.data;
    } catch (error) {
        console.error("Error deleting goal:", error);
        throw error;
    }
};

export const fetchPatientSessionAttendance = async (regNo?: string, month?: string, year?: string) => {
    try {
        const params: any = {};
        if (regNo) params.reg_no = regNo;
        if (month) params.month = month;
        if (year) params.year = year;
        const response = await axios.get(`${API_URL}/patient-session-attendance/`, { params });
        return response.data;
    } catch (error: any) {
        console.error("Error fetching session attendance:", error);
        return [];
    }
};

export const confirmSessionAttendance = async (id: string, confirmedBy?: string) => {
    try {
        const response = await axios.post(`${API_URL}/patient-session-attendance/confirm/${id}/`, {
            confirmed_by: confirmedBy || 'Staff'
        });
        return response.data;
    } catch (error: any) {
        console.error("Error confirming session attendance:", error);
        throw error;
    }
};
