import axios from 'axios';
import Config from '../constants/Config';

const API_BASE_URL = Config.API_BASE_URL;

export interface QnaItem {
    _id?: string;
    id?: string;
    qa_id: string;
    question: string;
    category: string;
    asked_by?: string;
    registration_number?: string;
    patient_name?: string;
    answers?: any[];
    status?: string;
    is_personal?: boolean;
    is_active?: boolean;
    created_date?: string;
}

export const fetchQnaList = async (regNo?: string, category?: string, type?: string) => {
    try {
        const params: any = {};
        if (regNo) {
            params.reg_no = regNo;
        }
        if (category && category !== 'All') {
            params.category = category;
        }
        if (type && type !== 'All') {
            params.type = type.toLowerCase();
        }
        const response = await axios.get(`${API_BASE_URL}/qna/`, { params });
        return response.data as QnaItem[];
    } catch (error: any) {
        if (error.response && error.response.status === 404) {
            return [];
        }
        console.error("Error fetching Q&A list:", error);
        throw error;
    }
};

export const submitQuestion = async (data: {
    question: string;
    category?: string;
    asked_by?: string;
    registration_number?: string;
    patient_name?: string;
    is_personal?: boolean;
}) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/qna/`, data);
        return response.data;
    } catch (error) {
        console.error("Error submitting question:", error);
        throw error;
    }
};
