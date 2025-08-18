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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createThumbnail } from 'react-native-create-thumbnail';
import { BASE_URL } from '../config/api';

// 常量定义
const CONSTANTS = {
  DEFAULT_VIDEO_WIDTH: 200,
  DEFAULT_VIDEO_HEIGHT: 150,
  MIN_VIDEO_SIZE: 100,
  MAX_VIDEO_SIZE: 280,
  FADE_DURATION: 200,
  BUBBLE_PADDING: 4, // 气泡内边距
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
}) => {
  const [videoWidth, setVideoWidth] = useState(CONSTANTS.DEFAULT_VIDEO_WIDTH);
  const [videoHeight, setVideoHeight] = useState(CONSTANTS.DEFAULT_VIDEO_HEIGHT);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [thumbnailError, setThumbnailError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

      // 如果是上传中的视频，尝试生成缩略图（特别是iOS本地视频）
      if (isUploading) {
        // 对于iOS本地视频，也尝试生成缩略图
        if (Platform.OS === 'ios' && videoUrl && videoUrl.startsWith('file://')) {
          console.log('尝试为iOS上传中的本地视频生成缩略图:', videoUrl);
          
          try {
            const result = await createThumbnail({
              url: videoUrl,
              timeStamp: 1000,
              cacheName: `upload_${Date.now()}`,
            });

            if (isMounted && result.path) {
              console.log('iOS上传中视频缩略图生成成功:', result.path);
              setThumbnailUrl(result.path);
              
              // 设置视频尺寸
              const aspectRatio = result.width / result.height;
              let newWidth = CONSTANTS.DEFAULT_VIDEO_WIDTH;
              let newHeight = newWidth / aspectRatio;
              
              if (newHeight > CONSTANTS.DEFAULT_VIDEO_HEIGHT) {
                newHeight = CONSTANTS.DEFAULT_VIDEO_HEIGHT;
                newWidth = newHeight * aspectRatio;
              }
              
              setVideoWidth(newWidth);
              setVideoHeight(newHeight);
            }
          } catch (thumbError) {
            console.log('iOS上传中视频缩略图生成失败:', thumbError);
          }
        }
        
        if (isMounted) {
          // 如果没有生成缩略图，使用默认尺寸
          if (!thumbnailUrl) {
            setVideoWidth(CONSTANTS.DEFAULT_VIDEO_WIDTH);
            setVideoHeight(CONSTANTS.DEFAULT_VIDEO_HEIGHT);
          }
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
        if (
          Platform.OS === 'ios' &&
          localFileUri &&
          (localFileUri.startsWith('file://') ||
            localFileUri.startsWith('assets-library://') ||
            localFileUri.startsWith('ph://'))
        ) {
          fullVideoUrl = localFileUri;
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
        const aspectRatio = result.width / result.height;
        
        // 设置最大宽度和最大高度
        const maxWidth = CONSTANTS.MAX_VIDEO_SIZE;
        const maxHeight = CONSTANTS.MAX_VIDEO_SIZE;
        
        // 根据宽高比计算实际显示尺寸
        let newWidth, newHeight;
        
        if (aspectRatio > 1) {
          // 宽视频：以宽度为基准
          newWidth = Math.min(maxWidth, result.width);
          newHeight = newWidth / aspectRatio;
          // 如果高度超过最大值，重新以高度为基准计算
          if (newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = newHeight * aspectRatio;
          }
        } else {
          // 长视频：以高度为基准
          newHeight = Math.min(maxHeight, result.height);
          newWidth = newHeight * aspectRatio;
          // 如果宽度超过最大值，重新以宽度为基准计算
          if (newWidth > maxWidth) {
            newWidth = maxWidth;
            newHeight = newWidth / aspectRatio;
          }
        }
        
        // 确保最小尺寸，但保持宽高比
        if (newWidth < CONSTANTS.MIN_VIDEO_SIZE && newHeight < CONSTANTS.MIN_VIDEO_SIZE) {
          if (aspectRatio > 1) {
            newWidth = CONSTANTS.MIN_VIDEO_SIZE;
            newHeight = newWidth / aspectRatio;
          } else {
            newHeight = CONSTANTS.MIN_VIDEO_SIZE;
            newWidth = newHeight * aspectRatio;
          }
        }
        
        setVideoWidth(newWidth);
        setVideoHeight(newHeight);
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
        // 设置一个默认尺寸
        setVideoWidth(CONSTANTS.DEFAULT_VIDEO_WIDTH);
        setVideoHeight(CONSTANTS.DEFAULT_VIDEO_HEIGHT);
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

  return (
    <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.otherMessage]}>
      <TouchableOpacity 
        style={[
          styles.messageBubble, 
          isMe ? styles.myBubble : styles.otherBubble, 
          styles.videoBubble,
          { 
            width: videoWidth + (CONSTANTS.BUBBLE_PADDING * 2), 
            height: videoHeight + (CONSTANTS.BUBBLE_PADDING * 2) 
          }
        ]}
        onPress={() => {
          if (!isUploading && videoUrl) {
            // 调试日志已清理 - 视频点击事件
            onPress(videoUrl);
          }
        }}
        activeOpacity={0.8}
        disabled={isUploading || !videoUrl}
      >
        <View style={[styles.videoContainer, { width: videoWidth, height: videoHeight }]}>
          {loading && !isUploading ? (
            <View style={styles.videoLoadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : isUploading ? (
            <View style={styles.videoUploadingContainer}>
              <View style={styles.uploadProgressContainer}>
                <View style={[styles.uploadProgressBar, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={styles.uploadProgressText}>{`${uploadProgress}%`}</Text>
              <ActivityIndicator size="small" color="#fff" style={styles.uploadingIndicator} />
            </View>
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
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Text style={styles.videoPlaceholderText}>视频</Text>
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
            </>
          )}
        </View>
      </TouchableOpacity>
      <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.otherMessageTime]}>
        {isUploading ? '上传中...' : formatMessageTime(timestamp)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 2,
    paddingHorizontal: 12,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
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
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholderText: {
    color: '#fff',
    fontSize: 12,
  },
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
  messageTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  myMessageTime: {
    textAlign: 'right',
  },
  otherMessageTime: {
    textAlign: 'left',
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
    prevProps.uploadProgress === nextProps.uploadProgress
  );
}); 