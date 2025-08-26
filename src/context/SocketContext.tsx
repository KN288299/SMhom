import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '../config/api';
import { useAuth } from './AuthContext';
import { Platform, AppState } from 'react-native';
import IOSCallService from '../services/IOSCallService';

interface Message {
  _id: string;
  conversationId?: string;
  senderId: string;
  senderRole?: 'user' | 'customer_service';
  content: string;
  timestamp: Date;
  isRead?: boolean;
  messageType?: 'text' | 'voice' | 'image' | 'video' | 'location';
  contentType?: 'text' | 'voice' | 'image' | 'video' | 'file' | 'location';
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
  fileUrl?: string;
  localFileUri?: string;
  isCallRecord?: boolean;
  callerId?: string;
  callDuration?: string;
  missed?: boolean;
  rejected?: boolean;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  address?: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (messageData: any) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  subscribeToMessages: (callback: (message: Message) => void) => () => void;
  subscribeToIncomingCalls: (callback: (callData: any) => void) => () => void;
  rejectCall: (callId: string, recipientId: string, conversationId?: string) => void;
  // 主动释放 incoming_call 去重（用于接听/拒绝后立即允许新的来电）
  releaseIncomingCallDedup: (callId: string) => void;
  unreadMessageCount: number;
  addUnreadMessage: () => void;
  clearUnreadMessages: () => void;
}

