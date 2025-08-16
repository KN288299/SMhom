import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../config/api';
import AndroidPushService from '../services/AndroidPushService';

interface AuthContextType {
  isLoading: boolean;
  userToken: string | null;
  userInfo: any;
  login: (token: string, userData: any) => Promise<void>;
  logout: () => Promise<void>;
  isCustomerService: () => boolean;
  refreshUserInfo: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  userToken: null,
  userInfo: null,
  login: async () => {},
  logout: async () => {},
  isCustomerService: () => false,
  refreshUserInfo: async () => false,
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  // 初始化时检查登录状态
  useEffect(() => {
    bootstrapAsync();
  }, []);

  // 检查存储的token并验证
  const bootstrapAsync = async () => {
    try {
      console.log('正在检查存储的登录状态...');
      const token = await AsyncStorage.getItem('token');
      const userInfoString = await AsyncStorage.getItem('userInfo');
      
      if (token && userInfoString) {
        console.log('发现存储的token和用户信息，验证token有效性');
        // 验证token有效性
        const isValid = await validateToken(token);
        if (isValid) {
          console.log('Token有效，设置登录状态');
          setUserToken(token);
          setUserInfo(JSON.parse(userInfoString));
        } else {
          console.log('Token无效，清除存储');
          // token无效，清除存储
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('userInfo');
        }
      } else {
        console.log('未找到存储的登录状态');
      }
    } catch (e) {
      console.log('恢复token失败', e);
    } finally {
      setIsLoading(false);
    }
  };

  // 验证token是否有效
  const validateToken = async (token: string) => {
    try {
      console.log('正在验证token...');
      const response = await axios.get(`${API_URL}${API_ENDPOINTS.VALIDATE_TOKEN}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Token验证响应:', response.data);
      return response.data.isValid;
    } catch (error) {
      console.log('Token验证失败:', error);
      return false;
    }
  };

  // 登录函数
  const login = async (token: string, userData: any) => {
    try {
      console.log('正在保存登录状态...');
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('userInfo', JSON.stringify(userData));
      setUserToken(token);
      setUserInfo(userData);
      console.log('登录状态保存成功');
      
      // 登录后上传FCM Token
      try {
        await AndroidPushService.updateFCMTokenAfterLogin(token);
      } catch (pushError) {
        console.log('上传FCM Token失败:', pushError);
      }
    } catch (e) {
      console.log('登录保存失败', e);
    }
  };

  // 注销函数
  const logout = async () => {
    try {
      console.log('正在注销...');
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userInfo');
      setUserToken(null);
      setUserInfo(null);
      console.log('注销成功');
    } catch (e) {
      console.log('注销失败', e);
    }
  };

  // 检查是否是客服用户
  const isCustomerService = () => {
    return userInfo?.userType === 'customerService';
  };

  // 刷新用户信息
  const refreshUserInfo = async () => {
    if (!userToken) {
      return false;
    }

    try {
      console.log('正在刷新用户信息...');
      const response = await axios.get(`${API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      
      if (response.data) {
        console.log('用户信息刷新成功:', response.data);
        console.log('VIP状态:', response.data.isVip, 'VIP到期时间:', response.data.vipExpiryDate);
        setUserInfo(response.data);
        await AsyncStorage.setItem('userInfo', JSON.stringify(response.data));
        return true;
      }
      return false;
    } catch (error) {
      console.log('刷新用户信息失败:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        userToken,
        userInfo,
        login,
        logout,
        isCustomerService,
        refreshUserInfo
      }}>
      {children}
    </AuthContext.Provider>
  );
};

// 使用AuthContext的钩子
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // 在开发环境下记录错误，但不抛出异常以避免应用崩溃
    console.error('useAuth必须在AuthProvider内使用');
    // 返回默认值而不是抛出错误
    return {
      isLoading: false, // 修改为false，避免无限加载
      userToken: null,
      userInfo: null,
      login: async () => {
        console.warn('AuthContext未初始化，login操作被跳过');
      },
      logout: async () => {
        console.warn('AuthContext未初始化，logout操作被跳过');
      },
      isCustomerService: () => false,
      refreshUserInfo: async () => {
        console.warn('AuthContext未初始化，refreshUserInfo操作被跳过');
        return false;
      },
    };
  }
  return context;
}; 