import axios from 'axios';
import { API_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Order {
  id: string;
  _id?: string;
  orderNumber: string;
  serviceType: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  appointmentTime: string;
  date: string; // 兼容前端显示
  price: number;
  address: string;
  notes?: string;
  user?: {
    id: string;
    name: string;
    phoneNumber: string;
  };
  staff?: {
    id: string;
    name: string;
    job: string;
    image: string;
  };
  staffName?: string;
  staffImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderQueryParams {
  page?: number;
  limit?: number;
  status?: string;
}

// 获取用户订单列表
export const getUserOrders = async (params?: OrderQueryParams): Promise<{
  orders: Order[];
  page: number;
  pages: number;
  total: number;
}> => {
  try {
    // 获取认证token
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('未授权，请先登录');
    }

    // 获取用户信息
    const userInfoStr = await AsyncStorage.getItem('userInfo');
    if (!userInfoStr) {
      throw new Error('用户信息不存在');
    }

    const userInfo = JSON.parse(userInfoStr);
    const userId = userInfo._id || userInfo.id;

    // 构建查询参数
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);

    // 构建URL
    const queryString = queryParams.toString();
    const url = queryString 
      ? `${API_URL}/orders/user/${userId}?${queryString}` 
      : `${API_URL}/orders/user/${userId}`;

    // 发送请求
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // 处理响应数据，添加兼容字段
    const processedOrders = response.data.orders.map((order: Order) => ({
      ...order,
      id: order._id || order.id,
      date: new Date(order.appointmentTime).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      staffName: order.staff?.name || '',
      staffImage: order.staff?.image || '',
    }));

    return {
      ...response.data,
      orders: processedOrders,
    };
  } catch (error) {
    console.error('获取订单列表失败:', error);
    throw error;
  }
};

// 获取订单详情
export const getOrderDetail = async (orderId: string): Promise<Order> => {
  try {
    // 获取认证token
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('未授权，请先登录');
    }

    // 发送请求
    const response = await axios.get(`${API_URL}/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // 处理响应数据，添加兼容字段
    return {
      ...response.data,
      id: response.data._id || response.data.id,
      date: new Date(response.data.appointmentTime).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      staffName: response.data.staff?.name || '',
      staffImage: response.data.staff?.image || '',
    };
  } catch (error) {
    console.error(`获取订单 ${orderId} 详情失败:`, error);
    throw error;
  }
};

// 取消订单
export const cancelOrder = async (orderId: string): Promise<Order> => {
  try {
    // 获取认证token
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('未授权，请先登录');
    }

    // 发送请求
    const response = await axios.put(
      `${API_URL}/orders/${orderId}/status`,
      { status: 'cancelled' },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // 处理响应数据
    return {
      ...response.data,
      id: response.data._id || response.data.id,
      date: new Date(response.data.appointmentTime).toLocaleString('zh-CN'),
      staffName: response.data.staff?.name || '',
      staffImage: response.data.staff?.image || '',
    };
  } catch (error) {
    console.error(`取消订单 ${orderId} 失败:`, error);
    throw error;
  }
};

export default {
  getUserOrders,
  getOrderDetail,
  cancelOrder,
}; 