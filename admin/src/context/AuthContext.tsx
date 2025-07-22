import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../api/api';

// 定义认证上下文类型
interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  token: string | null;
  login: (token: string, user: any) => void;
  logout: () => void;
  loading: boolean;
  checkAuth: () => Promise<boolean>;
  forceLogout: () => void;
}

// 登录会话信息接口
interface LoginSession {
  token: string;
  user: any;
  loginTime: number;
  deviceFingerprint: string;
  sessionId: string;
}

// 创建认证上下文
export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  loading: true,
  checkAuth: async () => false,
  forceLogout: () => {},
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 生成设备指纹
  const generateDeviceFingerprint = (): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
      return canvas.toDataURL();
    }
    return 'default-fingerprint';
  };

  // 生成会话ID
  const generateSessionId = (): string => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  // 检查会话是否过期（5小时 = 18000000毫秒）
  const isSessionExpired = (loginTime: number): boolean => {
    const currentTime = Date.now();
    const sessionDuration = 5 * 60 * 60 * 1000; // 5小时
    return (currentTime - loginTime) > sessionDuration;
  };

  // 检查设备指纹是否匹配
  const isDeviceFingerprintValid = (storedFingerprint: string): boolean => {
    const currentFingerprint = generateDeviceFingerprint();
    return storedFingerprint === currentFingerprint;
  };

  // 检查会话是否有效
  const isSessionValid = (session: LoginSession): boolean => {
    if (!session || !session.token || !session.loginTime || !session.deviceFingerprint) {
      return false;
    }

    // 检查是否过期
    if (isSessionExpired(session.loginTime)) {
      console.log('会话已过期');
      return false;
    }

    // 检查设备指纹
    if (!isDeviceFingerprintValid(session.deviceFingerprint)) {
      console.log('设备指纹不匹配，可能是不同设备');
      return false;
    }

    return true;
  };

  // 强制登出（清除所有会话信息）
  const forceLogout = () => {
    console.log('强制登出');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminSession');
    sessionStorage.removeItem('adminSession');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setLoading(false);
  };

  // 检查认证状态
  const checkAuth = async (): Promise<boolean> => {
    const storedSession = localStorage.getItem('adminSession');
    console.log('检查认证状态，session:', storedSession ? '存在' : '不存在');
    
    if (!storedSession) {
      console.log('没有session，设置未认证状态');
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      setLoading(false);
      return false;
    }

    try {
      const session: LoginSession = JSON.parse(storedSession);
      
      // 检查会话是否有效
      if (!isSessionValid(session)) {
        console.log('会话无效，清除并设置未认证状态');
        forceLogout();
        return false;
      }

      console.log('尝试验证token...');
      const response = await authAPI.getProfile();
      console.log('token验证成功:', response);
      
      // 更新用户信息
      setUser(response.admin);
      setToken(session.token);
      setIsAuthenticated(true);
      setLoading(false);
      return true;
    } catch (error) {
      console.error('认证检查失败:', error);
      forceLogout();
      return false;
    }
  };

  // 初始化时检查认证状态
  useEffect(() => {
    checkAuth();
  }, []);

  // 设置自动注销定时器
  useEffect(() => {
    if (isAuthenticated && token) {
      const session = localStorage.getItem('adminSession');
      if (session) {
        const sessionData: LoginSession = JSON.parse(session);
        const timeUntilExpiry = (sessionData.loginTime + 5 * 60 * 60 * 1000) - Date.now();
        
        if (timeUntilExpiry > 0) {
          const timer = setTimeout(() => {
            console.log('会话超时，自动注销');
            forceLogout();
          }, timeUntilExpiry);

          return () => clearTimeout(timer);
        } else {
          // 会话已过期，立即注销
          forceLogout();
        }
      }
    }
  }, [isAuthenticated, token]);

  // 监听页面可见性变化（新打开后台需要重新登录）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        console.log('页面重新可见，检查会话状态');
        checkAuth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated]);

  // 监听存储变化（多标签页同步）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'adminSession' && e.newValue === null) {
        console.log('检测到其他标签页登出，同步登出');
        forceLogout();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 登录函数
  const login = (newToken: string, userData: any) => {
    console.log('执行登录函数:', { token: newToken ? '存在' : '不存在', userData });
    
    const session: LoginSession = {
      token: newToken,
      user: userData,
      loginTime: Date.now(),
      deviceFingerprint: generateDeviceFingerprint(),
      sessionId: generateSessionId()
    };

    // 存储到localStorage和sessionStorage
    localStorage.setItem('adminToken', newToken);
    localStorage.setItem('adminSession', JSON.stringify(session));
    sessionStorage.setItem('adminSession', JSON.stringify(session));
    
    setUser(userData);
    setToken(newToken);
    setIsAuthenticated(true);
    setLoading(false);
    console.log('登录状态已设置:', { isAuthenticated: true, user: userData });
  };

  // 登出函数
  const logout = () => {
    console.log('执行登出函数');
    forceLogout();
  };

  // 提供认证上下文
  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      token, 
      login, 
      logout, 
      loading, 
      checkAuth,
      forceLogout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// 自定义 hook 用于使用认证上下文
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 