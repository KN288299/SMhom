import { useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Socket } from 'socket.io-client';
import AudioManager from '../utils/AudioManager';
import { BASE_URL } from '../config/api';

interface UseCallManagerProps {
  userInfo: any;
  isCustomerService: () => boolean;
  contactName: string;
  conversationId: string | undefined;
  userToken: string | null;
  socketRef: React.MutableRefObject<Socket | null>;
  formatMediaUrl: (url: string) => string;
  generateUniqueId: () => string;
  onError: (error: any, message: string) => void;
  onSetActiveCallId: (callId: string | null) => void;
  onSetCallTimeoutRef: (ref: NodeJS.Timeout | null) => void;
  navigation: any;
}

const CALL_TIMEOUT = 30000; // 30秒超时

// 通话状态缓存键
const CALL_STATE_KEY = 'active_call_state';

interface CallState {
  callId: string;
  contactId: string;
  contactName: string;
  contactAvatar?: string;
  conversationId: string;
  status: 'connecting' | 'ringing' | 'connected';
  startTime: number;
}

export const useCallManager = ({
  userInfo,
  isCustomerService,
  contactName,
  conversationId,
  userToken,
  socketRef,
  formatMediaUrl,
  generateUniqueId,
  onError,
  onSetActiveCallId,
  onSetCallTimeoutRef,
  navigation,
}: UseCallManagerProps) => {
  
  const callStateRef = useRef<CallState | null>(null);
  
  // 保存通话状态到本地存储
  const saveCallState = useCallback(async (callState: CallState) => {
    try {
      await AsyncStorage.setItem(CALL_STATE_KEY, JSON.stringify(callState));
      callStateRef.current = callState;
      console.log('通话状态已保存:', callState.callId);
    } catch (error) {
      console.error('保存通话状态失败:', error);
    }
  }, []);
  
  // 清除通话状态
  const clearCallState = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(CALL_STATE_KEY);
      callStateRef.current = null;
      console.log('通话状态已清除');
    } catch (error) {
      console.error('清除通话状态失败:', error);
    }
  }, []);
  
  // 恢复通话状态
  const restoreCallState = useCallback(async () => {
    try {
      const savedState = await AsyncStorage.getItem(CALL_STATE_KEY);
      if (savedState) {
        const callState: CallState = JSON.parse(savedState);
        callStateRef.current = callState;
        console.log('恢复通话状态:', callState.callId);
        return callState;
      }
    } catch (error) {
      console.error('恢复通话状态失败:', error);
    }
    return null;
  }, []);
  
  // 优化的通话发起逻辑
  const initiateCall = useCallback(async (recipientId: string) => {
    try {
      // 检查是否有活跃通话
      const existingState = await restoreCallState();
      if (existingState && existingState.status === 'connected') {
        Alert.alert(
          '通话进行中', 
          '当前有通话正在进行，是否结束现有通话并发起新通话？',
          [
            { text: '取消', style: 'cancel' },
            { 
              text: '确定', 
              onPress: async () => {
                await clearCallState();
                await initiateNewCall(recipientId);
              }
            }
          ]
        );
        return;
      }
      
      await initiateNewCall(recipientId);
    } catch (error) {
      onError(error, '发起通话失败，请稍后再试');
    }
  }, [restoreCallState, clearCallState, onError]);
  
  // 发起新通话的具体实现
  const initiateNewCall = useCallback(async (recipientId: string) => {
    if (!socketRef.current) {
      console.log('Socket未连接，无法发起通话');
      Alert.alert('通话错误', '网络连接不可用，请稍后再试');
      return;
    }

    // 生成唯一的通话ID
    const callId = generateUniqueId();
    onSetActiveCallId(callId);

    // 保存通话状态
    const callState: CallState = {
      callId,
      contactId: recipientId,
      contactName: contactName || '未知联系人',
      conversationId,
      status: 'connecting',
      startTime: Date.now(),
    };
    
    await saveCallState(callState);

    // 发送呼叫请求
    socketRef.current.emit('initiate_call', {
      callerId: userInfo?._id,
      recipientId,
      callId,
      conversationId,
    });

    console.log(`发起语音通话: ${callId}`);
    
    // 播放回铃音
    AudioManager.playRingback();

    // 设置呼叫超时
    const callTimeout = setTimeout(async () => {
      AudioManager.stopRingback();
      await clearCallState();
      console.log('通话超时，对方未应答');
      onSetActiveCallId(null);
    }, CALL_TIMEOUT);

    // 保存超时引用以便清除
    onSetCallTimeoutRef(callTimeout);

    // 获取联系人头像
    let contactAvatar;
    try {
      if (isCustomerService()) {
        // 如果是客服，获取用户头像
        const response = await fetch(`${BASE_URL}/api/users/${recipientId}`, {
          headers: { 'Authorization': `Bearer ${userToken}` }
        });
        if (response.ok) {
          const userData = await response.json();
          contactAvatar = userData.avatar ? formatMediaUrl(userData.avatar) : undefined;
        }
      } else {
        // 如果是用户，获取客服头像
        const response = await fetch(`${BASE_URL}/api/customer-service/${recipientId}`, {
          headers: { 'Authorization': `Bearer ${userToken}` }
        });
        if (response.ok) {
          const csData = await response.json();
          contactAvatar = csData.avatar ? formatMediaUrl(csData.avatar) : undefined;
        }
      }
    } catch (error) {
      console.warn('获取联系人头像失败:', error);
    }

    // 更新通话状态包含头像
    if (contactAvatar) {
      callState.contactAvatar = contactAvatar;
      await saveCallState(callState);
    }

    // 导航到通话界面
    navigation.navigate('VoiceCall', {
      callId,
      recipientId,
      contactId: recipientId,
      contactName: contactName,
      contactAvatar: contactAvatar,
      isOutgoing: true,
      conversationId,
    });
  }, [
    userInfo,
    isCustomerService,
    contactName,
    conversationId,
    userToken,
    socketRef,
    formatMediaUrl,
    generateUniqueId,
    onSetActiveCallId,
    onSetCallTimeoutRef,
    navigation,
    saveCallState,
    clearCallState,
  ]);

  return {
    initiateCall,
    saveCallState,
    clearCallState,
    restoreCallState,
  };
}; 