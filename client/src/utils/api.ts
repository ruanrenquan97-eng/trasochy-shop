import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 增加超时时间到120秒，以支持较慢的AI生成和翻译
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
    if (err.response?.status === 401) {
      // 自动登出处理
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    const msg = err.response?.data?.error || '网络错误';
    return Promise.reject(new Error(msg));
  }
);

export default api;
