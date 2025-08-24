import { Platform, Alert, Linking } from 'react-native';
import PushNotification, { Importance } from 'react-native-push-notification';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { BASE_URL } from '../config/api';

// 全局类型声明
declare global {
  var userToken: string | undefined;
}

export interface NotificationData {
  title: string;
  message: string;
  data?: any;
  sound?: string;
  importance?: 'default' | 'high' | 'low';
  category?: 'message' | 'call' | 'system';
}

class PushNotificationService {
  private initialized = false;
  private deviceToken: string | null = null;
  private pushNotificationsConfigured = false;

  // 初始化推送通知服务 - 不立即请求权限
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 配置推送通知（不请求权限）
      this.configurePushNotification();
      
      // 不立即请求权限，等待用户登录后
      // await this.requestPermissions();
      
      this.initialized = true;
      console.log('✅ [PushNotification] 推送通知服务初始化完成（权限请求延迟）');
    } catch (error) {
      console.error('❌ [PushNotification] 初始化失败:', error);
    }
  }

  // 用户登录成功后请求通知权限
  async requestPermissionsAfterLogin(): Promise<boolean> {
    if (this.pushNotificationsConfigured) return true;

    try {
      console.log('🔔 [PushNotification] 用户登录成功，开始请求通知权限');
      
      // 请求权限
      const result = await this.requestPermissions();
      
      this.pushNotificationsConfigured = true;
      console.log('✅ [PushNotification] 通知权限请求完成');
      
      return result;
    } catch (error) {
      console.error('❌ [PushNotification] 通知权限请求失败:', error);
      return false;
    }
  }

  // 配置推送通知
  private configurePushNotification(): void {
    PushNotification.configure({
      // 当点击通知或应用打开时调用
      onNotification: function (notification) {
        console.log('📱 [PushNotification] 收到通知:', notification);
        
        // 处理通知点击
        if (notification.userInteraction) {
          console.log('👆 [PushNotification] 用户点击了通知');
          // TODO: 根据通知类型导航到相应页面
        }
        
        // iOS需要调用这个方法
        if (Platform.OS === 'ios') {
          notification.finish(PushNotification.FetchResult.NoData);
        }
      },

      // Android权限请求
      onAction: function (notification) {
        console.log('🔔 [PushNotification] 通知动作:', notification.action);
        console.log('🔔 [PushNotification] 通知数据:', notification);
      },

      // 注册成功回调
      onRegistrationError: function(err) {
        console.error('❌ [PushNotification] 注册失败:', err.message);
      },

      // 权限设置
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      // iOS设置 - 不立即请求权限
      popInitialNotification: true,
      requestPermissions: false, // 改为false，延迟权限请求
    });

    // 创建通知频道（Android）
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'default-channel',
          channelName: '默认通知',
          channelDescription: '应用默认通知频道',
          soundName: 'default',
          importance: Importance.HIGH,
          vibrate: true,
        },
        (created) => console.log(`📢 [PushNotification] 默认频道创建: ${created}`)
      );

      PushNotification.createChannel(
        {
          channelId: 'call-channel',
          channelName: '来电通知',
          channelDescription: '语音通话来电通知',
          soundName: 'default',
          importance: Importance.HIGH,
          vibrate: true,
        },
        (created) => console.log(`📞 [PushNotification] 来电频道创建: ${created}`)
      );

      PushNotification.createChannel(
        {
          channelId: 'message-channel',
          channelName: '消息通知',
          channelDescription: '聊天消息通知',
          soundName: 'default',
          importance: Importance.DEFAULT,
          vibrate: true,
        },
        (created) => console.log(`💬 [PushNotification] 消息频道创建: ${created}`)
      );
    }
  }

  // 请求通知权限
  private async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // iOS权限请求 - 简化版，移除Firebase依赖
        Alert.alert(
          '需要通知权限',
          '为了及时接收消息和来电通知，请在弹出的系统对话框中允许通知权限。',
          [{ text: '好的', style: 'default' }]
        );
        
        // 由于没有Firebase，返回true假设权限已获取
        console.log('⚠️ [PushNotification] iOS通知权限请求已简化(无Firebase)');
        return true;
      } else {
        // Android权限请求（兼容处理：某些环境下 PERMISSIONS 可能为 undefined）
        // 增强防御性编程：检查PERMISSIONS模块是否正确加载
        if (!PERMISSIONS) {
          console.warn('⚠️ [PushNotification] PERMISSIONS模块未加载，跳过通知权限检查');
          return true;
        }

        let ANDROID_PERMISSIONS;
        try {
          ANDROID_PERMISSIONS = PERMISSIONS?.ANDROID as
            | { POST_NOTIFICATIONS?: string }
            | undefined;

          if (!ANDROID_PERMISSIONS?.POST_NOTIFICATIONS) {
            console.warn(
              '⚠️ [PushNotification] PERMISSIONS.ANDROID 未定义，跳过通知权限检查以避免崩溃'
            );
            return true;
          }
        } catch (permError) {
          console.warn('⚠️ [PushNotification] 权限模块加载异常，跳过权限检查:', permError);
          return true;
        }

        const permission = await check(ANDROID_PERMISSIONS.POST_NOTIFICATIONS!);
        
        if (permission === RESULTS.GRANTED) {
          console.log('✅ [PushNotification] Android通知权限已存在');
          return true;
        }

        if (permission === RESULTS.DENIED) {
          const result = await request(ANDROID_PERMISSIONS.POST_NOTIFICATIONS!);
          return result === RESULTS.GRANTED;
        }

        console.log('⚠️ [PushNotification] Android通知权限被阻止');
        return false;
      }
    } catch (error) {
      console.error('❌ [PushNotification] 权限请求失败:', error);
      return false;
    }
  }

  // 显示本地通知
  showLocalNotification(data: NotificationData): void {
    const channelId = data.category === 'call' ? 'call-channel' : 
                     data.category === 'message' ? 'message-channel' : 
                     'default-channel';

    PushNotification.localNotification({
      title: data.title,
      message: data.message,
      channelId,
      importance: data.importance === 'high' ? 'high' : 'default',
      priority: data.importance === 'high' ? 'high' : 'default',
      vibrate: true,
      vibration: 300,
      playSound: true,
      soundName: data.sound || 'default',
      userInfo: data.data,
      actions: data.category === 'call' ? ['接听', '拒绝'] : undefined,
    });
  }

  // 显示消息通知
  showMessageNotification(senderName: string, message: string, conversationId: string): void {
    this.showLocalNotification({
      title: senderName,
      message: message,
      data: { 
        type: 'message', 
        conversationId 
      },
      category: 'message',
      importance: 'default'
    });
  }

  // 显示来电通知
  showCallNotification(callerName: string, callId: string, conversationId: string): void {
    this.showLocalNotification({
      title: '来电',
      message: `${callerName} 正在呼叫您`,
      data: { 
        type: 'call', 
        callId, 
        conversationId 
      },
      category: 'call',
      importance: 'high',
      sound: 'default'
    });
  }

  // 显示应用内通知
  showInAppNotification(data: NotificationData): void {
    // 简化版的应用内通知，使用本地通知
    this.showLocalNotification(data);
  }

  // 清除所有通知
  clearAllNotifications(): void {
    PushNotification.cancelAllLocalNotifications();
    console.log('🧹 [PushNotification] 已清除所有通知');
  }

  // 清除指定通知
  clearNotification(id: string): void {
    PushNotification.cancelLocalNotifications({ id });
    console.log('🧹 [PushNotification] 已清除通知:', id);
  }

  // 获取设备令牌 (空实现，原Firebase FCM功能)
  getFCMTokenSync(): string | null {
    return null;
  }

  // 检查通知权限状态
  async checkPermissionStatus(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // iOS权限检查简化版
        return true;
      } else {
        // 增强防御性编程：检查PERMISSIONS模块是否正确加载
        if (!PERMISSIONS) {
          console.warn('⚠️ [PushNotification] PERMISSIONS模块未加载，跳过权限状态检查');
          return false;
        }

        let ANDROID_PERMISSIONS;
        try {
          ANDROID_PERMISSIONS = PERMISSIONS?.ANDROID as
            | { POST_NOTIFICATIONS?: string }
            | undefined;
          if (!ANDROID_PERMISSIONS?.POST_NOTIFICATIONS) {
            console.warn(
              '⚠️ [PushNotification] PERMISSIONS.ANDROID 未定义，跳过权限状态检查'
            );
            return true;
          }
        } catch (permError) {
          console.warn('⚠️ [PushNotification] 权限模块加载异常，跳过权限检查:', permError);
          return true;
        }
        const permission = await check(ANDROID_PERMISSIONS.POST_NOTIFICATIONS!);
        return permission === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('❌ [PushNotification] 检查权限状态失败:', error);
      return false;
    }
  }
}

// 导出单例
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService; 