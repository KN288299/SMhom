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
      
      // 导入AudioRecorderPlayer
      const AudioRecorderPlayer = require('react-native-audio-recorder-player').default;
      const tempPlayer = new AudioRecorderPlayer();
      
      // 1. 首先设置播放订阅，激活音频会话
      await tempPlayer.setSubscriptionDuration(0.1);
      
      // 2. 尝试设置iOS特定的音频会话类别
      try {
        // 使用原生模块设置音频会话类别为播放
        const { NativeModules } = require('react-native');
        if (NativeModules.AudioRecorderPlayerModule) {
          // 设置音频会话类别为播放和录制，允许与其他应用混音
          await NativeModules.AudioRecorderPlayerModule.setAudioSessionCategory('playAndRecord', {
            allowBluetooth: true,
            allowBluetoothA2DP: true,
            allowAirPlay: true,
            defaultToSpeaker: false
          });
          console.log('✅ iOS音频会话类别已设置为播放模式');
        }
      } catch (categoryError) {
        console.warn('⚠️ 设置音频会话类别失败，使用默认配置:', categoryError);
      }
      
      // 3. 短暂等待确保音频会话完全激活
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 4. 激活音频会话
      try {
        if (NativeModules.AudioRecorderPlayerModule) {
          await NativeModules.AudioRecorderPlayerModule.setActive(true);
          console.log('✅ iOS音频会话已激活');
        }
      } catch (activeError) {
        console.warn('⚠️ 激活音频会话失败:', activeError);
      }
      
      this.isSessionActive = true;
      console.log('✅ iOS音频播放会话配置完成');
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
