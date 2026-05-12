import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  const lang = localStorage.getItem('i18nextLng') || 'zh';
  config.headers['Accept-Language'] = lang;
  
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.error || '网络错误';
    return Promise.reject(new Error(msg));
  }
);

export default api;
