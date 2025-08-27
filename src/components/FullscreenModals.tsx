import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Platform,
  PanResponder,
  Animated,
  ActivityIndicator,
} from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/Ionicons';
import { saveImageToGallery, saveVideoToGallery } from '../utils/saveImage';

const { width, height } = Dimensions.get('window');

interface FullscreenModalsProps {
  // 全屏图片相关
  showFullscreenImage: boolean;
  fullscreenImageUrl: string;
  onCloseFullscreenImage: () => void;
  
  // 全屏视频相关（可选）
  showFullscreenVideo?: boolean;
  fullscreenVideoUrl?: string;
  fullscreenPosterUrl?: string;
  isVideoPlaying?: boolean;
  videoProgress?: number;
  videoDuration?: number;
  videoCurrentTime?: number;
  showVideoControls?: boolean;
  onCloseFullscreenVideo?: () => void;
  onToggleVideoPlayPause?: () => void;
  onToggleVideoControls?: () => void;
  onVideoProgress?: (data: any) => void;
  onVideoLoad?: (data: any) => void;
  onVideoEnd?: () => void;
}

const FullscreenModals: React.FC<FullscreenModalsProps> = ({
  // 全屏图片相关
  showFullscreenImage,
  fullscreenImageUrl,
  onCloseFullscreenImage,
  
  // 全屏视频相关（可选）
  showFullscreenVideo = false,
  fullscreenVideoUrl = '',
  fullscreenPosterUrl = '',
  isVideoPlaying = false,
  videoProgress = 0,
  videoDuration = 0,
  videoCurrentTime = 0,
  showVideoControls = true,
  onCloseFullscreenVideo = () => {},
  onToggleVideoPlayPause = () => {},
  onToggleVideoControls = () => {},
  onVideoProgress = () => {},
  onVideoLoad = () => {},
  onVideoEnd = () => {},
}) => {
  // 手势：点击暂停/播放，垂直滑动退出
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        const { dx, dy } = gestureState;
        // 垂直滑动或明显移动时拦截
        return Math.abs(dy) > 6 || Math.abs(dx) > 6;
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const { dy, vy, dx } = gestureState;
        const isSwipeToDismiss = Math.abs(dy) > 60 && Math.abs(vy) > 0.3 && Math.abs(dy) > Math.abs(dx);
        if (isSwipeToDismiss) {
          onCloseFullscreenVideo();
          return;
        }
        // 视为点击：切换显示/隐藏控件（返回/暂停/保存）
        onToggleVideoControls();
      },
    })
  ).current;

  // 缓冲与首帧就绪处理，避免黑屏闪烁
  const [isBuffering, setIsBuffering] = useState(true);
  const [isReadyForDisplay, setIsReadyForDisplay] = useState(false);
  const videoOpacity = useRef(new Animated.Value(0)).current;
  const bufferUpdateRef = useRef<number>(0);
  const readyFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (readyFallbackTimerRef.current) {
        clearTimeout(readyFallbackTimerRef.current);
        readyFallbackTimerRef.current = null;
      }
    };
  }, []);

  const makeReady = useCallback(() => {
    setIsReadyForDisplay(true);
    setIsBuffering(false);
    Animated.timing(videoOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [videoOpacity]);
  
  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSaveImage = useCallback(async () => {
    if (!fullscreenImageUrl) return;
    try {
      await saveImageToGallery(fullscreenImageUrl);
      // 轻量反馈：暂不引入 Toast 依赖，这里可用 Alert 或交给调用方
      console.log('✅ 图片已保存到相册');
    } catch (e) {
      console.log('❌ 保存图片失败:', e);
    }
  }, [fullscreenImageUrl]);

  return (
    <>
      {/* 全屏图片查看器 */}
      <Modal
        visible={showFullscreenImage}
        transparent
        animationType="fade"
        onRequestClose={onCloseFullscreenImage}
      >
        <TouchableOpacity 
          style={styles.fullscreenImageContainer}
          onPress={onCloseFullscreenImage}
          activeOpacity={0.9}
        >
          {fullscreenImageUrl && (
            <Image 
              source={{ uri: fullscreenImageUrl }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity 
            style={styles.closeFullscreenButton}
            onPress={onCloseFullscreenImage}
          >
            <Icon name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSaveImage}
          >
            <Icon name="download" size={28} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      
      {/* 全屏视频播放器 */}
      <Modal
        visible={showFullscreenVideo}
        transparent
        animationType="fade"
        onRequestClose={onCloseFullscreenVideo}
        statusBarTranslucent
      >
        <View style={styles.fullscreenVideoContainer}>
          {fullscreenVideoUrl && (
            <>
              <View style={styles.fullscreenVideoWrapper} {...panResponder.panHandlers}>
                <Animated.View style={{ flex: 1, opacity: videoOpacity }}>
                  <Video
                    key={fullscreenVideoUrl}
                    // iOS: 支持 file:// / ph:// / assets-library://
                    source={{ uri: fullscreenVideoUrl }}
                    style={styles.fullscreenVideo}
                    resizeMode="contain"
                    poster={fullscreenPosterUrl || undefined}
                    posterResizeMode="cover"
                    onLoadStart={() => {
                      setIsBuffering(true);
                      setIsReadyForDisplay(false);
                      videoOpacity.setValue(0);
                      if (readyFallbackTimerRef.current) {
                        clearTimeout(readyFallbackTimerRef.current);
                        readyFallbackTimerRef.current = null;
                      }
                    }}
                    onBuffer={({ isBuffering }) => {
                      const now = Date.now();
                      if (isBuffering) {
                        if (now - bufferUpdateRef.current < 300) return;
                        bufferUpdateRef.current = now;
                        setIsBuffering(true);
                      } else {
                        bufferUpdateRef.current = now;
                        setIsBuffering(false);
                      }
                    }}
                    onReadyForDisplay={() => {
                      if (readyFallbackTimerRef.current) {
                        clearTimeout(readyFallbackTimerRef.current);
                        readyFallbackTimerRef.current = null;
                      }
                      makeReady();
                    }}
                    onProgress={(data) => {
                      // 将进度上抛
                      onVideoProgress && onVideoProgress(data);
                    }}
                    onLoad={(data) => {
                      // 上抛 onLoad，并设置兜底：若 800ms 内未触发 onReadyForDisplay，则直接就绪
                      onVideoLoad && onVideoLoad(data);
                      if (readyFallbackTimerRef.current) {
                        clearTimeout(readyFallbackTimerRef.current);
                      }
                      readyFallbackTimerRef.current = setTimeout(() => {
                        makeReady();
                      }, 800);
                    }}
                    onEnd={onVideoEnd}
                    onError={(e: any) => {
                      console.log('❌ 全屏视频播放失败:', (e && (e.error || e)));
                      setIsBuffering(false);
                      setIsReadyForDisplay(false);
                    }}
                    // 使用 rate 控制播放，避免切换 paused 带来的黑屏闪烁
                    paused={false}
                    rate={isVideoPlaying ? 1.0 : 0.0}
                    repeat={true}
                    progressUpdateInterval={500}
                    playInBackground={false}
                    playWhenInactive={false}
                    {...(Platform.OS === 'android'
                      ? {
                          useTextureView: false,
                          shutterColor: 'transparent',
                          minLoadRetryCount: 2,
                          bufferConfig: {
                            minBufferMs: 5000,
                            maxBufferMs: 20000,
                            bufferForPlaybackMs: 300,
                            bufferForPlaybackAfterRebufferMs: 1500,
                          },
                        }
                      : {
                          preferredForwardBufferDuration: 1.5,
                          automaticallyWaitsToMinimizeStalling: false,
                        })}
                  />
                </Animated.View>
                {(isBuffering || !isReadyForDisplay) && (
                  <View style={styles.bufferingOverlay} pointerEvents="none">
                    <ActivityIndicator size="large" color="#fff" />
                  </View>
                )}
              </View>
              
              {showVideoControls && (
                <View style={styles.videoControlsContainer}>
                  <View style={styles.videoControlsBottom}>
                    <View style={styles.videoProgressContainer}>
                      <View style={styles.videoProgressBar}>
                        <View 
                          style={[
                            styles.videoProgressFill, 
                            { width: `${videoProgress * 100}%` }
                          ]} 
                        />
                      </View>
                      <View style={styles.videoTimeContainer}>
                        <Text style={styles.videoTimeText}>
                          {formatTime(videoCurrentTime)}
                        </Text>
                        <Text style={styles.videoTimeText}>
                          {formatTime(videoDuration)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.videoControlButtons}>
                      <TouchableOpacity 
                        style={styles.videoControlButton}
                        onPress={onCloseFullscreenVideo}
                      >
                        <Icon name="arrow-back" size={24} color="#fff" />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.videoPlayPauseButton}
                        onPress={onToggleVideoPlayPause}
                      >
                        <Icon 
                          name={isVideoPlaying ? "pause" : "play"} 
                          size={32} 
                          color="#fff" 
                        />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.videoControlButton}
                        onPress={async () => {
                          if (!fullscreenVideoUrl) return;
                          try {
                            await saveVideoToGallery(fullscreenVideoUrl);
                            console.log('✅ 视频已保存到相册');
                          } catch (e) {
                            console.log('❌ 保存视频失败:', e);
                          }
                        }}
                      >
                        <Icon name="download" size={24} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // 全屏图片样式
  fullscreenImageContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: width,
    height: height,
  },
  closeFullscreenButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 25,
  },
  saveButton: {
    position: 'absolute',
    top: 40,
    right: 80,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
  },
  
  // 全屏视频样式
  fullscreenVideoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenVideoWrapper: {
    flex: 1,
  },
  fullscreenVideo: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoControlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  videoControlsBottom: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  videoProgressContainer: {
    marginBottom: 15,
  },
  videoProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginBottom: 8,
  },
  videoProgressFill: {
    height: '100%',
    backgroundColor: '#ff6b81',
    borderRadius: 2,
  },
  videoTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  videoTimeText: {
    color: '#fff',
    fontSize: 12,
  },
  videoControlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoControlButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
  },
  videoPlayPauseButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30,
  },
  bufferingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});

export default FullscreenModals; 