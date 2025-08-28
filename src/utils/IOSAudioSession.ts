import { Platform, NativeModules } from 'react-native';

/**
 * iOS音频会话管理工具
 * 解决iOS语音消息播放无声音和录音启动失败的问题
 */
class IOSAudioSession {
  private static instance: IOSAudioSession;
  private isSessionActive: boolean = false;
  private currentMode: 'playback' | 'recording' | 'idle' = 'idle';

  public static getInstance(): IOSAudioSession {
    if (!IOSAudioSession.instance) {
      IOSAudioSession.instance = new IOSAudioSession();
    }
    return IOSAudioSession.instance;
  }

  /**
   * 准备音频录音会话
   * 确保iOS能够正常录音
   */
  public async prepareForRecording(): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    try {
      console.log('🎙️ 准备iOS音频录音会话...');
      
      // 导入AudioRecorderPlayer
      const AudioRecorderPlayer = require('react-native-audio-recorder-player').default;
      const tempRecorder = new AudioRecorderPlayer();
      
      // 1. 首先设置录音订阅，激活音频会话
      await tempRecorder.setSubscriptionDuration(0.1);
      
      // 2. 设置iOS特定的音频会话类别为录音
      try {
        const { NativeModules } = require('react-native');
        const module = NativeModules.AudioRecorderPlayerModule;
        if (module && typeof module.setAudioSessionCategory === 'function') {
          // 设置音频会话类别专门为录音和播放，优先录音
          // 精简选项，避免不被支持的组合导致原生崩溃
          await module.setAudioSessionCategory('playAndRecord', {
            allowBluetooth: true,
            defaultToSpeaker: true
          });
          console.log('✅ iOS音频会话类别已设置为录音模式');
        } else {
          console.warn('⚠️ iOS原生音频模块不可用，跳过录音会话类别设置');
        }
      } catch (categoryError) {
        console.warn('⚠️ 设置录音音频会话类别失败，使用默认配置:', categoryError);
      }
      
      // 3. 激活音频会话
      try {
        const { NativeModules } = require('react-native');
        const module = NativeModules.AudioRecorderPlayerModule;
        if (module && typeof module.setActive === 'function') {
          await module.setActive(true);
          console.log('✅ iOS录音音频会话已激活');
        } else {
          console.warn('⚠️ iOS原生音频模块不可用，跳过激活录音会话');
        }
      } catch (activeError) {
        console.warn('⚠️ 激活录音音频会话失败:', activeError);
      }
      
      // 4. 等待音频会话稳定（首次授权后需要更长时间以避免建连卡住）
      await new Promise(resolve => setTimeout(resolve, 800));
      
      this.isSessionActive = true;
      this.currentMode = 'recording';
      console.log('✅ iOS音频录音会话配置完成');
    } catch (error) {
      console.warn('⚠️ iOS录音音频会话设置警告:', error);
      // 即使设置失败，也标记为已尝试，避免重复尝试
      this.isSessionActive = true;
      this.currentMode = 'recording';
    }
  }

  /**
   * 准备音频播放会话
   * 确保iOS能够正常播放音频
   * @param audioFormat 可选的音频格式，用于特殊优化
   */
  public async prepareForPlayback(audioFormat?: string): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    try {
      console.log('🎵 准备iOS音频播放会话...', audioFormat ? `(格式: ${audioFormat})` : '');
      
      // 导入AudioRecorderPlayer
      const AudioRecorderPlayer = require('react-native-audio-recorder-player').default;
      const tempPlayer = new AudioRecorderPlayer();
      
      // 1. 首先设置播放订阅，激活音频会话
      await tempPlayer.setSubscriptionDuration(0.1);
      
      // 2. 尝试设置iOS特定的音频会话类别为播放
      try {
        // 使用原生模块设置音频会话类别为播放
        const { NativeModules } = require('react-native');
        const module = NativeModules.AudioRecorderPlayerModule;
        if (module && typeof module.setAudioSessionCategory === 'function') {
          // 根据音频格式调整配置（精简为稳定的最小配置）
          const options: any = {
            defaultToSpeaker: true,
            allowBluetooth: audioFormat === 'mp3' ? false : true,
          };

          // 使用更安全的 'playback' 类别，避免与录音路由混用导致崩溃
          await module.setAudioSessionCategory('playback', options);
          console.log('✅ iOS音频会话类别已设置为播放模式');
        } else {
          console.warn('⚠️ iOS原生音频模块不可用，跳过播放会话类别设置');
        }
      } catch (categoryError) {
        console.warn('⚠️ 设置播放音频会话类别失败，使用默认配置:', categoryError);
      }
      
      // 3. 激活音频会话
      try {
        const { NativeModules } = require('react-native');
        const module = NativeModules.AudioRecorderPlayerModule;
        if (module && typeof module.setActive === 'function') {
          await module.setActive(true);
          console.log('✅ iOS播放音频会话已激活');
        } else {
          console.warn('⚠️ iOS原生音频模块不可用，跳过激活播放会话');
        }
      } catch (activeError) {
        console.warn('⚠️ 激活播放音频会话失败:', activeError);
      }
      
      // 4. 短暂等待确保音频会话完全激活
      // MP3格式可能需要更长的等待时间
      const waitTime = audioFormat === 'mp3' ? 300 : 200;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      this.isSessionActive = true;
      this.currentMode = 'playback';
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
      this.currentMode = 'idle';
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

  /**
   * 获取当前音频会话模式
   */
  public getCurrentMode(): 'playback' | 'recording' | 'idle' {
    return this.currentMode;
  }

  /**
   * 重置音频会话（用于切换模式）
   */
  public async reset(): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    try {
      console.log('🔄 重置iOS音频会话...');
      
      // 尝试停用当前会话
      try {
        const { NativeModules } = require('react-native');
        const module = NativeModules.AudioRecorderPlayerModule;
        if (module && typeof module.setActive === 'function') {
          await module.setActive(false);
          console.log('✅ iOS音频会话已停用');
        } else {
          console.warn('⚠️ iOS原生音频模块不可用，跳过停用音频会话');
        }
      } catch (deactivateError) {
        console.warn('⚠️ 停用音频会话失败:', deactivateError);
      }

      // 等待音频会话完全停用
      await new Promise(resolve => setTimeout(resolve, 100));

      this.isSessionActive = false;
      this.currentMode = 'idle';
      console.log('✅ iOS音频会话重置完成');
    } catch (error) {
      console.warn('⚠️ 重置iOS音频会话失败:', error);
    }
  }
}

export default IOSAudioSession;
