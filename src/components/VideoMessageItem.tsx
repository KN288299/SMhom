import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import Video from 'react-native-video';
import MessageActionSheet from './MessageActionSheet';
import { saveVideoToGallery } from '../utils/saveImage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createThumbnail } from 'react-native-create-thumbnail';
import { BASE_URL } from '../config/api';
import { DEFAULT_AVATAR } from '../utils/DefaultAvatar';

// 常量定义
const CONSTANTS = {
  DEFAULT_VIDEO_WIDTH: 240,
  DEFAULT_VIDEO_HEIGHT: 240,
  MIN_VIDEO_SIZE: 120,
  MAX_VIDEO_SIZE: 320,
  FADE_DURATION: 200,
  BUBBLE_PADDING: 6, // 气泡内边距
  SHORT_VIDEO_THRESHOLD_SECONDS: 5,
};

// 工具函数
const formatMessageTime = (timestamp: Date): string => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

interface VideoMessageItemProps {
  videoUrl: string;
  timestamp: Date;
  isMe: boolean;
  videoDuration?: string;
  onPress: (url: string) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  // iOS 自发视频的本地路径，用于缩略图/播放回退
  localFileUri?: string;
  contactAvatar?: string | null;
  userAvatar?: string | null;
  isRead?: boolean;
  // 仅允许最新的短视频自动播放
  autoplayEligible?: boolean;
  // 新增：当前条目是否在屏幕上可见（由父级FlatList传入）
  isItemVisible?: boolean;
  // 新增：聊天页面是否处于焦点（由父级传入）
  isScreenFocused?: boolean;
  // 新增：用于在组件挂载瞬间就按比例显示与渲染缩略图
  initialWidth?: number;
  initialHeight?: number;
  initialThumbnail?: string | null;
}

