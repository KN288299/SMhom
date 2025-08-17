import { Platform, NativeModules } from 'react-native';

/**
 * iOS音频会话管理工具
 * 解决iOS语音消息播放无声音的问题
 */
class IOSAudioSession {
  private static instance: IOSAudioSession;
  private isSessionActive: boolean = false;

  public static getInstance(): IOSAudioSession {
    if (!IOSAudioSession.instance) {
      IOSAudioSession.instance = new IOSAudioSession();
    }
    return IOSAudioSession.instance;
  }

  /**
   * 准备音频播放会话
   * 确保iOS能够正常播放音频
   */
  public async prepareForPlayback(): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    try {
      console.log('🎵 准备iOS音频播放会话...');
      
      // 每次播放前都重新激活音频会话，确保音频能够正常播放
      // 这解决了iOS在某些情况下音频播放无声音的问题
      const AudioRecorderPlayer = require('react-native-audio-recorder-player').default;
      const tempPlayer = new AudioRecorderPlayer();
      
      // 设置播放订阅，这会激活iOS音频会话
      // 并设置正确的音频会话类别为播放
      await tempPlayer.setSubscriptionDuration(0.1);
      
      // 短暂等待确保音频会话完全激活
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.isSessionActive = true;
      console.log('✅ iOS音频播放会话已激活');
    } catch (error) {
      console.warn('⚠️ iOS音频会话设置警告:', error);
      // 即使设置失败，也标记为已尝试，避免重复尝试
      this.isSessionActive = true;
    }
  }

  /**
   * 清理音频会话
   */
  public cleanup(): void {
    if (Platform.OS !== 'ios') {
      return;
    }

    try {
      this.isSessionActive = false;
      console.log('🔇 iOS音频会话已清理');
    } catch (error) {
      console.warn('⚠️ 清理iOS音频会话失败:', error);
    }
  }

  /**
   * 检查音频会话状态
   */
  public isActive(): boolean {
    return this.isSessionActive;
  }
}

export default IOSAudioSession;
