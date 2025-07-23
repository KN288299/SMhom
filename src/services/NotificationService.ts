import { Alert, Platform } from 'react-native';

// 定义通知数据接口
export interface NotificationData {
  title: string;
  message: string;
  data?: any;
  category?: string;
}

/**
 * 简化的通知服务，不依赖于Firebase
 * 仅在本地处理通知，不涉及远程推送
 */
class NotificationService {
  private static instance: NotificationService;
  private initialized = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🔔 [NotificationService] 初始化本地通知服务');
      this.initialized = true;
    } catch (error) {
      console.error('❌ [NotificationService] 初始化失败:', error);
    }
  }

  // 显示应用内通知
  showInAppNotification(data: NotificationData): void {
    console.log('📱 [NotificationService] 显示应用内通知:', data.title);
    
    // 使用Alert显示应用内通知
    Alert.alert(data.title, data.message, [{ text: '好的' }]);
  }

  // 显示消息通知
  showMessageNotification(senderName: string, message: string, conversationId: string): void {
    console.log('💬 [NotificationService] 显示消息通知:', senderName);
    
    this.showInAppNotification({
      title: senderName,
      message: message,
      data: { type: 'message', conversationId },
      category: 'message'
    });
  }

  // 显示来电通知
  showCallNotification(callerName: string, callId: string, conversationId: string): void {
    console.log('📞 [NotificationService] 显示来电通知:', callerName);
    
    this.showInAppNotification({
      title: '来电',
      message: `${callerName} 正在呼叫您`,
      data: { type: 'call', callId, conversationId },
      category: 'call'
    });
  }
}

export default NotificationService.getInstance(); 