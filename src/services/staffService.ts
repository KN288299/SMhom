import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../config/api';

// 员工接口
export interface StaffMember {
  id: string;
  _id?: string; // MongoDB ObjectId
  name: string;
  age: number;
  job: string;
  image: string;
  province?: string; // 保留省份字段
  height?: number;
  weight?: number;
  description?: string;
  photos?: string[];
  tag?: string;
}

// 分页响应接口
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 查询参数接口
export interface StaffQueryParams {
  page?: number;
  limit?: number;
  province?: string; // 添加省份筛选
  search?: string;  // 添加搜索关键词
  job?: string;     // 添加职业搜索
  age?: number;     // 添加年龄搜索
}

/**
 * 获取员工列表
 * 从后端API获取实际员工数据
 */
export const getStaffList = async (params?: StaffQueryParams): Promise<StaffMember[]> => {
  try {
    // 构建查询参数
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.province) queryParams.append('province', params.province);
    
    // 添加搜索相关参数
    if (params?.search) queryParams.append('search', params.search);
    if (params?.job) queryParams.append('job', params.job);
    if (params?.age) queryParams.append('age', params.age.toString());
    
    const queryString = queryParams.toString();
    const url = queryString 
      ? `${API_URL}${API_ENDPOINTS.STAFF_LIST}?${queryString}` 
      : `${API_URL}${API_ENDPOINTS.STAFF_LIST}`;
    
    console.log(`请求员工列表接口: ${url}`, { params });
    
    // 获取分页数据
    const response = await axios.get<PaginatedResponse<StaffMember>>(url);
    const staffData = response.data.data || [];
    
    console.log('获取到员工数据:', response.data);
    
    // 确保每个员工都有标签字段并处理图片URL
    const processedData = staffData.map((staff: StaffMember) => ({
      ...staff,
      tag: staff.tag || '可预约',
      // 确保图片URL是完整的
      image: staff.image.startsWith('http') 
        ? staff.image 
        : `${API_URL.replace('/api', '')}${staff.image}`, // 使用服务器基础URL
      // 处理多张照片的URL
      photos: (staff.photos || []).map((photo: string) => 
        photo.startsWith('http') 
          ? photo 
          : `${API_URL.replace('/api', '')}${photo}`
      )
    }));
    
    return processedData;
  } catch (error) {
    console.error('获取员工列表失败:', error);
    // 出错时返回空数组
    return [];
  }
};

/**
 * 获取单个员工详情
 */
export const getStaffDetail = async (id: string): Promise<StaffMember | null> => {
  try {
    // 添加日志辅助调试
    console.log(`开始获取员工详情，ID: ${id}, API URL: ${API_URL}${API_ENDPOINTS.STAFF_LIST}/${id}`);
    
    const response = await axios.get(`${API_URL}${API_ENDPOINTS.STAFF_LIST}/${id}`);
    
    console.log('获取员工详情成功，返回数据:', response.data);
    
    const staff = response.data;
    
    // 处理图片URL
    const processedStaff = {
      ...staff,
      image: staff.image.startsWith('http')
        ? staff.image
        : `${API_URL.replace('/api', '')}${staff.image}`,
      photos: (staff.photos || []).map((photo: string) =>
        photo.startsWith('http')
          ? photo
          : `${API_URL.replace('/api', '')}${photo}`
      )
    };
    
    return processedStaff;
  } catch (error: any) {
    // 详细记录错误信息
    console.error('获取员工详情失败:', error);
    
    if (error.response) {
      // 服务器响应了错误状态码
      console.error('错误响应状态:', error.response.status);
      console.error('错误响应数据:', error.response.data);
    } else if (error.request) {
      // 请求已发送但没有收到响应
      console.error('未收到响应，请求信息:', error.request);
    }
    
    return null;
  }
};

/**
 * 保存员工数据
 * 调用实际API
 */
export const saveStaffList = async (staff: Omit<StaffMember, 'id'>): Promise<StaffMember | null> => {
  try {
    const response = await axios.post(`${API_URL}${API_ENDPOINTS.STAFF_LIST}`, staff);
    return response.data;
  } catch (error) {
    console.error('保存员工数据失败:', error);
    return null;
  }
}; 