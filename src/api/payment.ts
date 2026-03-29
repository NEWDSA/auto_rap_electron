import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// Add token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const PaymentApi = {
  // Register
  register: (data: any) => api.post('/auth/register', data),

  // Login
  login: (data: any) => api.post('/auth/login', data),

  // Get User Info
  getUserInfo: () => api.get('/auth/me'),

  // Create payment order
  createOrder: () => api.post('/payment/create'),

  // Check download permission (or just use getUserInfo)
  checkDownloadAuth: () => api.get('/download/authorize'),

  // Download file
  downloadFile: () => api.get('/download/file', { responseType: 'blob' }),
}
