import { Platform } from 'react-native';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import IOSAudioSession from '../utils/IOSAudioSession';
import IOSCallService from './IOSCallService';

/**
 * iOS应用初始化管理器
 * 解决首次使用时的权限、音频会话、Socket连接时序竞态问题
 */
class IOSInitializationManager {
  private static instance: IOSInitializationManager;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  
  // 初始化状态跟踪
  private initStatus = {
    permissionsChecked: false,
    audioSessionReady: false,
    socketReady: false,
    callServiceReady: false
  };

  public static getInstance(): IOSInitializationManager {
    if (!IOSInitializationManager.instance) {
      IOSInitializationManager.instance = new IOSInitializationManager();
    }
    return IOSInitializationManager.instance;
  }

  /**
   * 🚀 智能初始化：根据权限状态决定初始化策略
   */
  async smartInitialize(): Promise<void> {
    if (Platform.OS !== 'ios') return;
    
    // 如果已经在初始化中，等待完成
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // 如果已经初始化完成，直接返回
    if (this.initialized) {
      return;
    }

    console.log('🍎 [IOSInitManager] 开始智能初始化流程...');
    
    this.initializationPromise = this.performSmartInitialization();
    await this.initializationPromise;
  }

  private async performSmartInitialization(): Promise<void> {
    try {
      // 步骤1: 检查关键权限状态
      await this.checkPermissionStatus();
      
      // 步骤2: 根据权限状态选择初始化策略
      if (this.initStatus.permissionsChecked) {
        await this.fullInitialization();
      } else {
        await this.deferredInitialization();
      }
      
      this.initialized = true;
      console.log('✅ [IOSInitManager] iOS智能初始化完成');
    } catch (error) {
      console.error('❌ [IOSInitManager] 初始化失败:', error);
      // 即使失败也要进行基础初始化
      await this.fallbackInitialization();
    }
  }

  /**
   * 检查关键权限状态
   */
  private async checkPermissionStatus(): Promise<void> {
    try {
      console.log('🔍 [IOSInitManager] 检查麦克风权限状态...');
      
      const microphoneStatus = await check(PERMISSIONS.IOS.MICROPHONE);
      const hasPermission = microphoneStatus === RESULTS.GRANTED;
      
      console.log('🎙️ [IOSInitManager] 麦克风权限状态:', microphoneStatus, hasPermission ? '已授权' : '未授权');
      
      this.initStatus.permissionsChecked = hasPermission;
    } catch (error) {
      console.warn('⚠️ [IOSInitManager] 权限检查失败:', error);
      this.initStatus.permissionsChecked = false;
    }
  }

  /**
   * 完整初始化（有权限时）
   */
  private async fullInitialization(): Promise<void> {
    console.log('🚀 [IOSInitManager] 执行完整初始化（权限已授权）');
    
    try {
      // 并行初始化音频会话和通话服务
      await Promise.all([
        this.initializeAudioSession(),
        this.initializeCallService()
      ]);
      
      // 等待Socket连接就绪
      await this.ensureSocketReady();
      
      console.log('✅ [IOSInitManager] 完整初始化成功');
    } catch (error) {
      console.error('❌ [IOSInitManager] 完整初始化失败:', error);
      throw error;
    }
  }

  /**
   * 延迟初始化（无权限时）
   */
  private async deferredInitialization(): Promise<void> {
    console.log('⏳ [IOSInitManager] 执行延迟初始化（权限未授权）');
    
    try {
      // 只初始化通话服务（不涉及音频会话）
      await this.initializeCallService();
      
      // 等待Socket连接就绪
      await this.ensureSocketReady();
      
      console.log('✅ [IOSInitManager] 延迟初始化成功（音频会话将在获取权限后初始化）');
    } catch (error) {
      console.error('❌ [IOSInitManager] 延迟初始化失败:', error);
      throw error;
    }
  }

  /**
   * 兜底初始化（确保基本功能可用）
   */
  private async fallbackInitialization(): Promise<void> {
    console.log('🛡️ [IOSInitManager] 执行兜底初始化');
    
    try {
      // 最基础的通话服务初始化
      await IOSCallService.initialize();
      this.initStatus.callServiceReady = true;
      
      console.log('✅ [IOSInitManager] 兜底初始化完成');
    } catch (error) {
      console.warn('⚠️ [IOSInitManager] 兜底初始化也失败，但应用将继续运行');
    }
  }

