import axios from 'axios';

// 服务器基础URL - 修改为服务器IP地址
export const SERVER_BASE_URL = 'http://38.207.178.173:3000';

// 创建 axios 实例
const api = axios.create({
  baseURL: `${SERVER_BASE_URL}/api/admin`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 创建上传文件的axios实例
export const uploadApi = axios.create({
  baseURL: `${SERVER_BASE_URL}/api`,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// 请求拦截器 - 添加 token 到请求头
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 上传API请求拦截器
uploadApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理通用错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 错误，清除 token 并重定向到登录页
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 上传API响应拦截器
uploadApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 错误，清除 token 并重定向到登录页
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 管理员认证 API
export const authAPI = {
  getCaptcha: async () => {
    const response = await api.get('/captcha');
    return response.data;
  },
  login: async (username: string, password: string, captcha: string, captchaSessionId: string) => {
    const response = await api.post('/login', { 
      username, 
      password, 
      captcha, 
      captchaSessionId 
    });
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/profile');
    return response.data;
  },
};

// 统计数据 API
export const statsAPI = {
  getDashboardStats: async () => {
    const response = await api.get('/stats');
    return response.data;
  },
};

// 用户管理 API
export const userAPI = {
  getUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  getUserById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  updateUserStatus: async (id: string, status: string) => {
    const response = await api.put(`/users/${id}/status`, { status });
    return response.data;
  },
  deleteUser: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
  createUser: async (userData: any) => {
    const response = await api.post('/users', userData);
    return response.data;
  },
  // VIP管理
  activateVip: async (id: string, months: number = 12) => {
    const response = await axios.post(`${SERVER_BASE_URL}/api/users/${id}/vip`, { months }, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('adminToken')}`
      }
    });
    return response.data;
  },
  deactivateVip: async (id: string) => {
    const response = await axios.delete(`${SERVER_BASE_URL}/api/users/${id}/vip`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('adminToken')}`
      }
    });
    return response.data;
  },
};

// 员工管理 API
export const staffAPI = {
  getStaffList: async (params?: { page?: number; limit?: number; search?: string; isActive?: boolean; province?: string }) => {
    // 构建查询参数
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.province) queryParams.append('province', params.province);
    
    const queryString = queryParams.toString();
    const url = queryString ? `${SERVER_BASE_URL}/api/staff?${queryString}` : `${SERVER_BASE_URL}/api/staff`;
    
    const response = await axios.get(url);
    return response.data;
  },
  
  getStaffById: async (id: string) => {
    const response = await axios.get(`${SERVER_BASE_URL}/api/staff/${id}`);
    return response.data;
  },
  
  createStaff: async (staffData: FormData) => {
    const response = await uploadApi.post('/staff', staffData);
    return response.data;
  },
  
  updateStaff: async (id: string, staffData: FormData) => {
    const response = await uploadApi.put(`/staff/${id}`, staffData);
    return response.data;
  },
  
  deleteStaff: async (id: string) => {
    const response = await axios.delete(`${SERVER_BASE_URL}/api/staff/${id}`);
    return response.data;
  },
  
  // 上传员工图片
  uploadStaffImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await uploadApi.post('/staff/upload-image', formData);
    return response.data.imageUrl;
  }
};

// 订单管理API
export const orderAPI = {
  getOrders: async (params?: { 
    page?: number; 
    limit?: number; 
    status?: string;
    userId?: string;
    staffId?: string;
    orderNumber?: string;
  }) => {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.staffId) queryParams.append('staffId', params.staffId);
    if (params?.orderNumber) queryParams.append('orderNumber', params.orderNumber);
    
    const queryString = queryParams.toString();
    const url = queryString 
      ? `${SERVER_BASE_URL}/api/orders?${queryString}` 
      : `${SERVER_BASE_URL}/api/orders`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('获取订单列表失败:', error);
      throw error;
    }
  },
  
  getOrderById: async (id: string) => {
    try {
      const response = await axios.get(`${SERVER_BASE_URL}/api/orders/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`获取订单详情失败: ${id}`, error);
      throw error;
    }
  },
  
  createOrder: async (orderData: {
    userId: string;
    staffId: string;
    appointmentTime: string;
    price: number;
    address: string;
    notes?: string;
    serviceType: string;
    status?: string;
  }) => {
    try {
      console.log('API调用: 创建订单，数据:', orderData);
      console.log('当前令牌:', localStorage.getItem('adminToken'));
      
      const response = await axios.post(
        `${SERVER_BASE_URL}/api/orders`, 
        orderData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('API响应成功:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('API错误: 创建订单失败:', error);
      if (error.response) {
        console.error('错误状态码:', error.response.status);
        console.error('错误详情:', error.response.data);
      }
      throw error;
    }
  },
  
  updateOrderStatus: async (id: string, status: string) => {
    try {
      const response = await axios.put(
        `${SERVER_BASE_URL}/api/orders/${id}/status`, 
        { status },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error(`更新订单状态失败: ${id}`, error);
      throw error;
    }
  },
  
  updateOrder: async (id: string, orderData: {
    userId?: string;
    staffId?: string;
    appointmentTime?: string;
    price?: number;
    address?: string;
    notes?: string;
    serviceType?: string;
    status?: string;
  }) => {
    try {
      const response = await axios.put(
        `${SERVER_BASE_URL}/api/orders/${id}`, 
        orderData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error(`更新订单失败: ${id}`, error);
      throw error;
    }
  },
  
  deleteOrder: async (id: string) => {
    try {
      console.log(`API调用: 删除订单 ${id}`);
      console.log('当前令牌:', localStorage.getItem('adminToken'));
      
      const response = await axios.delete(`${SERVER_BASE_URL}/api/orders/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      console.log('API响应成功:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(`API错误: 删除订单失败: ${id}`, error);
      if (error.response) {
        console.error('错误状态码:', error.response.status);
        console.error('错误详情:', error.response.data);
      }
      throw error;
    }
  },
  
  getUserOrders: async (userId: string, params?: { page?: number; limit?: number; status?: string }) => {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    
    const queryString = queryParams.toString();
    const url = queryString 
      ? `${SERVER_BASE_URL}/api/orders/user/${userId}?${queryString}` 
      : `${SERVER_BASE_URL}/api/orders/user/${userId}`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`获取用户订单失败: ${userId}`, error);
      throw error;
    }
  }
};

