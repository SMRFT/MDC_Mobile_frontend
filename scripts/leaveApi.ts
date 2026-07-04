import axios from 'axios';
import Config from '../constants/Config';

const API_BASE_URL = Config.API_BASE_URL;

export const searchLeaves = async (regNo: string, month: string = 'All', year?: string) => {
    try {
        const params: any = { reg_no: regNo };
        if (month !== 'All') {
            params.month = month;
        }
        if (year) {
            params.year = year;
        }
        const response = await axios.get(`${API_BASE_URL}/leave/`, { params });
        return response.data;
    } catch (error: any) {
        if (error.response && error.response.status === 404) {
            return [];
        }
        console.error("Error fetching leaves:", error);
        throw error;
    }
};

export const createLeave = async (data: any) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/leave/`, data);
        return response.data;
    } catch (error) {
        console.error("Error creating leave:", error);
        throw error;
    }
};