  /**
   * 初始化音频会话
   */
  private async initializeAudioSession(): Promise<void> {
    try {
      console.log('🎵 [IOSInitManager] 初始化音频会话...');
      
      const audioSession = IOSAudioSession.getInstance();
      
      // 重置并准备录音会话
      await audioSession.reset();
      await audioSession.prepareForRecording();
      
      this.initStatus.audioSessionReady = true;
      console.log('✅ [IOSInitManager] 音频会话初始化完成');
    } catch (error) {
      console.warn('⚠️ [IOSInitManager] 音频会话初始化失败（将在需要时重试）:', error);
      this.initStatus.audioSessionReady = false;
    }
  }

  /**
   * 初始化通话服务
   */
  private async initializeCallService(): Promise<void> {
    try {
      console.log('📞 [IOSInitManager] 初始化通话服务...');
      
      await IOSCallService.initialize();
      
      this.initStatus.callServiceReady = true;
      console.log('✅ [IOSInitManager] 通话服务初始化完成');
    } catch (error) {
      console.warn('⚠️ [IOSInitManager] 通话服务初始化失败:', error);
      this.initStatus.callServiceReady = false;
      throw error;
    }
  }

  /**
   * 确保Socket连接就绪
   */
  private async ensureSocketReady(): Promise<void> {
    try {
      console.log('🔌 [IOSInitManager] 确保Socket连接就绪...');
      
      // 最多等待5秒Socket连接
      const maxWaitTime = 5000;
      const checkInterval = 100;
      let waited = 0;
      
      while (waited < maxWaitTime) {
        const globalSocket = (global as any).socketRef?.current;
        
        if (globalSocket && globalSocket.connected) {
          this.initStatus.socketReady = true;
          console.log('✅ [IOSInitManager] Socket连接已就绪');
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
      }
      
      console.warn('⚠️ [IOSInitManager] Socket连接超时，但继续初始化');
      this.initStatus.socketReady = false;
    } catch (error) {
      console.warn('⚠️ [IOSInitManager] Socket状态检查失败:', error);
      this.initStatus.socketReady = false;
    }
  }

  /**
   * 🎙️ 权限获取后的音频会话初始化
   * 在用户授权麦克风权限后调用
   */
  async initializeAudioSessionAfterPermission(): Promise<void> {
    if (Platform.OS !== 'ios' || this.initStatus.audioSessionReady) {
      return;
    }

    console.log('🔓 [IOSInitManager] 权限获取后初始化音频会话...');
    
    try {
      await this.initializeAudioSession();
      console.log('✅ [IOSInitManager] 权限后音频会话初始化完成');
    } catch (error) {
      console.error('❌ [IOSInitManager] 权限后音频会话初始化失败:', error);
    }
  }

  /**
   * 🔍 检查初始化状态
   */
  getInitializationStatus() {
    return {
      initialized: this.initialized,
      ...this.initStatus
    };
  }

  /**
   * 🔄 重置初始化状态（用于调试）
   */
  reset(): void {
    this.initialized = false;
    this.initializationPromise = null;
    this.initStatus = {
      permissionsChecked: false,
      audioSessionReady: false,
      socketReady: false,
      callServiceReady: false
    };
    console.log('🔄 [IOSInitManager] 初始化状态已重置');
  }

  /**
   * 🚀 快速重连（应用从后台恢复时）
   */
  async quickReconnect(): Promise<void> {
    if (Platform.OS !== 'ios') return;
    
    console.log('⚡ [IOSInitManager] 执行快速重连...');
    
    try {
      // 快速检查并重连Socket
      const globalSocket = (global as any).socketRef?.current;
      if (globalSocket && globalSocket.disconnected) {
        globalSocket.connect();
      }
      
      // 快速恢复音频会话（如果权限可用）
      if (this.initStatus.permissionsChecked && !this.initStatus.audioSessionReady) {
        await this.initializeAudioSession();
      }
      
      console.log('✅ [IOSInitManager] 快速重连完成');
    } catch (error) {
      console.warn('⚠️ [IOSInitManager] 快速重连失败:', error);
    }
  }
}

export default IOSInitializationManager;
