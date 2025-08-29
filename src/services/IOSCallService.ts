import { Platform, AppState, AppStateStatus } from 'react-native';
import PushNotification from 'react-native-push-notification';
import NotificationService from './NotificationService';
import IOSAudioSession from '../utils/IOSAudioSession';

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
  private pushNotificationsConfigured = false;

  // 初始化iOS通话服务 - 不立即配置推送通知
  async initialize(): Promise<void> {
    if (this.initialized || Platform.OS !== 'ios') return;

    try {
      // 设置应用状态监听
      this.setupAppStateListener();
      
      // 预初始化音频会话（为后续通话做准备）
      await this.prepareAudioSession();
      
      this.initialized = true;
      console.log('✅ [IOSCallService] iOS通话服务初始化完成（推送通知延迟配置）');
    } catch (error) {
      console.error('❌ [IOSCallService] 初始化失败:', error);
    }
  }

  // 🔧 iOS首次使用修复：使用初始化管理器预初始化音频会话
  private async prepareAudioSession(): Promise<void> {
    try {
      console.log('🎵 [IOSCallService] 预初始化iOS音频会话...');
      
      // 🔧 优先使用iOS初始化管理器，确保与智能初始化策略一致
      try {
        const IOSInitializationManager = require('./IOSInitializationManager').default;
        const initManager = IOSInitializationManager.getInstance();
        
        // 通过初始化管理器检查并完成音频会话配置
        if (!initManager.isAudioSessionReady()) {
          console.log('🔧 [IOSCallService] 通过初始化管理器配置音频会话...');
          await initManager.initializeAudioSessionAfterPermission();
          console.log('✅ [IOSCallService] iOS初始化管理器音频会话配置完成');
        } else {
          console.log('✅ [IOSCallService] iOS初始化管理器音频会话已就绪');
        }
      } catch (managerError) {
        console.warn('⚠️ [IOSCallService] 初始化管理器不可用，使用兜底方案:', managerError);
        
        // 🛡️ 兜底：直接使用IOSAudioSession
        const audioSession = IOSAudioSession.getInstance();
        if (!audioSession.isActive()) {
          await audioSession.prepareForRecording();
          console.log('✅ [IOSCallService] 兜底音频会话配置完成');
        }
      }
    } catch (error) {
      console.warn('⚠️ [IOSCallService] 音频会话预初始化失败（不影响功能）:', error);
    }
  }

  // 用户登录成功后配置推送通知
  async configurePushNotificationsAfterLogin(): Promise<void> {
    if (this.pushNotificationsConfigured || Platform.OS !== 'ios') return;

    try {
      console.log('🍎 [IOSCallService] 用户登录成功，开始配置iOS推送通知');
      
      // 配置iOS推送通知
      this.configurePushNotifications();
      
      this.pushNotificationsConfigured = true;
      console.log('✅ [IOSCallService] iOS推送通知配置完成');
    } catch (error) {
      console.error('❌ [IOSCallService] iOS推送通知配置失败:', error);
    }
  }

  // 移除iOS推送通知配置，避免权限冲突
  // 保留app内通话功能，使用自定义弹窗而非系统通知
  private configurePushNotifications(): void {
    console.log('🍎 [IOSCallService] 跳过系统推送配置，使用app内通话功能');
    // 不再配置系统推送通知，避免通知权限请求干扰通讯录权限
    // app内的通话、弹窗、震动功能不受影响
  }

  // 设置应用状态监听
  private setupAppStateListener(): void {
    this.appStateListener = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log(`📱 [IOSCallService] 应用状态变化: ${AppState.currentState} -> ${nextAppState}`);
      
      if (nextAppState === 'active') {
        console.log('🔄 [IOSCallService] 应用激活，执行快速恢复流程');
        
        // 🔧 iOS首次使用修复：使用初始化管理器执行快速重连
        setTimeout(async () => {
          try {
            const IOSInitializationManager = require('./IOSInitializationManager').default;
            await IOSInitializationManager.getInstance().quickReconnect();
            console.log('✅ [IOSCallService] 初始化管理器快速重连完成');
          } catch (error) {
            console.warn('⚠️ [IOSCallService] 初始化管理器快速重连失败，使用原方案:', error);
            // 兜底：使用原来的强制重连
            this.forceSocketReconnect();
          }
        }, 50);
        
        // 应用回到前台，检查是否有待处理的来电
        setTimeout(() => this.checkPendingCalls(), 100);     // 减少到100ms
      }
    });
  }

  // 强制Socket重连 - 优化版
  private forceSocketReconnect(): void {
    try {
      const socketRef = (global as any).socketRef;
      if (socketRef?.current) {
        if (socketRef.current.disconnected) {
          console.log('🔄 [IOSCallService] 强制重连断开的Socket');
          socketRef.current.connect();
          
          // 短暂延迟后再次检查连接状态
          setTimeout(() => {
            if (socketRef.current?.disconnected) {
              console.log('🔄 [IOSCallService] 第二次尝试强制重连');
              socketRef.current.connect();
            }
          }, 200);
        } else if (!socketRef.current.connected) {
          console.log('🔄 [IOSCallService] Socket未连接，尝试重新连接');
          socketRef.current.connect();
        } else {
          console.log('✅ [IOSCallService] Socket已连接，无需重连');
          // 即使已连接，也发送一个ping确保连接质量
          if (socketRef.current.emit) {
            socketRef.current.emit('ping', { timestamp: Date.now() });
          }
        }
      } else {
        console.warn('⚠️ [IOSCallService] Socket引用不存在，无法重连');
      }
    } catch (error) {
      console.error('❌ [IOSCallService] 强制重连失败:', error);
    }
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
      // 跳过推送通知，使用app内通话功能
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

  // 移除推送通知，使用app内通话界面
  private sendCallPushNotification(callData: CallData): void {
    console.log('📞 [IOSCallService] 跳过推送通知，使用app内通话界面:', callData);
    
    // 不再发送系统推送通知，通话功能完全在app内实现
    // 使用VoiceCallScreen和Socket实现实时通话，不依赖系统通知权限
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
    
    // 移除通知清除逻辑，改为app内状态管理
    console.log('📱 [IOSCallService] 通话结束，app内状态已清理:', callId);
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
