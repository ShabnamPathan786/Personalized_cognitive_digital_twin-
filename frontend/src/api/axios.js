import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'http://localhost:8080/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Important for session-based auth
});

const shouldBroadcastUnauthorized = (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';

    if (status !== 401) {
        return false;
    }

    return !url.includes('/auth/login') && !url.includes('/auth/register');
};

// Request interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (typeof window !== 'undefined' && shouldBroadcastUnauthorized(error)) {
            window.dispatchEvent(
                new CustomEvent('auth:unauthorized', {
                    detail: { url: error?.config?.url || '' },
                })
            );
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
