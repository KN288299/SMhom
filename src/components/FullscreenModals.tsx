import React, { useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  StyleSheet,
  Dimensions,
  Platform,
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
              <TouchableWithoutFeedback onPress={onToggleVideoControls}>
                <View style={styles.fullscreenVideoWrapper}>
                  <Video
                    // iOS: 支持 file:// / ph:// / assets-library://
                    source={{ uri: fullscreenVideoUrl }}
                    style={styles.fullscreenVideo}
                    resizeMode="contain"
                    onProgress={onVideoProgress}
                    onLoad={onVideoLoad}
                    onEnd={onVideoEnd}
                    paused={!isVideoPlaying}
                    repeat={false}
                    progressUpdateInterval={250}
                    {...(Platform.OS === 'android'
                      ? {
                          useTextureView: false,
                          bufferConfig: {
                            minBufferMs: 20000,
                            maxBufferMs: 120000,
                            bufferForPlaybackMs: 3000,
                            bufferForPlaybackAfterRebufferMs: 6000,
                          },
                        }
                      : {})}
                  />
                </View>
              </TouchableWithoutFeedback>
              
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
});

export default FullscreenModals; 