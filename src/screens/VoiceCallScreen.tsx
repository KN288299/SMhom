import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Linking,
  Dimensions,
  Animated,
  PanResponder,
  Image,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
  RTCView,
  MediaStreamTrack,
} from 'react-native-webrtc';
import { Socket } from 'socket.io-client';
import { API_URL, API_ENDPOINTS } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useFloatingCall } from '../context/FloatingCallContext';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import AudioManager from '../utils/AudioManager';
import { DEFAULT_AVATAR } from '../utils/DefaultAvatar';
import IOSAudioSession from '../utils/IOSAudioSession';
import NetInfo from '@react-native-community/netinfo';
import { getOptimizedConnectionStatus } from '../utils/iOSNetworkHelper';

// 定义WebRTC事件类型
interface RTCPeerConnectionWithEvents extends RTCPeerConnection {
  onicecandidate: ((event: any) => void) | null;
  onconnectionstatechange: (() => void) | null;
  oniceconnectionstatechange: (() => void) | null;
  ontrack: ((event: any) => void) | null;
}

const VoiceCallScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userInfo, userToken, isCustomerService } = useAuth();
  const { socket: globalSocket, isConnected } = useSocket();
  const { showFloatingCall, hideFloatingCall, updateCallDuration } = useFloatingCall();
  
  // 从路由参数中获取联系人信息
  const { contactId, contactName, isIncoming = false, callId: routeCallId } = route.params || {};
  const isIncomingRef = useRef<boolean>(isIncoming);
  
  // 通话状态
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>(
    isIncoming ? 'ringing' : 'connecting'
  );
  const callStatusRef = useRef<'connecting' | 'ringing' | 'connected' | 'ended'>(
    isIncoming ? 'ringing' : 'connecting'
  ); // 使用ref确保能获取最新值
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | undefined>(routeCallId);
  const [isEndingCall, setIsEndingCall] = useState(false);
  const isEndingCallRef = useRef(false); // 使用ref确保能获取最新值
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [webrtcConnected, setWebrtcConnected] = useState(false); // 新增：WebRTC连接状态
  const webrtcConnectedRef = useRef(false); // 使用ref确保能获取最新值
  
  // 悬浮窗状态
  const [isFloating, setIsFloating] = useState(false);
  const [isEnteringFloatingMode, setIsEnteringFloatingMode] = useState(false); // 新增：正在进入悬浮窗模式的标志
  const isEnteringFloatingModeRef = useRef(false); // 使用ref确保能获取最新值
  const floatingAnimation = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY()).current;
  
  // 同步状态和ref
  useEffect(() => {
    isEnteringFloatingModeRef.current = isEnteringFloatingMode;
  }, [isEnteringFloatingMode]);

  // 调试配置：强制仅走TURN中继 + 固定TURN服务器（需要时设为false恢复自动）
  const DEBUG_FORCE_TURN_RELAY = true;
  const TURN_ONLY_ICE_SERVERS = [
    {
      urls: [
        'turns:turn.uu68.icu:5349?transport=tcp',
        'turns:turn.uu68.icu:5349?transport=udp',
        'turn:turn.uu68.icu:3478?transport=tcp',
        'turn:turn.uu68.icu:3478?transport=udp',
      ],
      username: 'webrtc',
      credential: 'P@ssw0rdStrong1!',
    },
  ];
  
  useEffect(() => {
    isEndingCallRef.current = isEndingCall;
  }, [isEndingCall]);
  useEffect(() => {
    isIncomingRef.current = isIncoming;
  }, [isIncoming]);
  
  useEffect(() => {
    callStatusRef.current = callStatus;
    console.log('📊 [CallStatus] 状态更新:', callStatus);
  }, [callStatus]);
  
  useEffect(() => {
    webrtcConnectedRef.current = webrtcConnected;
    console.log('📊 [WebRTC] 连接状态更新:', webrtcConnected);
  }, [webrtcConnected]);
  
  // 屏幕尺寸
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  
  // 拖动手势处理
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gestureState) => {
        // 限制悬浮窗在屏幕内
        const newX = Math.max(0, Math.min(screenWidth - 120, gestureState.moveX - 50));
        const newY = Math.max(50, Math.min(screenHeight - 120, gestureState.moveY - 50));
        
        Animated.spring(pan, {
          toValue: { x: newX, y: newY },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;
  
  // WebRTC相关引用
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnectionWithEvents | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // iOS关键：在设置远端SDP之前缓冲远端ICE候选，避免addIceCandidate报错导致一直连接中
  const remoteDescriptionSetRef = useRef(false);
  const pendingRemoteIceCandidatesRef = useRef<any[]>([]);
  // 本地ICE候选在callId未就绪前先缓存，避免发送时丢失callId
  const localPendingIceCandidatesRef = useRef<any[]>([]);
  const isCallIdReadyRef = useRef(false);

  // 冲刷本地待发送ICE候选
  const flushLocalIceCandidates = (callIdOverride?: string) => {
    try {
      const callIdToUse = callIdOverride || activeCallId || routeCallId;
      if (!socketRef.current || !callIdToUse) {
        return;
      }
      if (localPendingIceCandidatesRef.current.length > 0) {
        console.log(`冲刷本地ICE候选: ${localPendingIceCandidatesRef.current.length}`);
        for (const cand of localPendingIceCandidatesRef.current) {
          socketRef.current.emit('webrtc_ice_candidate', {
            callId: callIdToUse,
            recipientId: contactId,
            candidate: cand
          });
        }
        localPendingIceCandidatesRef.current = [];
      }
    } catch (e) {
      console.error('冲刷本地ICE候选失败:', e);
    }
  };
  
  // 创建一个安全的返回函数
  const safeGoBack = () => {
    // 检查是否可以返回
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // 如果不能返回，则导航到对应的聊天详情页面
      navigation.navigate('Chat', {
        contactId: contactId,
        contactName: contactName
      });
    }
  };

    // 请求麦克风权限
  const requestMicrophonePermission = async () => {
    try {
      console.log('正在检查麦克风权限...');
      
      // 检查权限状态
      let permissionStatus;
      if (Platform.OS === 'android') {
        // 增强防御性编程：检查PERMISSIONS模块是否正确加载
        try {
          if (!PERMISSIONS || !PERMISSIONS.ANDROID || !PERMISSIONS.ANDROID.RECORD_AUDIO) {
            console.warn('⚠️ [VoiceCall] PERMISSIONS.ANDROID未加载，使用默认权限字符串');
            permissionStatus = await check('android.permission.RECORD_AUDIO' as any);
          } else {
            permissionStatus = await check(PERMISSIONS.ANDROID.RECORD_AUDIO);
          }
        } catch (permError) {
          console.warn('⚠️ [VoiceCall] 权限检查异常，使用默认权限:', permError);
          permissionStatus = await check('android.permission.RECORD_AUDIO' as any);
        }
      } else {
        permissionStatus = await check(PERMISSIONS.IOS.MICROPHONE);
      }
      
      console.log('麦克风权限状态:', permissionStatus);
      
      // 如果已有权限，直接返回成功
      if (permissionStatus === RESULTS.GRANTED) {
        console.log('已有麦克风权限');
        
        // 🔧 iOS音频会话优化：权限已有时立即预配置音频会话
        if (Platform.OS === 'ios') {
          try {
            console.log('🍎 [VoiceCall] 已有麦克风权限，预配置iOS音频会话...');
            const audioSession = IOSAudioSession.getInstance();
            await audioSession.prepareForRecording();
            console.log('✅ [VoiceCall] 已有权限-iOS音频会话预配置完成');
          } catch (audioError) {
            console.warn('⚠️ [VoiceCall] 已有权限-音频会话预配置失败:', audioError);
          }
        }
        
        return true;
      }
      
      // 如果权限状态是 BLOCKED 或 DENIED，表示用户之前拒绝过
      if (permissionStatus === RESULTS.BLOCKED) {
        console.log('麦克风权限已被阻止');
        return new Promise<boolean>((resolve) => {
          Alert.alert(
            '需要麦克风权限',
            '语音通话需要访问麦克风。请在设备设置中启用麦克风权限。',
            [
              { 
                text: '取消', 
                style: 'cancel',
                onPress: () => resolve(false)
              },
              { 
                text: '去设置', 
                onPress: () => {
                  Platform.OS === 'ios' 
                    ? Linking.openURL('app-settings:') 
                    : Linking.openSettings();
                  resolve(false);
                }
              }
            ]
          );
        });
      }
      
      // 请求权限
      console.log('请求麦克风权限...');
      let result;
      if (Platform.OS === 'android') {
        // 增强防御性编程：检查PERMISSIONS模块是否正确加载
        try {
          if (!PERMISSIONS || !PERMISSIONS.ANDROID || !PERMISSIONS.ANDROID.RECORD_AUDIO) {
            console.warn('⚠️ [VoiceCall] PERMISSIONS.ANDROID未加载，使用默认权限字符串');
            result = await request('android.permission.RECORD_AUDIO' as any);
          } else {
            result = await request(PERMISSIONS.ANDROID.RECORD_AUDIO);
          }
        } catch (permError) {
          console.warn('⚠️ [VoiceCall] 权限请求异常，使用默认权限:', permError);
          result = await request('android.permission.RECORD_AUDIO' as any);
        }
      } else {
        result = await request(PERMISSIONS.IOS.MICROPHONE);
      }
      
      console.log('麦克风权限请求结果:', result);
      
      // 如果用户拒绝了权限
      if (result !== RESULTS.GRANTED) {
        Alert.alert(
          '无法访问麦克风',
          '您已拒绝麦克风访问权限，语音通话功能将无法使用。',
          [
            { text: '确定', style: 'default' }
          ]
        );
      }
      
      // 🔧 iOS音频会话优化：权限请求成功后立即预配置音频会话
      const hasPermission = result === RESULTS.GRANTED;
      if (hasPermission && Platform.OS === 'ios') {
        try {
          console.log('🍎 [VoiceCall] 权限请求成功，预配置iOS音频会话...');
          const audioSession = IOSAudioSession.getInstance();
          await audioSession.prepareForRecording();
          console.log('✅ [VoiceCall] 权限请求成功-iOS音频会话预配置完成');
        } catch (audioError) {
          console.warn('⚠️ [VoiceCall] 权限请求成功-音频会话预配置失败:', audioError);
        }
      }
      
      // 返回请求结果
      return hasPermission;
    } catch (error) {
      console.error('请求麦克风权限失败:', error);
      Alert.alert('权限请求错误', '请求麦克风权限时发生错误，请重试');
      return false;
    }
  };
  
  // 初始化WebRTC和Socket连接
  useEffect(() => {
    // 记录传入的路由参数，用于调试
    console.log('VoiceCallScreen - 路由参数:', {
      contactId,
      contactName,
      contactAvatar: route.params?.contactAvatar,
      isIncoming,
      callId: routeCallId
    });
    
    const setupCall = async () => {
      try {
        // 检查是否是从悬浮窗恢复
        if (route.params?.resumeFromFloating) {
          console.log('📱 [VoiceCall] 从悬浮窗恢复，跳过WebRTC初始化');
          
          // 悬浮窗恢复时也要检查麦克风权限
          const hasPermission = await requestMicrophonePermission();
          if (!hasPermission) {
            console.log('麦克风权限被拒绝，无法继续悬浮窗通话');
            safeGoBack();
            return;
          }
          
          // 只初始化音频管理
          AudioManager.start();
          AudioManager.setSpeakerOn(false);
          setIsSpeakerOn(false);
          
          // 🔧 iOS首次使用修复：悬浮窗恢复时使用初始化管理器确保音频会话正确配置
          if (Platform.OS === 'ios') {
            try {
              console.log('🍎 [VoiceCall] 悬浮窗恢复，使用初始化管理器检查音频会话...');
              const IOSInitializationManager = require('../services/IOSInitializationManager').default;
              await IOSInitializationManager.getInstance().initializeAudioSessionAfterPermission();
              console.log('✅ [VoiceCall] 悬浮窗恢复，初始化管理器音频会话配置完成');
            } catch (audioError) {
              console.warn('⚠️ [VoiceCall] 悬浮窗恢复时初始化管理器配置失败，使用原方案:', audioError);
              // 兜底：使用原来的音频会话逻辑
              try {
                const audioSession = IOSAudioSession.getInstance();
                if (!audioSession.isActive()) {
                  await audioSession.prepareForRecording();
                  console.log('✅ [VoiceCall] 悬浮窗恢复，原方案音频会话配置完成');
                }
              } catch (fallbackError) {
                console.warn('⚠️ [VoiceCall] 悬浮窗恢复时原方案也失败:', fallbackError);
              }
            }
          }
          
          // 设置Socket引用为全局Socket
          socketRef.current = globalSocket;
          
          // 设置Socket事件监听
          setupSocketListeners();
          
          // 设置callId
          if (routeCallId) {
            setActiveCallId(routeCallId);
            isCallIdReadyRef.current = true;
            flushLocalIceCandidates(routeCallId);
          }
          
          console.log('📱 [VoiceCall] 悬浮窗恢复完成，无需重新初始化WebRTC');
          return;
        }
        
        // 正常的新通话流程
        // 请求麦克风权限
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
          console.log('麦克风权限被拒绝，无法继续');
          safeGoBack();
          return;
        }
        
        // 初始化音频管理
        AudioManager.start();
        // 默认使用听筒模式
        AudioManager.setSpeakerOn(false);
        setIsSpeakerOn(false);
        
        // 🔧 iOS首次使用修复：权限获取后确保音频系统完全就绪
        if (Platform.OS === 'ios') {
          try {
            console.log('🍎 [VoiceCall] 权限获取成功，确保iOS音频系统完全就绪...');
            
            // 1. 使用初始化管理器配置音频会话
            const IOSInitializationManager = require('../services/IOSInitializationManager').default;
            await IOSInitializationManager.getInstance().initializeAudioSessionAfterPermission();
            
            // 2. 额外确保IOSAudioSession状态
            const audioSession = IOSAudioSession.getInstance();
            if (!audioSession.isActive()) {
              await audioSession.reset();
              await audioSession.prepareForRecording();
            }
            
            // 3. 关键延迟：确保音频系统完全稳定
            console.log('⏱️ [VoiceCall] 等待iOS音频系统稳定(授权后首启放宽到1s)...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log('✅ [VoiceCall] iOS音频系统完全就绪');
          } catch (audioError) {
            console.warn('⚠️ [VoiceCall] iOS音频系统配置失败，使用兜底方案:', audioError);
            
            // 兜底方案：基础音频会话配置
            try {
              const audioSession = IOSAudioSession.getInstance();
              await audioSession.reset();
              await audioSession.prepareForRecording();
              await new Promise(resolve => setTimeout(resolve, 200));
              console.log('✅ [VoiceCall] 兜底音频会话配置完成');
            } catch (fallbackError) {
              console.warn('⚠️ [VoiceCall] 兜底音频会话配置失败（继续流程）:', fallbackError);
            }
          }
        }
        
        // 等待全局Socket连接就绪，避免冷启动竞态（事件驱动）
        const socketCandidate = (global as any).socketRef?.current || globalSocket;
        if (!socketCandidate || !socketCandidate.connected) {
          console.log('全局Socket未连接，订阅connect事件等待就绪...');
          setCallStatus('connecting');
          await new Promise<void>((resolve, reject) => {
            const s: any = (global as any).socketRef?.current || globalSocket;
            if (s && s.connected) {
              console.log('全局Socket已连接（检查时已连接）');
              resolve();
              return;
            }
            let settled = false;
            let timeoutId: any = null;
            const cleanup = () => {
              if (timeoutId) clearTimeout(timeoutId);
              if (!s) return;
              s.off('connect', onConnect);
              s.off('connect_error', onConnectError);
              s.off('error', onError);
            };
            const onConnect = () => {
              if (settled) return;
              settled = true;
              cleanup();
              console.log('收到connect事件，全局Socket就绪');
              resolve();
            };
            const onConnectError = (err: any) => {
              if (settled) return;
              settled = true;
              cleanup();
              console.warn('Socket连接错误:', err?.message || err);
              reject(new Error('等待Socket连接失败'));
            };
            const onError = (err: any) => {
              if (settled) return;
              settled = true;
              cleanup();
              console.warn('Socket错误:', err?.message || err);
              reject(new Error('等待Socket连接失败'));
            };
            timeoutId = setTimeout(() => {
              if (settled) return;
              settled = true;
              cleanup();
              console.warn('等待Socket连接超时');
              reject(new Error('等待Socket连接超时'));
            }, 10000);
            if (s) {
              s.once('connect', onConnect);
              s.once('connect_error', onConnectError);
              s.once('error', onError);
            } else {
              // 如果此刻还拿不到socket实例，短延迟后再检查一次
              setTimeout(() => {
                const s2: any = (global as any).socketRef?.current || globalSocket;
                if (s2) {
                  s2.once('connect', onConnect);
                  s2.once('connect_error', onConnectError);
                  s2.once('error', onError);
                }
              }, 50);
            }
          });
        }
        
        // 设置Socket引用为全局Socket
        socketRef.current = (global as any).socketRef?.current || globalSocket;
        console.log('使用全局Socket连接进行通话');
        
        // 先初始化WebRTC，再注册Socket监听，最后再触发接听/拨打，确保iOS在收到offer时已有PeerConnection与监听
        try {
          await initWebRTC();
          console.log('WebRTC初始化成功');
          
          // 设置Socket事件监听（在PeerConnection准备好后再设置）
          setupSocketListeners();
          
          if (!isIncoming) {
            console.log('这是主动呼叫，即将发起呼叫...');
            if (routeCallId) {
              setActiveCallId(routeCallId);
              isCallIdReadyRef.current = true;
              flushLocalIceCandidates(routeCallId);
            }
            initiateCall();
          } else {
            console.log('这是来电，准备接听...');
            if (routeCallId) {
              setActiveCallId(routeCallId);
              isCallIdReadyRef.current = true;
              flushLocalIceCandidates(routeCallId);
            }
            // 确保在PeerConnection与监听就绪之后再发送accept_call
            acceptCall();
          }
        } catch (error) {
          console.error('初始化WebRTC失败:', error);
          Alert.alert(
            'WebRTC初始化失败',
            '无法初始化音频通话，请检查设备权限或重试。',
            [{ text: '确定', onPress: () => safeGoBack() }]
          );
        }
      } catch (error) {
        console.error('设置通话失败:', error);
        Alert.alert(
          '通话错误',
          '设置通话时发生错误，请重试。',
          [{ text: '确定', onPress: () => safeGoBack() }]
        );
      }
    };
    
    // 启动通话设置
    setupCall();
    
    // 清理函数
    return () => {
      // 在关闭WebRTC连接之前，先保存当前的连接状态（使用ref获取最新值）
      const currentCallStatus = callStatusRef.current;
      const wasWebrtcConnected = webrtcConnectedRef.current;
      
      // 停止音频管理
      AudioManager.stopAll();
      
      // 悬浮窗模式下不清理WebRTC资源，让新实例接管
      if (!isEnteringFloatingModeRef.current) {
        console.log('🧹 [Cleanup] 非悬浮窗模式，清理WebRTC资源');
        // 隐藏悬浮窗（如果不是进入悬浮窗模式）
        hideFloatingCall();
        // 清理WebRTC资源
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => {
            track.stop();
          });
        }
        
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
        }
      } else {
        console.log('✅ [Cleanup] 悬浮窗模式，保留WebRTC资源供新实例使用');
      }
      
      // 清理Socket事件监听（不断开全局Socket连接）
      if (socketRef.current) {
        console.log('📞 [Cleanup] 清理逻辑检查:', {
          currentCallStatus,
          wasWebrtcConnected,
          isEndingCall: isEndingCallRef.current,
          isEnteringFloatingMode: isEnteringFloatingModeRef.current
        });
        
        // 根据WebRTC连接状态和通话状态决定是否取消通话（使用ref获取的最新状态）
        if (currentCallStatus === 'connected' && wasWebrtcConnected) {
          // WebRTC真正连接且正在进入悬浮窗模式
          if (isEnteringFloatingModeRef.current) {
            console.log('✅ [Cleanup] WebRTC连接正常，正在进入悬浮窗模式，不取消通话');
          } else {
            console.log('✅ [Cleanup] WebRTC连接正常，组件卸载但不取消通话');
          }
        } else if (currentCallStatus !== 'ended' && !isEndingCallRef.current && (currentCallStatus === 'connecting' || currentCallStatus === 'ringing' || (currentCallStatus === 'connected' && !wasWebrtcConnected))) {
          // 通话未真正建立且未正在结束通话时，才发送取消通话事件
          const callIdToUse = activeCallId || routeCallId;
          if (callIdToUse) {
            console.log('❌ [Cleanup] 组件卸载，取消未真正连接的通话:', callIdToUse, 'WebRTC连接状态:', wasWebrtcConnected);
            socketRef.current.emit('cancel_call', {
              callId: callIdToUse,
              recipientId: contactId
            });
          }
        } else {
          console.log('ℹ️ [Cleanup] 通话状态:', currentCallStatus, 'WebRTC连接:', wasWebrtcConnected, '正在结束:', isEndingCallRef.current, '不需要取消通话');
        }
        
        // 清理事件监听器，但不断开全局Socket
        socketRef.current.off('call_accepted');
        socketRef.current.off('call_initiated');
        socketRef.current.off('call_failed');
        socketRef.current.off('incoming_call');
        socketRef.current.off('webrtc_offer');
        socketRef.current.off('webrtc_answer');
        socketRef.current.off('webrtc_ice_candidate');
        socketRef.current.off('call_rejected');
        socketRef.current.off('call_ended');
        socketRef.current.off('call_cancelled');
        console.log('已清理VoiceCallScreen的Socket事件监听器');
      }
      
      // 清除计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // 清理ICE统计轮询
      if (iceStatsIntervalRef.current) {
        clearInterval(iceStatsIntervalRef.current);
        iceStatsIntervalRef.current = null;
      }
      // 清理ICE缓冲状态
      remoteDescriptionSetRef.current = false;
      pendingRemoteIceCandidatesRef.current = [];
    };
  }, []);
  
  // 设置Socket事件监听
  const setupSocketListeners = () => {
    if (!socketRef.current) return;
    
    // 接收呼叫应答（仅拨打方处理，避免双向同时创建offer引发协商冲突）
    socketRef.current.on('call_accepted', async (data: any) => {
      console.log('对方已接受通话');
      if (isIncomingRef.current) {
        console.log('我是被叫端，忽略call_accepted中的发起offer逻辑，等待对端offer');
        return;
      }
      
      // 停止铃声
      AudioManager.stopRingback();
      
      // 不立即设置为connected，等待WebRTC连接建立
      setCallStatus('connecting');
      // 但是开始计时
      startCallTimer();
      
      try {
        // 使用 call_accepted 携带的 callId 作为主叫端的权威 callId 来源
        if (data && data.callId && !activeCallId) {
          setActiveCallId(data.callId);
          isCallIdReadyRef.current = true;
          flushLocalIceCandidates(data.callId);
        }
        // 重新标记远端未设置，等待answer到来
        remoteDescriptionSetRef.current = false;
        // 创建并发送offer
        console.log('创建WebRTC offer...');
        const offerOptions = {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        };
        const offer = await peerConnectionRef.current?.createOffer(offerOptions);
        
        if (!offer) {
          throw new Error('创建offer失败');
        }
        
        console.log('设置本地描述...');
        await peerConnectionRef.current?.setLocalDescription(offer);
        
        console.log('发送WebRTC offer...');
        socketRef.current?.emit('webrtc_offer', {
          callId: activeCallId || data.callId,
          recipientId: contactId,
          sdp: peerConnectionRef.current?.localDescription
        });
      } catch (error) {
        console.error('创建offer失败:', error);
        endCall();
      }
    });
    
    // 移除对 call_initiated 的强依赖：改由 call_accepted / webrtc_offer / webrtc_answer 赋值
    // 如服务器仍发送 call_initiated，这里也兼容但不再依赖其存在
    socketRef.current.on('call_initiated', (data: any) => {
      console.log('收到call_initiated（兼容）:', data);
      if (data && data.callId && !activeCallId) {
        setActiveCallId(data.callId);
        isCallIdReadyRef.current = true;
        flushLocalIceCandidates(data.callId);
      }
    });
    
    // 接收呼叫失败通知
    socketRef.current.on('call_failed', (data: any) => {
      console.log('呼叫失败:', data);
      Alert.alert(
        '呼叫失败',
        data.message || '无法连接到对方，请稍后再试。',
        [{ text: '确定', onPress: () => safeGoBack() }]
      );
    });

    // 接收来电通知（仅同步callId，不在此处自动接听，避免在PeerConnection未就绪时过早发送accept_call）
    socketRef.current.on('incoming_call', (data: any) => {
      console.log('收到来电:', data);
      if (isIncoming && data.callId) {
        console.log('记录来电ID以备接听，来电者ID:', data.callerId, '通话ID:', data.callId);
        setActiveCallId(data.callId);
        isCallIdReadyRef.current = true;
        flushLocalIceCandidates(data.callId);
      }
    });
    
    // 接收WebRTC offer
    socketRef.current.on('webrtc_offer', async (data: any) => {
      console.log('收到WebRTC offer');
      try {
        if (data.callId && !activeCallId) {
          setActiveCallId(data.callId);
          isCallIdReadyRef.current = true;
          flushLocalIceCandidates(data.callId);
        }
        if (data.sdp) {
          console.log('设置远程描述...');
          await peerConnectionRef.current?.setRemoteDescription(
            new RTCSessionDescription(data.sdp)
          );
          // 远端描述已设置，冲刷缓冲的ICE候选
          remoteDescriptionSetRef.current = true;
          if (pendingRemoteIceCandidatesRef.current.length > 0) {
            console.log(`冲刷待处理ICE候选: ${pendingRemoteIceCandidatesRef.current.length}`);
            for (const cand of pendingRemoteIceCandidatesRef.current) {
              try {
                await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.error('冲刷ICE候选失败:', e);
              }
            }
            pendingRemoteIceCandidatesRef.current = [];
          }
          
          // 创建应答
          console.log('创建WebRTC answer...');
          const answer = await peerConnectionRef.current?.createAnswer();
          
          if (!answer) {
            throw new Error('创建answer失败');
          }
          
          console.log('设置本地描述...');
          await peerConnectionRef.current?.setLocalDescription(answer);
          
          console.log('发送WebRTC answer...');
          socketRef.current?.emit('webrtc_answer', {
            callId: activeCallId || data.callId, // 使用保存的callId或数据中的callId
            recipientId: contactId,
            sdp: peerConnectionRef.current?.localDescription
          });
        } else {
          console.error('收到的offer没有SDP');
        }
      } catch (error) {
        console.error('处理offer失败:', error);
        endCall();
      }
    });
    
    // 接收WebRTC answer
    socketRef.current.on('webrtc_answer', async (data: any) => {
      console.log('收到WebRTC answer');
      try {
        if (data.callId && !activeCallId) {
          setActiveCallId(data.callId);
          isCallIdReadyRef.current = true;
          flushLocalIceCandidates(data.callId);
        }
        if (data.sdp) {
          console.log('设置远程描述...');
          await peerConnectionRef.current?.setRemoteDescription(
            new RTCSessionDescription(data.sdp)
          );
          console.log('远程描述设置完成');
          // 远端描述已设置，冲刷缓冲的ICE候选
          remoteDescriptionSetRef.current = true;
          if (pendingRemoteIceCandidatesRef.current.length > 0) {
            console.log(`冲刷待处理ICE候选: ${pendingRemoteIceCandidatesRef.current.length}`);
            for (const cand of pendingRemoteIceCandidatesRef.current) {
              try {
                await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.error('冲刷ICE候选失败:', e);
              }
            }
            pendingRemoteIceCandidatesRef.current = [];
          }
        } else {
          console.error('收到的answer没有SDP');
        }
      } catch (error) {
        console.error('处理answer失败:', error);
        endCall();
      }
    });
    
    // 接收ICE候选
    socketRef.current.on('webrtc_ice_candidate', async (data: any) => {
      console.log('收到ICE候选:', data.candidate?.type, data.candidate?.protocol, data.candidate?.address);
      try {
        if (data.candidate) {
          if (!remoteDescriptionSetRef.current) {
            // 远端描述未设置，先缓冲，适配iOS严格顺序要求
            pendingRemoteIceCandidatesRef.current.push(data.candidate);
            console.log('远端SDP未设置，缓冲ICE候选。当前缓冲数:', pendingRemoteIceCandidatesRef.current.length);
          } else {
            console.log('添加ICE候选...');
            await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log('ICE候选添加成功');
          }
        }
      } catch (error) {
        console.error('添加ICE候选失败:', error);
      }
    });
    
    // 通话被拒绝
    socketRef.current.on('call_rejected', () => {
      console.log('通话被拒绝');
      
      // 停止铃声
      AudioManager.stopRingback();
      
      // 设置标记，防止在endCall中重复发送cancel_call事件
      setIsEndingCall(true);
      
      // 直接设置状态为结束
      setCallStatus('ended');
      
      // 清理计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // 不再显示弹窗，气泡会显示"对方已拒绝"
      console.log('通话被拒绝，气泡会显示"对方已拒绝"');
      
      // 延迟返回以确保状态更新完成
      setTimeout(() => {
        safeGoBack();
      }, 100);
    });
    
    // 通话结束（对方主动挂断）
    socketRef.current.on('call_ended', (data) => {
      console.log('通话已结束（对方主动挂断）:', data);
      
      // 停止铃声
      AudioManager.stopRingback();
      
      // 设置标记，防止重复处理
      setIsEndingCall(true);
      isEndingCallRef.current = true;
      
      // 重置悬浮窗标志
      setIsEnteringFloatingMode(false);
      isEnteringFloatingModeRef.current = false;
      
      // 隐藏悬浮窗
      hideFloatingCall();
      
      // 重置WebRTC连接状态
      setWebrtcConnected(false);
      
      // 直接设置状态为结束
      setCallStatus('ended');
      
      // 清理计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      console.log('对方已挂断，自动关闭通话界面');
      
      // 延迟返回以确保状态更新完成
      setTimeout(() => {
        safeGoBack();
      }, 100);
    });

    // 通话被取消（拨打者挂断）
    socketRef.current.on('call_cancelled', () => {
      console.log('通话被取消（拨打者已挂断）');
      
      // 停止铃声
      AudioManager.stopRingback();
      
      // 设置标记，防止重复处理
      setIsEndingCall(true);
      
      // 直接设置状态为结束
      setCallStatus('ended');
      
      // 清理计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      console.log('拨打者已取消通话，自动关闭通话界面');
      
      // 延迟返回以确保状态更新完成
      setTimeout(() => {
        safeGoBack();
      }, 100);
    });
  };
  
  // 初始化WebRTC
  const initWebRTC = async () => {
    try {
      if (peerConnectionRef.current) {
        console.log('WebRTC已初始化，跳过重复初始化');
        return;
      }

      console.log('正在初始化WebRTC...');
      
      // 🔧 iOS首次使用修复：确保音频系统完全就绪后再初始化WebRTC
      if (Platform.OS === 'ios') {
        console.log('🍎 [VoiceCall] iOS设备，确保音频系统完全就绪...');
        
        try {
          // 1. 等待初始化管理器完成音频会话配置
          const IOSInitializationManager = require('../services/IOSInitializationManager').default;
          const initManager = IOSInitializationManager.getInstance();
          
          if (!initManager.isAudioSessionReady()) {
            console.log('🔧 [VoiceCall] 音频会话未就绪，等待初始化管理器配置...');
            await initManager.initializeAudioSessionAfterPermission();
            console.log('✅ [VoiceCall] 初始化管理器音频会话配置完成');
          }
          
          // 2. 额外确保IOSAudioSession状态正确
          const audioSession = IOSAudioSession.getInstance();
          if (!audioSession.isActive()) {
            console.log('🎵 [VoiceCall] 音频会话未激活，重新配置...');
            await audioSession.reset();
            await audioSession.prepareForRecording();
            console.log('✅ [VoiceCall] IOSAudioSession重新配置完成');
          }
          
          // 3. 关键：等待音频系统完全稳定（iOS需要这个延迟）
          console.log('⏱️ [VoiceCall] 等待iOS音频系统完全稳定...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('✅ [VoiceCall] iOS音频系统稳定延迟完成');
          
        } catch (audioError) {
          console.warn('⚠️ [VoiceCall] iOS音频系统配置失败，使用兜底方案:', audioError);
          // 兜底方案：基础音频会话重置
          try {
            const audioSession = IOSAudioSession.getInstance();
            await audioSession.reset();
            await audioSession.prepareForRecording();
            await new Promise(resolve => setTimeout(resolve, 300));
            console.log('✅ [VoiceCall] 兜底音频会话配置完成');
          } catch (fallbackError) {
            console.warn('⚠️ [VoiceCall] 兜底音频配置也失败:', fallbackError);
          }
        }
      }
      
      // 检查mediaDevices是否可用
      if (!mediaDevices) {
        console.error('mediaDevices未定义，可能是react-native-webrtc未正确初始化');
        Alert.alert(
          'WebRTC初始化失败',
          '无法访问媒体设备。请尝试重启应用。',
          [{ text: '确定', style: 'default' }]
        );
        throw new Error('mediaDevices未定义');
      }

      // 拉取临时ICE配置（动态 TURN 凭证）
      let fetchedIceServers: any[] = [];
      try {
        const resp = await fetch(`${API_URL}${API_ENDPOINTS.ICE_CONFIG}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // 后端 protect 中间件需要 Bearer <token>
            Authorization: userToken ? `Bearer ${userToken}` : '',
          },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data.iceServers)) {
            fetchedIceServers = data.iceServers;
          }
          console.log('获取ICE配置成功:', JSON.stringify(data, null, 2));
        } else {
          console.warn('获取ICE配置失败，使用静态备用配置:', resp.status);
        }
      } catch (e) {
        console.warn('获取ICE配置异常，使用静态备用配置:', e);
      }

      // 兜底静态配置（当后端未配置时使用公共TURN服务器）
      if (!fetchedIceServers || fetchedIceServers.length === 0) {
        fetchedIceServers = [
          // 多个STUN服务器提高连接成功率
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:38.207.178.173:3478' },
          // 公共TURN服务器作为备用
          {
            urls: [
              'turn:openrelay.metered.ca:80',
              'turn:openrelay.metered.ca:443',
              'turn:openrelay.metered.ca:443?transport=tcp',
            ],
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          // 私有TURN服务器
          {
            urls: [
                      'turn:38.207.178.173:3478?transport=udp',
        'turn:38.207.178.173:3478?transport=tcp',
        'turn:38.207.178.173:443?transport=tcp',
            ],
            username: 'webrtcuser',
            credential: 'webrtcpass',
          },
        ];
      }

      // iOS 优化：保留更多传输选项，WiFi下优先UDP，蜂窝网络下优先TCP
      let effectiveIceServers = fetchedIceServers;
      if (Platform.OS === 'ios') {
        // 保留所有STUN服务器和TURN服务器，但优先排序
        effectiveIceServers = fetchedIceServers.map((srv) => {
          if (!srv.urls) return srv;
          const urls = Array.isArray(srv.urls) ? srv.urls : [srv.urls];
          
          // 对于STUN服务器，保持不变
          if (urls.some((u: string) => u.startsWith('stun:'))) {
            return srv;
          }
          
          // 对于TURN服务器，重新排序：UDP优先（WiFi友好），然后TCP
          const reordered = [
            ...urls.filter((u: string) => u.includes('transport=udp')),
            ...urls.filter((u: string) => u.includes('transport=tcp')),
            ...urls.filter((u: string) => !u.includes('transport='))
          ];
          
          return { ...srv, urls: reordered };
        });
      }

      // 若开启调试强制TURN中继，则覆盖为固定TURN列表
      if (DEBUG_FORCE_TURN_RELAY) {
        console.log('🧪 [ICE] 调试模式：强制仅使用 TURN 中继');
        effectiveIceServers = TURN_ONLY_ICE_SERVERS;
      }

      // 策略：调试时仅 relay，其余为 all
      const rtcConfig = {
        iceServers: effectiveIceServers,
        iceTransportPolicy: (DEBUG_FORCE_TURN_RELAY ? 'relay' : 'all') as 'relay' | 'all',
        iceCandidatePoolSize: 10,
        bundlePolicy: 'balanced' as 'balanced' | 'max-compat' | 'max-bundle',
        rtcpMuxPolicy: 'require' as 'negotiate' | 'require',
      };

    console.log('创建RTCPeerConnection...');
    console.log('ICE配置:', JSON.stringify(rtcConfig, null, 2));
    peerConnectionRef.current = new RTCPeerConnection(rtcConfig) as RTCPeerConnectionWithEvents;

    try {
      // 获取媒体流（仅音频）
      console.log('获取媒体流...');
      const audioConstraints: any = Platform.OS === 'ios'
        ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000, // 降低采样率，提高兼容性
            channelCount: 1,
          }
        : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
            channelCount: 1,
          };
      
      // 🔧 iOS首次使用修复：增强getUserMedia调用的错误处理和重试机制
      let stream: MediaStream | null = null;
      let attempts = 0;
      const maxAttempts = Platform.OS === 'ios' ? 3 : 1;
      
      while (attempts < maxAttempts && !stream) {
        try {
          console.log(`🎙️ [VoiceCall] 尝试获取媒体流 (第${attempts + 1}次/共${maxAttempts}次)...`);
          
          stream = await mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: false
          });
          
          console.log('✅ [VoiceCall] 媒体流获取成功');
          break;
          
        } catch (streamError: any) {
          attempts++;
          console.warn(`⚠️ [VoiceCall] 第${attempts}次获取媒体流失败:`, streamError.message);
          
          if (attempts >= maxAttempts) {
            throw streamError; // 重新抛出最后一次的错误
          }
          
          // iOS特殊处理：等待音频系统稳定后重试
          if (Platform.OS === 'ios') {
            console.log('🔄 [VoiceCall] iOS等待音频系统稳定后重试...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 重试前重新配置音频会话
            try {
              const audioSession = IOSAudioSession.getInstance();
              await audioSession.reset();
              await audioSession.prepareForRecording();
              console.log('✅ [VoiceCall] 重试前音频会话重新配置完成');
            } catch (retryAudioError) {
              console.warn('⚠️ [VoiceCall] 重试前音频会话配置失败:', retryAudioError);
            }
          }
        }
      }
      
      // 确保有有效的流
      if (!stream) {
        throw new Error('获取媒体流失败：所有重试都失败了');
      }
      
      localStreamRef.current = stream;

      // 确保音频流正常
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        console.log('获取到本地音频轨道:', audioTracks.length);
        console.log('音频轨道状态:', audioTracks[0].enabled ? '启用' : '禁用');
        
        // 添加本地流到对等连接
        console.log('添加本地音频轨道到对等连接...');
        audioTracks.forEach(track => {
          if (peerConnectionRef.current && localStreamRef.current) {
            peerConnectionRef.current.addTrack(track, localStreamRef.current);
          }
        });
      } else {
        console.warn('没有获取到音频轨道!');
      }
    } catch (mediaError: any) {
      console.error('获取媒体流失败:', mediaError);
      
      // 根据错误类型提供不同的错误信息
      if (mediaError.name === 'NotAllowedError' || mediaError.name === 'PermissionDeniedError') {
        Alert.alert(
          '麦克风访问被拒绝',
          '您需要允许应用访问麦克风才能进行语音通话。',
          [
            { text: '取消', style: 'cancel', onPress: () => safeGoBack() },
            { 
              text: '去设置', 
              onPress: () => {
                Platform.OS === 'ios' 
                  ? Linking.openURL('app-settings:') 
                  : Linking.openSettings();
                safeGoBack();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          '无法访问麦克风',
          `获取麦克风访问失败: ${mediaError.message || '未知错误'}`,
          [{ text: '确定', style: 'default', onPress: () => safeGoBack() }]
        );
      }
      
      throw mediaError;
    }
    
    // 监听远程流
    peerConnectionRef.current.ontrack = (event) => {
      console.log('收到远程轨道:', event.track.kind);
      
      // 确保音频输出到扬声器或听筒
      if (event.track.kind === 'audio') {
        console.log('收到远程音频轨道，设置音频输出...');
        
        // 🔧 iOS首次使用修复：增强音频输出配置
        if (Platform.OS === 'ios') {
          console.log('🍎 [VoiceCall] iOS收到远程音频，配置音频输出路径...');
          
          // 确保音频会话处于正确状态
          setTimeout(async () => {
            try {
              const audioSession = IOSAudioSession.getInstance();
              
              // 检查并重新激活音频会话（如果需要）
              if (!audioSession.isActive()) {
                console.log('🔄 [VoiceCall] 远程音频到达时音频会话未激活，重新激活...');
                await audioSession.prepareForRecording();
              }
              
              // 设置音频输出路径
              console.log('🔊 [VoiceCall] 设置iOS音频输出为扬声器（首次通话避免听不到）');
              AudioManager.setSpeakerOn(true);
              setIsSpeakerOn(true);
              
              console.log('✅ [VoiceCall] iOS远程音频配置完成');
            } catch (audioOutputError) {
              console.warn('⚠️ [VoiceCall] iOS音频输出配置失败:', audioOutputError);
              // 兜底：使用基础配置
              AudioManager.setSpeakerOn(true);
              setIsSpeakerOn(true);
            }
          }, 100); // 小延迟确保音频轨道完全就绪
        } else {
          AudioManager.setSpeakerOn(isSpeakerOn);
        }
      }
    };
    
    // 监听ICE候选
    peerConnectionRef.current.onicecandidate = (event: any) => {
      if (event && event.candidate) {
        console.log('产生ICE候选:', event.candidate.type, event.candidate.protocol, event.candidate.address);
        const callIdToUse = activeCallId || routeCallId;
        if (!socketRef.current || !callIdToUse) {
          // callId未就绪，缓存
          localPendingIceCandidatesRef.current.push(event.candidate);
          console.log('callId未就绪，缓存本地ICE候选。当前缓存数:', localPendingIceCandidatesRef.current.length);
        } else {
          socketRef.current.emit('webrtc_ice_candidate', {
            callId: callIdToUse,
            recipientId: contactId,
            candidate: event.candidate
          });
        }
      } else if (event && event.candidate === null) {
        console.log('ICE候选收集完成');
      }
    };
    // 额外的ICE调试日志
    (peerConnectionRef.current as any).onicegatheringstatechange = () => {
      const gatheringState = (peerConnectionRef.current as any)?.iceGatheringState;
      console.log('ICE候选收集状态:', gatheringState);
    };
    (peerConnectionRef.current as any).onicecandidateerror = (e: any) => {
      console.warn('ICE候选错误:', e?.errorText || e?.message || e);
    };
    
    // 监听连接状态变化
    peerConnectionRef.current.onconnectionstatechange = () => {
      const state = peerConnectionRef.current?.connectionState;
      console.log('连接状态:', state);
      
      if (state === 'connected') {
        console.log('WebRTC连接已建立');
        setWebrtcConnected(true);
        setCallStatus('connected');
        if (!timerRef.current) {
          startCallTimer();
        }
        // 连接成功后检查选中候选对
        logSelectedCandidatePair();
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        console.log('WebRTC连接已断开或失败');
        setWebrtcConnected(false);
        // 只有在通话未结束且未主动结束通话且不在悬浮窗模式时才调用endCall
        if (callStatusRef.current !== 'ended' && !isEndingCallRef.current && !isEnteringFloatingModeRef.current) {
          console.log('WebRTC连接断开，但不是主动结束，调用endCall');
          endCall();
        } else {
          console.log('WebRTC连接断开，但已在结束通话流程中或悬浮窗模式，不重复调用endCall');
        }
      }
    };
    
    // 🔧 网络切换修复：增强ICE连接状态变化监听，支持网络切换重连
    let iceReconnectAttempts = 0;
    const maxIceReconnectAttempts = 3;
    
    peerConnectionRef.current.oniceconnectionstatechange = () => {
      const state = peerConnectionRef.current?.iceConnectionState;
      console.log('ICE连接状态:', state);
      
      if (state === 'connected' || state === 'completed') {
        console.log('ICE连接已建立');
        console.log('🔗 [WebRTC] 设置webrtcConnected=true, callStatus=connected');
        setWebrtcConnected(true);
        setCallStatus('connected');
        
        // 🔧 网络切换修复：连接成功后重置重连尝试次数
        iceReconnectAttempts = 0;
        
        if (!timerRef.current) {
          startCallTimer();
        }
        // 连接成功后检查选中候选对
        logSelectedCandidatePair();
      } else if (state === 'disconnected') {
        console.log('🔶 [WebRTC] ICE连接已断开，可能是网络切换导致');
        setWebrtcConnected(false);
        
        // 🔧 网络切换修复：ICE断开时先尝试重连，而不是立即结束通话
        if (callStatusRef.current !== 'ended' && !isEndingCallRef.current && !isEnteringFloatingModeRef.current) {
          if (iceReconnectAttempts < maxIceReconnectAttempts) {
            iceReconnectAttempts++;
            console.log(`🔄 [WebRTC] ICE断开，尝试重连 (${iceReconnectAttempts}/${maxIceReconnectAttempts})`);
            
            // 延迟重连，给网络切换时间稳定
            setTimeout(async () => {
              try {
                if (peerConnectionRef.current && callStatusRef.current !== 'ended') {
                  console.log('🔄 [WebRTC] 开始ICE重连过程');
                  
                  // 重启ICE连接
                  await peerConnectionRef.current.restartIce();
                  
                  // 如果是发起方，重新创建offer
                  if (!isIncomingRef.current) {
                    console.log('🔄 [WebRTC] 发起方重新创建offer');
                    const offer = await peerConnectionRef.current.createOffer({
                      iceRestart: true
                    });
                    await peerConnectionRef.current.setLocalDescription(offer);
                    
                    // 通过Socket发送新的offer
                    if (globalSocket && activeCallId) {
                      globalSocket.emit('webrtc_offer', {
                        callId: activeCallId,
                        offer: offer,
                        isIceRestart: true
                      });
                    }
                  }
                }
              } catch (error) {
                console.error('❌ [WebRTC] ICE重连失败:', error);
              }
            }, 1000 * iceReconnectAttempts); // 递增延迟
          } else {
            console.log('❌ [WebRTC] ICE重连次数已达上限，结束通话');
            endCall();
          }
        }
      } else if (state === 'failed' || state === 'closed') {
        console.log('ICE连接已失败或关闭');
        setWebrtcConnected(false);
        // 只有在通话未结束且未主动结束通话且不在悬浮窗模式时才调用endCall
        if (callStatusRef.current !== 'ended' && !isEndingCallRef.current && !isEnteringFloatingModeRef.current) {
          console.log('ICE连接失败，调用endCall');
          endCall();
        } else {
          console.log('ICE连接失败，但已在结束通话流程中或悬浮窗模式，不重复调用endCall');
        }
      }
    };
    
    // 不在此处自动接听，改为在初始化完成且监听就绪后再处理
    
  } catch (error) {
    console.error('初始化WebRTC失败:', error);
    throw error;
  }
};

  // 定时记录/检查选中候选对（relay/host/srflx）
  const iceStatsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logSelectedCandidatePair = async () => {
    try {
      const pc: any = peerConnectionRef.current;
      if (!pc || typeof pc.getStats !== 'function') return;
      const stats = await pc.getStats();
      let logged = false;
      // stats 可能是 Map，也可能是对象，统一按 Map 处理
      const reportList: any[] = [];
      if (typeof stats.forEach === 'function') {
        stats.forEach((r: any) => reportList.push(r));
      } else if (Array.isArray(stats)) {
        reportList.push(...stats);
      }
      const pairs = reportList.filter((r) => r.type === 'candidate-pair');
      for (const r of pairs) {
        if (r.state === 'succeeded' || r.selected === true) {
          const local = reportList.find((x) => x.id === r.localCandidateId);
          const remote = reportList.find((x) => x.id === r.remoteCandidateId);
          console.log('🎯 [ICE] 已选候选对:', {
            localType: local?.candidateType,
            localProtocol: local?.protocol,
            localIp: local?.ip || local?.address,
            remoteType: remote?.candidateType,
            remoteProtocol: remote?.protocol,
            relayProtocol: remote?.relayProtocol,
            remoteIp: remote?.ip || remote?.address,
          });
          logged = true;
          break;
        }
      }
      if (!logged) {
        console.log('ℹ️ [ICE] 暂未找到已选候选对，稍后重试');
      }
      // 若尚无间隔轮询，则启动，观察是否被切换
      if (!iceStatsIntervalRef.current) {
        iceStatsIntervalRef.current = setInterval(() => {
          logSelectedCandidatePair();
        }, 3000);
      }
    } catch (e) {
      console.warn('统计已选候选对失败:', e);
    }
  };
  
  // 发起呼叫
  const initiateCall = () => {
    if (!socketRef.current) return;
    
    console.log('正在发起呼叫，目标ID:', contactId);
    
    // 使用正确的参数格式发送呼叫请求
    socketRef.current.emit('initiate_call', {
      callerId: userInfo?._id,
      recipientId: contactId,
      callId: activeCallId,
      conversationId: route.params?.conversationId
    });
    
    console.log('正在呼叫:', contactName);
    setCallStatus('ringing');
    
    // 设置超时处理
    const callTimeout = setTimeout(() => {
      if (callStatus === 'ringing') {
        console.log('呼叫超时，无人接听');
        Alert.alert(
          '无人接听',
          '对方可能不在线或未能接听您的通话',
          [{ text: '确定', onPress: () => safeGoBack() }]
        );
      }
    }, 30000); // 30秒超时
    
    // 清理函数
    return () => {
      clearTimeout(callTimeout);
    };
  };
  
  // 接受呼叫
  const acceptCall = () => {
    if (!socketRef.current) return;
    
    const callIdToUse = activeCallId || routeCallId;
    
    if (!callIdToUse) {
      console.error('没有可用的callId，无法接受通话');
      Alert.alert('错误', '无法接受通话，缺少必要信息');
      safeGoBack();
      return;
    }
    
    console.log('接受通话，callId:', callIdToUse, '目标ID:', contactId);
    
    // 停止铃声
    AudioManager.stopRingback();
    
    // 使用正确的参数格式发送接受呼叫请求
    socketRef.current.emit('accept_call', {
      callId: callIdToUse,
      recipientId: contactId
    });
    
    // 标记为连接中，等待对端offer与ICE完成连接后再置为connected并启动计时
    setCallStatus('connecting');
  };
  
  // 拒绝呼叫
  const rejectCall = () => {
    if (!socketRef.current) return;
    
    const callIdToUse = activeCallId || routeCallId;
    // 获取对话ID
    const conversationId = route.params?.conversationId;
    
    if (!callIdToUse) {
      console.error('没有可用的callId，无法拒绝通话');
      safeGoBack();
      return;
    }
    
    console.log('拒绝通话，callId:', callIdToUse, '目标ID:', contactId, '对话ID:', conversationId);
    
    // 使用正确的参数格式发送拒绝呼叫请求
    // 服务器端会统一处理通话记录的创建和广播，避免重复
    socketRef.current.emit('reject_call', {
      callId: callIdToUse,
      recipientId: contactId,
      conversationId
    });
    
    safeGoBack();
  };
  
  // 结束通话
  const endCall = () => {
    // 防止重复调用
    if (isEndingCall) {
      console.log('通话结束已在处理中，忽略重复调用');
      return;
    }
    
    setIsEndingCall(true);
    isEndingCallRef.current = true; // 同时设置ref
    // 重置悬浮窗标志
    setIsEnteringFloatingMode(false);
    isEnteringFloatingModeRef.current = false;
    // 隐藏悬浮窗
    hideFloatingCall();
    // 重置WebRTC连接状态
    setWebrtcConnected(false);
    
    if (socketRef.current) {
      const callIdToUse = activeCallId || routeCallId;
      
      // 尝试获取对话ID
      const conversationId = route.params?.conversationId;
      
      if (callIdToUse) {
        
        // 根据通话状态发送不同的事件，确保只发送一种事件
        // 只有在通话未建立时才发送cancel_call事件
        if (callStatus === 'connecting' || callStatus === 'ringing') {
          console.log('取消未接听的通话，callId:', callIdToUse, '目标ID:', contactId, '对话ID:', conversationId);
          
          // 使用正确的参数格式发送取消通话请求
          socketRef.current.emit('cancel_call', {
            callId: callIdToUse,
            recipientId: contactId,
            conversationId
          });
        } 
        // 只有在通话已建立时才发送end_call事件
        else if (callStatus === 'connected') {
          console.log('结束通话，callId:', callIdToUse, '目标ID:', contactId, '时长:', callDuration, '对话ID:', conversationId);
          
          // 使用正确的参数格式发送结束通话请求，包含通话时长和对话ID
          socketRef.current.emit('end_call', {
            callId: callIdToUse,
            recipientId: contactId,
            duration: callDuration,
            conversationId
          });
        } else {
          console.log('通话已结束或处于其他状态，不发送任何事件');
        }
      } else {
        console.error('没有可用的callId，无法发送结束通话事件');
      }
    }
    
    // 停止铃声
    AudioManager.stopRingback();
    
    setCallStatus('ended');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // 使用setTimeout确保状态更新和事件发送完成后再导航
    setTimeout(() => {
      safeGoBack();
    }, 100);
  };
  
  // 切换麦克风静音状态
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      
      const newMuteState = !isMuted;
      console.log(`切换麦克风状态: ${newMuteState ? '静音' : '取消静音'}`);
      console.log(`音频轨道数量: ${audioTracks.length}`);
      
      audioTracks.forEach((track) => {
        // 切换启用状态 - 注意：enabled=false表示静音
        track.enabled = !newMuteState;
        console.log(`音频轨道 ${track.id} 已${newMuteState ? '静音' : '启用'}`);
      });
      
      // 更新UI状态
      setIsMuted(newMuteState);
    } else {
      console.warn('没有可用的本地音频流');
    }
  };
  
  // 切换扬声器
  const toggleSpeaker = () => {
    try {
      // 使用AudioManager切换扬声器
      const newSpeakerState = !isSpeakerOn;
      AudioManager.setSpeakerOn(newSpeakerState);
      console.log(`扬声器状态已切换为: ${newSpeakerState ? '开启' : '关闭'}`);
      
      // 更新UI状态
      setIsSpeakerOn(newSpeakerState);
    } catch (error) {
      console.error('切换扬声器失败:', error);
      Alert.alert('操作失败', '切换扬声器时发生错误，请重试');
    }
  };
  
  // 开始通话计时器
  const startCallTimer = () => {
    timerRef.current = setInterval(() => {
      setCallDuration(prev => {
        const newDuration = prev + 1;
        // 如果在悬浮窗模式，更新悬浮窗的时长
        updateCallDuration(newDuration);
        return newDuration;
      });
    }, 1000);
  };
  
  // 格式化通话时长
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
  };
  
  // 渲染通话状态文本
  const renderStatusText = () => {
    switch (callStatus) {
      case 'connecting':
        return '正在连接...';
      case 'ringing':
        return isIncoming ? '来电响铃...' : '等待对方接受邀请...';
      case 'connected':
        return formatDuration(callDuration);
      case 'ended':
        return '通话已结束';
      default:
        return '';
    }
  };
  
  // 渲染用户头像
  const renderAvatar = () => {
    // 记录头像信息
    console.log('渲染头像 - contactAvatar:', route.params?.contactAvatar);
    console.log('渲染头像 - 是否是客服:', isCustomerService(), '是否是来电:', isIncoming, '是否是去电:', !isIncoming);
    
    // 修改判断逻辑：
    // 1. 如果是客服，且是去电(客服打给用户)，用户使用默认头像
    // 2. 如果是用户，且是来电(客服打给用户)，显示客服头像
    // 3. 如果是用户，且是去电(用户打给客服)，显示客服头像
    
    // 简化逻辑：
    // - 如果是客服在通话中，且是客服主动拨打，则显示默认头像(用户头像)
    // - 其他情况，只要有contactAvatar就显示(客服头像)
    
    const shouldShowAvatar = route.params?.contactAvatar && 
      !(isCustomerService() && !isIncoming); // 不是"客服拨打电话"的情况都显示头像
    
    console.log('是否显示联系人头像:', shouldShowAvatar, 
      '是否是客服:', isCustomerService(), 
      '是否是来电:', isIncoming);
    
    // 由于default-avatar.png可能存在问题，我们使用条件渲染
    return (
      <View style={styles.avatarContainer}>
        {shouldShowAvatar && !avatarLoadError ? (
          <Image 
            source={{ uri: route.params.contactAvatar }} 
            style={styles.avatar} 
            onLoad={() => console.log('头像加载成功:', route.params.contactAvatar)}
            onError={(e) => {
              console.error('头像加载失败:', route.params.contactAvatar, e.nativeEvent.error);
              // 头像加载失败时使用默认头像
              setAvatarLoadError(true);
            }}
          />
        ) : (
          <Image 
            source={DEFAULT_AVATAR}
            style={styles.avatar} 
            onLoad={() => console.log('默认头像加载成功')}
            onError={(e) => console.error('默认头像加载失败:', e.nativeEvent.error)}
          />
        )}
        <Text style={styles.contactName}>{contactName}</Text>
      </View>
    );
  };
  
  // 渲染通话控制按钮
  const renderCallControls = () => {
    if (isIncoming && callStatus === 'ringing') {
      // 来电接听界面
      return (
        <View style={styles.incomingActionsContainer}>
          <TouchableOpacity style={styles.callButtonWrapper} onPress={rejectCall}>
            <View style={[styles.callButton, styles.rejectButton]}>
              <Icon name="call" size={26} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </View>
            <Text style={styles.buttonLabel}>取消</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.callButtonWrapper} onPress={acceptCall}>
            <View style={[styles.callButton, styles.acceptButton]}>
              <Icon name="call" size={26} color="#fff" />
            </View>
            <Text style={styles.buttonLabel}>接听</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (callStatus === 'connected') {
      // 通话中界面
      return (
        <View style={styles.connectedActionsContainer}>
          <TouchableOpacity style={styles.actionButtonWrapper} onPress={toggleMute}>
            <View style={[styles.actionButton, isMuted && styles.activeButton]}>
              <Icon name={isMuted ? "mic-off" : "mic"} size={24} color="#fff" />
            </View>
            <Text style={styles.actionLabel}>{isMuted ? '麦克风已关' : '麦克风已开'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.callButtonWrapper} onPress={endCall}>
            <View style={[styles.callButton, styles.endButton]}>
              <Icon name="call" size={26} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </View>
            <Text style={styles.buttonLabel}>取消</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButtonWrapper} onPress={toggleSpeaker}>
            <View style={[styles.actionButton, isSpeakerOn && styles.activeButton]}>
              <Icon name={isSpeakerOn ? "volume-high" : "volume-medium"} size={24} color="#fff" />
            </View>
            <Text style={styles.actionLabel}>{isSpeakerOn ? '扬声器已开' : '扬声器已关'}</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      // 拨打电话等待接听界面
      return (
        <View style={styles.outgoingActionsContainer}>
          <TouchableOpacity style={styles.callButtonWrapper} onPress={endCall}>
            <View style={[styles.callButton, styles.endButton]}>
              <Icon name="call" size={26} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </View>
            <Text style={styles.buttonLabel}>取消</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };
  
  // 渲染悬浮窗
  const renderFloatingWindow = () => {
    return (
      <View style={styles.floatingContainer}>
        <Text style={styles.floatingContactName} numberOfLines={1}>
          {contactName}
        </Text>
        <Text style={styles.floatingStatus}>
          {formatDuration(callDuration)}
        </Text>
        <View style={styles.floatingButtonsRow}>
          <TouchableOpacity 
            style={styles.floatingEndButton}
            onPress={endCall}
          >
            <Icon name="call" size={18} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.floatingExpandButton}
            onPress={toggleFloatingMode}
          >
            <Icon name="expand-outline" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // 切换悬浮窗模式
  const toggleFloatingMode = () => {
    const newFloatingState = !isFloating;
    
    if (newFloatingState) {
      // 检查是否真正连接，只有连接状态才能缩小
      const currentCallStatus = callStatusRef.current;
      const currentWebrtcConnected = webrtcConnectedRef.current;
      
      if (currentCallStatus !== 'connected' || !currentWebrtcConnected) {
        console.log('📱 [VoiceCall] 通话未连接，不能缩小到悬浮窗');
        return;
      }
      
      console.log('📱 [VoiceCall] 切换到悬浮窗模式');
      // 设置标志，防止自动挂断
      setIsEnteringFloatingMode(true);
      isEnteringFloatingModeRef.current = true;
      
      // 显示全局悬浮窗，保存当前WebRTC状态
      showFloatingCall({
        contactName: contactName || '未知联系人',
        contactId: contactId,
        callId: activeCallId || routeCallId || '',
        callDuration: callDuration,
        onEndCall: () => {
          // 结束通话的回调
          endCall();
        },
        // 保存WebRTC相关状态
        peerConnection: peerConnectionRef.current,
        localStream: localStreamRef.current,
        timerRef: timerRef.current,
        callStatus: callStatus,
        webrtcConnected: webrtcConnected,
        conversationId: route.params?.conversationId,
        contactAvatar: route.params?.contactAvatar
      });
      
      // 返回到聊天页面
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Chat', {
          contactId: contactId,
          contactName: contactName
        });
      }
    } else {
      // 从悬浮窗模式恢复
      Animated.timing(floatingAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // 导航到通话全屏页面
      navigation.navigate('VoiceCall', {
        contactId: contactId,
        contactName: contactName,
        isIncoming: false,
        callId: activeCallId,
        isReturning: true
      });
    }
    
    setIsFloating(newFloatingState);
  };

  // 🔧 网络切换修复：添加网络状态监听，支持语音通话中的网络切换
  useEffect(() => {
    let lastNetworkType: string | null = null;
    
    const networkUnsubscribe = NetInfo.addEventListener(state => {
      const currentNetworkType = state.type || 'unknown';
      const connected = Platform.OS === 'ios' 
        ? getOptimizedConnectionStatus(state)
        : Boolean(state.isConnected && state.isInternetReachable !== false);
      
      // 检测网络类型变化
      const isNetworkTypeChanged = lastNetworkType !== null && 
                                  lastNetworkType !== currentNetworkType &&
                                  connected === true;
      
      // 特别关注蜂窝数据到WiFi的切换
      const isCellularToWifi = lastNetworkType === 'cellular' && currentNetworkType === 'wifi';
      
      if (isNetworkTypeChanged && (callStatus === 'connected' || callStatus === 'ringing')) {
        console.log(`🔄 [VoiceCall] 通话中检测到网络切换: ${lastNetworkType} → ${currentNetworkType}`);
        
        if (isCellularToWifi) {
          console.log('📶 [VoiceCall] 蜂窝数据切换到WiFi，主动触发ICE重连');
          
          // 延迟触发ICE重连，等待WiFi稳定
          setTimeout(async () => {
            try {
              if (peerConnectionRef.current && callStatusRef.current === 'connected') {
                console.log('🔄 [VoiceCall] WiFi稳定，开始主动ICE重连');
                await peerConnectionRef.current.restartIce();
                
                // 如果是发起方，重新创建offer
                if (!isIncomingRef.current && globalSocket && activeCallId) {
                  const offer = await peerConnectionRef.current.createOffer({
                    iceRestart: true
                  });
                  await peerConnectionRef.current.setLocalDescription(offer);
                  
                  globalSocket.emit('webrtc_offer', {
                    callId: activeCallId,
                    offer: offer,
                    isIceRestart: true
                  });
                  
                  console.log('🔄 [VoiceCall] 网络切换后发送新offer');
                }
              }
            } catch (error) {
              console.error('❌ [VoiceCall] 网络切换后ICE重连失败:', error);
            }
          }, 2000); // 等待2秒WiFi稳定
        }
      }
      
      lastNetworkType = currentNetworkType;
    });
    
    return () => {
      networkUnsubscribe();
    };
  }, [callStatus, activeCallId, globalSocket]);

  // 检查是否是从悬浮窗返回
  useEffect(() => {
    if (route.params?.isReturning) {
      console.log('📱 [VoiceCall] 从悬浮窗返回，重置状态');
      setIsFloating(false);
      setIsEnteringFloatingMode(false);
      isEnteringFloatingModeRef.current = false;
      // 隐藏悬浮窗（如果还在显示）
      hideFloatingCall();
    }

    // 检查是否是从悬浮窗恢复通话
    if (route.params?.resumeFromFloating) {
      console.log('📱 [VoiceCall] 从悬浮窗恢复通话，恢复状态');
      console.log('📱 [VoiceCall] 恢复的状态:', {
        initialCallStatus: route.params?.initialCallStatus,
        initialCallDuration: route.params?.initialCallDuration,
        webrtcConnected: route.params?.webrtcConnected
      });
      
      // 恢复通话状态
      if (route.params?.initialCallStatus) {
        setCallStatus(route.params.initialCallStatus);
        callStatusRef.current = route.params.initialCallStatus;
      }
      
      // 恢复通话时长
      if (route.params?.initialCallDuration) {
        setCallDuration(route.params.initialCallDuration);
        // 如果通话是连接状态，继续计时
        if (route.params?.initialCallStatus === 'connected') {
          startCallTimer();
        }
      }
      
      // 恢复WebRTC连接状态
      if (route.params?.webrtcConnected) {
        setWebrtcConnected(route.params.webrtcConnected);
        webrtcConnectedRef.current = route.params.webrtcConnected;
      }
      
      // 设置为不是新的通话（跳过WebRTC初始化）
      setIsFloating(false);
      setIsEnteringFloatingMode(false);
      isEnteringFloatingModeRef.current = false;
    }
  }, [route.params?.isReturning, route.params?.resumeFromFloating]);
  


  return (
    <SafeAreaView style={[
      styles.container, 
      isFloating && { 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'transparent',
        zIndex: 9999,
        pointerEvents: 'box-none'
      }
    ]}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {!isFloating && callStatus === 'connected' && webrtcConnected && (
        <TouchableOpacity 
          style={styles.minimizeButton} 
          onPress={toggleFloatingMode}
        >
          <Icon 
            name="contract-outline" 
            size={22} 
            color="#fff" 
          />
        </TouchableOpacity>
      )}
      
      <Animated.View 
        {...(isFloating ? panResponder.panHandlers : {})}
        style={[
          styles.callContainer,
          isFloating && {
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: 20,
            backgroundColor: 'rgba(42, 42, 42, 0.95)',
            transform: [
              { scale: floatingAnimation },
              { translateX: pan.x },
              { translateY: pan.y },
            ],
            zIndex: 9999,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }
        ]}
      >
        {isFloating ? renderFloatingWindow() : (
          <>
            {renderAvatar()}
            
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>{renderStatusText()}</Text>
              {callStatus === 'connecting' && (
                <ActivityIndicator size="small" color="#fff" style={styles.loader} />
              )}
              {callStatus === 'connected' && webrtcConnected && (
                <Text style={styles.hintText}>点击右上角按钮可缩小通话界面</Text>
              )}
            </View>
            
            {renderCallControls()}
          </>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  callContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  minimizeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 65 : 35,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  contactName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  statusText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 10,
  },
  hintText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 5,
    textAlign: 'center',
  },
  loader: {
    marginTop: 10,
  },
  outgoingActionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  incomingActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 30,
    marginBottom: 40,
  },
  connectedActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
  },
  callButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 10,
  },
  activeButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.6)',
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 14,
  },
  actionLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  acceptButton: {
    backgroundColor: '#4CD964',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  endButton: {
    backgroundColor: '#FF3B30',
  },
  floatingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  floatingContactName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    textAlign: 'center',
  },
  floatingStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  floatingButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  floatingEndButton: {
    backgroundColor: '#FF3B30',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  floatingExpandButton: {
    backgroundColor: '#34C759',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
});

export default VoiceCallScreen; 