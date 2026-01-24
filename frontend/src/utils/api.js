import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
});

// No need for Authorization header interceptor since we use httpOnly cookies
// The browser automatically includes cookies with requests when withCredentials: true

export default api;
