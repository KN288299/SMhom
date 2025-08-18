import { Platform, AppState, AppStateStatus } from 'react-native';
import PushNotification from 'react-native-push-notification';
import NotificationService from './NotificationService';

interface CallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  conversationId: string;
  callerRole: 'user' | 'customer_service';
}

class IOSCallService {
  private initialized = false;
  private currentCallId: string | null = null;
  private appStateListener: any = null;

  // 初始化iOS通话服务
  async initialize(): Promise<void> {
    if (this.initialized || Platform.OS !== 'ios') return;

    try {
      // 配置iOS推送通知
      this.configurePushNotifications();
      
      // 监听应用状态变化
      this.setupAppStateListener();
      
      this.initialized = true;
      console.log('✅ [IOSCallService] iOS通话服务初始化完成');
    } catch (error) {
      console.error('❌ [IOSCallService] 初始化失败:', error);
    }
  }

  // 配置iOS推送通知
  private configurePushNotifications(): void {
    // 配置iOS推送通知
    PushNotification.configure({
      // 权限请求
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      
      // 权限授予回调
      onRegister: function (token: any) {
        console.log('📱 [IOSCallService] 推送令牌:', token);
      },
      
      // 通知接收回调
      onNotification: (notification: any) => {
        console.log('📱 [IOSCallService] 收到推送通知:', notification);
        
        // 处理来电推送
        if (notification.data?.type === 'incoming_call') {
          this.handleIncomingCallPush(notification.data);
        }
      },
      
      // 通知打开回调
      onAction: (notification: any) => {
        console.log('📱 [IOSCallService] 用户点击通知:', notification);
        
        // 处理用户点击来电通知
        if (notification.action === 'accept_call') {
          this.handleCallAcceptFromPush(notification.data);
        } else if (notification.action === 'reject_call') {
          this.handleCallRejectFromPush(notification.data);
        }
      },
      
      // 权限状态回调
      onRegistrationError: function(err: any) {
        console.error('❌ [IOSCallService] 推送注册失败:', err);
      },
      
      // 前台通知显示
      popInitialNotification: true,
      requestPermissions: true,
    });
  }

  // 设置应用状态监听
  private setupAppStateListener(): void {
    this.appStateListener = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log(`📱 [IOSCallService] 应用状态变化: ${AppState.currentState} -> ${nextAppState}`);
      
      if (nextAppState === 'active') {
        // 应用回到前台，检查是否有待处理的来电
        this.checkPendingCalls();
      }
    });
  }

  // 显示iOS来电通知
  showIncomingCallNotification(callData: CallData): void {
    if (Platform.OS !== 'ios') return;
    
    console.log('📞 [IOSCallService] 显示iOS来电通知:', callData);
    
    const appState = AppState.currentState;
    console.log('📱 [IOSCallService] 当前应用状态:', appState);
    
    if (appState === 'active') {
      // 前台时显示本地弹窗
      this.showForegroundCallAlert(callData);
    } else {
      // 后台时发送推送通知
      this.sendCallPushNotification(callData);
    }
  }

  // 前台来电弹窗
  private showForegroundCallAlert(callData: CallData): void {
    console.log('📞 [IOSCallService] 前台显示iOS来电弹窗');
    
    // 使用本地通知服务显示弹窗
    NotificationService.showCallNotification(
      callData.callerName,
      callData.callId,
      callData.conversationId
    );
  }

  // 发送iOS推送通知
  private sendCallPushNotification(callData: CallData): void {
    console.log('📞 [IOSCallService] 发送iOS来电推送通知');
    
    // 创建本地推送通知
    PushNotification.localNotification({
      id: callData.callId,
      title: '来电',
      message: `${callData.callerName} 正在呼叫您`,
      data: {
        type: 'incoming_call',
        ...callData
      },
      actions: ['拒绝', '接听'],
      category: 'incoming_call',
      soundName: 'ringtone.caf', // iOS默认铃声
      playSound: true,
      vibrate: true,
      priority: 'high',
      importance: 'high',
      ongoing: true, // 持续显示直到用户操作
      autoCancel: false,
      largeIcon: callData.callerAvatar || 'ic_launcher',
      bigText: `${callData.callerName} 正在呼叫您`,
      subText: '语音通话',
    });
    
    this.currentCallId = callData.callId;
  }

  // 处理来自推送的来电
  private handleIncomingCallPush(callData: CallData): void {
    console.log('📞 [IOSCallService] 处理推送来电:', callData);
    
    // 存储来电信息，等待应用回到前台
    this.storePendingCall(callData);
  }

  // 存储待处理的来电
  private storePendingCall(callData: CallData): void {
    // 使用AsyncStorage存储来电信息
    // 这里可以扩展为更复杂的存储机制
    console.log('💾 [IOSCallService] 存储待处理来电:', callData.callId);
  }

  // 检查待处理的来电
  private checkPendingCalls(): void {
    console.log('🔍 [IOSCallService] 检查待处理来电');
    
    // 检查是否有待处理的来电
    // 如果有，显示来电界面
  }

  // 处理用户从推送接听来电
  private handleCallAcceptFromPush(callData: CallData): void {
    console.log('✅ [IOSCallService] 用户从推送接听来电:', callData.callId);
    
    // 清除通知
    this.clearCallNotification(callData.callId);
    
    // 导航到通话页面
    this.navigateToCall(callData);
  }

  // 处理用户从推送拒绝来电
  private handleCallRejectFromPush(callData: CallData): void {
    console.log('❌ [IOSCallService] 用户从推送拒绝来电:', callData.callId);
    
    // 清除通知
    this.clearCallNotification(callData.callId);
    
    // 发送拒绝信号
    this.sendRejectSignal(callData);
  }

  // 清除来电通知
  private clearCallNotification(callId: string): void {
    console.log('🧹 [IOSCallService] 清除iOS来电通知:', callId);
    
    if (this.currentCallId === callId) {
      this.currentCallId = null;
    }
    
    // 清除本地通知
    PushNotification.cancelLocalNotifications({ id: callId });
  }

  // 导航到通话页面
  private navigateToCall(callData: CallData): void {
    console.log('📱 [IOSCallService] 导航到iOS通话页面:', callData);
    
    // 使用全局导航引用
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
      console.warn('⚠️ [IOSCallService] 导航引用不可用或未就绪');
    }
  }

  // 发送拒绝信号
  private sendRejectSignal(callData: CallData): void {
    console.log('📤 [IOSCallService] 发送iOS拒绝信号:', callData);
    
    // 使用全局Socket引用
    if ((global as any).socketRef?.current) {
      (global as any).socketRef.current.emit('reject_call', {
        callId: callData.callId,
        recipientId: callData.callerId,
        conversationId: callData.conversationId
      });
    } else {
      console.warn('⚠️ [IOSCallService] Socket引用不可用');
    }
  }

  // 取消当前来电
  cancelCurrentCall(): void {
    if (this.currentCallId) {
      console.log('📴 [IOSCallService] 取消当前iOS来电:', this.currentCallId);
      this.clearCallNotification(this.currentCallId);
    }
  }

  // 清理资源
  cleanup(): void {
    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
    }
    
    if (this.currentCallId) {
      this.clearCallNotification(this.currentCallId);
    }
    
    console.log('🧹 [IOSCallService] iOS通话服务已清理');
  }
}

export default new IOSCallService();
