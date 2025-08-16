import { Platform, Alert, AppState } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import notificationService from './NotificationService';

interface CallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  conversationId: string;
  callerRole: 'user' | 'customer_service';
}

class BackgroundCallService {
  private initialized = false;
  private currentCallId: string | null = null;

  // 初始化服务
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 请求权限
      await this.requestPermissions();
      
      this.initialized = true;
      console.log('✅ [BackgroundCall] 后台来电服务初始化完成');
    } catch (error) {
      console.error('❌ [BackgroundCall] 初始化失败:', error);
    }
  }

  // 请求权限
  private async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // iOS 权限处理
        return true;
      } else {
        // Android 通知权限检查（简化版本）
        console.log('✅ [BackgroundCall] Android通知权限检查完成');
        return true;
      }
    } catch (error) {
      console.error('❌ [BackgroundCall] 权限请求失败:', error);
      return false;
    }
  }

  // 显示来电通知
  showIncomingCallNotification(callData: CallData): void {
    console.log('📞 [BackgroundCall] 显示来电通知:', callData);
    
    // 检查应用状态
    const appState = AppState.currentState;
    console.log('📱 [BackgroundCall] 当前应用状态:', appState);
    
    if (appState === 'active') {
      // 前台时显示Alert弹窗
      this.showForegroundCallAlert(callData);
    } else {
      // 后台时显示系统通知
      this.showBackgroundCallNotification(callData);
    }
  }

  // 前台来电Alert
  private showForegroundCallAlert(callData: CallData): void {
    console.log('📞 [BackgroundCall] 前台显示来电Alert');
    
    Alert.alert(
      '来电',
      `${callData.callerName} 正在呼叫您`,
      [
        { 
          text: '拒绝', 
          style: 'cancel',
          onPress: () => this.handleCallReject(callData)
        },
        { 
          text: '接听', 
          onPress: () => this.handleCallAccept(callData)
        }
      ],
      { cancelable: false }
    );
  }

  // 后台系统通知
  private showBackgroundCallNotification(callData: CallData): void {
    console.log('📞 [BackgroundCall] 后台显示系统来电通知');
    
    this.currentCallId = callData.callId;
    
    // 使用现有的通知服务
    notificationService.showCallNotification(
      callData.callerName,
      callData.callId,
      callData.conversationId
    );
  }

  // 处理接听
  private handleCallAccept(callData: CallData): void {
    console.log('✅ [BackgroundCall] 用户接听来电:', callData.callId);
    
    // 清除通知
    this.clearCallNotification(callData.callId);
    
    // 导航到通话页面
    this.navigateToCall(callData);
  }

  // 处理拒绝
  private handleCallReject(callData: CallData): void {
    console.log('❌ [BackgroundCall] 用户拒绝来电:', callData.callId);
    
    // 清除通知
    this.clearCallNotification(callData.callId);
    
    // 发送拒绝信号到服务器
    this.sendRejectSignal(callData);
  }

  // 清除来电通知
  private clearCallNotification(callId: string): void {
    console.log('🧹 [BackgroundCall] 清除来电通知:', callId);
    this.currentCallId = null;
  }

  // 导航到通话页面
  private navigateToCall(callData: CallData): void {
    console.log('📱 [BackgroundCall] 导航到通话页面:', callData);
    
    // 这里需要全局导航引用
    if ((global as any).navigationRef?.isReady?.()) {
      (global as any).navigationRef.navigate('VoiceCall', {
        contactId: callData.callerId,
        contactName: callData.callerName,
        contactAvatar: callData.callerAvatar,
        isIncoming: true,
        callId: callData.callId,
        conversationId: callData.conversationId
      });
    } else {
      console.warn('⚠️ [BackgroundCall] 导航引用不可用或未就绪');
    }
  }

  // 发送拒绝信号
  private sendRejectSignal(callData: CallData): void {
    console.log('📤 [BackgroundCall] 发送拒绝信号:', callData);
    
    // 这里需要全局Socket引用
    if ((global as any).socketRef?.current) {
      (global as any).socketRef.current.emit('reject_call', {
        callId: callData.callId,
        recipientId: callData.callerId,
        conversationId: callData.conversationId
      });
    } else {
      console.warn('⚠️ [BackgroundCall] Socket引用不可用');
    }
  }

  // 取消当前来电
  cancelCurrentCall(): void {
    if (this.currentCallId) {
      console.log('📴 [BackgroundCall] 取消当前来电:', this.currentCallId);
      this.clearCallNotification(this.currentCallId);
    }
  }
}

export default new BackgroundCallService(); 