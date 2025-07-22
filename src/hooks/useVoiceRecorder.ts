import { useState, useRef, useCallback } from 'react';
import { Platform, Alert, PermissionsAndroid, Animated } from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

// 常量定义
const CONSTANTS = {
  PULSE_DURATION: 800,
  CACHE_MAX_AGE: 30,
};

interface UseVoiceRecorderProps {
  onError: (error: any, message: string) => void;
  onRecordingComplete: (audioUrl: string, duration: string) => void;
}

interface UseVoiceRecorderReturn {
  // 状态
  isRecording: boolean;
  recordTime: string;
  showPreview: boolean;
  recordingUri: string;
  isPlaying: boolean;
  pulseAnim: Animated.Value;
  
  // 方法
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
  playPreview: () => Promise<void>;
  confirmSendVoiceMessage: () => void;
  toggleVoiceMode: () => void;
  
  // 辅助状态
  isVoiceMode: boolean;
  hasRecordingPermission: boolean;
}

export const useVoiceRecorder = ({
  onError,
  onRecordingComplete,
}: UseVoiceRecorderProps): UseVoiceRecorderReturn => {
  // 状态管理
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState('00:00');
  const [showPreview, setShowPreview] = useState(false);
  const [recordingUri, setRecordingUri] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [hasRecordingPermission, setHasRecordingPermission] = useState(false);
  
  // 引用
  const audioRecorderPlayerRef = useRef(new AudioRecorderPlayer());
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isRequestingPermission = useRef(false);

  // 权限检查 - 修改为不自动触发录音
  const requestRecordingPermission = useCallback(async (): Promise<boolean> => {
    // 防止重复请求权限
    if (isRequestingPermission.current) {
      console.log('正在请求权限中...');
      return false;
    }

    try {
      isRequestingPermission.current = true;
      
      if (Platform.OS === 'android') {
        // 先检查是否已有权限
        const existingPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        
        if (existingPermission) {
          console.log('已有录音权限');
          setHasRecordingPermission(true);
          return true;
        }

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: '录音权限',
            message: '应用需要访问您的麦克风来录制语音消息',
            buttonNeutral: '稍后询问',
            buttonNegative: '拒绝',
            buttonPositive: '允许',
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('录音权限已授予');
          setHasRecordingPermission(true);
          return true;
        } else {
          console.log('录音权限被拒绝');
          Alert.alert(
            '权限被拒绝',
            '录音权限被拒绝，请在设置中手动开启权限',
            [
              { text: '取消', style: 'cancel' },
              { 
                text: '去设置', 
                onPress: () => {
                  // 可以引导用户去设置页面
                }
              }
            ]
          );
          setHasRecordingPermission(false);
          return false;
        }
      } else {
        // iOS权限检查
        const result = await check(PERMISSIONS.IOS.MICROPHONE);
        
        if (result === RESULTS.GRANTED) {
          setHasRecordingPermission(true);
          return true;
        } else if (result === RESULTS.DENIED) {
          const requestResult = await request(PERMISSIONS.IOS.MICROPHONE);
          const hasPermission = requestResult === RESULTS.GRANTED;
          setHasRecordingPermission(hasPermission);
          return hasPermission;
        } else {
          Alert.alert('权限被拒绝', '录音权限被拒绝，请在设置中手动开启权限');
          setHasRecordingPermission(false);
          return false;
        }
      }
    } catch (error) {
      console.error('检查录音权限时出错:', error);
      onError(error, '检查录音权限失败');
      setHasRecordingPermission(false);
      return false;
    } finally {
      isRequestingPermission.current = false;
    }
  }, [onError]);

  // 动画控制
  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: CONSTANTS.PULSE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: CONSTANTS.PULSE_DURATION,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulseAnimation = useCallback(() => {
    pulseAnim.setValue(1);
    Animated.timing(pulseAnim, { 
      toValue: 1,
      duration: 0,
      useNativeDriver: true
    }).stop();
  }, [pulseAnim]);

  // 开始录音 - 修改逻辑，权限请求不会自动开始录音
  const startRecording = useCallback(async () => {
    try {
      // 检查权限
      if (!hasRecordingPermission) {
        const hasPermission = await requestRecordingPermission();
        if (!hasPermission) {
          console.log('没有获得录音权限，取消录音');
          return;
        }
        // 权限获取成功后，不自动开始录音，需要用户再次按住
        console.log('权限已获取，请再次按住开始录音');
        return;
      }

      // 如果已经在录音，不允许重复开始
      if (isRecording) {
        console.log('已在录音中，忽略重复请求');
        return;
      }

      // 强制清理之前的状态
      try {
        await audioRecorderPlayerRef.current.stopRecorder();
        audioRecorderPlayerRef.current.removeRecordBackListener();
        // 稍等确保完全停止
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (cleanupError) {
        console.log('清理录音器状态:', cleanupError);
      }

      // 使用应用的缓存目录
      let audioPath;
      const timestamp = Date.now();
      const fileName = `voice_message_${timestamp}${Platform.OS === 'ios' ? '.m4a' : '.mp3'}`;
      
      if (Platform.OS === 'ios') {
        audioPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      } else {
        // 在Android上使用正确的缓存目录
        audioPath = `${RNFS.CachesDirectoryPath}/${fileName}`;
        
        // 确保目录存在
        const dirExists = await RNFS.exists(RNFS.CachesDirectoryPath);
        if (!dirExists) {
          await RNFS.mkdir(RNFS.CachesDirectoryPath);
        }
      }
      
      console.log('开始录音，路径:', audioPath);
      
      const result = await audioRecorderPlayerRef.current.startRecorder(audioPath);
      
      // 检查是否返回了无效状态
      if (typeof result === 'string' && (
        result.includes('Already recording') || 
        result.includes('Already stopped') ||
        result === 'Already recording'
      )) {
        console.log('检测到录音器状态异常:', result);
        throw new Error('录音器状态异常，请稍后重试');
      }
      
      setRecordingUri(result);
      
      audioRecorderPlayerRef.current.addRecordBackListener((e) => {
        const seconds = Math.floor(e.currentPosition / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        setRecordTime(
          `${minutes < 10 ? '0' + minutes : minutes}:${
            remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds
          }`
        );
      });
      
      setIsRecording(true);
      startPulseAnimation();
      console.log('录音已开始:', result);
    } catch (error: any) {
      console.error('录音启动失败:', error);
      onError(error, '无法启动录音，请重试');
      setIsRecording(false);
      setRecordTime('00:00');
      stopPulseAnimation();
    }
  }, [hasRecordingPermission, isRecording, requestRecordingPermission, startPulseAnimation, stopPulseAnimation, onError]);

  // 停止录音 - 修复文件检查逻辑
  const stopRecording = useCallback(async () => {
    try {
      if (!isRecording) {
        console.log('没有正在进行的录音');
        return;
      }
      
      console.log('停止录音...');
      const result = await audioRecorderPlayerRef.current.stopRecorder();
      audioRecorderPlayerRef.current.removeRecordBackListener();
      setIsRecording(false);
      stopPulseAnimation();
      console.log('录音已保存:', result);
      
      // 检查返回结果是否为有效路径
      if (typeof result !== 'string' || 
          result.includes('Already stopped') || 
          result.includes('error') ||
          result.length < 10) {
        console.log('录音停止返回无效结果:', result);
        throw new Error('录音保存失败，请重试');
      }
      
      // 检查录音文件是否存在
      let fileExists = false;
      try {
        fileExists = await RNFS.exists(result);
      } catch (fileCheckError) {
        console.log('检查文件存在性失败:', fileCheckError);
        fileExists = false;
      }
      
      if (!fileExists) {
        console.log('录音文件不存在:', result);
        throw new Error('录音文件保存失败');
      }
      
      // 检查录音时长
      if (recordTime === '00:00' || recordTime === '0:00') {
        console.log('录音时间过短，删除文件');
        try {
          await RNFS.unlink(result);
        } catch (deleteError) {
          console.log('删除短录音文件失败:', deleteError);
        }
        Alert.alert('录音时间过短', '请录制至少1秒的语音消息');
        setRecordTime('00:00');
        setRecordingUri('');
        return;
      }
      
      console.log('录音成功，显示预览');
      setShowPreview(true);
    } catch (error: any) {
      console.error('停止录音失败:', error);
      onError(error, '录音保存失败，请重试');
      setIsRecording(false);
      setRecordTime('00:00');
      setRecordingUri('');
      stopPulseAnimation();
    }
  }, [isRecording, recordTime, stopPulseAnimation, onError]);

  // 取消录音
  const cancelRecording = useCallback(async () => {
    try {
      // 停止录音器
      if (isRecording) {
        await audioRecorderPlayerRef.current.stopRecorder();
        audioRecorderPlayerRef.current.removeRecordBackListener();
        setIsRecording(false);
        stopPulseAnimation();
      }
      
      // 删除录音文件
      if (recordingUri) {
        try {
          await RNFS.unlink(recordingUri);
          console.log('已删除录音文件:', recordingUri);
        } catch (deleteError) {
          console.log('删除录音文件失败:', deleteError);
        }
      }
      
      setShowPreview(false);
      setRecordingUri('');
      setRecordTime('00:00');
      setIsPlaying(false);
      
      // 停止播放器
      try {
        await audioRecorderPlayerRef.current.stopPlayer();
      } catch (stopPlayerError) {
        console.log('停止播放器失败:', stopPlayerError);
      }
    } catch (error) {
      console.log('取消录音时出错:', error);
    }
  }, [isRecording, recordingUri, stopPulseAnimation]);

  // 播放预览
  const playPreview = useCallback(async () => {
    try {
      if (!recordingUri) {
        console.log('没有录音文件可播放');
        return;
      }
      
      if (isPlaying) {
        // 停止播放
        await audioRecorderPlayerRef.current.stopPlayer();
        setIsPlaying(false);
        console.log('停止播放录音');
      } else {
        // 开始播放
        console.log('开始播放录音预览:', recordingUri);
        
        await audioRecorderPlayerRef.current.startPlayer(recordingUri);
        setIsPlaying(true);
        
        audioRecorderPlayerRef.current.addPlayBackListener((e) => {
          if (e.currentPosition === e.duration) {
            setIsPlaying(false);
            audioRecorderPlayerRef.current.removePlayBackListener();
          }
        });
      }
    } catch (error: any) {
      onError(error, '播放录音失败');
      setIsPlaying(false);
    }
  }, [recordingUri, isPlaying, onError]);

  // 确认发送语音消息
  const confirmSendVoiceMessage = useCallback(() => {
    if (recordingUri && recordTime) {
      onRecordingComplete(recordingUri, recordTime);
      setShowPreview(false);
      setRecordingUri('');
      setRecordTime('00:00');
      setIsPlaying(false);
    }
  }, [recordingUri, recordTime, onRecordingComplete]);

  // 切换语音模式
  const toggleVoiceMode = useCallback(() => {
    setIsVoiceMode(!isVoiceMode);
  }, [isVoiceMode]);

  return {
    // 状态
    isRecording,
    recordTime,
    showPreview,
    recordingUri,
    isPlaying,
    pulseAnim,
    isVoiceMode,
    hasRecordingPermission,
    
    // 方法
    startRecording,
    stopRecording,
    cancelRecording,
    playPreview,
    confirmSendVoiceMessage,
    toggleVoiceMode,
  };
}; 