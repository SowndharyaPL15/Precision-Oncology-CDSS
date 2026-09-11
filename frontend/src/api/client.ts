import axios from 'axios';

// Update to match backend API URL when it's running, supporting Vite env variables in production
export const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8005';
export const API_BASE_URL = `${BACKEND_URL}/api/v1`;

export const getMediaUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_URL}${cleanPath}`;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Authentication Token Interceptor — attaches JWT to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — if we get a 401 and have a refresh token, attempt silent token refresh.
// This prevents the WebAuthn update fingerprint flow from failing after 60 minutes of inactivity.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = localStorage.getItem('refresh_token');

    // Attempt silent refresh on 401 only once, only if we have a refresh token,
    // and only if this isn't already a token-refresh request itself.
    if (
      error.response?.status === 401 &&
      refreshToken &&
      !originalRequest._retried &&
      !originalRequest.url?.includes('/auth/token/refresh')
    ) {
      originalRequest._retried = true;
      try {
        const refreshResp = await axios.post(`${API_BASE_URL}/auth/token/refresh`, {
          refresh_token: refreshToken,
        });
        const newAccessToken: string = refreshResp.data?.access_token;
        if (newAccessToken) {
          localStorage.setItem('token', newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
      } catch {
        // Refresh failed — token truly expired. Clear storage and redirect to home.
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
