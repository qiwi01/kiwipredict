import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
  timeout: 30000, // 30 second timeout for cold starts
});

const rawApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
  timeout: 30000,
});

// Track if we're currently waking up the server
let isWakingUp = false;
let wakeUpPromise = null;

// Function to wake up the server
const wakeUpServer = async () => {
  if (isWakingUp && wakeUpPromise) {
    return wakeUpPromise;
  }

  isWakingUp = true;
  console.log('[API] Server might be sleeping, attempting to wake up...');

  wakeUpPromise = rawApi.get('/wakeup', { timeout: 60000, _skipRetry: true })
    .then(() => {
      console.log('[API] Server is now awake');
      return true;
    })
    .catch((error) => {
      console.log('[API] Wake up attempt failed:', error.message);
      return false;
    })
    .finally(() => {
      isWakingUp = false;
      wakeUpPromise = null;
    });

  return wakeUpPromise;
};

// Request interceptor - add any pre-request logic here
api.interceptors.request.use(
  (config) => {
    // You can add loading indicators here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors and retries
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if this is a network error or timeout (server might be sleeping)
    const isNetworkError = !error.response && (
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ETIMEDOUT' ||
      error.message?.includes('Network Error') ||
      error.message?.includes('timeout')
    );

    const isWakeupRequest = originalRequest?.url?.includes('/wakeup');

    // If server is sleeping and we haven't retried yet. Never retry the wakeup
    // request through this interceptor, otherwise /wakeup recursively retries itself.
    if (isNetworkError && !isWakeupRequest && !originalRequest?._retry && !originalRequest?._skipRetry) {
      originalRequest._retry = true;
      console.log('[API] Request failed, server might be sleeping. Retrying after wake-up...');

      // Try to wake up the server
      await wakeUpServer();

      // Wait a moment for the server to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Retry the original request
      try {
        return api(originalRequest);
      } catch (retryError) {
        console.error('[API] Retry failed:', retryError.message);
        return Promise.reject(retryError);
      }
    }

    // Handle specific error status codes
    if (error.response) {
      const status = error.response.status;

      // Handle 401 Unauthorized - redirect to login if needed
      if (status === 401) {
        // Don't redirect for login/register requests
        if (!originalRequest.url?.includes('/auth/login') && 
            !originalRequest.url?.includes('/auth/register')) {
          // Clear any stored user data
          localStorage.removeItem('user');
          // Only redirect if not already on login/register pages
          if (!window.location.pathname.includes('/login') && 
              !window.location.pathname.includes('/register')) {
            window.location.href = '/login';
          }
        }
      }

      // Handle 429 Rate Limited
      if (status === 429) {
        console.warn('[API] Rate limited. Please slow down.');
      }

      // Handle 500 Server Error
      if (status >= 500) {
        console.error('[API] Server error:', error.response.data);
      }
    }

    return Promise.reject(error);
  }
);

// Helper function to make requests with automatic retry on cold start
export const apiWithRetry = async (method, url, data = null, options = {}) => {
  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await api({
        method,
        url,
        data,
        ...options,
      });
      return response;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const isNetworkError = !error.response;

      if (isLastAttempt || !isNetworkError) {
        throw error;
      }

      console.log(`[API] Attempt ${attempt} failed, retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }
};

// Pre-warm the server when the app loads
export const preWarmServer = async () => {
  try {
    console.log('[API] Pre-warming server...');
    await rawApi.get('/wakeup', { timeout: 60000, _skipRetry: true });
    console.log('[API] Server is ready');
    return true;
  } catch (error) {
    console.log('[API] Pre-warm failed:', error.message);
    return false;
  }
};

export default api;