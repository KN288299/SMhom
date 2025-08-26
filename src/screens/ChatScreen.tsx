import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Alert,
  PermissionsAndroid,
  Pressable,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  Dimensions,
  Linking,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { iOSChatStyles, iOSMessageStyles, isIOS, getPlatformStyles, getIOSFontSize, IOS_CHAT_HEADER_HEIGHT, IOS_SAFE_AREA_TOP } from '../styles/iOSStyles';
import NetInfo from '@react-native-community/netinfo';
import { getOptimizedConnectionStatus } from '../utils/iOSNetworkHelper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../config/api';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import VoiceRecorderModal from '../components/VoiceRecorderModal';
import ChatInputArea from '../components/ChatInputArea';
import RNFS from 'react-native-fs';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import Video, { VideoRef } from 'react-native-video';
import { createThumbnail } from 'react-native-create-thumbnail';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import AudioManager from '../utils/AudioManager';
import IncomingCallScreen from '../components/IncomingCallScreen';
import MessageRenderer from '../components/MessageRenderer';
import { useMessages } from '../hooks/useMessages';
import { useCallManager } from '../hooks/useCallManager';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import FullscreenModals from '../components/FullscreenModals';
import MediaPreviewModals from '../components/MediaPreviewModals';
import { useSocket } from '../context/SocketContext';
import LocationPickerModal from '../components/LocationPickerModal';
import LocationViewerModal from '../components/LocationViewerModal';
import MediaUploadService from '../services/MediaUploadService';

// 常量定义
const CONSTANTS = {
  // 媒体尺寸
  MAX_IMAGE_SIZE: 240,
  MIN_IMAGE_SIZE: 120,
  DEFAULT_IMAGE_WIDTH: 200,
  DEFAULT_IMAGE_HEIGHT: 150,
  
  // 时间相关
  CALL_TIMEOUT: 30000,         // 30秒通话超时
  VIDEO_CONTROLS_HIDE_DELAY: 3000,  // 3秒后隐藏视频控件
  VIDEO_CONTROLS_AUTO_HIDE: 5000,   // 5秒后自动隐藏视频控件
  CACHE_MAX_AGE: 30,           // 30秒缓存最大年龄
  SCROLL_DELAY: 100,           // 滚动延迟
  
  // 分页
  MESSAGES_PER_PAGE: 20,       // 每页消息数量
  LOAD_MORE_THRESHOLD: 0.1,    // 加载更多的阈值
  
  // 动画
  FADE_DURATION: 200,          // 淡入动画时长
  PULSE_DURATION: 800,         // 脉冲动画时长
};

// 工具函数
const generateUniqueId = () => {
  // 组合多个随机源生成唯一ID，增强唯一性
  const timestamp = Date.now(); // 精确时间戳
  const timestampStr = timestamp.toString(36);
  const randomStr1 = Math.random().toString(36).substring(2, 10);
  const randomStr2 = Math.random().toString(36).substring(2, 10);
  const processId = Math.floor(Math.random() * 10000).toString(36);
  
  // 格式化为更唯一的ID
  return `msg_${timestampStr}_${randomStr1}_${randomStr2}_${processId}_${timestamp}`;
};

// URL格式化工具函数
const formatMediaUrl = (url: string): string => {
  if (!url) return '';
  // 保留本地/系统资产路径，避免错误地拼接到服务器域名
  if (
    url.startsWith('http') ||
    url.startsWith('file://') ||
    url.startsWith('ph://') ||
    url.startsWith('assets-library://')
  ) {
    return url;
  }
  return `${BASE_URL}${url}`;
};

// 时间格式化工具函数
const formatMessageTime = (timestamp: Date): string => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// 图片尺寸计算工具函数
const calculateImageSize = (width: number, height: number) => {
  const aspectRatio = width / height;
  const { MAX_IMAGE_SIZE, MIN_IMAGE_SIZE } = CONSTANTS;
  
  let newWidth, newHeight;
  
  if (aspectRatio > 1) {
    // 宽图
    newWidth = Math.min(width, MAX_IMAGE_SIZE);
    newHeight = newWidth / aspectRatio;
  } else {
    // 长图
    newHeight = Math.min(height, MAX_IMAGE_SIZE);
    newWidth = newHeight * aspectRatio;
  }
  
  // 确保最小尺寸
  newWidth = Math.max(newWidth, MIN_IMAGE_SIZE);
  newHeight = Math.max(newHeight, MIN_IMAGE_SIZE);
  
  return { width: newWidth, height: newHeight };
};

interface Message {
  _id: string;
  conversationId?: string; // 关键字段：消息所属的对话ID
  senderId: string;
  senderRole?: 'user' | 'customer_service';
  content: string;
  timestamp: Date;
  isRead?: boolean;
  messageType?: 'text' | 'voice' | 'image' | 'video' | 'location';
  contentType?: 'text' | 'voice' | 'image' | 'video' | 'file' | 'location';  // 添加后端使用的contentType字段
  voiceDuration?: string;
  voiceUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  videoDuration?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  videoWidth?: number;
  videoHeight?: number;
  aspectRatio?: number;
  fileUrl?: string;  // 添加通用文件URL字段
  // 仅本地使用：iOS 自发视频的本地路径，用于预览/播放回退
  localFileUri?: string;
  isCallRecord?: boolean;  // 是否是通话记录
  callerId?: string;  // 通话发起者ID
  callDuration?: string;  // 通话时长
  missed?: boolean;  // 是否是未接通话
  rejected?: boolean;  // 是否是拒绝通话
  latitude?: number;  // 纬度
  longitude?: number;  // 经度
  locationName?: string;  // 位置名称
  address?: string;  // 地址
}

interface ChatScreenProps {
  route: {
    params: {
      contactId: string;
      contactName: string;
      conversationId?: string;
    };
  };
}

// ImageMessageItem已移至独立组件文件

// VideoMessageItem已移至独立组件文件

const ChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const { contactId, contactName, conversationId: routeConversationId, contactAvatar: routeContactAvatar } = route.params;
  
  // 上下文和状态
  const { userToken, userInfo, isCustomerService, logout } = useAuth();
  
  // 统一错误处理函数
  const handleError = React.useCallback((error: any, userMessage: string, showAlert: boolean = true) => {
    console.error('ChatScreen错误:', error);
    
    if (showAlert) {
      // 对于网络错误，提供更友好的提示
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network')) {
        Alert.alert('网络错误', '网络连接不稳定，请检查网络后重试');
      } else if (error.response?.status === 401) {
        Alert.alert('登录过期', '登录已过期，请重新登录', [
          {
            text: '重新登录',
            onPress: async () => {
              await logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' as never }],
              });
            },
          }
        ]);
        } else {
        Alert.alert('提示', userMessage);
      }
    }
  }, [logout, navigation]);
  
  // Toast式提示函数（轻量级提示）
  const showToast = React.useCallback((message: string) => {
    if (Platform.OS === 'android') {
      // Android使用ToastAndroid
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      // iOS使用轻量级Alert
      Alert.alert('', message, [], { 
        cancelable: true,
        onDismiss: () => {}
      });
    }
  }, []);
  const [conversationId, setConversationId] = useState<string | undefined>(routeConversationId);
  
  // 使用useMessages Hook
  const {
    messages,
    loading,
    currentPage,
    totalPages,
    loadingMore,
    hasMoreMessages,
    setMessages,
    fetchMessages,
    addMessage,
    updateMessage
  } = useMessages({
    conversationId,
    userToken,
    isCustomerService,
    onError: handleError,
  });
  
  const [messageText, setMessageText] = useState('');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showLocationViewer, setShowLocationViewer] = useState(false);
  const [viewingLocation, setViewingLocation] = useState<{
    latitude: number;
    longitude: number;
    locationName?: string;
    address?: string;
  } | null>(null);
  const [selectedImage, setSelectedImage] = useState<Asset | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  // 🔧 视频发送状态 - 保留用于直接发送逻辑
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [selectedVideoUri, setSelectedVideoUri] = useState<string | null>(null);
  // const [showVideoPreview, setShowVideoPreview] = useState(false); // 已移除，视频直接发送
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState('');
  const [showFullscreenVideo, setShowFullscreenVideo] = useState(false);
  const [fullscreenVideoUrl, setFullscreenVideoUrl] = useState('');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [showVideoControls, setShowVideoControls] = useState(true);
  const [contactAvatar, setContactAvatar] = useState<string | null>(routeContactAvatar || null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [incomingCallInfo, setIncomingCallInfo] = useState<any>(null);
  
  // 分页状态变量现在从useMessages Hook获取
  
  // 添加丢失的状态变量
  const [connecting, setConnecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [callTimeoutRef, setCallTimeoutRef] = useState<NodeJS.Timeout | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  
  // 引用和动画值
  const flatListRef = useRef<FlatList>(null);
  const videoRef = useRef<any>(null);
  const videoControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 使用全局Socket（暂时移除增强功能以避免类型错误）
  const { 
    socket, 
    isConnected, 
    sendMessage: globalSendMessage, 
    joinConversation: globalJoinConversation,
    subscribeToMessages,
    subscribeToIncomingCalls,
    clearUnreadMessages
  } = useSocket();
  
  // 添加滚动位置维持相关状态
  const [scrollOffset, setScrollOffset] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [hasInitialScrolled, setHasInitialScrolled] = useState(false); // 添加首次滚动标记
  
  // 网络状态
  const [isNetworkConnected, setIsNetworkConnected] = useState(true);
  const [showNetworkBanner, setShowNetworkBanner] = useState(false);

  // 使用语音录制Hook
  const voiceRecorderHook = useVoiceRecorder({
    onError: handleError,
    onRecordingComplete: (audioUrl: string, duration: string) => {
      sendVoiceMessage(audioUrl, duration);
    },
  });

  // 为了兼容现有代码，直接解构到原变量名
  const {
    isRecording,
    recordTime,
    showPreview,
    recordingUri,
    isPlaying,
    pulseAnim,
    isVoiceMode,
    hasRecordingPermission,
    startRecording,
    stopRecording,
    cancelRecording,
    playPreview,
    confirmSendVoiceMessage,
    toggleVoiceMode,
  } = voiceRecorderHook;

  // 使用通话管理Hook
  const { initiateCall } = useCallManager({
    userInfo,
    isCustomerService,
    contactName,
    conversationId,
    userToken,
    socketRef: { current: socket }, // 包装成ref格式
    formatMediaUrl,
    generateUniqueId,
    onError: handleError,
    onSetActiveCallId: setActiveCallId,
    onSetCallTimeoutRef: setCallTimeoutRef,
    navigation,
  });
  
  // 使用全局Socket订阅消息
  useEffect(() => {
    // 订阅消息事件
    const unsubscribeMessages = subscribeToMessages((message: Message) => {
      console.log('📨 [ChatScreen] 收到新消息:', {
        content: message.content,
        senderId: message.senderId,
        senderRole: message.senderRole,
        conversationId: message.conversationId,
        currentConversationId: conversationId,
        isCallRecord: message.isCallRecord,
        callerId: message.callerId,
        messageType: message.messageType,
        timestamp: message.timestamp
      });
      
      // 🔥 关键修复：只处理属于当前对话的消息
      const isMessageForCurrentConversation = message.conversationId === conversationId;
      
      // 通话记录需要特殊处理：只要涉及当前用户就显示
      const isCallRecordForCurrentUser = message.isCallRecord && (
        message.callerId === userInfo?._id || 
        message.senderId === userInfo?._id ||
        message.conversationId === conversationId
      );
      
      if (!isMessageForCurrentConversation && !isCallRecordForCurrentUser) {
        console.log('📨 [ChatScreen] 消息不属于当前对话，跳过处理:', {
          messageConversationId: message.conversationId,
          currentConversationId: conversationId,
          isCallRecord: message.isCallRecord
        });
        return;
      }
      
      console.log('✅ [ChatScreen] 消息属于当前对话，处理中');
      
      // 通话记录消息对所有参与者都可见，但显示逻辑不同
      if (message.isCallRecord) {
        console.log('📞 [ChatScreen] 处理通话记录消息:', {
          callerId: message.callerId,
          currentUserId: userInfo?._id,
          rejected: message.rejected,
          missed: message.missed,
          callDuration: message.callDuration
        });
        
        // 通话记录对双方都显示，但根据发送者决定显示位置
        addMessage({ 
          ...message,
          _id: generateUniqueId(), // 使用兼容的ID生成函数
          // 确保通话记录字段正确传递
          isCallRecord: true,
          callerId: message.callerId,
          callDuration: message.callDuration,
          missed: message.missed,
          rejected: message.rejected
        });
      } else {
        // 正常消息，添加到当前对话
        addMessage({ 
          ...message,
          _id: generateUniqueId() // 使用兼容的ID生成函数
        });
      }
    });

      // 注意：来电处理已移至全局App层面，ChatScreen不再单独处理来电显示
  // 但仍需要订阅来电事件以便更新聊天状态
  const unsubscribeIncomingCalls = subscribeToIncomingCalls((callData: any) => {
    // 调试日志已清理 - 收到来电
    // 全局来电处理会自动显示来电界面，这里不需要处理UI
    console.log('ChatScreen收到来电事件，交由全局处理:', callData.callId);
  });

    // 清理订阅
    return () => {
      unsubscribeMessages();
      unsubscribeIncomingCalls();
    };
  }, [userInfo?._id, subscribeToMessages, subscribeToIncomingCalls]);

  // 清除服务器端未读计数
  const clearServerUnreadCount = async (conversationId: string) => {
    try {
      console.log('🧹 [ChatScreen] 清除服务器端未读计数');
      console.log('  会话ID:', conversationId);
      console.log('  用户角色:', isCustomerService() ? '客服' : '用户');
      console.log('  用户ID:', userInfo?._id);
      console.log('  联系人ID:', contactId);
      
      // 调用API清除未读消息
      const response = await axios.put(
        `${BASE_URL}/api/messages/conversation/${conversationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ [ChatScreen] 服务器端未读计数已清除:', response.data);
    } catch (error: any) {
      console.error('❌ [ChatScreen] 清除服务器端未读计数失败:', error.response?.data || error.message);
      console.error('  请求URL:', `${BASE_URL}/api/messages/conversation/${conversationId}/read`);
      console.error('  请求头:', { Authorization: `Bearer ${userToken ? userToken.substring(0, 20) + '...' : 'null'}` });
    }
  };

  // 会话管理
  useEffect(() => {
    if (conversationId && isConnected) {
      // 调试日志已清理 - 加入会话
      globalJoinConversation(conversationId);
      
      // 进入聊天页面时清除全局未读计数
      clearUnreadMessages();
      
      // 通过API清除服务器端的未读计数
      clearServerUnreadCount(conversationId);
    } else if (!conversationId) {
      // 如果没有会话ID，创建一个新会话
      createConversation();
    }
  }, [conversationId, isConnected, globalJoinConversation, clearUnreadMessages]);
  
  // 获取历史消息
  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId]);
  
  // 监听加载更多状态变化，修复上滑加载历史记录时的跳动问题
  useEffect(() => {
    // 当loadingMore从true变为false时，表示加载更多消息完成
    if (!loadingMore && currentPage > 1) {
      // 调试日志已清理 - 加载更多历史消息完成
      // 由于使用了maintainVisibleContentPosition，React Native会自动维持位置
      // 这里只需要确保列表状态稳定
      setTimeout(() => {
        if (flatListRef.current) {
          // 调试日志已清理 - 历史消息加载完成
        }
      }, 100);
    }
  }, [loadingMore, currentPage, messages.length]);
  
  // 创建新会话或获取现有会话
  const createConversation = async () => {
    try {
      // 调试日志已清理 - 尝试获取或创建会话
      
      if (!contactId || !userInfo?._id) {
        console.error('缺少用户ID或联系人ID', { contactId, userId: userInfo?._id });
        return;
      }
      
      // 确定用户ID和客服ID
      let userId, customerServiceId;
      
      if (isCustomerService()) {
        // 如果当前用户是客服，则联系人是普通用户
        customerServiceId = userInfo._id;
        userId = contactId;
      } else {
        // 如果当前用户是普通用户，则联系人是客服
        userId = userInfo._id;
        customerServiceId = contactId;
      }
      
      // 调试日志已清理 - 查找会话参数
      
      try {
        // 1. 先尝试查找现有会话
        const findResponse = await axios.get(
          `${BASE_URL}/api/conversations/find/${userId}/${customerServiceId}`,
          {
            headers: {
              Authorization: `Bearer ${userToken}`
            }
          }
        );
        
        if (findResponse.data && findResponse.data._id) {
          console.log('找到现有会话:', findResponse.data._id);
          setConversationId(findResponse.data._id);
          
          // 加入现有会话
          globalJoinConversation(findResponse.data._id);
          return;
        }
      } catch (findError) {
        console.log('未找到现有会话, 将创建新会话');
      }
      
      // 2. 如果没找到现有会话，创建新会话
      const createResponse = await axios.post(
        `${BASE_URL}/api/conversations`,
        {
          userId,
          customerServiceId
        },
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (createResponse.data && createResponse.data._id) {
        console.log('创建的会话ID:', createResponse.data._id);
        setConversationId(createResponse.data._id);
      
      // 加入新创建的会话
        globalJoinConversation(createResponse.data._id);
      } else {
        console.error('创建会话失败，返回数据无效:', createResponse.data);
      }
      
    } catch (error: any) {
      console.error('获取/创建会话失败:', error.response?.data || error.message);
      
      Alert.alert(
        '连接失败',
        '无法创建或加入聊天会话，请稍后再试。',
        [{ text: '确定' }]
      );
    }
  };
  
  // 加载更多历史消息
  const loadMoreMessages = useCallback(() => {
    if (loadingMore || !hasMoreMessages) return;
    
    // 调试日志已清理 - 加载更多历史消息
    const nextPage = currentPage + 1;
    if (nextPage <= totalPages) {
      // 调试日志已清理 - 开始加载历史消息
      fetchMessages(nextPage);
    }
  }, [loadingMore, hasMoreMessages, currentPage, totalPages, fetchMessages, messages.length]);
  
  // 发送消息 - 增强错误处理和重试机制
  const handleSendMessage = useCallback(() => {
    if (!messageText.trim() || !conversationId) return;
    
    // 检查网络连接
    if (!isNetworkConnected) {
      showToast('网络连接不可用，消息将在网络恢复后发送');
      return;
    }
    
    if (!socket || !socket.connected) {
      // 移除重连提示，避免影响用户体验，静默重连
      // 尝试重新连接
      if (socket && !socket.connected) {
        socket.connect();
      }
      return;
    }
    
    // 创建符合Message接口的消息对象
    const messageData: Message = {
      _id: generateUniqueId(), // 使用兼容的ID生成函数
      content: messageText.trim(),
      senderId: userInfo?._id || '',
      senderRole: isCustomerService() ? 'customer_service' : 'user',
      timestamp: new Date(),
      messageType: 'text',
      isRead: false
    };
    
    // 添加临时消息到UI
    addMessage(messageData);
    
    const messageContent = messageText.trim();
    setMessageText(''); // 清空输入框
    
    // 构建要通过Socket发送的数据
    const socketData = {
      conversationId,
      receiverId: contactId,
      content: messageContent,
      messageType: messageData.messageType
    };
    
    // 发送消息函数（支持重试）
    const sendWithRetry = async (retryCount = 0) => {
      try {
        // 检查Socket连接状态，如果未连接则等待连接
        if (!socket.connected) {
          console.log('Socket未连接，等待连接...');
          socket.connect();
          await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
        }
    
    // 通过全局Socket发送
    globalSendMessage(socketData);
    
    // 同时也通过HTTP API保存消息，确保消息持久化
        const response = await axios.post(
        `${BASE_URL}/api/messages`,
        {
          conversationId,
            content: messageContent,
          contentType: 'text'
        },
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json'
            },
            timeout: 10000 // 10秒超时
          }
        );
        
        // 更新临时消息ID为服务器返回的ID
        if (response.data && response.data._id) {
          updateMessage(messageData._id, { _id: response.data._id });
        }
        
      } catch (error: any) {
        console.error('发送消息失败:', error);
        
        // 重试逻辑
        if (retryCount < 3 && (error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR')) {
          console.log(`消息发送失败，第${retryCount + 1}次重试...`);
          setTimeout(() => sendWithRetry(retryCount + 1), Math.pow(2, retryCount) * 1000);
        } else {
          // 标记消息发送失败
          updateMessage(messageData._id, { 
            content: `${messageContent} (发送失败，点击重试)`,
            isUploading: false 
          });
        }
      }
    };
    
    sendWithRetry();
  }, [messageText, conversationId, socket, isNetworkConnected, contactId, userInfo?._id, isCustomerService, userToken, addMessage, updateMessage, globalSendMessage, showToast]);
  
  // 语音录制相关函数已移至useVoiceRecorder Hook
  
  // 发送语音消息 - 使用增强的上传服务
  const sendVoiceMessage = async (audioUrl: string, duration: string) => {
    if (!conversationId) return;
    
    // 创建临时消息ID和消息对象
    const tempMessageId = generateUniqueId();
         const tempMessage = {
       _id: tempMessageId,
       senderId: userInfo?._id || '',
       senderRole: (isCustomerService() ? 'customer_service' : 'user') as 'user' | 'customer_service',
       content: '语音消息',
       timestamp: new Date(),
       messageType: 'voice' as const,
       voiceDuration: duration,
       voiceUrl: audioUrl,
       isUploading: true,
       uploadProgress: 0
     };
    
    // 立即添加到UI显示上传状态
    addMessage(tempMessage);
    
    try {
             // 1. 首先确保Socket连接
       console.log('🔗 确保Socket连接...');
       // 检查Socket连接状态
       if (!socket || !socket.connected) {
         // 尝试等待连接
         let retries = 0;
         while ((!socket || !socket.connected) && retries < 30) {
           await new Promise(resolve => setTimeout(resolve, 100));
           retries++;
         }
         if (!socket || !socket.connected) {
           throw new Error('Socket连接失败，无法发送消息');
         }
       }
      
      // 2. 使用增强的媒体上传服务
      console.log('📤 开始上传语音文件...');
      const uploadResult = await MediaUploadService.uploadVoice(audioUrl, duration, {
        token: userToken || '',
                 onProgress: (progress: number) => {
           // 更新上传进度
           updateMessage(tempMessageId, { uploadProgress: progress });
         },
         onRetry: (attempt: number, maxAttempts: number) => {
           console.log(`🔄 语音上传第${attempt}/${maxAttempts}次重试...`);
           updateMessage(tempMessageId, { 
             content: `语音消息 (重试${attempt}/${maxAttempts})` 
           });
         },
        maxRetries: 3,
        timeout: 20000
      });
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || '语音上传失败');
      }
      
      console.log('✅ 语音文件上传成功:', uploadResult.url);
      
      // 3. 通过Socket发送消息
      const voiceMessage = {
        conversationId,
        receiverId: contactId,
        content: '语音消息',
        messageType: 'voice',
        voiceDuration: duration,
        voiceUrl: uploadResult.url
      };
      
      console.log('📡 通过Socket发送语音消息...');
      globalSendMessage(voiceMessage);
      
      // 4. 更新临时消息状态
      updateMessage(tempMessageId, {
        voiceUrl: uploadResult.url,
        isUploading: false,
        uploadProgress: 100,
        content: '语音消息'
      });
      
      // 5. 通过API保存消息确保持久化
      try {
        const response = await axios.post(
          `${BASE_URL}/api/messages`,
          {
            conversationId,
            content: '语音消息',
            contentType: 'voice',
            fileUrl: uploadResult.url,
            voiceUrl: uploadResult.url,
            voiceDuration: duration
          },
          {
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );
        
        // 更新临时消息ID为服务器返回的ID
        if (response.data && response.data._id) {
          updateMessage(tempMessageId, { _id: response.data._id });
        }
        
        console.log('💾 语音消息已保存到数据库');
      } catch (apiError) {
        console.error('⚠️ 语音消息API保存失败（Socket已发送）:', apiError);
        // Socket消息已发送，API保存失败不影响用户体验
      }
      
    } catch (error: any) {
      console.error('❌ 发送语音消息失败:', error);
      
      // 更新消息状态为失败
      updateMessage(tempMessageId, {
        isUploading: false,
        content: `语音消息 (发送失败: ${error.message})`,
        voiceUrl: audioUrl // 保留本地文件路径以便重试
      });
      
      // 显示用户友好的错误信息
      const errorMessage = error.message.includes('Socket') 
        ? '网络连接不稳定，请检查网络后重试'
        : error.message.includes('上传')
        ? '语音文件上传失败，请重试'
        : '发送失败，请重试';
        
      Alert.alert('发送失败', errorMessage, [
        { text: '确定', style: 'default' },
        { 
          text: '重试', 
          style: 'default',
          onPress: () => {
            // 移除失败的消息，重新发送
            setMessages(prev => prev.filter(msg => msg._id !== tempMessageId));
            sendVoiceMessage(audioUrl, duration);
          }
        }
      ]);
    }
  };

  // 组件卸载时的全局清理
  useEffect(() => {
    return () => {
      // 清理定时器
      if (videoControlsTimerRef.current) {
        clearTimeout(videoControlsTimerRef.current);
        videoControlsTimerRef.current = null;
      }
      if (callTimeoutRef) {
        clearTimeout(callTimeoutRef);
        setCallTimeoutRef(null);
      }
    };
  }, []);
  
  // 位置查看处理函数
  const handleViewLocation = useCallback((location: {
    latitude: number;
    longitude: number;
    locationName?: string;
    address?: string;
  }) => {
    console.log('📍 [ChatScreen] 查看位置:', location);
    setViewingLocation(location);
    setShowLocationViewer(true);
  }, []);

  // 渲染消息项 - 使用useCallback优化性能
  const renderMessageItem = useCallback(({ item }: { item: Message }) => {
      return (
      <MessageRenderer
        item={item}
        userInfo={userInfo}
        onOpenFullscreenImage={(imageUrl: string) => openFullscreenImage(imageUrl)}
        onOpenFullscreenVideo={(videoUrl: string) => openFullscreenVideo(videoUrl)}
        onViewLocation={handleViewLocation}
        formatMediaUrl={formatMediaUrl}
        contactAvatar={contactAvatar}
      />
    );
  }, [userInfo, formatMediaUrl, handleViewLocation, contactAvatar]);

  // 优化keyExtractor - 使用稳定的消息ID，避免因index变化导致整列表重挂载
  const keyExtractor = useCallback((item: Message) => {
    // 所有消息均保证有稳定的 _id（本地临时消息也会生成），直接返回
    return item._id;
  }, []);

  // 优化getItemLayout（简化版）
  const getItemLayout = useCallback((data: any, index: number) => {
    const ESTIMATED_ITEM_HEIGHT = 80; // 估算消息高度
    return {
      length: ESTIMATED_ITEM_HEIGHT,
      offset: ESTIMATED_ITEM_HEIGHT * index,
      index,
    };
  }, []);
  
  // 滚动到底部
  const scrollToBottom = () => {
    // 对于inverted列表，滚动到顶部就是最新消息
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  };
  
  // 无需滚动，inverted列表会自动显示最新消息
  useEffect(() => {
    // 只设置初始化标记，不进行任何滚动操作
    if (messages.length > 0 && !loading && !hasInitialScrolled) {
      setHasInitialScrolled(true);
    }
  }, [messages.length, loading, hasInitialScrolled]);
  
  // 🔧 网络切换修复：增强网络状态监听，支持网络切换检测
  useEffect(() => {
    let lastConnectedState = isNetworkConnected;
    let lastNetworkType: string | null = null;
    
    const unsubscribe = NetInfo.addEventListener(state => {
      // 使用简化的网络连接检测
      const connected = Platform.OS === 'ios' 
        ? getOptimizedConnectionStatus(state)
        : Boolean(state.isConnected && state.isInternetReachable !== false);
      
      const currentNetworkType = state.type || 'unknown';
      
      // 🔧 网络切换修复：检测网络类型变化
      const isNetworkTypeChanged = lastNetworkType !== null && 
                                  lastNetworkType !== currentNetworkType &&
                                  lastConnectedState === true && 
                                  connected === true;
      
      // 🔧 网络切换修复：特别处理蜂窝数据到WiFi的切换
      const isCellularToWifi = lastNetworkType === 'cellular' && currentNetworkType === 'wifi';
      
      // 减少状态更新频率
      if (connected !== lastConnectedState) {
        setIsNetworkConnected(connected);
        
        if (!connected) {
          setShowNetworkBanner(true);
          showToast('网络连接已断开');
        } else if (lastConnectedState === false) {
          setShowNetworkBanner(false);
          // 移除网络恢复提示，避免影响用户体验
        }
        
        lastConnectedState = connected;
      }
      
      // 🔧 网络切换修复：处理网络切换事件
      if (isNetworkTypeChanged) {
        console.log(`🔄 [ChatScreen] 检测到网络切换: ${lastNetworkType} → ${currentNetworkType}`);
        
        if (isCellularToWifi) {
          console.log('📶 [ChatScreen] 蜂窝数据切换到WiFi，等待连接稳定后重连Socket');
          
          // 导入网络工具函数
          const { waitForWifiStability, forceSocketReconnectAfterNetworkSwitch } = require('../utils/iOSNetworkHelper');
          // 等待WiFi稳定后强制重连Socket
          waitForWifiStability(3000, 500).then((isStable: boolean) => {
            if (isStable) {
              // 获取全局Socket引用并强制重连
              const socketRef = (global as any).socketRef;
              if (socketRef) {
                console.log('🔄 [ChatScreen] WiFi稳定，强制Socket重连');
                forceSocketReconnectAfterNetworkSwitch(socketRef, 500);
              }
            } else {
              console.warn('⚠️ [ChatScreen] WiFi连接不稳定，跳过强制重连');
            }
          });
        } else {
          // 其他网络切换场景的快速重连
          console.log('🔄 [ChatScreen] 其他网络切换，立即尝试Socket重连');
          const socketRef = (global as any).socketRef;
          if (socketRef) {
            const { forceSocketReconnectAfterNetworkSwitch } = require('../utils/iOSNetworkHelper');
            forceSocketReconnectAfterNetworkSwitch(socketRef, 200);
          }
        }
      }
      
      // 更新网络类型追踪
      lastNetworkType = currentNetworkType;
    });

    return () => unsubscribe();
  }, [showToast]);

  // 监听Socket连接状态 - 轻量级版本
  useEffect(() => {
    if (socket) {
      let wasDisconnected = false;
      
      const handleConnect = () => {
        setConnecting(false);
        if (wasDisconnected) {
          // 移除重连成功提示，避免影响用户体验
          wasDisconnected = false;
        }
      };
      
      const handleDisconnect = (reason: string) => {
        setConnecting(true);
        wasDisconnected = true;
        // 减少断开提示
      };
      
      const handleConnectError = (error: any) => {
        setConnecting(false);
        wasDisconnected = true;
        // 减少错误提示
      };

      // 初始连接状态
      setConnecting(!socket.connected);
      if (!socket.connected) {
        wasDisconnected = true;
      }

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleConnectError);

      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleConnectError);
      };
    }
  }, [socket, showToast]);
  
  // 当conversationId变化时重置首次滚动标记
  useEffect(() => {
    // 调试日志已清理 - conversationId变化，重置首次滚动标记
    setHasInitialScrolled(false);
  }, [conversationId]);
  

  
  // 切换更多选项面板
  const toggleMoreOptions = () => {
    // 无论输入框是否有文字，都可以切换多功能面板
    setShowMoreOptions(prevState => !prevState);
    
    // 如果正在打开面板，关闭键盘
    if (!showMoreOptions) {
      Keyboard.dismiss();
    }
  };
  
  // 处理拍照功能
  const handleTakePhoto = async () => {
    setShowMoreOptions(false);
    
    try {
      // 先检查相机权限
      let cameraPermission;
      if (Platform.OS === 'android') {
        // 增强防御性编程：检查PERMISSIONS模块是否正确加载
        try {
          if (!PERMISSIONS || !PERMISSIONS.ANDROID || !PERMISSIONS.ANDROID.CAMERA) {
            console.warn('⚠️ [ChatScreen] PERMISSIONS.ANDROID未加载，使用默认权限字符串');
            cameraPermission = await check('android.permission.CAMERA' as any);
          } else {
            cameraPermission = await check(PERMISSIONS.ANDROID.CAMERA);
          }
        } catch (permError) {
          console.warn('⚠️ [ChatScreen] 权限检查异常，使用默认权限:', permError);
          cameraPermission = await check('android.permission.CAMERA' as any);
        }
      } else {
        cameraPermission = await check(PERMISSIONS.IOS.CAMERA);
      }
      
      // 如果没有权限，请求权限
      if (cameraPermission !== RESULTS.GRANTED) {
        let requestResult;
        if (Platform.OS === 'android') {
          // 增强防御性编程：检查PERMISSIONS模块是否正确加载
          try {
            if (!PERMISSIONS || !PERMISSIONS.ANDROID || !PERMISSIONS.ANDROID.CAMERA) {
              console.warn('⚠️ [ChatScreen] PERMISSIONS.ANDROID未加载，使用默认权限字符串');
              requestResult = await request('android.permission.CAMERA' as any);
            } else {
              requestResult = await request(PERMISSIONS.ANDROID.CAMERA);
            }
          } catch (permError) {
            console.warn('⚠️ [ChatScreen] 权限请求异常，使用默认权限:', permError);
            requestResult = await request('android.permission.CAMERA' as any);
          }
        } else {
          requestResult = await request(PERMISSIONS.IOS.CAMERA);
        }
        
        if (requestResult !== RESULTS.GRANTED) {
          Alert.alert(
            '需要相机权限',
            '请在设置中允许应用访问相机',
            [
              { text: '取消', style: 'cancel' },
              { text: '去设置', onPress: () => Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings() }
            ]
          );
          return;
        }
      }
      
      // 权限已获取，启动相机
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: true,
        includeBase64: false,
        maxWidth: 1280,
        maxHeight: 1280,
        cameraType: 'back',
        presentationStyle: 'fullScreen',
        includeExtra: true,
      });
      
      if (result.didCancel) {
        console.log('用户取消了拍照');
        return;
      }
      
      if (result.errorCode) {
        console.error('拍照错误:', result.errorMessage);
        Alert.alert('错误', `拍照失败: ${result.errorMessage}`);
        return;
      }
      
      if (result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setSelectedImage(selectedAsset);
        if (selectedAsset.uri) {
          setSelectedImageUri(selectedAsset.uri);
        }
        setShowImagePreview(true);
      }
    } catch (error: any) {
      console.error('拍照异常:', error);
      Alert.alert('错误', `拍照时发生错误: ${error.message || '未知错误'}`);
    }
  };
  
  // 处理发送图片功能
  const handleSendImage = async () => {
    setShowMoreOptions(false);
    
    try {
      // 先检查存储权限
      let storagePermission;
      if (Platform.OS === 'android') {
        // 增强防御性编程：检查PERMISSIONS模块是否正确加载
        try {
          if (!PERMISSIONS || !PERMISSIONS.ANDROID || !PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE) {
            console.warn('⚠️ [ChatScreen] PERMISSIONS.ANDROID未加载，使用默认权限字符串');
            storagePermission = await check('android.permission.READ_EXTERNAL_STORAGE' as any);
          } else {
            storagePermission = await check(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
          }
        } catch (permError) {
          console.warn('⚠️ [ChatScreen] 权限检查异常，使用默认权限:', permError);
          storagePermission = await check('android.permission.READ_EXTERNAL_STORAGE' as any);
        }
      } else {
        storagePermission = await check(PERMISSIONS.IOS.PHOTO_LIBRARY);
      }
      
      // 如果没有权限，请求权限
      if (storagePermission !== RESULTS.GRANTED) {
        let requestResult;
        if (Platform.OS === 'android') {
          // 增强防御性编程：检查PERMISSIONS模块是否正确加载
          try {
            if (!PERMISSIONS || !PERMISSIONS.ANDROID || !PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE) {
              console.warn('⚠️ [ChatScreen] PERMISSIONS.ANDROID未加载，使用默认权限字符串');
              requestResult = await request('android.permission.READ_EXTERNAL_STORAGE' as any);
            } else {
              requestResult = await request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
            }
          } catch (permError) {
            console.warn('⚠️ [ChatScreen] 权限请求异常，使用默认权限:', permError);
            requestResult = await request('android.permission.READ_EXTERNAL_STORAGE' as any);
          }
        } else {
          requestResult = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
        }
        
        if (requestResult !== RESULTS.GRANTED) {
          Alert.alert(
            '需要存储权限',
            '请在设置中允许应用访问照片',
            [
              { text: '取消', style: 'cancel' },
              { text: '去设置', onPress: () => Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings() }
            ]
          );
          return;
        }
      }
      
      const result = await launchImageLibrary({
        mediaType: 'mixed', // 修改为mixed，允许选择图片和视频
        quality: 0.8,
        selectionLimit: 1,
        includeBase64: false,
        maxWidth: 1280,
        maxHeight: 1280,
      });
      
      if (result.didCancel) {
        console.log('用户取消了选择媒体');
        return;
      }
      
      if (result.errorCode) {
        console.error('选择媒体错误:', result.errorMessage);
        Alert.alert('错误', `选择媒体失败: ${result.errorMessage}`);
        return;
      }
      
      if (result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        // 检查是视频还是图片
        if (selectedAsset.type && selectedAsset.type.startsWith('video/')) {
          // 检查视频大小限制
          if (selectedAsset.fileSize && selectedAsset.fileSize > 500 * 1024 * 1024) { // 500MB
            Alert.alert('文件过大', '视频文件大小不能超过500MB');
            return;
          }
          
          // 🔧 修改：直接发送视频，不显示预览弹窗
          setSelectedVideo(selectedAsset);
          if (selectedAsset.uri) {
            setSelectedVideoUri(selectedAsset.uri);
          }
          // 直接调用确认发送视频函数
          handleDirectSendVideo(selectedAsset);
        } else {
          // 检查图片大小限制
          if (selectedAsset.fileSize && selectedAsset.fileSize > 50 * 1024 * 1024) { // 50MB
            Alert.alert('文件过大', '图片文件大小不能超过50MB');
            return;
          }
          
          // 处理图片
          setSelectedImage(selectedAsset);
          if (selectedAsset.uri) {
            setSelectedImageUri(selectedAsset.uri);
          }
          setShowImagePreview(true);
        }
      }
    } catch (error: any) {
      console.error('选择媒体异常:', error);
      Alert.alert('错误', `选择媒体时发生错误: ${error.message || '未知错误'}`);
    }
  };
  
  // 取消发送图片
  const cancelSendImage = () => {
    setSelectedImage(null);
    setShowImagePreview(false);
  };
  
  // 🔧 第一次媒体发送失败修复：确认发送图片
  const confirmSendImage = async () => {
    if (!selectedImage || !selectedImage.uri || !conversationId) {
      cancelSendImage();
      return;
    }
    
    // 创建临时消息ID用于本地显示和后续更新
    const tempMessageId = generateUniqueId();
    
    // 立即创建临时消息，提供即时UI反馈
    const tempMessage: Message = {
      _id: tempMessageId,
      senderId: userInfo?._id || '',
      senderRole: isCustomerService() ? 'customer_service' : 'user',
      content: '图片消息',
      timestamp: new Date(),
      messageType: 'image',
      imageUrl: selectedImage.uri, // 先使用本地路径
      isUploading: true,
      uploadProgress: 0
    };
    
    addMessage(tempMessage);
    cancelSendImage(); // 立即关闭预览界面
    
    try {
      // 🔧 首次发送修复：确保Socket连接已建立
      console.log('📱 [图片发送] 检查Socket连接状态...');
      if (!isConnected) {
        console.log('⚠️ [图片发送] Socket未连接，等待连接建立...');
        
        // 尝试触发连接
        if (socket && socket.disconnected) {
          socket.connect();
        }
        
        // 等待最多5秒钟连接建立
        let waitTime = 0;
        const maxWaitTime = 5000;
        const checkInterval = 100;
        
        while (!isConnected && waitTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waitTime += checkInterval;
        }
        
        if (!isConnected) {
          throw new Error('网络连接未建立，请检查网络后重试');
        }
      }
      
      console.log('✅ [图片发送] Socket连接已建立，开始上传...');
      
      // 🔧 使用MediaUploadService进行可靠上传
      const MediaUploadService = require('../services/MediaUploadService').default;
      
      const uploadResult = await MediaUploadService.uploadImage(
        selectedImage.uri,
        {
          token: userToken,
          onProgress: (progress: number) => {
            // 更新上传进度
            updateMessage(tempMessageId, { 
              uploadProgress: progress,
              isUploading: true 
            });
          },
          maxRetries: 5, // 增加重试次数
          timeout: 40000, // 40秒超时
          retryDelay: 2000
        }
      );
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || '图片上传失败');
      }
      
      console.log('✅ [图片发送] 图片上传成功:', uploadResult.url);
      
      // 获取上传后的图片URL
      const imageUrl = uploadResult.url;
      const fullImageUrl = imageUrl?.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`;
      
      // 🔧 确保Socket连接后再发送消息
      const imageMessage = {
        conversationId,
        receiverId: contactId,
        content: '图片消息',
        messageType: 'image',
        imageUrl: imageUrl
      };
      
      // 再次确认Socket连接状态
      if (isConnected && globalSendMessage) {
        globalSendMessage(imageMessage);
        console.log('📡 [图片发送] 已通过Socket发送图片消息');
      } else {
        console.warn('⚠️ [图片发送] Socket连接异常，仅通过API保存');
      }
      
      // 更新临时消息为最终状态
      updateMessage(tempMessageId, {
        imageUrl: fullImageUrl,
        isUploading: false,
        uploadProgress: 100
      });
      
      // 🔧 通过API保存消息以确保持久化（带重试机制）
      const saveMessageWithRetry = async (retryCount = 0) => {
        try {
          const response = await axios.post(
            `${BASE_URL}/api/messages`,
            {
              conversationId,
              content: '图片消息',
              contentType: 'image',
              fileUrl: imageUrl,
              imageUrl: imageUrl
            },
            {
              headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          );
          
          // 更新临时消息ID为服务器返回的ID
          if (response.data && response.data._id) {
            updateMessage(tempMessageId, { _id: response.data._id });
          }
          
          console.log('✅ [图片发送] 消息已保存到数据库');
        } catch (error: any) {
          console.error('❌ [图片发送] API保存失败:', error);
          
          // 重试逻辑
          if (retryCount < 3 && (error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR')) {
            console.log(`🔄 [图片发送] API保存重试 ${retryCount + 1}/3`);
            setTimeout(() => saveMessageWithRetry(retryCount + 1), Math.pow(2, retryCount) * 1000);
          } else {
            // 标记为发送失败但保留本地消息
            updateMessage(tempMessageId, { 
              content: '图片消息 (发送失败，点击重试)',
              isUploading: false 
            });
          }
        }
      };
      
      saveMessageWithRetry();
      
    } catch (error: any) {
      console.error('❌ [图片发送] 发送失败:', error);
      
      // 更新临时消息为失败状态
      updateMessage(tempMessageId, { 
        content: `图片消息 (发送失败: ${error.message})`,
        isUploading: false,
        uploadProgress: 0
      });
      
      // 显示友好的错误提示
      if (error.message.includes('网络连接未建立')) {
        showToast('网络连接异常，请检查网络后重试');
      } else if (error.message.includes('上传失败')) {
        showToast('图片上传失败，请重试');
      } else {
        showToast(`发送失败: ${error.message}`);
      }
    }
  };
  
  // 🔧 取消发送视频 - 已废弃，视频现在直接发送
  /*
  const cancelSendVideo = () => {
    setSelectedVideo(null);
    setShowVideoPreview(false);
  };
  */
  
  // 🔧 新增：直接发送视频，无需预览
  const handleDirectSendVideo = async (videoAsset: any) => {
    if (!videoAsset || !videoAsset.uri) {
      Alert.alert('错误', '视频文件无效');
      return;
    }

    // 设置视频状态
    setSelectedVideo(videoAsset);
    setSelectedVideoUri(videoAsset.uri);

    // 创建临时消息ID
    const tempMessageId = `temp_video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 计算视频时长
    let videoDuration = '未知';
    if (videoAsset.duration) {
      const durationInSec = videoAsset.duration;
      const minutes = Math.floor(durationInSec / 60);
      const seconds = Math.floor(durationInSec % 60);
      videoDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // 创建临时消息对象
    const newMessage: any = {
      _id: tempMessageId,
      conversationId,
      senderId: userInfo?._id,
      senderRole: isCustomerService ? 'customer_service' : 'user',
      content: '视频消息',
      messageType: 'video',
      videoUrl: videoAsset.uri,
      videoDuration: videoDuration,
      localFileUri: videoAsset.uri,
      timestamp: new Date().toISOString(),
      isUploading: true,
      uploadProgress: 0
    };
    
    // 添加到消息列表
    addMessage(newMessage);

    try {
      // 检查Socket连接状态
      console.log('📱 [直接视频发送] 检查Socket连接状态...');
      if (!isConnected) {
        console.log('⚠️ [直接视频发送] Socket未连接，等待连接建立...');
        
        if (socket && socket.disconnected) {
          socket.connect();
        }
        
        let waitTime = 0;
        const maxWaitTime = 5000;
        const checkInterval = 100;
        
        while (!isConnected && waitTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waitTime += checkInterval;
        }
        
        if (!isConnected) {
          throw new Error('网络连接未建立，请检查网络后重试');
        }
      }
      
      console.log('✅ [直接视频发送] Socket连接已建立，开始上传...');
      
      // 使用MediaUploadService进行上传
      const MediaUploadService = require('../services/MediaUploadService').default;
      
      const uploadResult = await MediaUploadService.uploadVideo(
        videoAsset.uri,
        {
          token: userToken,
          onProgress: (progress: number) => {
            updateMessage(tempMessageId, { 
              uploadProgress: progress,
              isUploading: true 
            });
          },
          maxRetries: 5,
          timeout: 600000,
          retryDelay: 5000
        }
      );
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || '视频上传失败');
      }
      
      console.log('✅ [直接视频发送] 视频上传成功:', uploadResult.url);
      
      const videoUrl = uploadResult.url;
      const fullVideoUrl = videoUrl?.startsWith('http') ? videoUrl : `${BASE_URL}${videoUrl}`;
      
      // 发送消息
      const videoMessage = {
        conversationId,
        receiverId: contactId,
        content: '视频消息',
        messageType: 'video',
        videoUrl: videoUrl,
        videoDuration: videoDuration
      };
      
      if (isConnected && globalSendMessage) {
        globalSendMessage(videoMessage);
        console.log('📡 [直接视频发送] 已通过Socket发送视频消息');
      } else {
        console.warn('⚠️ [直接视频发送] Socket连接异常，仅通过API保存');
      }
      
      // 更新消息为最终状态
      updateMessage(tempMessageId, {
        videoUrl: fullVideoUrl,
        videoDuration: videoDuration,
        isUploading: false,
        uploadProgress: 100
      });
      
      // API保存消息
      try {
        const response = await axios.post(`${BASE_URL}/api/messages`, {
          conversationId,
          content: '视频消息',
          contentType: 'video',
          messageType: 'video',
          videoUrl: videoUrl,
          videoDuration: videoDuration
        }, {
          headers: { Authorization: `Bearer ${userToken}` },
          timeout: 30000
        });
        
        console.log('✅ [直接视频发送] 消息API保存成功');
      } catch (apiError: any) {
        console.error('❌ [直接视频发送] API保存失败:', apiError);
      }
      
      // 清理状态
      setSelectedVideo(null);
      setSelectedVideoUri(null);
      
    } catch (error: any) {
      console.error('❌ [直接视频发送] 发送失败:', error);
      
      // 更新消息状态为失败
      updateMessage(tempMessageId, {
        isUploading: false,
        uploadProgress: 0
      });
      
      Alert.alert('发送失败', error.message || '视频发送失败，请重试');
      
      // 清理状态
      setSelectedVideo(null);
      setSelectedVideoUri(null);
    }
  };

  // 🔧 第一次媒体发送失败修复：确认发送视频
  const confirmSendVideo = async () => {
    if (!selectedVideo || !selectedVideoUri) {
      // setShowVideoPreview(false); // 已移除预览功能
      return;
    }
      
    // 立即关闭预览界面，避免用户等待上传
    // setShowVideoPreview(false); // 已移除预览功能
    
    // 创建临时ID用于本地显示和后续更新
    const tempMessageId = generateUniqueId();

    // 创建新消息对象
    const newMessage: Message = {
      _id: tempMessageId,
      senderId: userInfo?._id || '',
      senderRole: isCustomerService() ? 'customer_service' : 'user',
      content: '视频消息',
      timestamp: new Date(),
      messageType: 'video',
      videoUrl: selectedVideoUri,
      localFileUri: Platform.OS === 'ios' ? selectedVideoUri : undefined,
      isUploading: true,
      uploadProgress: 0
    };
    
    addMessage(newMessage);
    
    try {
      // 🔧 首次发送修复：确保Socket连接已建立
      console.log('📱 [视频发送] 检查Socket连接状态...');
      if (!isConnected) {
        console.log('⚠️ [视频发送] Socket未连接，等待连接建立...');
        
        // 尝试触发连接
        if (socket && socket.disconnected) {
          socket.connect();
        }
        
        // 等待最多5秒钟连接建立
        let waitTime = 0;
        const maxWaitTime = 5000;
        const checkInterval = 100;
        
        while (!isConnected && waitTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waitTime += checkInterval;
        }
        
        if (!isConnected) {
          throw new Error('网络连接未建立，请检查网络后重试');
        }
      }
      
      console.log('✅ [视频发送] Socket连接已建立，开始上传...');
      
      // 计算视频时长（如果可用）
      let videoDuration = '未知';
      if (selectedVideo.duration) {
        const durationInSec = selectedVideo.duration;
        const minutes = Math.floor(durationInSec / 60);
        const seconds = Math.floor(durationInSec % 60);
        videoDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      
      console.log('📹 [视频发送] 视频信息:', {
        uri: selectedVideoUri,
        duration: videoDuration,
        width: selectedVideo.width || 0,
        height: selectedVideo.height || 0,
        fileSize: selectedVideo.fileSize
      });
      
      // 🔧 使用MediaUploadService进行可靠上传
      const MediaUploadService = require('../services/MediaUploadService').default;
      
      const uploadResult = await MediaUploadService.uploadVideo(
        selectedVideoUri,
        {
          token: userToken,
          onProgress: (progress: number) => {
            // 更新上传进度
            updateMessage(tempMessageId, { 
              uploadProgress: progress,
              isUploading: true 
            });
          },
          maxRetries: 5,
          timeout: 600000, // 10分钟超时，支持大视频文件
          retryDelay: 5000
        }
      );
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || '视频上传失败');
      }
      
      console.log('✅ [视频发送] 视频上传成功:', uploadResult.url);
      
      // 获取上传后的视频URL
      const videoUrl = uploadResult.url;
      const fullVideoUrl = videoUrl?.startsWith('http') ? videoUrl : `${BASE_URL}${videoUrl}`;
      
      // 🔧 确保Socket连接后再发送消息
      const videoMessage = {
        conversationId,
        receiverId: contactId,
        content: '视频消息',
        messageType: 'video',
        videoUrl: videoUrl,
        videoDuration: videoDuration
      };
      
      // 再次确认Socket连接状态
      if (isConnected && globalSendMessage) {
        globalSendMessage(videoMessage);
        console.log('📡 [视频发送] 已通过Socket发送视频消息');
      } else {
        console.warn('⚠️ [视频发送] Socket连接异常，仅通过API保存');
      }
      
      // 更新临时消息为最终状态
      updateMessage(tempMessageId, {
        videoUrl: fullVideoUrl,
        videoDuration: videoDuration,
        isUploading: false,
        uploadProgress: 100
      });
      
      // 🔧 通过API保存消息以确保持久化（带重试机制）
      const saveVideoMessageWithRetry = async (retryCount = 0) => {
        try {
          const response = await axios.post(
            `${BASE_URL}/api/messages`,
            {
              conversationId,
              content: '视频消息',
              contentType: 'video',
              fileUrl: videoUrl,
              videoUrl: videoUrl,
              videoDuration: videoDuration
            },
            {
              headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          );
          
          // 更新临时消息ID为服务器返回的ID
          if (response.data && response.data._id) {
            updateMessage(tempMessageId, { _id: response.data._id });
          }
          
          console.log('✅ [视频发送] 消息已保存到数据库');
        } catch (error: any) {
          console.error('❌ [视频发送] API保存失败:', error);
          
          // 重试逻辑
          if (retryCount < 3 && (error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR')) {
            console.log(`🔄 [视频发送] API保存重试 ${retryCount + 1}/3`);
            setTimeout(() => saveVideoMessageWithRetry(retryCount + 1), Math.pow(2, retryCount) * 1000);
          } else {
            // 标记为发送失败但保留本地消息
            updateMessage(tempMessageId, { 
              content: '视频消息 (发送失败，点击重试)',
              isUploading: false 
            });
          }
        }
      };
      
      saveVideoMessageWithRetry();
      
      // 清理状态
      setSelectedVideo(null);
      setSelectedVideoUri(null);
      
    } catch (error: any) {
      console.error('❌ [视频发送] 发送失败:', error);
      
      // 更新临时消息为失败状态
      updateMessage(tempMessageId, { 
        content: `视频消息 (发送失败: ${error.message})`,
        isUploading: false,
        uploadProgress: 0
      });
      
      // 显示友好的错误提示
      if (error.message.includes('网络连接未建立')) {
        showToast('网络连接异常，请检查网络后重试');
      } else if (error.message.includes('上传失败')) {
        showToast('视频上传失败，请重试');
      } else {
        showToast(`发送失败: ${error.message}`);
      }
      
      // 清理状态
      setSelectedVideo(null);
      setSelectedVideoUri(null);
    }
  };

  // 来电处理已移至全局App层面，ChatScreen不再处理来电UI
  // 保留这些函数以维持代码兼容性，但实际不会被调用
  const handleIncomingCall = (callData: any) => {
    console.log('ChatScreen来电处理(已废弃):', callData);
    // 全局处理，这里不再设置本地状态
  };

  const handleAcceptCall = () => {
    console.log('ChatScreen接受来电(已废弃)');
    // 全局处理，这里不再处理
  };

  const handleRejectCall = () => {
    console.log('ChatScreen拒绝来电(已废弃)');
    // 全局处理，这里不再处理
  };
  
  // ChatScreen中的通话事件监听已移至全局处理
  // 只保留必要的拨打者状态管理
  useEffect(() => {
    console.log('设置通话相关事件监听器');
    
    if (socket) {
      // 先清除旧的监听器，避免重复监听
      socket.off('call_rejected');
      socket.off('call_accepted');
      socket.off('call_ended');
      socket.off('call_cancelled');
      
      // 监听通话被拒绝事件
      socket.on('call_rejected', (data: any) => {
        const { callId } = data;
        console.log(`通话被拒绝: ${callId}`);
        
        // 停止回铃音
        AudioManager.stopRingback();
        
        // 清除超时
        if (callTimeoutRef) {
          clearTimeout(callTimeoutRef);
          setCallTimeoutRef(null);
        }
        
        // 清除当前通话ID
        if (activeCallId === callId) {
          setActiveCallId(null);
        }
        
        // 不再显示弹窗提示，通话记录气泡会显示"对方已拒绝"
        console.log('通话被拒绝，气泡会显示"对方已拒绝"');
      });
      
      // 监听通话已接听事件
      socket.on('call_accepted', (data: any) => {
        const { callId } = data;
        console.log(`通话已接听: ${callId}`);
        
        // 停止回铃音
        AudioManager.stopRingback();
        
        // 清除超时
        if (callTimeoutRef) {
          clearTimeout(callTimeoutRef);
          setCallTimeoutRef(null);
        }
      });
      
      // 监听通话结束事件
      socket.on('call_ended', (data: any) => {
        const { callId } = data;
        console.log(`通话已结束: ${callId}`);
        
        // 停止回铃音
        AudioManager.stopRingback();
        
        // 清除超时
        if (callTimeoutRef) {
          clearTimeout(callTimeoutRef);
          setCallTimeoutRef(null);
        }
        
        // 清除当前通话ID
        if (activeCallId === callId) {
          setActiveCallId(null);
        }
      });
      
      // 监听通话被取消事件（拨打者在对方接听前挂断）
      socket.on('call_cancelled', (data: any) => {
        const { callId } = data;
        console.log(`来电已被取消: ${callId}`);
        
        // 停止回铃音
        AudioManager.stopRingback();
        
        // 清除当前通话ID
        if (activeCallId === callId) {
          setActiveCallId(null);
        }
        
        // 来电界面处理已移至全局，这里只处理拨打者状态
        console.log('来电取消事件，全局来电管理器会处理界面关闭');
      });
    }

    return () => {
      console.log('清除通话事件监听器');
      if (socket) {
        socket.off('call_rejected');
        socket.off('call_accepted');
        socket.off('call_ended');
        socket.off('call_cancelled');
      }
      
      // 清除超时
      if (callTimeoutRef) {
        clearTimeout(callTimeoutRef);
      }
      
      // 停止所有音频
      AudioManager.stopAll();
    };
  }, [socket, activeCallId, callTimeoutRef]);
  
  // 移除connecting加载界面，实现无感进入
  // if (connecting) {
  //   return (
  //     <View style={styles.loadingContainer}>
  //       <ActivityIndicator size="large" color="#ff6b81" />
  //       <Text style={styles.loadingText}>连接中...</Text>
  //     </View>
  //   );
  // }
  
  // 更新语音通话相关功能
  const handleVoiceCallButton = () => {
    setShowMoreOptions(false);
    if (contactId) {
      initiateCall(contactId);
    } else {
      Alert.alert('错误', '无法识别联系人ID');
    }
  };
  
  // 打开全屏图片查看器
  const openFullscreenImage = (imageUrl: string) => {
    setFullscreenImageUrl(imageUrl);
    setShowFullscreenImage(true);
  };
  
  // 关闭全屏图片查看器
  const closeFullscreenImage = () => {
    setShowFullscreenImage(false);
  };
  
  // 打开全屏视频播放器
  const openFullscreenVideo = (videoUrl: string) => {
    console.log('打开全屏视频播放器，URL:', videoUrl);
    setFullscreenVideoUrl(videoUrl);
    setShowFullscreenVideo(true);
    setIsVideoPlaying(true); // 修改为true，实现自动播放
    setVideoProgress(0);
    setVideoDuration(0);
    setVideoCurrentTime(0);
    setShowVideoControls(true);
    
    // 3秒后自动隐藏控制器
    if (videoControlsTimerRef.current) {
      clearTimeout(videoControlsTimerRef.current);
    }
    videoControlsTimerRef.current = setTimeout(() => {
      setShowVideoControls(false);
    }, 3000);
  };

  // 关闭全屏视频播放器
  const closeFullscreenVideo = () => {
    setShowFullscreenVideo(false);
    setIsVideoPlaying(false);
    setVideoProgress(0);
    setVideoDuration(0);
    setVideoCurrentTime(0);
    setShowVideoControls(true);
    
    // 清除控制器自动隐藏定时器
    if (videoControlsTimerRef.current) {
      clearTimeout(videoControlsTimerRef.current);
      videoControlsTimerRef.current = null;
    }
  };

  // 切换视频播放/暂停
  const toggleVideoPlayPause = () => {
    setIsVideoPlaying(!isVideoPlaying);
  };

  // 切换视频控制器显示/隐藏
  const toggleVideoControls = () => {
    const newShowControls = !showVideoControls;
    setShowVideoControls(newShowControls);
    
    // 清除现有定时器
    if (videoControlsTimerRef.current) {
      clearTimeout(videoControlsTimerRef.current);
      videoControlsTimerRef.current = null;
    }
    
    // 如果显示控制器，3秒后自动隐藏
    if (newShowControls) {
      videoControlsTimerRef.current = setTimeout(() => {
        setShowVideoControls(false);
      }, 3000);
    }
  };

  // 视频播放进度回调
  const onVideoProgress = (data: any) => {
    setVideoCurrentTime(data.currentTime);
    if (videoDuration > 0) {
      setVideoProgress(data.currentTime / videoDuration);
    }
  };

  // 视频加载完成回调
  const onVideoLoad = (data: any) => {
    console.log('视频加载完成:', data);
    setVideoDuration(data.duration);
  };

  // 视频播放结束回调
  const onVideoEnd = () => {
    setIsVideoPlaying(false);
    setVideoProgress(1); // 设置为100%进度
    setVideoCurrentTime(videoDuration);
    setShowVideoControls(true); // 播放完成后显示控制器
    
    // 清除自动隐藏定时器
    if (videoControlsTimerRef.current) {
      clearTimeout(videoControlsTimerRef.current);
      videoControlsTimerRef.current = null;
    }
  };

  // 位置相关函数
  const handleSendLocation = () => {
    console.log('📍 [ChatScreen] 用户点击发送位置');
    setShowLocationPicker(true);
  };

  const handleLocationPickerClose = () => {
    console.log('📍 [ChatScreen] 关闭位置选择器');
    setShowLocationPicker(false);
  };

  const handleLocationViewerClose = useCallback(() => {
    console.log('📍 [ChatScreen] 关闭位置查看器');
    setShowLocationViewer(false);
    setViewingLocation(null);
  }, []);

  const handleConfirmSendLocation = async (location: {
    latitude: number;
    longitude: number;
    locationName: string;
    address: string;
  }) => {
    console.log('📍 [ChatScreen] 确认发送位置:', location);
    
    if (!conversationId) {
      showToast('会话信息错误，无法发送位置');
      return;
    }

    try {
      // 创建临时消息ID用于本地显示
      const tempMessageId = generateUniqueId();
      
      // 准备Socket消息数据（实时发送给对方）
      const socketData = {
        conversationId,
        receiverId: contactId,
        content: `📍 ${location.locationName || '位置'}`,
        messageType: 'location',
        latitude: location.latitude,
        longitude: location.longitude,
        locationName: location.locationName,
        address: location.address,
      };

      console.log('📍 [ChatScreen] 通过Socket发送位置消息:', socketData);

      // 通过全局Socket实时发送给对方
      globalSendMessage(socketData);

      // 添加到本地消息列表
      const newMessage: Message = {
        _id: tempMessageId,
        senderId: userInfo?._id || '',
        senderRole: isCustomerService() ? 'customer_service' : 'user',
        content: socketData.content,
        timestamp: new Date(),
        messageType: 'location',
        contentType: 'location',
        latitude: location.latitude,
        longitude: location.longitude,
        locationName: location.locationName,
        address: location.address,
      };

      addMessage(newMessage);

      // 同时通过HTTP API保存到数据库，确保消息持久化
      const messageData = {
        conversationId,
        content: socketData.content,
        contentType: 'location' as const,
        messageType: 'location' as const,
        latitude: location.latitude,
        longitude: location.longitude,
        locationName: location.locationName,
        address: location.address,
      };

      console.log('📍 [ChatScreen] 保存位置消息到数据库:', messageData);

      const response = await axios.post(`${BASE_URL}/api/messages`, messageData, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📍 [ChatScreen] 位置消息保存成功:', response.data);

      // 更新临时消息ID为服务器返回的ID
      if (response.data && response.data._id) {
        updateMessage(tempMessageId, { _id: response.data._id });
      }

      showToast('位置已发送');

    } catch (error) {
      console.error('📍 [ChatScreen] 发送位置失败:', error);
      handleError(error, '发送位置失败，请重试');
    }
  };
  

  
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      {/* 来电全屏界面已移至全局App层面处理 */}
      {/* 
      {isIncomingCall && incomingCallInfo && (
        <IncomingCallScreen
          contactName={contactName}
          contactAvatar={incomingCallInfo.contactAvatar}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
      */}
      
      <View style={getPlatformStyles(iOSChatStyles.headerContainer, styles.headerContainer)}>
        <View style={getPlatformStyles(iOSChatStyles.chatHeader, styles.chatHeader)}>
          <TouchableOpacity 
            style={getPlatformStyles(iOSChatStyles.backButton, styles.backButton)}
            onPress={() => navigation.goBack()}
            hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
          >
            <Icon name="chevron-back" size={isIOS ? 24 : 28} color="#007AFF" />
          </TouchableOpacity>
          <View style={getPlatformStyles(iOSChatStyles.headerCenter, styles.headerCenter)}>
            <Text style={getPlatformStyles(iOSChatStyles.chatHeaderName, styles.chatHeaderName)} numberOfLines={1}>{contactName}</Text>
            <View style={styles.onlineStatusContainer}>
              <View style={styles.onlineIndicator} />
              <Text style={getPlatformStyles(iOSChatStyles.onlineStatusText, styles.onlineStatusText)}>在线</Text>
            </View>
          </View>
          {/* 移除语音测试按钮 */}
          <View style={styles.headerRight} />
        </View>
      </View>
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? IOS_CHAT_HEADER_HEIGHT : 0}
        onStartShouldSetResponder={() => {
          if (showMoreOptions) {
            setShowMoreOptions(false);
            return true;
          }
          return false;
        }}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ff6b81" />
            <Text style={getPlatformStyles(iOSChatStyles.loadingText, styles.loadingText)}>正在加载消息...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            inverted={true} // 倒置列表，默认显示最新消息
            renderItem={renderMessageItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            contentContainerStyle={getPlatformStyles(iOSChatStyles.messagesList, styles.messagesList)}
            ListHeaderComponent={
              <>
                <View style={styles.listFooterSpace} />
                {loadingMore && (
                  <View style={styles.loadingMoreContainer}>
                    <ActivityIndicator size="small" color="#ff6b81" />
                    <Text style={styles.loadMoreText}>加载更多历史消息...</Text>
                  </View>
                )}
              </>
            }
            ListFooterComponent={<View style={styles.listHeaderSpace} />}
            onEndReached={hasMoreMessages ? loadMoreMessages : undefined}
            onEndReachedThreshold={0.1}             // 降低阈值，减少误触发
            onScroll={useCallback((event: any) => {
              const offset = event.nativeEvent.contentOffset.y;
              // 使用防抖机制，避免频繁更新状态
              setScrollOffset(offset);
            }, [])}
            onContentSizeChange={useCallback((width: number, height: number) => {
              // 只记录高度，不进行额外操作避免跳动，使用防抖
              setContentHeight(height);
            }, [])}
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout;
              // 调试日志已清理 - FlatList布局事件
              // 移除自动滚动逻辑，避免加载历史记录时的跳动
              // 滚动到底部的逻辑已在useEffect中处理
            }}
            scrollEventThrottle={32} // 降低滚动事件频率，减少重渲染
            removeClippedSubviews={true} // 提升大列表性能
            initialNumToRender={15} // 减少初始渲染数量
            maxToRenderPerBatch={5} // 减少每批渲染数量
            updateCellsBatchingPeriod={100} // 增加更新间隔，减少频繁更新
            windowSize={5} // 减小渲染窗口，节省内存
            // 移除getItemLayout，避免计算错误导致跳动
            // 移除maintainVisibleContentPosition，避免与手动滚动控制冲突
          />
        )}
        
        <ChatInputArea
          messageText={messageText}
          setMessageText={setMessageText}
          onSendMessage={handleSendMessage}
          isVoiceMode={isVoiceMode}
          isRecording={isRecording}
          recordTime={recordTime}
          pulseAnim={pulseAnim}
          hasRecordingPermission={hasRecordingPermission}
          onToggleVoiceMode={toggleVoiceMode}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          showMoreOptions={showMoreOptions}
          onToggleMoreOptions={toggleMoreOptions}
          onTakePhoto={handleTakePhoto}
          onSendImage={handleSendImage}
          onVoiceCall={handleVoiceCallButton}
          onShowToast={showToast}
          onSendLocation={handleSendLocation}
        />
      </KeyboardAvoidingView>
      
      {/* 网络状态横幅 */}
      {showNetworkBanner && (
        <View style={getPlatformStyles(iOSChatStyles.networkBanner, styles.networkBanner)}>
          <Text style={getPlatformStyles(iOSChatStyles.networkBannerText, styles.networkBannerText)}>
            ⚠️ 网络连接已断开，消息可能无法及时发送
          </Text>
        </View>
      )}
      
      {/* Socket连接状态横幅 */}
      {connecting && (
        <View style={getPlatformStyles(iOSChatStyles.connectingBanner, styles.connectingBanner)}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={getPlatformStyles(iOSChatStyles.connectingBannerText, styles.connectingBannerText)}>
            正在连接服务器...
          </Text>
        </View>
      )}
      
      {/* 媒体预览模态框 */}
      <MediaPreviewModals
        showVoicePreview={showPreview}
        isPlaying={isPlaying}
        recordTime={recordTime}
        currentPlayTime={recordTime}
        onPlayPreview={playPreview}
        onCancelVoice={cancelRecording}
        onConfirmVoice={confirmSendVoiceMessage}
        showImagePreview={showImagePreview}
        selectedImage={selectedImage}
        onCancelImage={cancelSendImage}
        onConfirmImage={confirmSendImage}
      />
      
      {/* 全屏模态框 */}
      <FullscreenModals
        showFullscreenImage={showFullscreenImage}
        fullscreenImageUrl={fullscreenImageUrl}
        onCloseFullscreenImage={closeFullscreenImage}
        showFullscreenVideo={showFullscreenVideo}
        fullscreenVideoUrl={fullscreenVideoUrl}
        isVideoPlaying={isVideoPlaying}
        videoProgress={videoProgress}
        videoDuration={videoDuration}
        videoCurrentTime={videoCurrentTime}
        showVideoControls={showVideoControls}
        onCloseFullscreenVideo={closeFullscreenVideo}
        onToggleVideoPlayPause={toggleVideoPlayPause}
        onToggleVideoControls={toggleVideoControls}
        onVideoProgress={onVideoProgress}
        onVideoLoad={onVideoLoad}
        onVideoEnd={onVideoEnd}
      />

      {/* 位置选择器模态框 */}
      <LocationPickerModal
        visible={showLocationPicker}
        onClose={handleLocationPickerClose}
        onSendLocation={handleConfirmSendLocation}
      />

      {/* 位置查看器模态框 */}
      {viewingLocation && (
        <LocationViewerModal
          visible={showLocationViewer}
          onClose={handleLocationViewerClose}
          latitude={viewingLocation.latitude}
          longitude={viewingLocation.longitude}
          locationName={viewingLocation.locationName}
          address={viewingLocation.address}
        />
      )}

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff', // 顶部安全区域背景色与header一致
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 0, // 移除水平内边距，由iOS样式控制
  },
  chatHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16, // Android保持原有的水平内边距
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  onlineStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 4,
  },
  onlineStatusText: {
    fontSize: 12,
    color: '#666',
  },
  headerRight: {
    width: 50,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  messagesList: {
    padding: 10,
    paddingBottom: 20,
    paddingTop: 15,
  },
  listHeaderSpace: {
    height: 15,
  },
  listFooterSpace: {
    height: 15,
  },
  messageContainer: {
    marginVertical: 5,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    marginRight: 8,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  messageBubble: {
    borderRadius: 18,
    padding: 14, // 增加内边距让气泡更大
    minHeight: 40, // 增加最小高度
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  myBubble: {
    backgroundColor: '#ff6b81',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 18, // 增大消息文字字体
    lineHeight: 22,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 4,
  },
  myMessageTime: {
    color: '#999',
    alignSelf: 'flex-end',
  },
  otherMessageTime: {
    color: '#999',
  },
  // 输入区域和模态框样式已移至独立组件
  imageBubble: {
    padding: 3,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  messageImage: {
    borderRadius: 15,
    minWidth: 120,
    minHeight: 120,
    maxWidth: 240,
    maxHeight: 240,
  },
  videoBubble: {
    padding: 0,
    overflow: 'hidden',
    backgroundColor: '#333',
    borderWidth: 0,
  },
  videoContainer: {
    width: 200,
    height: 150,
    backgroundColor: '#333',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  videoUploadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  uploadProgressContainer: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  uploadProgressBar: {
    height: '100%',
    backgroundColor: '#ff6b81',
  },
  uploadProgressText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 8,
  },
  uploadingIndicator: {
    marginTop: 8,
  },
  videoInfoContainer: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 5,
    borderRadius: 10,
  },
  videoInfoText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  fullscreenVideoContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenVideoWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenVideo: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  closeFullscreenVideoButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 25,
    zIndex: 10,
  },
  videoControlsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  videoControlsBottom: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  videoControlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingHorizontal: 10,
  },
  videoControlButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    marginHorizontal: 10,
  },
  videoPlayPauseButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 107, 129, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  videoProgressContainer: {
    width: '100%',
  },
  videoProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  videoProgressFill: {
    height: '100%',
    backgroundColor: '#ff6b81',
  },
  videoTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  videoTimeText: {
    color: '#fff',
    fontSize: 12,
  },
  videoControlsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingMoreContainer: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f2f2f2',
    borderRadius: 20,
    marginVertical: 15,
  },
  loadMoreText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  networkBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffcc00',
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  networkBannerText: {
    color: '#333',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  connectingBanner: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#ff6b81',
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectingBannerText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default ChatScreen; 