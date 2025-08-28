import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Image, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { BASE_URL } from '../config/api';
import IOSAudioSession from '../utils/IOSAudioSession';
import AudioCompatibility from '../utils/AudioCompatibility';
import RNFS from 'react-native-fs';
import GlobalAudioPlayer from '../services/GlobalAudioPlayer';
import { DEFAULT_AVATAR } from '../utils/DefaultAvatar';

interface VoiceMessageItemProps {
  audioUrl: string;
  duration?: string;
  isMe: boolean;
  timestamp: Date;
  contactAvatar?: string | null;
  userAvatar?: string | null;
  isRead?: boolean;
}

const VoiceMessageItem: React.FC<VoiceMessageItemProps> = ({ 
  audioUrl, 
  duration = '00:00', 
  isMe,
  timestamp,
  contactAvatar,
  userAvatar,
  isRead
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState('00:00');
  const audioPlayerRef = useRef<AudioRecorderPlayer>(new AudioRecorderPlayer());
  const isStartingRef = useRef(false);
  const [localCachedPath, setLocalCachedPath] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const WAVEFORM_PATTERN = [4, 8, 12, 16, 12, 10, 6, 8, 14, 6, 10, 18, 8, 4, 12, 6]; // 微信样式波形
  
  // 解析时长字符串为秒
  const parseDurationToSeconds = (value?: string): number => {
    if (!value) return 0;
    const str = String(value).trim();
    // 支持 00:00 / 00:00:00 等格式
    if (str.includes(':')) {
      const parts = str.split(':').map(p => parseInt(p, 10) || 0);
      return parts.reduce((acc, v) => acc * 60 + v, 0);
    }
    // 支持 "60秒" / "60s" / 60
    const num = parseInt(str.replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  };

  // 自适应气泡宽度（依据时长，不改变配色）
  const durationSeconds = Math.max(0, parseDurationToSeconds(duration));
  const windowWidth = Dimensions.get('window').width;
  const bubbleMaxWidthPx = Math.min(Math.floor(windowWidth * 0.7), 320);
  const bubbleMinWidthPx = 112; // 保持紧凑的最小宽度
  const clamped = Math.min(durationSeconds, 60); // 以60秒为满刻度
  const bubbleWidth = Math.floor(
    bubbleMinWidthPx + (bubbleMaxWidthPx - bubbleMinWidthPx) * (clamped / 60)
  );

  // 根据可用宽度动态生成波形条数量，保证对称与填充
  const innerHorizontalPadding = 14 * 2;
  const iconAndGapSpace = 18 /*icon*/ + 8 /*gap*/;
  const durationTextSpace = 44; // 预估"00:00"文本宽度
  const waveformAvailableWidth = Math.max(
    20,
    bubbleWidth - innerHorizontalPadding - iconAndGapSpace - durationTextSpace
  );
  const barsCount = Math.max(8, Math.min(30, Math.floor(waveformAvailableWidth / 6))); // 3px条 + 3px间距
  const waveformBars = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < barsCount; i++) {
      arr.push(WAVEFORM_PATTERN[i % WAVEFORM_PATTERN.length]);
    }
    return arr;
  }, [barsCount]);

  // 获取完整的音频URL
  const getFullAudioUrl = () => {
    // 安全检查：确保audioUrl是有效的字符串
    if (!audioUrl || typeof audioUrl !== 'string') {
      console.error('无效的音频URL:', audioUrl);
      return '';
    }
    
    // 检查是否是错误状态（如"Already recording"）
    if (audioUrl === 'Already recording' || audioUrl.includes('Already recording')) {
      console.error('检测到录音状态错误:', audioUrl);
      return '';
    }
    
    // 如果是完整URL或本地文件路径，直接返回
    if (audioUrl.startsWith('http') || audioUrl.startsWith('file://')) {
      return audioUrl;
    }
    
    // 确保路径以/开头
    const normalizedPath = audioUrl.startsWith('/') ? audioUrl : `/${audioUrl}`;
    
    // 拼接基础URL
    return `${BASE_URL}${normalizedPath}`;
  };
  
  // 组件卸载时停止播放
  useEffect(() => {
    return () => {
      if (isPlaying) {
        audioPlayerRef.current.stopPlayer();
        audioPlayerRef.current.removePlayBackListener();
      }
    };
  }, [isPlaying]);

  const handlePlayPause = async () => {
    // 并发防护：避免快速连点导致原生崩溃
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    // 解析远程音频文件名与扩展名（使用响应头或启发式）
    const resolveRemoteAudioFileName = async (url: string): Promise<string> => {
      try {
        const urlWithoutQuery = url.split('?')[0];
        const rawName = decodeURIComponent(urlWithoutQuery.split('/').pop() || `voice_${Date.now()}`);
        const lower = rawName.toLowerCase();
        const known = ['.mp3', '.m4a', '.aac', '.wav', '.mp4'];
        const hasKnownExt = known.some(ext => lower.endsWith(ext));
        if (hasKnownExt) {
          return rawName;
        }
        // 优先通过 HEAD 的 Content-Type 判断
        try {
          const res = await fetch(url, { method: 'HEAD' });
          const ct = res.headers.get('Content-Type') || res.headers.get('content-type') || '';
          let ext = '.m4a';
          if (ct.includes('m4a') || ct.includes('aac') || ct.includes('mp4')) ext = '.m4a';
          else if (ct.includes('wav')) ext = '.wav';
          else if (ct.includes('mpeg') || ct.includes('mp3')) ext = '.mp3';
          return `${rawName}${ext}`;
        } catch {}
        // 回退：优先使用统一容器 m4a，除非URL明确包含mp3
        const guessMp3 = url.toLowerCase().includes('mp3');
        return `${rawName}${guessMp3 ? '.mp3' : '.m4a'}`;
      } catch {
        return `voice_${Date.now()}.m4a`;
      }
    };
    try {
      if (isPlaying) {
        console.log('停止播放语音');
        await GlobalAudioPlayer.stop();
        setIsPlaying(false);
        setCurrentPosition('00:00');
      } else {
        const fullAudioUrl = getFullAudioUrl();
        
        // 检查URL是否有效
        if (!fullAudioUrl) {
          console.error('无效的音频URL，无法播放');
          Alert.alert('播放失败', '音频文件路径无效，无法播放');
          isStartingRef.current = false;
          return;
        }
        
        // 🎵 检查音频兼容性
        const compatInfo = AudioCompatibility.getAudioCompatibilityInfo(fullAudioUrl);
        const recommendations = AudioCompatibility.getPlaybackRecommendations(fullAudioUrl);
        
        console.log('🎵 音频兼容性检查:', {
          url: fullAudioUrl,
          platform: Platform.OS,
          compatibility: compatInfo,
          recommendations: recommendations
        });
        
        // 如果存在明显不兼容（如 iOS 播放 3gp/amr/opus），直接给出提示并避免崩溃
        const fatalUnsupportedOnIOS = Platform.OS === 'ios' && ['3gp', 'amr', 'ogg', 'opus'].includes(compatInfo.sourceFormat);
        if (fatalUnsupportedOnIOS) {
          AudioCompatibility.logCompatibilityIssue(fullAudioUrl, 'iOS不支持的安卓音频格式');
          Alert.alert('无法播放', '该语音采用安卓专用音频格式，iOS无法直接播放。请对方更新至最新版或重新发送语音。');
          isStartingRef.current = false;
          return;
        }
        // 非致命：记录警告但继续尝试播放
        if (!compatInfo.canPlayDirectly) {
          console.warn('⚠️ 音频格式可能存在兼容性问题，但仍会尝试播放');
          AudioCompatibility.logCompatibilityIssue(fullAudioUrl, '格式兼容性警告');
        }
        
        // 🔧 iOS播放前：简化音频会话准备，避免重复 reset 导致竞态
        if (Platform.OS === 'ios') {
          try {
            const audioSession = IOSAudioSession.getInstance();
            await audioSession.prepareForPlayback(compatInfo.sourceFormat);
          } catch (sessionErr) {
            console.warn('⚠️ iOS播放会话准备失败，继续尝试播放:', sessionErr);
          }
        }
        
        console.log('开始播放语音:', fullAudioUrl);
        setIsPlaying(true);
        try {
          await GlobalAudioPlayer.play(
            fullAudioUrl,
            (e) => {
              const seconds = Math.floor(e.currentPosition / 1000);
              const minutes = Math.floor(seconds / 60);
              const remainingSeconds = seconds % 60;
              setCurrentPosition(
                `${minutes < 10 ? '0' + minutes : minutes}:${remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds}`
              );
            },
            () => {
              setIsPlaying(false);
              setCurrentPosition('00:00');
            }
          );
          return;
        } catch (playError: any) {
          console.error('播放语音失败:', playError);
          let errorMessage = '无法播放语音消息';
          if (playError.message?.includes('Prepare failed')) {
            errorMessage = '音频文件损坏或格式不支持';
          } else if (playError.message?.includes('Network')) {
            errorMessage = '网络连接失败，请检查网络设置';
          }
          Alert.alert('播放失败', errorMessage);
          setIsPlaying(false);
          return;
        }
        
        try {
          // iOS特定：仅设置必要的播放器参数
          if (Platform.OS === 'ios') {
            try {
              await audioPlayerRef.current.setSubscriptionDuration(0.1);
            } catch (subscriptionError) {
              console.warn('⚠️ iOS播放器订阅配置警告:', subscriptionError);
            }
            try {
              await audioPlayerRef.current.setVolume(1.0);
            } catch {}
          }

          // 修复：默认优先直接播放远程URL，避免因为本地file://路径导致的iOS闪退
          // 仅在播放失败时再尝试本地缓存回退
          let playTarget = fullAudioUrl;

          // 防御：播放前清理可能的占用与残留监听
          try { await audioPlayerRef.current.stopRecorder(); } catch {}
          try { await audioPlayerRef.current.stopPlayer(); } catch {}
          try { audioPlayerRef.current.removePlayBackListener(); } catch {}

          console.log('开始播放音频文件:', playTarget);
          try {
            await audioPlayerRef.current.startPlayer(playTarget);
          } catch (primaryPlayErr) {
            // 回退：iOS远程直连失败时，尝试缓存到本地后再播放
            if (Platform.OS === 'ios' && fullAudioUrl.startsWith('http')) {
              try {
                console.warn('⚠️ iOS远程播放失败，尝试缓存回退:', (primaryPlayErr as any)?.message || String(primaryPlayErr));
                const fileName = await resolveRemoteAudioFileName(fullAudioUrl);
                const cachePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
                const exists = await RNFS.exists(cachePath);
                if (!exists) {
                  console.log('📥 下载语音到本地缓存:', cachePath);
                  await RNFS.downloadFile({ fromUrl: fullAudioUrl, toFile: cachePath, discretionary: true, cacheable: true }).promise;
                }
                setLocalCachedPath(cachePath);
                const iosLocalTarget = `file://${cachePath}`;
                try {
                  await audioPlayerRef.current.startPlayer(iosLocalTarget);
                } catch (cachePlayErr) {
                  // 最后回退：去掉 file:// 再试
                  const noSchemePath = iosLocalTarget.replace('file://', '');
                  console.warn('⚠️ iOS缓存(file://)播放失败，尝试无前缀路径:', noSchemePath);
                  await audioPlayerRef.current.startPlayer(noSchemePath);
                }
              } catch (cacheFallbackErr) {
                throw cacheFallbackErr;
              }
            } else if (Platform.OS === 'ios' && playTarget.startsWith('file://')) {
              // 备用回退：若当前是本地file://路径失败，尝试无scheme
              const noSchemePath = playTarget.replace('file://', '');
              console.warn('⚠️ iOS使用file://播放失败，尝试无前缀路径:', noSchemePath);
              await audioPlayerRef.current.startPlayer(noSchemePath);
            } else {
              throw primaryPlayErr;
            }
          }
          console.log('✅ 播放开始成功');
          
          audioPlayerRef.current.addPlayBackListener((e) => {
            console.log('播放进度:', e.currentPosition / 1000, '秒');
            const seconds = Math.floor(e.currentPosition / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            setCurrentPosition(
              `${minutes < 10 ? '0' + minutes : minutes}:${
                remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds
              }`
            );

            if (e.currentPosition >= e.duration) {
              console.log('播放完成');
              audioPlayerRef.current.stopPlayer();
              audioPlayerRef.current.removePlayBackListener();
              setIsPlaying(false);
              setCurrentPosition('00:00');
            }
          });
        } catch (playError: any) {
          console.error('播放语音失败:', playError);

          // iOS远程播放失败：尝试下载并从本地缓存播放
          if (Platform.OS === 'ios' && fullAudioUrl.startsWith('http')) {
            try {
              console.log('🔄 iOS播放失败，尝试本地缓存方案...');
              // 使用更稳健的方式解析文件名与扩展名
              const fileName = await resolveRemoteAudioFileName(fullAudioUrl);
              
              // iOS使用DocumentDirectory而不是CachesDirectory，权限更稳定
              const cachePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

              if (!localCachedPath || localCachedPath !== cachePath || !(await RNFS.exists(cachePath))) {
                console.log('📥 iOS下载语音到本地缓存:', cachePath);
                setIsDownloading(true);
                
                // 确保目录存在
                const dirExists = await RNFS.exists(RNFS.DocumentDirectoryPath);
                if (!dirExists) {
                  await RNFS.mkdir(RNFS.DocumentDirectoryPath);
                }
                
                await RNFS.downloadFile({ 
                  fromUrl: fullAudioUrl, 
                  toFile: cachePath,
                  discretionary: true,
                  cacheable: true
                }).promise;
                setLocalCachedPath(cachePath);
                console.log('✅ 文件下载完成');
              }
              setIsDownloading(false);

              // 🔧 简化：直接准备播放会话
              try {
                const audioSession = IOSAudioSession.getInstance();
                const fileFormat = fileName.split('.').pop()?.toLowerCase() || 'unknown';
                await audioSession.prepareForPlayback(fileFormat);
              } catch {}

              const iosLocalTarget = Platform.OS === 'ios' ? `file://${cachePath}` : cachePath;
              console.log('🎵 使用本地缓存文件播放语音:', iosLocalTarget);
              try {
                await audioPlayerRef.current.startPlayer(iosLocalTarget);
              } catch (cachePlayErr) {
                if (Platform.OS === 'ios' && iosLocalTarget.startsWith('file://')) {
                  const noSchemePath = iosLocalTarget.replace('file://', '');
                  console.warn('⚠️ iOS本地缓存(file://)播放失败，尝试无前缀路径:', noSchemePath);
                  await audioPlayerRef.current.startPlayer(noSchemePath);
                } else {
                  throw cachePlayErr;
                }
              }

              audioPlayerRef.current.addPlayBackListener((e) => {
                const seconds = Math.floor(e.currentPosition / 1000);
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                setCurrentPosition(
                  `${minutes < 10 ? '0' + minutes : minutes}:${
                    remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds
                  }`
                );

                if (e.currentPosition >= e.duration) {
                  audioPlayerRef.current.stopPlayer();
                  audioPlayerRef.current.removePlayBackListener();
                  setIsPlaying(false);
                  setCurrentPosition('00:00');
                }
              });
              isStartingRef.current = false;
              return;
            } catch (iosFallbackErr) {
              console.error('iOS缓存播放失败:', iosFallbackErr);
            } finally {
              setIsDownloading(false);
            }
          }

          let errorMessage = '无法播放语音消息';
          if (playError.message?.includes('Prepare failed')) {
            errorMessage = '音频文件损坏或格式不支持';
          } else if (playError.message?.includes('Network')) {
            errorMessage = '网络连接失败，请检查网络设置';
          }
          Alert.alert('播放失败', errorMessage);
          setIsPlaying(false);
        }
      }
    } catch (error: any) {
      console.error('处理语音播放失败:', error);
      Alert.alert('错误', `语音播放操作失败: ${error.message || '未知错误'}`);
      setIsPlaying(false);
    } finally {
      isStartingRef.current = false;
    }
  };

  // 渲染头像
  const renderAvatar = () => {
    // 根据消息发送者显示对应的头像
    const avatarUrl = isMe ? userAvatar : contactAvatar;
    if (avatarUrl) {
      return <Image source={{ uri: avatarUrl }} style={styles.avatar} />;
    } else {
      return <Image source={DEFAULT_AVATAR} style={styles.avatar} />;
    }
  };

  return (
    <View style={[styles.container, isMe ? styles.myContainer : styles.otherContainer]}>
      {/* 显示对方头像（非自己的消息） */}
      {!isMe && (
        <View style={styles.avatarContainer}>
          {renderAvatar()}
        </View>
      )}
      
      <View style={styles.messageContent}>
        <View style={styles.voiceMessageWithTime}>
          <TouchableOpacity 
            style={[styles.voiceMessage, { width: bubbleWidth }, isMe ? styles.myVoiceMessage : styles.otherVoiceMessage]} 
            onPress={handlePlayPause}
          >
            {isMe ? (
              // 发送的消息：波形在左，播放按钮在右
              <>
                <View style={[styles.waveformContainer, styles.myWaveformContainer]}>
                  <View style={styles.waveform}>
                    {waveformBars.map((height, index) => (
                      <View 
                        key={index} 
                        style={[
                          styles.waveformBar, 
                          styles.myWaveformBar,
                          { height }
                        ]} 
                      />
                    ))}
                  </View>
                  <Text style={[styles.duration, styles.myDuration]}>
                    {isPlaying ? currentPosition : duration}
                  </Text>
                </View>
                <Icon 
                  name={isPlaying ? "pause" : "play"} 
                  size={18} 
                  color="#2D5016" 
                />
              </>
            ) : (
              // 接收的消息：播放按钮在左，波形在右
              <>
                <Icon 
                  name={isPlaying ? "pause" : "play"} 
                  size={18} 
                  color="#666666" 
                />
                <View style={[styles.waveformContainer, styles.otherWaveformContainer]}>
                  <View style={styles.waveform}>
                    {waveformBars.map((height, index) => (
                      <View 
                        key={index} 
                        style={[
                          styles.waveformBar, 
                          styles.otherWaveformBar,
                          { height }
                        ]} 
                      />
                    ))}
                  </View>
                  <Text style={[styles.duration, styles.otherDuration]}>
                    {isPlaying ? currentPosition : duration}
                  </Text>
                </View>
              </>
            )}
          </TouchableOpacity>
          {/* 时间显示已移除 */}
        </View>
      </View>

      {/* 显示自己头像（自己的消息） */}
      {isMe && (
        <View style={styles.avatarContainer}>
          {renderAvatar()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  myContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginHorizontal: 2, // 从4减少到2，减少50%的距离
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  messageContent: {
    maxWidth: '70%',
  },
  voiceMessageWithTime: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  voiceMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 100,
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  myVoiceMessage: {
    backgroundColor: Platform.OS === 'ios' ? '#007AFF' : '#ff6b81', // iOS蓝色，Android粉色
    borderBottomRightRadius: 6, // 微信样式的尖角
  },
  otherVoiceMessage: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6, // 微信样式的尖角
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  waveformContainer: {
    flex: 1,
  },
  myWaveformContainer: {
    marginRight: 8, // 减少间距使布局更紧凑
  },
  otherWaveformContainer: {
    marginLeft: 8, // 减少间距使布局更紧凑
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20, // 增加高度以适应更高的波形
    marginBottom: 2,
  },
  waveformBar: {
    width: 3,
    marginHorizontal: 1,
    borderRadius: 2,
  },
  myWaveformBar: {
    backgroundColor: Platform.OS === 'ios' ? '#FFFFFF' : '#FFFFFF', // 两个平台都使用白色波形
  },
  otherWaveformBar: {
    backgroundColor: '#9CA3AF', // 灰色波形
  },
  duration: {
    fontSize: 11,
    fontWeight: '500',
  },
  myDuration: {
    color: '#FFFFFF', // 白色文字在蓝色/粉色背景上
  },
  otherDuration: {
    color: '#666666', // 深灰色文字
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginLeft: 8,
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  myTimestamp: {
    textAlign: 'right',
  },
  otherTimestamp: {
    textAlign: 'left',
  },
});

// 使用memo优化，避免不必要的重新渲染
export default memo(VoiceMessageItem, (prevProps, nextProps) => {
  return (
    prevProps.audioUrl === nextProps.audioUrl &&
    prevProps.duration === nextProps.duration &&
    prevProps.timestamp.getTime() === nextProps.timestamp.getTime() &&
    prevProps.isMe === nextProps.isMe &&
    prevProps.contactAvatar === nextProps.contactAvatar &&
    prevProps.userAvatar === nextProps.userAvatar
  );
}); 