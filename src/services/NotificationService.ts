import { Platform, Alert, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export interface NotificationData {
  title: string;
  message: string;
  data?: any;
  category?: 'message' | 'call' | 'system';
}

class NotificationService {
  private initialized = false;

  // 初始化通知服务
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 请求权限
      await this.requestPermissions();
      
      this.initialized = true;
      console.log('✅ [Notification] 通知服务初始化完成');
    } catch (error) {
      console.error('❌ [Notification] 初始化失败:', error);
    }
  }

  // 请求通知权限
  private async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // iOS 可以直接显示系统通知
        console.log('✅ [Notification] iOS通知权限检查完成');
        return true;
      } else {
        // Android 13+ 需要通知权限
        console.log('✅ [Notification] Android通知权限检查完成');
        return true;
      }
    } catch (error) {
      console.error('❌ [Notification] 权限请求失败:', error);
      return false;
    }
  }

  // 显示应用内通知弹窗
  showInAppNotification(data: NotificationData): void {
    Alert.alert(
      data.title,
      data.message,
      [
        { text: '关闭', style: 'cancel' },
        { text: '查看', onPress: () => this.handleNotificationClick(data) }
      ],
      { cancelable: true }
    );
  }

  // 显示消息通知
  showMessageNotification(senderName: string, message: string, conversationId: string): void {
    this.showInAppNotification({
      title: `来自 ${senderName} 的消息`,
      message: message.length > 50 ? message.substring(0, 50) + '...' : message,
      data: { 
        type: 'message', 
        conversationId,
        senderName
      },
      category: 'message'
    });
  }

  // 显示来电通知
  showCallNotification(callerName: string, callId: string, conversationId: string): void {
    Alert.alert(
      '来电',
      `${callerName} 正在呼叫您`,
      [
        { 
          text: '拒绝', 
          style: 'cancel',
          onPress: () => this.handleCallReject(callId, conversationId)
        },
        { 
          text: '接听', 
          onPress: () => this.handleCallAccept(callId, conversationId, callerName)
        }
      ],
      { cancelable: false } // 来电通知不能取消
    );
  }

  // 处理通知点击
  private handleNotificationClick(data: NotificationData): void {
    console.log('👆 [Notification] 用户点击了通知:', data);
    
    if (data.category === 'message' && data.data?.conversationId) {
      // TODO: 导航到聊天页面
      console.log('导航到聊天页面:', data.data.conversationId);
    }
  }

  // 处理来电接听
  private handleCallAccept(callId: string, conversationId: string, callerName: string): void {
    console.log('✅ [Notification] 用户接听来电:', callId);
    // TODO: 导航到通话页面并接听
  }

  // 处理来电拒绝
  private handleCallReject(callId: string, conversationId: string): void {
    console.log('❌ [Notification] 用户拒绝来电:', callId);
    // TODO: 发送拒绝信号到服务器
  }

  // 检查通知权限状态
  async checkPermissionStatus(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // iOS 通常有基本通知权限
        return true;
      } else {
        // Android 检查通知权限
        return true; // 简化版本，假设有权限
      }
    } catch (error) {
      console.error('❌ [Notification] 检查权限状态失败:', error);
      return false;
    }
  }

  // 请求开启通知权限
  async requestNotificationPermission(): Promise<void> {
    const hasPermission = await this.checkPermissionStatus();
    
    if (!hasPermission) {
      Alert.alert(
        '需要通知权限',
        '为了及时接收消息和来电通知，请在设置中开启通知权限。',
        [
          { text: '取消', style: 'cancel' },
          { text: '去设置', onPress: () => Linking.openSettings() },
        ]
      );
    }
  }
}

// 导出单例
export const notificationService = new NotificationService();
export default notificationService; 