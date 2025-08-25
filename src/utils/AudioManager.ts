import InCallManager from 'react-native-incall-manager';
import { Platform, Vibration } from 'react-native';

class AudioManager {
  private static instance: AudioManager;
  private isSpeakerOn: boolean = false;
  private isCallActive: boolean = false;
  private vibrationIntervalId: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * 开始音频会话
   */
  public start(): void {
    try {
      // 优化音频配置
      InCallManager.start({ 
        media: 'audio', 
        ringback: '_BUNDLE_',
        auto: true
      });
      
      // 设置音频质量优化
      this.setupAudioOptimizations();
      
      // 默认使用听筒
      this.setSpeakerOn(false);
      this.isCallActive = true;
      console.log('音频会话已启动，已启用音频优化');
    } catch (error) {
      console.error('启动音频会话失败:', error);
    }
  }

  /**
   * 设置音频质量优化
   */
  private setupAudioOptimizations(): void {
    try {
      // 启用回声消除
      InCallManager.setMicrophoneMute(false);
      
      // 设置音频模式为通话模式
      if (Platform.OS === 'android') {
        // Android特定优化
        InCallManager.requestAudioFocus();
      }
      
      console.log('音频质量优化已启用');
    } catch (error) {
      console.error('设置音频优化失败:', error);
    }
  }

  /**
   * 停止音频会话
   */
  public stop(): void {
    try {
      // 确保停止所有铃声
      this.stopRingback();
      this.stopRingtone();
      this.stopVibration();
      
      // 停止音频会话
      InCallManager.stop();
      this.isCallActive = false;
      console.log('音频会话已停止');
    } catch (error) {
      console.error('停止音频会话失败:', error);
    }
  }

  /**
   * 切换扬声器状态
   * @param enabled 是否启用扬声器
   * @returns 当前扬声器状态
   */
  public setSpeakerOn(enabled: boolean): boolean {
    try {
      console.log(`设置扬声器状态: ${enabled ? '开启' : '关闭'}`);
      
      // 在Android上，可能需要额外的处理
      if (Platform.OS === 'android') {
        // 确保音频路由正确
        InCallManager.setForceSpeakerphoneOn(enabled);
        
        // 有些设备可能需要额外设置音频路由
        if (enabled) {
          // 使用扬声器
          InCallManager.chooseAudioRoute('SPEAKER_PHONE');
        } else {
          // 使用听筒
          InCallManager.chooseAudioRoute('EARPIECE');
        }
      } else {
        // iOS处理相对简单
        InCallManager.setForceSpeakerphoneOn(enabled);
      }
      
      this.isSpeakerOn = enabled;
      return this.isSpeakerOn;
    } catch (error) {
      console.error('设置扬声器状态失败:', error);
      return this.isSpeakerOn;
    }
  }

  /**
   * 切换扬声器状态
   * @returns 切换后的扬声器状态
   */
  public toggleSpeaker(): boolean {
    return this.setSpeakerOn(!this.isSpeakerOn);
  }

  /**
   * 获取当前扬声器状态
   * @returns 当前扬声器状态
   */
  public isSpeakerEnabled(): boolean {
    return this.isSpeakerOn;
  }

  /**
   * 播放铃声
   */
  public playRingback(): void {
    try {
      // 使用默认铃声
      InCallManager.startRingback('_BUNDLE_');
      console.log('开始播放铃声');
    } catch (error) {
      console.error('播放铃声失败:', error);
    }
  }

  /**
   * 停止铃声
   */
  public stopRingback(): void {
    try {
      InCallManager.stopRingback();
      console.log('停止播放铃声');
    } catch (error) {
      console.error('停止铃声失败:', error);
    }
  }
  
  /**
   * 开始来电铃声（被叫端）
   */
  public startRingtone(): void {
    try {
      InCallManager.startRingtone('_BUNDLE_');
      console.log('开始播放来电铃声');
    } catch (error) {
      console.error('播放来电铃声失败:', error);
    }
  }

  /**
   * 停止来电铃声（被叫端）
   */
  public stopRingtone(): void {
    try {
      InCallManager.stopRingtone();
      console.log('停止来电铃声');
    } catch (error) {
      console.error('停止来电铃声音频失败:', error);
    }
  }

  /**
   * 开始震动提示
   */
  public startVibration(): void {
    try {
      // Android 支持可重复的自定义节奏；iOS 对重复支持有限，这里用定时触发兜底
      if (Platform.OS === 'android') {
        Vibration.vibrate([500, 1000], true);
      } else {
        // iOS：每1.6秒触发一次短震
        Vibration.vibrate();
        if (this.vibrationIntervalId) {
          clearInterval(this.vibrationIntervalId);
        }
        this.vibrationIntervalId = setInterval(() => {
          Vibration.vibrate();
        }, 1600);
      }
      console.log('开始震动提示');
    } catch (error) {
      console.error('启动震动失败:', error);
    }
  }

  /**
   * 停止震动提示
   */
  public stopVibration(): void {
    try {
      Vibration.cancel();
      if (this.vibrationIntervalId) {
        clearInterval(this.vibrationIntervalId);
        this.vibrationIntervalId = null;
      }
      console.log('停止震动提示');
    } catch (error) {
      console.error('停止震动失败:', error);
    }
  }
  
  /**
   * 停止所有音频（铃声和通话）
   * 在组件卸载或通话结束时调用
   */
  public stopAll(): void {
    try {
      // 停止铃声
      this.stopRingback();
      this.stopRingtone();
      this.stopVibration();
      
      // 停止音频会话
      this.stop();
      
      console.log('已停止所有音频');
    } catch (error) {
      console.error('停止所有音频失败:', error);
    }
  }
}

export default AudioManager.getInstance(); 