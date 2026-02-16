import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./auth";
import type { ApiResponse, TokenPair, ApiError } from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---------- Request interceptor: attach Bearer token ----------
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------- Response interceptor: auto-refresh on 401 ----------
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: InternalAxiosRequestConfig) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve({ headers: { Authorization: `Bearer ${token}` } } as InternalAxiosRequestConfig);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only attempt refresh on 401 and if we haven't already retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the refresh completes
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((config) => api(config as InternalAxiosRequestConfig));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Use a raw axios call to avoid triggering interceptors
      const { data } = await axios.post<ApiResponse<TokenPair>>(
        `${API_BASE_URL}/auth/refresh`,
        { refresh_token: refreshToken }
      );

      const tokens = data.data;
      setTokens(tokens.access_token, tokens.refresh_token);

      processQueue(null, tokens.access_token);

      originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearTokens();
      // Redirect to login if on client
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

/**
 * Extract the `data` field from the API response envelope.
 * Usage: `const shows = await unwrap(api.get('/shows/search', { params }));`
 */
export async function unwrap<T>(
  promise: Promise<{ data: ApiResponse<T> }>
): Promise<T> {
  const response = await promise;
  return response.data.data;
}
