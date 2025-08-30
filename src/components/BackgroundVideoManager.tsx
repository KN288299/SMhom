import React, { useRef, useEffect, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import Video from 'react-native-video';

interface BackgroundVideoManagerProps {
  source: any;
  style: any;
  onError?: (error: any) => void;
  onLoad?: () => void;
  onProgress?: (data: any) => void;
}

/**
 * 背景视频管理器
 * 专门处理iOS权限弹窗时的视频播放状态
 */
const BackgroundVideoManager: React.FC<BackgroundVideoManagerProps> = ({
  source,
  style,
  onError,
  onLoad,
  onProgress
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const videoRef = useRef<Video>(null);
  const permissionDialogActive = useRef(false);

  // 监听应用状态变化
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('🎬 [BackgroundVideo] 应用状态变化:', appState, '->', nextAppState);
      
      if (Platform.OS === 'ios') {
        // iOS特殊处理：权限弹窗会导致应用状态变为 'inactive'
        if (nextAppState === 'inactive' && appState === 'active') {
          console.log('🍎 [BackgroundVideo] 检测到可能的权限弹窗，保持视频播放');
          // 不暂停视频，让视频继续播放
          setIsPaused(false);
          permissionDialogActive.current = true;
        } else if (nextAppState === 'active' && permissionDialogActive.current) {
          console.log('🍎 [BackgroundVideo] 权限弹窗关闭，恢复正常播放');
          setIsPaused(false);
          permissionDialogActive.current = false;
        } else if (nextAppState === 'background') {
          console.log('🎬 [BackgroundVideo] 应用进入后台，暂停视频');
          setIsPaused(true);
        } else if (nextAppState === 'active' && appState === 'background') {
          console.log('🎬 [BackgroundVideo] 应用回到前台，恢复视频');
          setIsPaused(false);
        }
      } else {
        // Android处理
        if (nextAppState === 'background') {
          console.log('🤖 [BackgroundVideo] Android应用进入后台，暂停视频');
          setIsPaused(true);
        } else if (nextAppState === 'active' && appState === 'background') {
          console.log('🤖 [BackgroundVideo] Android应用回到前台，恢复视频');
          setIsPaused(false);
        }
      }
      
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [appState]);

  // 处理视频错误
  const handleVideoError = (error: any) => {
    console.log('🎬 [BackgroundVideo] 视频播放错误:', error);
    onError?.(error);
  };

  // 处理视频加载完成
  const handleVideoLoad = () => {
    console.log('🎬 [BackgroundVideo] 视频加载完成');
    onLoad?.();
  };

  // 处理视频进度
  const handleVideoProgress = (data: any) => {
    onProgress?.(data);
  };

  return (
    <Video
      ref={videoRef}
      source={source}
      style={style}
      muted={true}
      repeat={true}
      resizeMode="cover"
      rate={1.0}
      ignoreSilentSwitch="obey"
      paused={isPaused}
      playInBackground={false}
      playWhenInactive={true}
      onError={handleVideoError}
      onLoad={handleVideoLoad}
      onProgress={handleVideoProgress}
    />
  );
};

export default BackgroundVideoManager;
