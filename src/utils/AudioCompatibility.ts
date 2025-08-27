import { Platform } from 'react-native';

/**
 * 跨平台音频兼容性工具类
 * 处理iOS和Android之间的音频格式差异
 */
class AudioCompatibility {
  private static instance: AudioCompatibility;

  public static getInstance(): AudioCompatibility {
    if (!AudioCompatibility.instance) {
      AudioCompatibility.instance = new AudioCompatibility();
    }
    return AudioCompatibility.instance;
  }

  /**
   * 获取当前平台推荐的音频格式
   */
  public getPreferredAudioFormat(): string {
    return Platform.OS === 'ios' ? 'm4a' : 'mp3';
  }

  /**
   * 获取当前平台的MIME类型
   */
  public getPreferredMimeType(): string {
    return Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mpeg';
  }

  /**
   * 检查音频URL是否可能需要格式转换
   * @param audioUrl 音频文件URL
   * @returns 是否需要处理兼容性
   */
  public needsCompatibilityProcessing(audioUrl: string): boolean {
    if (!audioUrl) return false;

    const url = audioUrl.toLowerCase();
    
    if (Platform.OS === 'ios') {
      // iOS设备接收Android的MP3文件
      return url.includes('.mp3');
    } else {
      // Android设备接收iOS的M4A文件
      return url.includes('.m4a');
    }
  }

  /**
   * 获取音频文件的兼容性信息
   * @param audioUrl 音频文件URL
   */
  public getAudioCompatibilityInfo(audioUrl: string): {
    isCompatible: boolean;
    sourceFormat: string;
    targetFormat: string;
    requiresProcessing: boolean;
    canPlayDirectly: boolean;
  } {
    const url = audioUrl.toLowerCase();
    let sourceFormat = 'unknown';
    
    if (url.includes('.mp3')) {
      sourceFormat = 'mp3';
    } else if (url.includes('.m4a')) {
      sourceFormat = 'm4a';
    } else if (url.includes('.wav')) {
      sourceFormat = 'wav';
    } else if (url.includes('.aac')) {
      sourceFormat = 'aac';
    } else if (url.includes('.3gp') || url.includes('.3gpp')) {
      sourceFormat = '3gp';
    } else if (url.includes('.amr')) {
      sourceFormat = 'amr';
    } else if (url.includes('.ogg') || url.includes('.opus')) {
      sourceFormat = url.includes('.opus') ? 'opus' : 'ogg';
    }

    const targetFormat = this.getPreferredAudioFormat();
    const isCompatible = sourceFormat === targetFormat;
    
    // 大多数现代播放器都支持跨格式播放
    const canPlayDirectly = this.canPlayFormatDirectly(sourceFormat);
    
    return {
      isCompatible,
      sourceFormat,
      targetFormat,
      requiresProcessing: !canPlayDirectly,
      canPlayDirectly
    };
  }

  /**
   * 检查当前平台是否可以直接播放指定格式
   * @param format 音频格式
   */
  public canPlayFormatDirectly(format: string): boolean {
    const supportedFormats = this.getSupportedFormats();
    return supportedFormats.includes(format.toLowerCase());
  }

  /**
   * 获取当前平台支持的音频格式列表
   */
  public getSupportedFormats(): string[] {
    if (Platform.OS === 'ios') {
      return [
        'm4a',    // 原生支持，最佳
        'mp3',    // 广泛支持
        'aac',    // 原生支持
        'wav',    // 支持但文件大
        'mp4'     // 音频容器
      ];
    } else {
      // Android
      return [
        'mp3',    // 原生支持，最佳
        'm4a',    // 大多数设备支持
        'aac',    // 原生支持
        'wav',    // 支持但文件大
        'ogg',    // Android特有
        '3gp',    // 某些安卓录音器使用
        'opus'    // 某些安卓设备/应用生成
      ];
    }
  }

  /**
   * 生成跨平台兼容的文件名
   * @param originalName 原始文件名
   */
  public generateCompatibleFileName(originalName?: string): string {
    const timestamp = Date.now();
    const preferredFormat = this.getPreferredAudioFormat();
    const baseName = originalName?.replace(/\.[^/.]+$/, '') || `voice_message_${timestamp}`;
    
    return `${baseName}.${preferredFormat}`;
  }

  /**
   * 记录音频兼容性问题
   * @param audioUrl 音频URL
   * @param error 遇到的错误
   */
  public logCompatibilityIssue(audioUrl: string, error: any): void {
    const compatInfo = this.getAudioCompatibilityInfo(audioUrl);
    
    console.warn('🎵 音频兼容性问题:', {
      platform: Platform.OS,
      audioUrl,
      compatibilityInfo: compatInfo,
      error: error?.message || error,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 获取音频播放建议
   * @param audioUrl 音频URL
   */
  public getPlaybackRecommendations(audioUrl: string): {
    shouldUseAlternativePlayer: boolean;
    recommendedMimeType: string;
    optimizationTips: string[];
  } {
    const compatInfo = this.getAudioCompatibilityInfo(audioUrl);
    const tips: string[] = [];
    
    if (!compatInfo.canPlayDirectly) {
      tips.push(`当前平台(${Platform.OS})可能不完全支持${compatInfo.sourceFormat}格式`);
      tips.push(`建议使用${compatInfo.targetFormat}格式以获得最佳兼容性`);
    }
    
    if (Platform.OS === 'ios' && compatInfo.sourceFormat === 'mp3') {
      tips.push('iOS设备播放MP3时建议检查音频会话配置');
      tips.push('建议使用本地缓存播放以提高兼容性');
      tips.push('确保音频会话设置为外放模式');
    }
    
    if (Platform.OS === 'android' && compatInfo.sourceFormat === 'm4a') {
      tips.push('Android设备播放M4A时建议检查MediaPlayer兼容性');
    }

    return {
      shouldUseAlternativePlayer: !compatInfo.canPlayDirectly,
      recommendedMimeType: this.getPreferredMimeType(),
      optimizationTips: tips
    };
  }
}

export default AudioCompatibility.getInstance();
