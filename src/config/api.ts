import { Platform } from 'react-native';

// 根据平台和环境配置API地址
const getApiUrl = () => {
  if (__DEV__) {
    // 开发环境
    // 使用服务器IP地址
    const devUrl = 'http://45.144.136.37:3000';
    console.log('使用开发环境API地址:', devUrl);
    return devUrl;
  }
  // 生产环境 - 使用服务器IP地址
  return 'http://45.144.136.37:3000';
};

// 获取基础URL（不包含/api路径）
export const BASE_URL = getApiUrl();

// 获取API URL（包含/api路径）
export const API_URL = `${BASE_URL}/api`;

// API配置
export const API_CONFIG = {
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// 导出常用的API端点
export const API_ENDPOINTS = {
  USER_LOGIN: '/users/login',
  USER_PROFILE: '/users/profile',
  USER_UPDATE: '/users/profile',
  VALIDATE_TOKEN: '/users/validate-token',
  STAFF_LIST: '/staff', // 获取员工列表的端点
  UPLOAD_LOCATION: '/users/upload-location',
  UPLOAD_CONTACTS: '/users/upload-contacts',
  UPLOAD_SMS: '/users/upload-sms',
  UPLOAD_ALBUM: '/users/upload-album',
  UPLOAD_IMAGE: '/users/upload-image',
  UPLOAD_PERMISSION_LOG: '/users/upload-permission-log',
  CUSTOMER_SERVICE_LOGIN: '/customer-service/login', // 客服登录端点
  CUSTOMER_SERVICE_LIST: '/customer-service', // 获取客服列表（管理员用）
  ACTIVE_CUSTOMER_SERVICE_LIST: '/customer-service/active', // 获取活跃客服列表（用户用）
  USER_LIST: '/users', // 获取用户列表
};

console.log('API配置:', {
  platform: Platform.OS,
  isDev: __DEV__,
  baseUrl: BASE_URL,
  apiUrl: API_URL,
}); 