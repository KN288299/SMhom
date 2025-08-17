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
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 检查认证状态
  const checkAuth = async (): Promise<boolean> => {
    const storedToken = localStorage.getItem('adminToken');
    console.log('检查认证状态，token:', storedToken ? '存在' : '不存在');
    
    if (!storedToken) {
      console.log('没有token，设置未认证状态');
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      setLoading(false);
      return false;
    }

    try {
      console.log('尝试验证token...');
      const response = await authAPI.getProfile();
      console.log('token验证成功:', response);
      
      // 更新用户信息
      setUser(response.admin);
      setToken(storedToken);
      setIsAuthenticated(true);
      setLoading(false);
      return true;
    } catch (error) {
      console.error('认证检查失败:', error);
      // 清除无效token
      localStorage.removeItem('adminToken');
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      setLoading(false);
      return false;
    }
  };

  // 初始化时检查认证状态
  useEffect(() => {
    checkAuth();
  }, []);

  // 登录函数
  const login = (newToken: string, userData: any) => {
    console.log('执行登录函数:', { token: newToken ? '存在' : '不存在', userData });
    
    // 存储token
    localStorage.setItem('adminToken', newToken);
    
    setUser(userData);
    setToken(newToken);
    setIsAuthenticated(true);
    setLoading(false);
    console.log('登录状态已设置:', { isAuthenticated: true, user: userData });
  };

  // 登出函数
  const logout = () => {
    console.log('执行登出函数');
    localStorage.removeItem('adminToken');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setLoading(false);
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
      checkAuth
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