const VideoMessageItem: React.FC<VideoMessageItemProps> = ({
  videoUrl,
  timestamp,
  isMe,
  videoDuration,
  onPress,
  isUploading = false,
  uploadProgress = 0,
  localFileUri,
  contactAvatar,
  userAvatar,
  isRead,
  autoplayEligible = false,
  isItemVisible = false,
  isScreenFocused = false,
  initialWidth,
  initialHeight,
  initialThumbnail,
}) => {
  const [videoWidth, setVideoWidth] = useState(initialWidth || CONSTANTS.DEFAULT_VIDEO_WIDTH);
  const [videoHeight, setVideoHeight] = useState(initialHeight || CONSTANTS.DEFAULT_VIDEO_HEIGHT);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(initialThumbnail || null);
  const [loading, setLoading] = useState(!initialThumbnail);
  const [thumbnailError, setThumbnailError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [bubbleVideoReady, setBubbleVideoReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [mediaAspectRatio, setMediaAspectRatio] = useState<number>(() => {
    // 按真实视频宽高比初始化（若父级已提供初始尺寸则直接使用）
    const width = initialWidth || videoWidth || CONSTANTS.DEFAULT_VIDEO_WIDTH;
    const height = initialHeight || videoHeight || CONSTANTS.DEFAULT_VIDEO_HEIGHT;
    return Math.max(0.1, width / Math.max(1, height));
  });

  const screenWidth = Dimensions.get('window').width;
  // 气泡宽度固定为消息区域70%（减去容器左右内边距）
  const bubbleMaxWidthPx = Math.max(CONSTANTS.MIN_VIDEO_SIZE, Math.floor(screenWidth * 0.7) - 32);

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

  // 若父组件给了初始缩略图，直接展示
  useEffect(() => {
    if (initialThumbnail) {
      fadeAnim.setValue(1);
      setLoading(false);
    }
    if (initialWidth && initialHeight) {
      setVideoWidth(initialWidth);
      setVideoHeight(initialHeight);
      setMediaAspectRatio(Math.max(0.1, initialWidth / Math.max(1, initialHeight)));
    }
    // 仅在初次挂载时依据初值处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 生成视频缩略图
  useEffect(() => {
    let isMounted = true;

    const generateThumbnail = async () => {
      if (!videoUrl) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      // 如果是上传中的视频，且已提供初始缩略图，直接使用避免二次生成
      if (isUploading && initialThumbnail) {
        if (isMounted) {
          setThumbnailUrl(initialThumbnail);
          if (initialWidth && initialHeight) {
            setVideoWidth(initialWidth);
            setVideoHeight(initialHeight);
          }
          setLoading(false);
          fadeAnim.setValue(1);
        }
        return;
      }

      // 如果是上传中的视频，优先用本地地址生成缩略图（iOS/Android 通用）
      if (isUploading) {
        const localCandidate = localFileUri || videoUrl;
        if (localCandidate) {
          try {
            const result = await createThumbnail({
              url: localCandidate,
              timeStamp: 800,
              cacheName: `upload_${Date.now()}`,
            });
            if (isMounted && result?.path) {
              console.log('上传中视频缩略图生成成功:', result.path);
              setThumbnailUrl(result.path);
              const aspectRatio = Math.max(0.1, result.width / Math.max(1, result.height));
              setVideoWidth(result.width);
              setVideoHeight(result.height);
              setMediaAspectRatio(aspectRatio);
            }
          } catch (thumbError) {
            console.log('上传中视频缩略图生成失败:', thumbError);
          }
        }
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
        setThumbnailError(false);
        fadeAnim.setValue(0);
      }

      try {
        // 解析用于生成缩略图的URL：支持 http、相对路径（拼 BASE_URL）、以及本地路径
        const isHttp = videoUrl.startsWith('http');
        const isRelative = videoUrl.startsWith('/');
        const isLocalScheme =
          videoUrl.startsWith('file://') ||
          videoUrl.startsWith('assets-library://') ||
          videoUrl.startsWith('ph://');

        let fullVideoUrl = videoUrl;
        if (isHttp) {
          fullVideoUrl = videoUrl;
        } else if (isRelative) {
          fullVideoUrl = BASE_URL + videoUrl;
        } else if (isLocalScheme) {
          fullVideoUrl = videoUrl;
        } else if (!videoUrl) {
          fullVideoUrl = '';
        }

        // 如果是iOS且存在本地文件URI，优先尝试本地（避免网络抖动导致缩略图失败）
        // 这对于自己发送的视频特别重要，确保能正常显示缩略图
        if (
          Platform.OS === 'ios' &&
          localFileUri &&
          (localFileUri.startsWith('file://') ||
            localFileUri.startsWith('assets-library://') ||
            localFileUri.startsWith('ph://'))
        ) {
          fullVideoUrl = localFileUri;
          console.log('iOS视频使用本地路径生成缩略图:', fullVideoUrl);
        }
        console.log('开始为视频生成缩略图:', fullVideoUrl);
        
        const result = await createThumbnail({
          url: fullVideoUrl,
          timeStamp: 1000,
          cacheName: videoUrl.split('/').pop(),
        });

        if (!isMounted) return;

        console.log('缩略图生成成功:', {
          path: result.path,
          width: result.width,
          height: result.height
        });
        
        setThumbnailUrl(result.path);
        
        // 根据视频的宽高比计算缩略图尺寸
        const aspectRatio = Math.max(0.1, result.width / Math.max(1, result.height));
        
        setVideoWidth(result.width);
        setVideoHeight(result.height);
        setMediaAspectRatio(aspectRatio);
        setLoading(false);
        
        // 显示缩略图的淡入动画
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: CONSTANTS.FADE_DURATION,
          useNativeDriver: true
        }).start();
        
      } catch (error) {
        if (!isMounted) return;
        
        console.error('生成视频缩略图失败:', error);
        // 失败时不强制设置默认正方形尺寸
        setLoading(false);
        setThumbnailError(true);
        
        // 即使缩略图生成失败，也要显示视频播放按钮
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: CONSTANTS.FADE_DURATION,
          useNativeDriver: true
        }).start();
      }
    };

    generateThumbnail();

    // 清理函数
    return () => {
      isMounted = false;
    };
  }, [videoUrl, isUploading, fadeAnim]);

  // 解析时长字符串为秒，支持 mm:ss / hh:mm:ss / 数字 / 带“秒”或“s”
  const parseDurationToSeconds = (duration?: string): number => {
    if (!duration) return 0;
    const str = String(duration).trim();
    // 尝试中文单位
    const hourMatch = str.match(/(\d+)\s*(小时|h)/i);
    const minMatch = str.match(/(\d+)\s*(分|min)/i);
    const secMatch = str.match(/(\d+)\s*(秒|s)/i);
    if (hourMatch || minMatch || secMatch) {
      const h = hourMatch ? parseInt(hourMatch[1], 10) : 0;
      const m = minMatch ? parseInt(minMatch[1], 10) : 0;
      const s = secMatch ? parseInt(secMatch[1], 10) : 0;
      return h * 3600 + m * 60 + s;
    }
    if (str.includes(':')) {
      const parts = str.split(':').map(p => parseInt(p, 10) || 0);
      return parts.reduce((acc, val) => acc * 60 + val, 0);
    }
    const num = parseInt(str.replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  };

  const durationSeconds = parseDurationToSeconds(videoDuration);
  // 自动播放：仅在对方消息、父级标记允许、页面在焦点且该条目可见，并且时长<=5秒
  const shouldAutoplayInBubble = !isMe && autoplayEligible && isScreenFocused && isItemVisible && durationSeconds > 0 && durationSeconds <= CONSTANTS.SHORT_VIDEO_THRESHOLD_SECONDS;

  const handleLongPress = () => {
    setShowActionSheet(true);
  };

  const getActions = () => [
    {
      label: '保存视频',
      onPress: async () => {
        try {
          const target = videoUrl || localFileUri || '';
          if (!target) return;
          await saveVideoToGallery(target);
          console.log('✅ 视频已保存到相册');
        } catch (e) {
          console.log('❌ 保存视频失败:', e);
        }
      },
    },
  ];

  return (
    <View style={[
      styles.messageContainer, 
      isMe ? styles.myMessage : styles.otherMessage
    ]}>
      {/* 显示对方头像（非自己的消息） */}
      {!isMe && (
        <View style={styles.avatarContainer}>
          {renderAvatar()}
        </View>
      )}
      
      <View style={styles.messageContent}>
        <View style={styles.videoWithTime}>
          <TouchableOpacity 
            style={(() => {
              // 外层Touchable与内层容器同尺寸，避免加载前后尺寸跳变
              const innerMax = Math.max(1, bubbleMaxWidthPx);
              const aspect = Math.max(0.1, mediaAspectRatio);
              let displayWidth = innerMax;
              let displayHeight = Math.max(CONSTANTS.MIN_VIDEO_SIZE, Math.floor(displayWidth / aspect));
              return { width: displayWidth, height: displayHeight };
            })()}
            onPress={() => {
              if (isUploading) {
                if (Platform.OS === 'ios' && localFileUri) {
                  onPress(localFileUri);
                }
                return;
              }
              if (videoUrl) {
                onPress(videoUrl);
              }
            }}
            onLongPress={handleLongPress}
            delayLongPress={500}
            activeOpacity={0.8}
            disabled={isUploading ? !(Platform.OS === 'ios' && !!localFileUri) : !videoUrl}
          >
            {(() => {
              // 统一计算：容器宽度为消息区域70%的上限；高度依赖真实/估算宽高比
              const innerMax = Math.max(1, bubbleMaxWidthPx);
              const aspect = Math.max(0.1, mediaAspectRatio);
              // 先按最大宽度计算显示宽度
              let displayWidth = innerMax;
              // 保持宽高比得到高度
              let displayHeight = Math.max(CONSTANTS.MIN_VIDEO_SIZE, Math.floor(displayWidth / aspect));
              // iOS 再整体缩小30%（宽高等比），与安卓视觉一致
              if (Platform.OS === 'ios') {
                displayWidth = Math.max(CONSTANTS.MIN_VIDEO_SIZE, Math.floor(displayWidth * 0.7));
                displayHeight = Math.max(CONSTANTS.MIN_VIDEO_SIZE, Math.floor(displayHeight * 0.7));
              }
              return (
                <View style={[styles.videoContainer, { width: displayWidth, height: displayHeight }]}>                    
                  {shouldAutoplayInBubble ? (
                    <>
                      <Video
                        source={{ uri: videoUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="contain"
                        repeat={true}
                        muted
                        paused={!shouldAutoplayInBubble || !bubbleVideoReady || isBuffering}
                        controls={false}
                        ignoreSilentSwitch="obey"
                        poster={thumbnailUrl || undefined}
                        onLoad={() => {
                          setBubbleVideoReady(true);
                          setIsBuffering(false);
                        }}
                        onBuffer={(e: any) => {
                          setIsBuffering(!!e?.isBuffering);
                        }}
                        onError={() => {
                          setBubbleVideoReady(false);
                          setIsBuffering(false);
                        }}
                        {...(Platform.OS === 'android'
                          ? {
                              useTextureView: false,
                              bufferConfig: {
                                minBufferMs: 15000,
                                maxBufferMs: 60000,
                                bufferForPlaybackMs: 2000,
                                bufferForPlaybackAfterRebufferMs: 4000,
                              },
                            }
                          : {})}
                      />
                      {(!bubbleVideoReady || isBuffering) && (
                        <View style={styles.videoLoadingOverlay}>
                          <ActivityIndicator size="small" color="#fff" />
                        </View>
                      )}
                      <View style={styles.videoDurationContainer}>
                        <Text style={styles.videoDurationText}>
                          {videoDuration || `${durationSeconds}s`}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      {thumbnailUrl && !thumbnailError ? (
                        <Animated.View style={{ 
                          opacity: fadeAnim, 
                          width: '100%', 
                          height: '100%',
                          borderRadius: 12,
                          overflow: 'hidden'
                        }}>
                          <Image 
                            source={{ 
                              uri: thumbnailUrl,
                              cache: 'force-cache' // 强制使用缓存
                            }}
                            style={{ 
                              width: '100%', 
                              height: '100%',
                              borderRadius: 12
                            }}
                            resizeMode="cover"
                            // 添加缓存相关优化
                            defaultSource={undefined} // 不使用默认图片，避免闪烁
                            progressiveRenderingEnabled={false} // 禁用渐进式渲染，避免闪烁
                            fadeDuration={0} // 禁用淡入动画，避免闪烁
                          />
                        </Animated.View>
                      ) : null}
                      {/* 加载缩略图时，仅覆盖一个轻量半透明层 */}
                      {loading && (
                        <View style={styles.videoLoadingOverlay}>
                          <ActivityIndicator size="small" color="#fff" />
                        </View>
                      )}
                      <View style={styles.videoPlayIconContainer}>
                        <Icon name="play-circle" size={40} color="#fff" />
                      </View>
                      <View style={styles.videoDurationContainer}>
                        <Text style={styles.videoDurationText}>
                          {videoDuration || '视频'}
                        </Text>
                      </View>
                      {/* 上传时仅显示转圈，其余无感 */}
                      {isUploading && uploadProgress < 100 && (
                        <View style={styles.videoUploadingContainer}>
                          <ActivityIndicator size="small" color="#fff" />
                        </View>
                      )}
                    </>
                  )}
                </View>
              );
            })()}
            
          </TouchableOpacity>
          {/* 时间显示已移除，保留上传状态 */}
          {isUploading && (
            <Text style={[
              styles.uploadStatus,
              isMe ? styles.myUploadStatus : styles.otherUploadStatus
            ]}>
              上传中...
            </Text>
          )}
        </View>
      </View>

      {/* 显示自己头像（自己的消息） */}
      {isMe && (
        <View style={styles.avatarContainer}>
          {renderAvatar()}
        </View>
      )}
      {/* 长按操作菜单 */}
      <MessageActionSheet
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        actions={getActions()}
        title="消息操作"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginHorizontal: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  messageContent: {
    width: '70%',
  },
  videoWithTime: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageBubble: {
    borderRadius: 20,
    maxWidth: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  myBubble: {
    backgroundColor: '#ff6b81',
  },
  otherBubble: {
    backgroundColor: '#f0f0f0',
  },
  videoBubble: {
    padding: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  videoContainer: {
    borderRadius: 12,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 12,
  },
  videoLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
  },
  videoUploadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
  },
  uploadProgressContainer: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginBottom: 8,
  },
  uploadProgressBar: {
    height: '100%',
    backgroundColor: '#ff6b81',
    borderRadius: 2,
  },
  uploadProgressText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 8,
  },
  uploadingIndicator: {
    marginTop: 4,
  },
  // 去除“视频”文字的正方形占位，保留加载转圈覆盖层
  videoPlayIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
  },
  videoDurationContainer: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  videoDurationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  // 时间显示样式已移除，替换为上传状态样式
  uploadStatus: {
    fontSize: 10,
    marginLeft: 8,
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  myUploadStatus: {
    textAlign: 'right',
    color: '#fff',
    opacity: 0.8,
  },
  otherUploadStatus: {
    textAlign: 'left',
    color: '#666',
  },
});

// 使用memo优化，避免不必要的重新渲染
export default memo(VideoMessageItem, (prevProps, nextProps) => {
  // 只有当这些关键属性发生变化时才重新渲染
  return (
    prevProps.videoUrl === nextProps.videoUrl &&
    prevProps.timestamp.getTime() === nextProps.timestamp.getTime() &&
    prevProps.isMe === nextProps.isMe &&
    prevProps.videoDuration === nextProps.videoDuration &&
    prevProps.isUploading === nextProps.isUploading &&
    prevProps.uploadProgress === nextProps.uploadProgress &&
    prevProps.contactAvatar === nextProps.contactAvatar &&
    prevProps.userAvatar === nextProps.userAvatar &&
    prevProps.autoplayEligible === nextProps.autoplayEligible &&
    prevProps.isItemVisible === nextProps.isItemVisible &&
    prevProps.isScreenFocused === nextProps.isScreenFocused
  );
}); 