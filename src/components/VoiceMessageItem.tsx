import React, { useState, useEffect, useRef, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { BASE_URL } from '../config/api';
import IOSAudioSession from '../utils/IOSAudioSession';
import AudioCompatibility from '../utils/AudioCompatibility';
import RNFS from 'react-native-fs';
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
  const [localCachedPath, setLocalCachedPath] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const WAVEFORM_PATTERN = [6, 10, 14, 18, 14, 12, 8, 10];
  
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
        await audioPlayerRef.current.stopPlayer();
        audioPlayerRef.current.removePlayBackListener();
        setIsPlaying(false);
        setCurrentPosition('00:00');
      } else {
        const fullAudioUrl = getFullAudioUrl();
        
        // 检查URL是否有效
        if (!fullAudioUrl) {
          console.error('无效的音频URL，无法播放');
          Alert.alert('播放失败', '音频文件路径无效，无法播放');
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
        
        // 如果有兼容性问题，记录警告但继续尝试播放
        if (!compatInfo.canPlayDirectly) {
          console.warn('⚠️ 音频格式可能存在兼容性问题，但仍会尝试播放');
          AudioCompatibility.logCompatibilityIssue(fullAudioUrl, '格式兼容性警告');
        }
        
        // 🔧 iOS播放MP3特殊处理：确保音频会话针对MP3优化
        if (Platform.OS === 'ios' && compatInfo.sourceFormat === 'mp3') {
          console.log('🎵 iOS播放MP3格式语音，进行特殊优化...');
          try {
            const audioSession = IOSAudioSession.getInstance();
            // 重置音频会话确保清理状态
            await audioSession.reset();
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 针对MP3播放的音频会话配置
            await audioSession.prepareForPlayback('mp3');
            console.log('✅ iOS MP3播放音频会话配置完成');
            
            // 额外等待确保音频会话稳定
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (mp3SessionError) {
            console.warn('⚠️ iOS MP3音频会话配置失败，继续尝试播放:', mp3SessionError);
          }
        }
        
        console.log('开始播放语音:', fullAudioUrl);
        setIsPlaying(true);
        
        try {
          // iOS特定：强化音频播放会话管理
          if (Platform.OS === 'ios') {
            console.log('🎵 iOS语音播放：初始化音频会话...');
            const audioSession = IOSAudioSession.getInstance();
            // 重置并准备播放会话
            console.log('🔄 重置iOS播放音频会话...');
            await audioSession.reset();
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log('🔊 配置iOS播放音频会话...');
            await audioSession.prepareForPlayback(compatInfo.sourceFormat);
            await new Promise(resolve => setTimeout(resolve, 200));
            // 配置播放器订阅
            try {
              await audioPlayerRef.current.setSubscriptionDuration(0.1);
              console.log('✅ iOS音频播放器订阅配置完成');
            } catch (subscriptionError) {
              console.warn('⚠️ iOS播放器订阅配置警告:', subscriptionError);
            }
            console.log('✅ iOS音频播放环境准备完成');
          }

          // iOS 优化：远程URL优先走本地缓存 + file:// 播放，避免"播放成功但无声"
          // 辅助：根据URL/响应头判断正确的文件扩展名

          let playTarget = fullAudioUrl;
          if (Platform.OS === 'ios' && fullAudioUrl.startsWith('http')) {
            try {
              // 使用更稳健的方式解析文件名与扩展名
              const fileName = await resolveRemoteAudioFileName(fullAudioUrl);
              
              const cachePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
              const exists = await RNFS.exists(cachePath);
              if (!exists) {
                console.log('📥 iOS缓存远程语音到本地 (保留原格式):', cachePath);
                await RNFS.downloadFile({ fromUrl: fullAudioUrl, toFile: cachePath, discretionary: true, cacheable: true }).promise;
                console.log('✅ 文件下载完成，格式:', fileName.split('.').pop());
              }
              setLocalCachedPath(cachePath);
              // iOS 本地文件使用 file:// 前缀
              playTarget = `file://${cachePath}`;
              console.log('🎵 使用本地缓存播放(iOS):', playTarget);
            } catch (cacheErr) {
              console.warn('⚠️ iOS缓存远程语音失败，改用直连播放:', cacheErr);
              playTarget = fullAudioUrl;
            }
          }

          // 防御：播放前清理可能的占用与残留监听
          try { await audioPlayerRef.current.stopRecorder(); } catch {}
          try { await audioPlayerRef.current.stopPlayer(); } catch {}
          try { audioPlayerRef.current.removePlayBackListener(); } catch {}

          console.log('开始播放音频文件:', playTarget);
          await audioPlayerRef.current.startPlayer(playTarget);
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

              // 🔧 iOS首次使用修复：再次准备音频会话（针对本地文件播放），优先使用初始化管理器
              try {
                const IOSInitializationManager = require('../services/IOSInitializationManager').default;
                const initManager = IOSInitializationManager.getInstance();
                
                // 检查初始化管理器是否可用并已准备音频会话
                if (!initManager.isAudioSessionReady()) {
                  console.log('🔧 [VoiceMessage] 通过初始化管理器配置播放音频会话...');
                  await initManager.initializeAudioSessionAfterPermission();
                  console.log('✅ [VoiceMessage] iOS初始化管理器音频会话配置完成');
                } else {
                  console.log('✅ [VoiceMessage] iOS初始化管理器音频会话已就绪');
                }
              } catch (managerError) {
                console.warn('⚠️ [VoiceMessage] 初始化管理器不可用，使用兜底方案:', managerError);
                
                // 🛡️ 兜底：直接使用IOSAudioSession
                const audioSession = IOSAudioSession.getInstance();
                // 获取音频格式用于优化
                const fileFormat = fileName.split('.').pop()?.toLowerCase() || 'unknown';
                if (audioSession.getCurrentMode() !== 'playback') {
                  await audioSession.reset();
                  await audioSession.prepareForPlayback(fileFormat);
                } else if (!audioSession.isActive()) {
                  await audioSession.prepareForPlayback(fileFormat);
                }
              }

              const iosLocalTarget = Platform.OS === 'ios' ? `file://${cachePath}` : cachePath;
              console.log('🎵 使用本地缓存文件播放语音:', iosLocalTarget);
              await audioPlayerRef.current.startPlayer(iosLocalTarget);

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
            style={[styles.voiceMessage, isMe ? styles.myVoiceMessage : styles.otherVoiceMessage]} 
            onPress={handlePlayPause}
          >
            {isMe ? (
              // 发送的消息：波形在左，播放按钮在右
              <>
                <View style={[styles.waveformContainer, styles.myWaveformContainer]}>
                  <View style={styles.waveform}>
                    {WAVEFORM_PATTERN.map((height, index) => (
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
                  size={20} 
                  color="#333" 
                />
              </>
            ) : (
              // 接收的消息：播放按钮在左，波形在右
              <>
                <Icon 
                  name={isPlaying ? "pause" : "play"} 
                  size={20} 
                  color="#333" 
                />
                <View style={[styles.waveformContainer, styles.otherWaveformContainer]}>
                  <View style={styles.waveform}>
                    {WAVEFORM_PATTERN.map((height, index) => (
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
    marginHorizontal: 4,
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
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 120,
    maxWidth: 240,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  myVoiceMessage: {
    backgroundColor: '#EAF3FF',
  },
  otherVoiceMessage: {
    backgroundColor: '#FFFFFF',
  },
  waveformContainer: {
    flex: 1,
  },
  myWaveformContainer: {
    marginRight: 10,
  },
  otherWaveformContainer: {
    marginLeft: 10,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 18,
    marginBottom: 2,
  },
  waveformBar: {
    width: 2,
    marginHorizontal: 1,
    borderRadius: 1,
  },
  myWaveformBar: {
    backgroundColor: '#6B7280',
  },
  otherWaveformBar: {
    backgroundColor: '#6B7280',
  },
  duration: {
    fontSize: 12,
  },
  myDuration: {
    color: '#111',
  },
  otherDuration: {
    color: '#374151',
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