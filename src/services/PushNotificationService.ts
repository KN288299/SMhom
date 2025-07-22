import { Platform, Alert, Linking } from 'react-native';
import PushNotification, { Importance } from 'react-native-push-notification';
import messaging from '@react-native-firebase/messaging';
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
  private fcmToken: string | null = null;

  // 初始化推送通知服务
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 配置推送通知
      this.configurePushNotification();
      
      // 请求权限
      await this.requestPermissions();
      
      // 获取FCM token
      await this.getFCMToken();
      
      // 设置消息监听
      this.setupMessageListeners();
      
      this.initialized = true;
      console.log('✅ [PushNotification] 推送通知服务初始化完成');
    } catch (error) {
      console.error('❌ [PushNotification] 初始化失败:', error);
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

      // iOS设置
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
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
        // iOS权限请求
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          Alert.alert(
            '需要通知权限',
            '为了及时接收消息和来电通知，请允许通知权限。',
            [
              { text: '取消', style: 'cancel' },
              { text: '去设置', onPress: () => Linking.openSettings() },
            ]
          );
          return false;
        }

        console.log('✅ [PushNotification] iOS通知权限已获取');
        return true;
      } else {
        // Android权限请求
        const permission = await check(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
        
        if (permission === RESULTS.GRANTED) {
          console.log('✅ [PushNotification] Android通知权限已存在');
          return true;
        }

        if (permission === RESULTS.DENIED) {
          const result = await request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
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

  // 获取FCM Token
  private async getFCMToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      this.fcmToken = token;
      console.log('🔑 [PushNotification] FCM Token:', token.substring(0, 50) + '...');
      
      // 发送token到服务器
      await this.sendTokenToServer(token);
      
      return token;
    } catch (error) {
      console.error('❌ [PushNotification] 获取FCM Token失败:', error);
      return null;
    }
  }

  // 发送token到服务器
  private async sendTokenToServer(token: string): Promise<void> {
    try {
      // 获取用户信息（如果有的话）
      const userToken = global.userToken || '';
      
      if (!userToken) {
        console.log('⚠️ [PushNotification] 用户未登录，跳过token上传');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/users/update-fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({ fcmToken: token }),
      });

      if (response.ok) {
        console.log('✅ [PushNotification] FCM Token已发送到服务器');
      } else {
        console.error('❌ [PushNotification] 发送FCM Token失败:', await response.text());
      }
    } catch (error) {
      console.error('❌ [PushNotification] 发送FCM Token到服务器失败:', error);
    }
  }

  // 设置消息监听
  private setupMessageListeners(): void {
    // 前台消息监听
    messaging().onMessage(async (remoteMessage) => {
      console.log('📨 [PushNotification] 前台收到消息:', remoteMessage);
      
      // 在前台显示本地通知
      this.showLocalNotification({
        title: remoteMessage.notification?.title || '新消息',
        message: remoteMessage.notification?.body || '您收到了一条新消息',
        data: remoteMessage.data,
        category: remoteMessage.data?.type || 'message'
      });
    });

    // 后台消息监听
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('📨 [PushNotification] 从后台打开消息:', remoteMessage);
      // TODO: 根据消息类型导航到相应页面
    });

    // 应用启动时的消息处理
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('📨 [PushNotification] 启动时的消息:', remoteMessage);
          // TODO: 根据消息类型导航到相应页面
        }
      });

    // Token刷新监听
    messaging().onTokenRefresh((token) => {
      console.log('🔄 [PushNotification] FCM Token刷新:', token.substring(0, 50) + '...');
      this.fcmToken = token;
      // TODO: 将新token发送到服务器
    });
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

  // 获取当前FCM Token
  getFCMTokenSync(): string | null {
    return this.fcmToken;
  }

  // 检查通知权限状态
  async checkPermissionStatus(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().hasPermission();
        return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
               authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      } else {
        const permission = await check(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
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