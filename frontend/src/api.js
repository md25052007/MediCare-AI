import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

const api = axios.create({
    baseURL: API_URL,
});

// Automatically attach the JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authAPI = {
    login: async (username, password) => {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        const response = await api.post('/login', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return response.data;
    },
    // NEW: Register new users
    register: async (username, password, role) => {
        const response = await api.post('/register', {
            username: username,
            password: password,
            role: role
        });
        return response.data;
    }
};

// NEW: Endpoints for handling EHR data
export const recordsAPI = {
    // Fetch records for a specific patient
    getPatientRecords: async (patientId) => {
        const response = await api.get(`/records/${patientId}`);
        return response.data;
    },
    // Create a new record
    createRecord: async (recordData) => {
        const response = await api.post('/records/', recordData);
        return response.data;
    }
};

export const chatAPI = {
    query: async (query, targetId = null, visitDates = null) => {
        const response = await api.post('/chat', {
            query: query,
            target_id: targetId,
            visit_dates: visitDates
        });
        return response.data;
    }
};

export default api;