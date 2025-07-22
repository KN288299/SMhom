import { Alert } from 'react-native';
import { AppState, AppStateStatus } from 'react-native';
import notificationService from './NotificationService';

interface OfflineMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: 'text' | 'voice' | 'image' | 'video';
  timestamp: Date;
  conversationId: string;
}

class OfflineMessageService {
  private messageQueue: OfflineMessage[] = [];
  private isOnline = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor() {
    this.setupAppStateListener();
  }

  // 监听应用状态变化
  private setupAppStateListener() {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log('📱 [OfflineMessage] 应用状态变化:', nextAppState);
      
      if (nextAppState === 'active') {
        this.handleAppForeground();
      } else if (nextAppState === 'background') {
        this.handleAppBackground();
      }
    });
  }

  // 应用回到前台
  private handleAppForeground() {
    console.log('📱 [OfflineMessage] 应用回到前台');
    this.processOfflineMessages();
  }

  // 应用进入后台
  private handleAppBackground() {
    console.log('📱 [OfflineMessage] 应用进入后台');
    // 在后台时，消息会通过系统推送通知
  }

  // 设置在线状态
  setOnlineStatus(isOnline: boolean) {
    this.isOnline = isOnline;
    console.log(`📡 [OfflineMessage] 连接状态: ${isOnline ? '在线' : '离线'}`);
    
    if (isOnline) {
      this.processOfflineMessages();
    }
  }

  // 添加离线消息
  addOfflineMessage(message: OfflineMessage) {
    console.log('📨 [OfflineMessage] 添加离线消息:', message.id);
    this.messageQueue.push(message);
    
    // 如果应用在后台，立即显示通知
    if (AppState.currentState !== 'active') {
      this.showOfflineMessageNotification(message);
    }
  }

  // 显示离线消息通知
  private showOfflineMessageNotification(message: OfflineMessage) {
    console.log('📨 [OfflineMessage] 显示离线消息通知');
    
    notificationService.showMessageNotification(
      message.senderName,
      message.content,
      message.conversationId
    );
  }

  // 处理离线消息队列
  private processOfflineMessages() {
    if (this.messageQueue.length === 0) return;
    
    console.log(`📨 [OfflineMessage] 处理 ${this.messageQueue.length} 条离线消息`);
    
    // 显示汇总通知
    if (this.messageQueue.length === 1) {
      const message = this.messageQueue[0];
      this.showOfflineMessageNotification(message);
    } else {
      // 多条消息时显示汇总通知
      Alert.alert(
        '离线消息',
        `您有 ${this.messageQueue.length} 条未读消息`,
        [
          { text: '稍后查看', style: 'cancel' },
          { 
            text: '立即查看', 
            onPress: () => {
              // TODO: 导航到消息列表页面
              console.log('导航到消息列表页面');
            }
          }
        ]
      );
    }
    
    // 清空队列
    this.messageQueue = [];
  }

  // 获取离线消息数量
  getOfflineMessageCount(): number {
    return this.messageQueue.length;
  }

  // 清空离线消息
  clearOfflineMessages() {
    this.messageQueue = [];
    console.log('📨 [OfflineMessage] 清空离线消息队列');
  }
}

export default new OfflineMessageService(); 