// 客服管理API
export const customerServiceAPI = {
  getCustomerServices: async () => {
    try {
      const response = await axios.get(`${SERVER_BASE_URL}/api/customer-service`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      console.log('获取到的客服列表数据:', response.data);
      // 检查每个客服的头像路径
      if (Array.isArray(response.data)) {
        response.data.forEach(cs => {
          console.log(`客服 ${cs.name} 的头像路径: ${cs.avatar}`);
          if (cs.avatar) {
            console.log(`完整URL: ${SERVER_BASE_URL}${cs.avatar}`);
          }
        });
      }
      return response.data;
    } catch (error) {
      console.error('获取客服列表失败:', error);
      throw error;
    }
  },
  
  getCustomerServiceById: async (id: string) => {
    try {
      const response = await axios.get(`${SERVER_BASE_URL}/api/customer-service/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`获取客服详情失败: ${id}`, error);
      throw error;
    }
  },
  
  createCustomerService: async (data: {
    name: string;
    phoneNumber: string;
    password: string;
  }) => {
    try {
      const response = await axios.post(
        `${SERVER_BASE_URL}/api/customer-service`, 
        data,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('创建客服失败:', error);
      throw error;
    }
  },
  
  updateCustomerService: async (id: string, data: {
    name?: string;
    phoneNumber?: string;
    password?: string;
    status?: string;
    isActive?: boolean;
  }) => {
    try {
      const response = await axios.put(
        `${SERVER_BASE_URL}/api/customer-service/${id}`, 
        data,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('更新客服信息失败:', error);
      throw error;
    }
  },
  
  deleteCustomerService: async (id: string) => {
    try {
      const response = await axios.delete(
        `${SERVER_BASE_URL}/api/customer-service/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('删除客服失败:', error);
      throw error;
    }
  },
  
  uploadAvatar: async (id: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await axios.post(
        `${SERVER_BASE_URL}/api/customer-service/${id}/avatar`, 
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('上传头像失败:', error);
      throw error;
    }
  },
  
  updateStatus: async (id: string, status: 'online' | 'offline' | 'busy') => {
    try {
      const response = await axios.put(
        `${SERVER_BASE_URL}/api/customer-service/${id}/status`, 
        { status },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('更新客服状态失败:', error);
      throw error;
    }
  }
};

// 页面配置管理API
export const pageConfigAPI = {
  getPageConfig: async () => {
    try {
      const response = await axios.get(`${SERVER_BASE_URL}/api/page-config`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('获取页面配置失败:', error);
      throw error;
    }
  },
  
  updatePageConfig: async (config: {
    centerButtonText: string;
    centerButtonColor: string;
    bannerImages?: string[];
    appName?: string;
    homeTitle?: string;
  }) => {
    try {
      const response = await axios.put(
        `${SERVER_BASE_URL}/api/page-config`, 
        config,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('更新页面配置失败:', error);
      throw error;
    }
  },

  uploadPageImage: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await uploadApi.post('/page-config/upload-image', formData);
      return response.data;
    } catch (error) {
      console.error('上传页面图片失败:', error);
      throw error;
    }
  },

  deletePageImage: async (imageUrl: string) => {
    try {
      const response = await axios.delete(`${SERVER_BASE_URL}/api/page-config/delete-image`, {
        data: { imageUrl },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('删除页面图片失败:', error);
      throw error;
    }
  }
};

// 导出页面配置API的别名以兼容组件中的使用
export const getPageConfig = pageConfigAPI.getPageConfig;
export const updatePageConfig = pageConfigAPI.updatePageConfig;
export const uploadPageImage = pageConfigAPI.uploadPageImage;
export const deletePageImage = pageConfigAPI.deletePageImage;

export default api; 