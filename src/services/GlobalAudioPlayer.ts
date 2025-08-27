import { Platform, Alert } from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import IOSAudioSession from '../utils/IOSAudioSession';

type PlaybackListener = (e: { currentPosition: number; duration: number }) => void;

class GlobalAudioPlayerService {
  private static instance: GlobalAudioPlayerService;
  private player: AudioRecorderPlayer;
  private isStarting: boolean = false;
  private activeUrl: string | null = null;
  private cachedLocalPath: string | null = null;

  private constructor() {
    this.player = new AudioRecorderPlayer();
  }

  public static getInstance(): GlobalAudioPlayerService {
    if (!GlobalAudioPlayerService.instance) {
      GlobalAudioPlayerService.instance = new GlobalAudioPlayerService();
    }
    return GlobalAudioPlayerService.instance;
  }

  public async stop(): Promise<void> {
    try { await this.player.stopPlayer(); } catch {}
    try { this.player.removePlayBackListener(); } catch {}
    this.activeUrl = null;
    this.cachedLocalPath = null;
  }

  public async play(url: string, onProgress?: PlaybackListener, onEnded?: () => void): Promise<void> {
    if (!url) {
      Alert.alert('播放失败', '音频URL无效');
      return;
    }
    if (this.isStarting) return;
    this.isStarting = true;

    try {
      // 若正在播放其他，先停止
      try { await this.player.stopRecorder(); } catch {}
      try { await this.player.stopPlayer(); } catch {}
      try { this.player.removePlayBackListener(); } catch {}

      let playTarget = url;

      if (Platform.OS === 'ios') {
        try {
          const audioFormat = this.getFormatFromUrl(url);
          await IOSAudioSession.getInstance().prepareForPlayback(audioFormat);
          try { await this.player.setSubscriptionDuration(0.1); } catch {}
        } catch {}
      }

      try {
        await this.player.startPlayer(playTarget);
      } catch (err) {
        // iOS远程失败：下载到本地再播，或去掉file://重试
        if (Platform.OS === 'ios') {
          if (url.startsWith('http')) {
            const fileName = this.resolveFileName(url);
            const cachePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
            const exists = await RNFS.exists(cachePath);
            if (!exists) {
              await RNFS.downloadFile({ fromUrl: url, toFile: cachePath, discretionary: true, cacheable: true }).promise;
            }
            this.cachedLocalPath = `file://${cachePath}`;
            try {
              await this.player.startPlayer(this.cachedLocalPath);
            } catch (cacheErr) {
              const noScheme = this.cachedLocalPath.replace('file://', '');
              await this.player.startPlayer(noScheme);
            }
          } else if (url.startsWith('file://')) {
            const noScheme = url.replace('file://', '');
            await this.player.startPlayer(noScheme);
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }

      this.activeUrl = url;
      this.player.addPlayBackListener((e) => {
        onProgress && onProgress(e);
        if (e.currentPosition >= e.duration) {
          try { this.player.stopPlayer(); } catch {}
          try { this.player.removePlayBackListener(); } catch {}
          this.activeUrl = null;
          this.cachedLocalPath = null;
          onEnded && onEnded();
        }
      });
    } finally {
      this.isStarting = false;
    }
  }

  private getFormatFromUrl(url: string): string {
    const lower = url.split('?')[0].toLowerCase();
    if (lower.endsWith('.mp3')) return 'mp3';
    if (lower.endsWith('.m4a') || lower.endsWith('.aac') || lower.endsWith('.mp4')) return 'm4a';
    if (lower.endsWith('.wav')) return 'wav';
    return 'unknown';
  }

  private resolveFileName(url: string): string {
    try {
      const base = decodeURIComponent(url.split('?')[0].split('/').pop() || `voice_${Date.now()}`);
      if (base.match(/\.(mp3|m4a|aac|wav|mp4)$/i)) return base;
      const isMp3 = url.toLowerCase().includes('mp3');
      return `${base}${isMp3 ? '.mp3' : '.m4a'}`;
    } catch {
      return `voice_${Date.now()}.m4a`;
    }
  }
}

export default GlobalAudioPlayerService.getInstance();


