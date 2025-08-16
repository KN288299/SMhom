import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '../config/api';
import { useAuth } from './AuthContext';
import { Alert } from 'react-native';

interface Message {
  _id: string;
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
  isCallRecord?: boolean;
  callerId?: string;
  callDuration?: string;
  missed?: boolean;
  rejected?: boolean;
  // 位置消息字段
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
    
    // 创建Socket连接 - 增强重连机制
    const socket = io(BASE_URL, {
      auth: {
        token: processedToken  // 使用处理后的token
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 10, // 增加重连次数
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000, // 最大重连延迟
      randomizationFactor: 0.5, // 随机化重连延迟
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
    const handleIncomingCall = (callData: any) => {
      console.log('📞 [GlobalSocket] 收到来电:', callData);
      console.log(`📞 [GlobalSocket] 当前通话订阅者数量: ${callSubscribersRef.current.size}`);
      
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
      console.log('📞 [GlobalSocket] 收到call_cancelled:', callData);
      
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

    // 绑定事件
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('message', handleReceiveMessage);
    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_cancelled', handleCallCancelled);
    socket.on('offline_messages_delivered', handleOfflineMessagesDelivered);
    
    console.log('🔗 [GlobalSocket] 已绑定所有Socket事件，包括incoming_call');
    console.log('🔗 [GlobalSocket] handleIncomingCall函数类型:', typeof handleIncomingCall);
    
    // 验证事件监听器
    setTimeout(() => {
      const listeners = socket.listeners('incoming_call');
      console.log('🔍 [GlobalSocket] incoming_call监听器数量:', listeners.length);
    }, 100);
    
    // 监听所有事件（调试用，同时作为备用处理方案）
    socket.onAny((eventName, ...args) => {
      if (eventName === 'incoming_call') {
        console.log(`🔔 [GlobalSocket] 收到任意事件 ${eventName}:`, args);
        console.log('🔧 [GlobalSocket] 使用onAny备用处理来电事件');
        
        // 备用处理方案：直接调用handleIncomingCall
        if (args[0]) {
          handleIncomingCall(args[0]);
        }
      } else if (eventName === 'call_cancelled') {
        console.log(`🔔 [GlobalSocket] 收到任意事件 ${eventName}:`, args);
        console.log('🔧 [GlobalSocket] 使用onAny备用处理call_cancelled事件');
        
        // 备用处理方案：直接调用handleCallCancelled
        if (args[0]) {
          handleCallCancelled(args[0]);
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
      console.log('🚪 [GlobalSocket] 离开会话:', conversationId);
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

  const value: SocketContextType = {
    socket: socketRef.current,
    isConnected,
    sendMessage,
    joinConversation,
    leaveConversation,
    subscribeToMessages,
    subscribeToIncomingCalls,
    rejectCall,
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