import { Alert, Linking } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { BASE_URL } from '../config/api';
import NotificationService from './NotificationService';

declare global {
  var userToken: string | undefined;
  var navigationRef: any;
}

interface PushNotificationData {
  type?: 'message' | 'voice_call' | 'general';
  conversationId?: string;
  callId?: string;
  senderName?: string;
  title?: string;
  body?: string;
}

class AndroidPushService {
  private static instance: AndroidPushService;
  private fcmToken: string | null = null;
  private initialized = false;
  private notificationService: typeof NotificationService;

  static getInstance(): AndroidPushService {
    if (!AndroidPushService.instance) {
      AndroidPushService.instance = new AndroidPushService();
    }
    return AndroidPushService.instance;
  }

  constructor() {
    this.notificationService = NotificationService;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🚀 [AndroidPush] 开始初始化推送服务');
      
      await this.notificationService.initialize();
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.warn('⚠️ [AndroidPush] 未获得通知权限');
        return;
      }

      await this.getFCMToken();
      this.setupMessageListeners();
      this.setupTokenRefreshListener();

      this.initialized = true;
      console.log('✅ [AndroidPush] 推送服务初始化完成');
    } catch (error) {
      console.error('❌ [AndroidPush] 初始化失败:', error);
    }
  }

  private async requestPermission(): Promise<boolean> {
    try {
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

      console.log('✅ [AndroidPush] 通知权限已获取');
      return true;
    } catch (error) {
      console.error('❌ [AndroidPush] 权限请求失败:', error);
      return false;
    }
  }

  private async getFCMToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      this.fcmToken = token;
      console.log('🔑 [AndroidPush] FCM Token获取成功:', token.substring(0, 20) + '...');
      
      await this.sendTokenToServer(token);
      return token;
    } catch (error) {
      console.error('❌ [AndroidPush] 获取FCM Token失败:', error);
      return null;
    }
  }

  private async sendTokenToServer(token: string): Promise<void> {
    try {
      // 这里暂时跳过token上传，在登录时会调用updateFCMToken
      console.log('📝 [AndroidPush] FCM Token准备就绪，等待登录后上传');
    } catch (error) {
      console.error('❌ [AndroidPush] 发送FCM Token到服务器失败:', error);
    }
  }

  // 新增方法：登录后上传FCM Token
  async updateFCMTokenAfterLogin(authToken: string): Promise<void> {
    if (!this.fcmToken) {
      console.log('⚠️ [AndroidPush] FCM Token尚未获取，跳过上传');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/users/update-fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ fcmToken: this.fcmToken }),
      });

      if (response.ok) {
        console.log('✅ [AndroidPush] FCM Token已发送到服务器');
      } else {
        console.error('❌ [AndroidPush] 发送FCM Token失败:', await response.text());
      }
    } catch (error) {
      console.error('❌ [AndroidPush] 发送FCM Token到服务器失败:', error);
    }
  }

  private setupMessageListeners(): void {
    messaging().onMessage(async (remoteMessage: any) => {
      console.log('📨 [AndroidPush] 前台收到消息:', remoteMessage);
      
      const { notification, data } = remoteMessage;
      
      if (notification && data) {
        this.showForegroundNotification({
          title: notification.title || '新消息',
          body: notification.body || '您收到了一条新消息',
          type: data.type || 'general',
          conversationId: data.conversationId,
          callId: data.callId,
          senderName: data.senderName,
        });
      }
    });

    messaging().onNotificationOpenedApp((remoteMessage: any) => {
      console.log('👆 [AndroidPush] 通知被点击，应用从后台打开:', remoteMessage);
      this.handleNotificationClick(remoteMessage);
    });

    messaging()
      .getInitialNotification()
      .then((remoteMessage: any) => {
        if (remoteMessage) {
          console.log('🚀 [AndroidPush] 应用从关闭状态被通知打开:', remoteMessage);
          setTimeout(() => {
            this.handleNotificationClick(remoteMessage);
          }, 2000);
        }
      });
  }

  private showForegroundNotification(notificationData: PushNotificationData): void {
    const { type, title, body, senderName, conversationId, callId } = notificationData;
    
    switch (type) {
      case 'message':
        this.notificationService.showMessageNotification(
          senderName || '未知用户',
          body || '新消息',
          conversationId || ''
        );
        break;
        
      case 'voice_call':
        this.notificationService.showCallNotification(
          senderName || '未知来电',
          callId || '',
          conversationId || ''
        );
        break;
        
      default:
        Alert.alert(
          title || '通知',
          body || '您收到了一条新通知',
          [
            { text: '确定', onPress: () => {
              if (conversationId) {
                this.navigateToChat(conversationId);
              }
            }}
          ]
        );
    }
  }

  private handleNotificationClick(remoteMessage: any): void {
    const { data } = remoteMessage;
    
    if (!data) return;
    
    console.log('🔔 [AndroidPush] 处理通知点击:', data);
    
    switch (data.type) {
      case 'message':
        if (data.conversationId) {
          console.log('💬 [AndroidPush] 导航到聊天页面:', data.conversationId);
          this.navigateToChat(data.conversationId);
        }
        break;
        
      case 'voice_call':
        if (data.callId && data.conversationId) {
          console.log('📞 [AndroidPush] 处理来电通知:', data.callId);
          this.navigateToVoiceCall(data.callId, data.conversationId);
        }
        break;
        
      default:
        console.log('📋 [AndroidPush] 未知通知类型:', data.type);
    }
  }

  private navigateToChat(conversationId: string): void {
    try {
      if (global.navigationRef?.current) {
        global.navigationRef.current.navigate('Chat', {
          conversationId: conversationId,
        });
        console.log('✅ [AndroidPush] 导航到聊天页面成功');
      } else {
        console.warn('⚠️ [AndroidPush] 导航引用不可用');
      }
    } catch (error) {
      console.error('❌ [AndroidPush] 导航失败:', error);
    }
  }

  private navigateToVoiceCall(callId: string, conversationId: string): void {
    try {
      if (global.navigationRef?.current) {
        global.navigationRef.current.navigate('VoiceCall', {
          callId: callId,
          conversationId: conversationId,
          isIncoming: true,
        });
        console.log('✅ [AndroidPush] 导航到来电页面成功');
      } else {
        console.warn('⚠️ [AndroidPush] 导航引用不可用');
      }
    } catch (error) {
      console.error('❌ [AndroidPush] 导航到来电页面失败:', error);
    }
  }

  private setupTokenRefreshListener(): void {
    messaging().onTokenRefresh(async (token: string) => {
      console.log('🔄 [AndroidPush] FCM Token已刷新');
      this.fcmToken = token;
      await this.sendTokenToServer(token);
    });
  }

  getFCMToken(): string | null {
    return this.fcmToken;
  }

  showTestNotification(): void {
    this.notificationService.showInAppNotification({
      title: '测试通知',
      message: '这是一个测试推送通知',
      data: { test: true },
      category: 'system'
    });
  }
}

export default AndroidPushService.getInstance(); 