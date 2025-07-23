import { Alert, Platform } from 'react-native';
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

/**
 * 简化的推送服务，不依赖于Firebase
 * 仅提供基本接口，不实际实现推送功能
 */
class AndroidPushService {
  private static instance: AndroidPushService;
  private initialized = false;
  private notificationService: typeof NotificationService;
  private deviceToken: string | null = null;

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
      console.log(`🚀 [PushService] 开始初始化推送服务 (平台: ${Platform.OS})`);
      
      await this.notificationService.initialize();
      
      this.initialized = true;
      console.log('✅ [PushService] 推送服务初始化完成');
    } catch (error) {
      console.error('❌ [PushService] 初始化失败:', error);
    }
  }

  // 更新设备令牌
  async updateFCMTokenAfterLogin(authToken: string): Promise<void> {
    // 这个方法被保留用于API兼容性，但实际上不执行任何操作
    console.log('📱 [PushService] 不使用Firebase，跳过更新推送令牌');
  }

  // 显示本地通知
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

  private navigateToChat(conversationId: string): void {
    try {
      if (global.navigationRef?.current) {
        global.navigationRef.current.navigate('Chat', {
          conversationId: conversationId,
        });
        console.log('✅ [PushService] 导航到聊天页面成功');
      } else {
        console.warn('⚠️ [PushService] 导航引用不可用');
      }
    } catch (error) {
      console.error('❌ [PushService] 导航失败:', error);
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
        console.log('✅ [PushService] 导航到来电页面成功');
      } else {
        console.warn('⚠️ [PushService] 导航引用不可用');
      }
    } catch (error) {
      console.error('❌ [PushService] 导航到来电页面失败:', error);
    }
  }

  getFCMToken(): string | null {
    // 这个方法被保留用于API兼容性，但总是返回null
    return null;
  }

  showTestNotification(): void {
    this.notificationService.showInAppNotification({
      title: '测试通知',
      message: '这是一个本地测试通知',
      data: { test: true },
      category: 'system'
    });
  }
}

export default AndroidPushService.getInstance(); 