export const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  sendMessage: () => {},
  joinConversation: () => {},
  leaveConversation: () => {},
  subscribeToMessages: () => () => {},
  subscribeToIncomingCalls: () => () => {},
  rejectCall: () => {},
  releaseIncomingCallDedup: () => {},
  unreadMessageCount: 0,
  addUnreadMessage: () => {},
  clearUnreadMessages: () => {},
});

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { userToken, logout, isCustomerService } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  // 去重：记录已处理的incoming_call的callId，避免重复弹窗/重复流程
  const handledIncomingCallIdsRef = useRef<Set<string>>(new Set());
  // 来电去重TTL（过长会导致紧接着的下一次来电被吞掉；设置为8秒更安全）
  const INCOMING_DEDUP_TTL_MS = 8 * 1000;
  // 暂存回放：当无订阅者时暂存incoming_call，订阅者就位后回放
  const PENDING_REPLAY_TTL_MS = 8 * 1000;
  const pendingIncomingCallRef = useRef<{ data: any; timestamp: number } | null>(null);
  // 取消事件去重，避免onAny兜底与专用监听重复触发
  const processedCancelledCallIdsRef = useRef<Set<string>>(new Set());
  
  // 消息订阅者列表
  const messageSubscribersRef = useRef<Set<(message: Message) => void>>(new Set());
  const callSubscribersRef = useRef<Set<(callData: any) => void>>(new Set());

  // 初始化Socket连接
  useEffect(() => {
    if (!userToken) {
      console.log('用户未登录，跳过Socket连接');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    console.log('🔌 [GlobalSocket] 初始化全局Socket连接');
    
    // 处理token格式 - 移除Bearer前缀
    let processedToken = userToken;
    if (userToken.startsWith('Bearer ')) {
      processedToken = userToken.substring(7);
    }
    
    console.log('🔑 [GlobalSocket] Token类型:', 
      processedToken.startsWith('CS_') ? '客服令牌' : 
      processedToken.startsWith('U_') ? '用户令牌' : '普通令牌');
    
    // 🔧 iOS首次使用修复：创建Socket连接 - 优化冷启动处理
    const socket = io(BASE_URL, {
      auth: {
        token: processedToken  // 使用处理后的token
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,          // 首次连接超时时间增加到10秒，给iOS冷启动更多时间
      reconnection: true,
      reconnectionAttempts: 35, // 增加重连次数，iOS首次启动可能需要更多尝试
      reconnectionDelay: 100,   // 快速重连延迟100ms
      reconnectionDelayMax: 1000, // 最大重连延迟1秒
      randomizationFactor: 0.1, // 减少随机化因子，优先快速重连
      forceNew: false,         // 不强制创建新连接，复用连接
      // 🍎 iOS优化：增加连接稳定性选项
      upgrade: true,           // 允许升级到更好的传输方式
      rememberUpgrade: true,   // 记住升级的传输方式
    });

    socketRef.current = socket;

    // 连接成功
    const handleConnect = () => {
      console.log('🟢 [GlobalSocket] Socket连接成功');
      console.log('🔍 [GlobalSocket] Socket ID:', socket.id);
      console.log('🔍 [GlobalSocket] 连接到服务器:', BASE_URL);
      setIsConnected(true);
      
      // 设置全局Socket引用
      (global as any).socketRef = socketRef;
      
      // 🔧 网络切换修复：连接成功后设置网络切换监听
      (global as any).onNetworkSwitch = (networkInfo: any) => {
        console.log('🔄 [GlobalSocket] 收到网络切换通知:', networkInfo);
        
        // 蜂窝数据到WiFi切换时，延迟重连以等待WiFi稳定
        if (networkInfo.isCellularToWifi) {
          console.log('📶 [GlobalSocket] 蜂窝数据切换到WiFi，延迟重连');
          setTimeout(() => {
            if (socketRef.current && !socketRef.current.connected) {
              console.log('🔄 [GlobalSocket] WiFi稳定期结束，尝试重连');
              socketRef.current.connect();
            }
          }, 2000); // 延迟2秒等待WiFi稳定
        }
      };
      
      // 连接成功后获取离线消息
      setTimeout(() => {
        console.log('📨 [GlobalSocket] 请求离线消息');
        socket.emit('get_offline_messages');
      }, 1000);
    };

    // 连接断开
    const handleDisconnect = () => {
      console.log('🔴 [GlobalSocket] Socket断开连接');
      setIsConnected(false);
    };

    // 连接错误
    const handleConnectError = (error: any) => {
      console.error('❌ [GlobalSocket] Socket连接错误:', error.message);
      setIsConnected(false);
    };

    // 接收消息
    const handleReceiveMessage = (message: Message) => {
      // 调试日志已清理 - 收到新消息
      
      // 通知所有订阅者
      messageSubscribersRef.current.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error('消息回调执行失败:', error);
        }
      });

      // 增加未读消息计数
      setUnreadMessageCount(prev => prev + 1);
    };

    // 接收离线消息送达确认
    const handleOfflineMessagesDelivered = (data: any) => {
      console.log('📨 [GlobalSocket] 离线消息已送达:', data);
      console.log(`📨 [GlobalSocket] 收到 ${data.count} 条离线消息`);
    };

    // 接收通话
    const handleIncomingCall = async (callData: any) => {
      console.log('📞 [GlobalSocket] 收到来电:', callData);
      console.log(`📞 [GlobalSocket] 当前通话订阅者数量: ${callSubscribersRef.current.size}`);
      // 来电去重：同一callId在短时间内只处理一次
      if (callData?.callId && handledIncomingCallIdsRef.current.has(callData.callId)) {
        console.log('🛑 [GlobalSocket] 重复incoming_call已忽略，callId:', callData.callId);
        return;
      }
      if (callData?.callId) {
        handledIncomingCallIdsRef.current.add(callData.callId);
        // TTL到期后自动过期，防止集合无限增长
        setTimeout(() => handledIncomingCallIdsRef.current.delete(callData.callId), INCOMING_DEDUP_TTL_MS);
      }
      
      // 注意：不要在此处请求麦克风权限，先显示来电界面；
      // 权限将由接听后进入的 VoiceCallScreen 内进行检查与请求。
      console.log('ℹ️ [GlobalSocket] 跳过来电前的麦克风权限请求，将在接听时申请');
      
      // iOS特殊处理：优化来电响应速度 v2
      if (Platform.OS === 'ios') {
        console.log('🍎 [GlobalSocket] iOS设备收到来电');
        const appState = AppState.currentState;
        console.log('🍎 [GlobalSocket] 当前应用状态:', appState);
        
        if (appState === 'active') {
          console.log('⚡ [GlobalSocket] iOS前台：快速路径，直接通知订阅者');
          // 前台时立即预热连接，确保后续操作流畅
          if (socketRef.current?.disconnected) {
            console.log('🔄 [GlobalSocket] 前台预热Socket连接');
            socketRef.current.connect();
          }
        } else {
          console.log('🍎 [GlobalSocket] iOS后台：使用iOS通话服务推送通知');
          IOSCallService.showIncomingCallNotification(callData);
          
          // 立即尝试预热连接，减少延迟
          setTimeout(() => {
            if (socketRef.current?.disconnected) {
              console.log('🔄 [GlobalSocket] 后台预热Socket连接');
              socketRef.current.connect();
            }
          }, 50); // 减少到50ms，更快响应
        }
      }
      
      // 如果当前没有通话订阅者，暂存此次来电用于稍后回放
      if (callSubscribersRef.current.size === 0) {
        pendingIncomingCallRef.current = { data: callData, timestamp: Date.now() };
        console.log('⏳ [GlobalSocket] 暂存incoming_call等待订阅者:', callData?.callId);
      } else {
        pendingIncomingCallRef.current = null;
      }

      // 通知所有通话订阅者
      let index = 0;
      callSubscribersRef.current.forEach(callback => {
        try {
          index++;
          console.log(`📞 [GlobalSocket] 调用通话订阅者 ${index}`);
          callback(callData);
          console.log(`✅ [GlobalSocket] 通话订阅者 ${index} 调用成功`);
        } catch (error) {
          console.error(`❌ [GlobalSocket] 通话订阅者 ${index} 调用失败:`, error);
        }
      });
    };

    // 转发call_cancelled事件给所有通话订阅者
    const handleCallCancelled = (callData: any) => {
      const callId = callData?.callId;
      console.log('📞 [GlobalSocket] 收到call_cancelled:', callData);
      // 取消事件去重，避免重复处理
      if (callId) {
        if (processedCancelledCallIdsRef.current.has(callId)) {
          console.log('🛑 [GlobalSocket] 重复call_cancelled已忽略:', callId);
          return;
        }
        processedCancelledCallIdsRef.current.add(callId);
        setTimeout(() => processedCancelledCallIdsRef.current.delete(callId), INCOMING_DEDUP_TTL_MS);
      }
      // 清理已处理集合，允许未来新的同ID通话（如果服务端会复用ID则保留也可）
      if (callId && handledIncomingCallIdsRef.current.has(callId)) {
        handledIncomingCallIdsRef.current.delete(callId);
      }
      // 若存在待回放的来电且ID匹配，则清理暂存
      if (pendingIncomingCallRef.current?.data?.callId && pendingIncomingCallRef.current.data.callId === callId) {
        pendingIncomingCallRef.current = null;
        console.log('🧹 [GlobalSocket] 清理暂存incoming_call，因来电已取消:', callId);
      }
      
      // 通知所有通话订阅者（包括GlobalNavigator）
      callSubscribersRef.current.forEach(callback => {
        try {
          // 我们需要标记这是一个取消事件
          callback({ ...callData, eventType: 'call_cancelled' });
        } catch (error) {
          console.error('call_cancelled回调执行失败:', error);
        }
      });
    };

    // 清理去重集合：通话被拒绝
    const handleCallRejected = (data: any) => {
      const { callId } = data || {};
      console.log('📞 [GlobalSocket] 收到call_rejected，清理去重集合:', callId);
      if (callId && handledIncomingCallIdsRef.current.has(callId)) {
        handledIncomingCallIdsRef.current.delete(callId);
      }
    };

    // 清理去重集合：通话已结束
    const handleCallEnded = (data: any) => {
      const { callId } = data || {};
      console.log('📞 [GlobalSocket] 收到call_ended，清理去重集合:', callId);
      if (callId && handledIncomingCallIdsRef.current.has(callId)) {
        handledIncomingCallIdsRef.current.delete(callId);
      }
    };

    // 清理去重集合：通话已接听（防止服务端复用callId或call_ended丢失导致后续来电被忽略）
    const handleCallAccepted = (data: any) => {
      const { callId } = data || {};
      console.log('📞 [GlobalSocket] 收到call_accepted，清理去重集合:', callId);
      if (callId && handledIncomingCallIdsRef.current.has(callId)) {
        handledIncomingCallIdsRef.current.delete(callId);
      }
    };

    // 绑定事件
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('message', handleReceiveMessage);
    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_cancelled', handleCallCancelled);
    socket.on('offline_messages_delivered', handleOfflineMessagesDelivered);
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_ended', handleCallEnded);
    socket.on('call_accepted', handleCallAccepted);
    
    console.log('🔗 [GlobalSocket] 已绑定所有Socket事件，包括incoming_call');
    console.log('🔗 [GlobalSocket] handleIncomingCall函数类型:', typeof handleIncomingCall);
    
    // 验证事件监听器
    setTimeout(() => {
      const listeners = socket.listeners('incoming_call');
      console.log('🔍 [GlobalSocket] incoming_call监听器数量:', listeners.length);
    }, 100);
    
    // 监听所有事件（仅用于调试日志，避免重复调用业务处理导致二次弹窗）
    socket.onAny((eventName, ...args) => {
      if (eventName === 'incoming_call' || eventName === 'call_cancelled') {
        const payload = args?.[0];
        console.log(`🔔 [GlobalSocket] onAny捕获事件 ${eventName}:`, payload?.callId || '');
        // 兜底派发，避免监听器在重绑窗口期漏掉事件
        try {
          if (eventName === 'incoming_call') {
            handleIncomingCall(payload);
          } else if (eventName === 'call_cancelled') {
            handleCallCancelled(payload);
          }
        } catch (e) {
          console.warn('onAny兜底处理失败:', e);
        }
      }
    });

    // 清理函数
    return () => {
      console.log('🧹 [GlobalSocket] 清理Socket连接...');
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message', handleReceiveMessage);
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_cancelled', handleCallCancelled);
      socket.off('offline_messages_delivered', handleOfflineMessagesDelivered);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
      socket.off('call_accepted', handleCallAccepted);
      socket.offAny(); // 清理onAny监听器
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [userToken]);

  // 发送消息
  const sendMessage = (messageData: any) => {
    if (socketRef.current && isConnected) {
      // 调试日志已清理 - 发送消息
      socketRef.current.emit('send_message', messageData);
    } else {
      console.warn('⚠️ [GlobalSocket] Socket未连接，无法发送消息');
    }
  };

  // 加入会话
  const joinConversation = (conversationId: string) => {
    if (socketRef.current && isConnected) {
      console.log('🏠 [GlobalSocket] 加入会话:', conversationId);
      socketRef.current.emit('join_conversation', conversationId);
    } else {
      console.warn('⚠️ [GlobalSocket] Socket未连接，无法加入会话');
    }
  };

  // 离开会话
  const leaveConversation = (conversationId: string) => {
    if (socketRef.current && isConnected) {
      console.log('�� [GlobalSocket] 离开会话:', conversationId);
      socketRef.current.emit('leave_conversation', conversationId);
    }
  };

  // 订阅消息
  const subscribeToMessages = (callback: (message: Message) => void) => {
    messageSubscribersRef.current.add(callback);
    // 调试日志已清理 - 添加消息订阅者
    
    // 返回取消订阅函数
    return () => {
      messageSubscribersRef.current.delete(callback);
      // 调试日志已清理 - 移除消息订阅者
    };
  };

  // 订阅来电
  const subscribeToIncomingCalls = (callback: (callData: any) => void) => {
    callSubscribersRef.current.add(callback);
    console.log(`📞 [GlobalSocket] 添加通话订阅者，当前数量: ${callSubscribersRef.current.size}`);
    
    // 首订阅即回放pending来电（解决首启期间事件先到、订阅者未就位的问题）
    try {
      const pending = pendingIncomingCallRef.current;
      if (pending && Date.now() - pending.timestamp <= PENDING_REPLAY_TTL_MS) {
        console.log('⏰ [GlobalSocket] 回放pending incoming_call给新订阅者');
        callback(pending.data);
        pendingIncomingCallRef.current = null; // 回放后清空，避免重复
      } else if (pending) {
        console.log('🧹 [GlobalSocket] 丢弃过期的pending incoming_call');
        pendingIncomingCallRef.current = null;
      }
    } catch (e) {
      console.warn('回放pending incoming_call失败:', e);
    }
    
    // 返回取消订阅函数
    return () => {
      callSubscribersRef.current.delete(callback);
      console.log(`🗑️ [GlobalSocket] 移除通话订阅者，当前数量: ${callSubscribersRef.current.size}`);
    };
  };

  // 增加未读消息
  const addUnreadMessage = () => {
    setUnreadMessageCount(prev => prev + 1);
  };

  // 清除未读消息
  const clearUnreadMessages = () => {
    setUnreadMessageCount(0);
  };

  // 拒绝来电
  const rejectCall = (callId: string, recipientId: string, conversationId?: string) => {
    if (socketRef.current && isConnected) {
      console.log('📞 [GlobalSocket] 发送拒绝来电信号:', { callId, recipientId, conversationId });
      socketRef.current.emit('reject_call', {
        callId,
        recipientId,
        conversationId
      });
    } else {
      console.warn('⚠️ [GlobalSocket] Socket未连接，无法发送拒绝来电信号');
    }
  };

  // 主动释放 incoming_call 去重（当本端接听/拒绝后立即释放，避免后端复用callId导致下一次来电被忽略）
  const releaseIncomingCallDedup = useCallback((callId: string) => {
    try {
      if (!callId) return;
      if (handledIncomingCallIdsRef.current.has(callId)) {
        handledIncomingCallIdsRef.current.delete(callId);
        console.log('🧹 [GlobalSocket] 主动释放incoming_call去重:', callId);
      }
    } catch (e) {
      console.warn('释放incoming_call去重失败:', e);
    }
  }, []);

  const value: SocketContextType = {
    socket: socketRef.current,
    isConnected,
    sendMessage,
    joinConversation,
    leaveConversation,
    subscribeToMessages,
    subscribeToIncomingCalls,
    rejectCall,
    releaseIncomingCallDedup,
    unreadMessageCount,
    addUnreadMessage,
    clearUnreadMessages,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Hook for using socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}; 