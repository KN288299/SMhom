import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  PermissionsAndroid,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import IOSAudioSession from '../utils/IOSAudioSession';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/Ionicons';

const AudioTestScreen: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordTime, setRecordTime] = useState('00:00');
  const [playTime, setPlayTime] = useState('00:00');
  const [audioPath, setAudioPath] = useState<string | null>(null);
  
  const audioRecorderPlayerRef = useRef<AudioRecorderPlayer>(new AudioRecorderPlayer());
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (isRecording) {
        audioRecorderPlayerRef.current.stopRecorder();
        audioRecorderPlayerRef.current.removeRecordBackListener();
      }
      if (isPlaying) {
        audioRecorderPlayerRef.current.stopPlayer();
        audioRecorderPlayerRef.current.removePlayBackListener();
      }
    };
  }, [isRecording, isPlaying]);
  
  // 请求录音权限
  const requestRecordingPermission = async () => {
    console.log('请求权限...');
    
    if (Platform.OS === 'android') {
      try {
        // 先检查是否已经有权限
        console.log('检查现有权限...');
        const checkAudioPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        const checkStoragePermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        
        console.log('现有权限状态:', {
          audio: checkAudioPermission,
          storage: checkStoragePermission
        });
        
        if (checkAudioPermission && checkStoragePermission) {
          console.log('已有全部所需权限');
          return true;
        }
        
        // 请求权限
        console.log('请求录音权限...');
        const audioPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: '录音权限',
            message: '应用需要访问您的麦克风以录制语音消息',
            buttonPositive: '允许',
            buttonNegative: '拒绝',
            buttonNeutral: '稍后询问'
          }
        );
        
        console.log('请求存储权限...');
        const storagePermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: '存储权限',
            message: '应用需要访问您的存储以保存语音消息',
            buttonPositive: '允许',
            buttonNegative: '拒绝',
            buttonNeutral: '稍后询问'
          }
        );
        
        console.log('权限请求结果:', {
          audio: audioPermission,
          storage: storagePermission
        });
        
        if (
          audioPermission === PermissionsAndroid.RESULTS.GRANTED &&
          storagePermission === PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.log('所有权限都已获得');
          return true;
        } else {
          // 显示不同的提示信息，根据被拒绝的权限
          let message = '需要权限才能录制语音消息:';
          if (audioPermission !== PermissionsAndroid.RESULTS.GRANTED) {
            message += '\n- 录音权限被拒绝';
          }
          if (storagePermission !== PermissionsAndroid.RESULTS.GRANTED) {
            message += '\n- 存储权限被拒绝';
          }
          message += '\n\n请在设备设置中启用这些权限。';
          
          console.log('权限被拒绝:', message);
          Alert.alert('权限被拒绝', message);
          return false;
        }
      } catch (err) {
        console.warn('权限请求错误:', err);
        Alert.alert('权限请求错误', '请求权限时发生错误，请重试');
        return false;
      }
    } else {
      console.log('iOS平台，假设已有权限');
      return true; // iOS会在使用时自动请求权限
    }
  };
  
  // 开始录音
  const startRecording = async () => {
    const hasPermission = await requestRecordingPermission();
    if (!hasPermission) {
      console.log('没有获得录音权限');
      return;
    }

    try {
      // 使用应用的缓存目录
      let audioPath;
      const timestamp = Date.now();
      const fileName = `test_recording_${timestamp}${Platform.OS === 'ios' ? '.m4a' : '.mp3'}`;
      
      if (Platform.OS === 'ios') {
        audioPath = `file://${RNFS.DocumentDirectoryPath}/${fileName}`;
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

      // iOS：准备录音会话，避免“initiate recorder”失败
      if (Platform.OS === 'ios') {
        try {
          await IOSAudioSession.getInstance().reset();
          await IOSAudioSession.getInstance().prepareForRecording();
        } catch (iosSessionErr) {
          console.warn('iOS录音会话准备失败，继续尝试:', iosSessionErr);
        }
      }

      // 防御：开始录音前停止任何播放/录音
      try { await audioRecorderPlayerRef.current.stopPlayer(); } catch {}
      try { await audioRecorderPlayerRef.current.stopRecorder(); } catch {}

      const result = Platform.OS === 'ios'
        ? await audioRecorderPlayerRef.current.startRecorder(audioPath, {
            AVEncoderAudioQualityKeyIOS: 96,
            AVNumberOfChannelsKeyIOS: 1,
            AVFormatIDKeyIOS: 'aac',
            AVSampleRateKeyIOS: 44100,
          } as any)
        : await audioRecorderPlayerRef.current.startRecorder(audioPath);
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
      setAudioPath(result);
      setIsRecording(true);
      console.log('录音已开始:', result);
    } catch (error: any) {
      console.error('录音失败:', error);
      Alert.alert('录音失败', `无法启动录音: ${error.message || '未知错误'}`);
    }
  };
  
  // 停止录音
  const stopRecording = async () => {
    try {
      if (!isRecording) {
        console.log('没有正在进行的录音');
        return;
      }
      
      console.log('停止录音...');
      const result = await audioRecorderPlayerRef.current.stopRecorder();
      audioRecorderPlayerRef.current.removeRecordBackListener();
      setIsRecording(false);
      console.log('录音已保存:', result);
      
      // 检查录音文件是否存在
      if (!result || result === 'file://') {
        console.error('录音文件路径无效');
        Alert.alert('录音失败', '无法保存录音文件');
        return;
      }
      
      setAudioPath(result);
      Alert.alert('录音完成', `录音已保存: ${result}`);
    } catch (error: any) {
      console.error('停止录音失败:', error);
      Alert.alert('录音失败', `停止录音时出错: ${error.message || '未知错误'}`);
      setIsRecording(false);
    }
  };
  
  // 播放录音
  const playRecording = async () => {
    if (!audioPath) {
      Alert.alert('错误', '没有可播放的录音');
      return;
    }
    
    try {
      console.log('开始播放录音:', audioPath);
      setIsPlaying(true);

      // iOS：准备播放会话并默认外放
      if (Platform.OS === 'ios') {
        try {
          const session = IOSAudioSession.getInstance();
          if (session.getCurrentMode() !== 'playback') {
            await session.reset();
          }
          await session.prepareForPlayback();
          try { await audioRecorderPlayerRef.current.setSubscriptionDuration(0.1); } catch {}
        } catch (iosPlayErr) {
          console.warn('iOS播放会话准备失败，继续尝试:', iosPlayErr);
        }
      }

      // 防御：先停止占用
      try { await audioRecorderPlayerRef.current.stopRecorder(); } catch {}
      try { await audioRecorderPlayerRef.current.stopPlayer(); } catch {}

      await audioRecorderPlayerRef.current.startPlayer(audioPath);
      console.log('播放开始');
      
      audioRecorderPlayerRef.current.addPlayBackListener((e) => {
        console.log('播放进度:', e.currentPosition / 1000, '秒');
        const seconds = Math.floor(e.currentPosition / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        setPlayTime(
          `${minutes < 10 ? '0' + minutes : minutes}:${
            remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds
          }`
        );

        if (e.currentPosition >= e.duration) {
          console.log('播放完成');
          stopPlaying();
        }
      });
    } catch (error: any) {
      console.error('播放录音失败:', error);
      Alert.alert('播放失败', `无法播放录音: ${error.message || '未知错误'}`);
      setIsPlaying(false);
    }
  };
  
  // 停止播放
  const stopPlaying = async () => {
    try {
      await audioRecorderPlayerRef.current.stopPlayer();
      audioRecorderPlayerRef.current.removePlayBackListener();
      setIsPlaying(false);
      setPlayTime('00:00');
      console.log('播放已停止');
    } catch (error: any) {
      console.error('停止播放失败:', error);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Text style={styles.title}>录音测试</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.recordSection}>
          <Text style={styles.sectionTitle}>录音</Text>
          <Text style={styles.timeText}>{recordTime}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, isRecording ? styles.activeButton : null]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Icon name={isRecording ? "stop" : "mic"} size={24} color="#fff" />
              <Text style={styles.buttonText}>
                {isRecording ? '停止录音' : '开始录音'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.playSection}>
          <Text style={styles.sectionTitle}>播放</Text>
          <Text style={styles.timeText}>{playTime}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, isPlaying ? styles.activeButton : null, !audioPath ? styles.disabledButton : null]}
              onPress={isPlaying ? stopPlaying : playRecording}
              disabled={!audioPath}
            >
              <Icon name={isPlaying ? "pause" : "play"} size={24} color="#fff" />
              <Text style={styles.buttonText}>
                {isPlaying ? '停止播放' : '播放录音'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {audioPath && (
          <View style={styles.pathSection}>
            <Text style={styles.pathTitle}>录音路径:</Text>
            <Text style={styles.pathText}>{audioPath}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  recordSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  playSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  timeText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#ff6b81',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#ff6b81',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 150,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeButton: {
    backgroundColor: '#e74c3c',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  pathSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  pathTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  pathText: {
    fontSize: 12,
    color: '#666',
  },
});

export default AudioTestScreen; 