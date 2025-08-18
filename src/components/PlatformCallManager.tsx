import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useFloatingCall } from '../context/FloatingCallContext';
import IncomingCallScreen from './IncomingCallScreen';
import IOSCallService from '../services/IOSCallService';
import { useNavigation } from '@react-navigation/native';

interface CallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  conversationId: string;
  callerRole: 'user' | 'customer_service';
  eventType?: string; // 添加eventType属性
}

const PlatformCallManager: React.FC = () => {
  const { userInfo } = useAuth();
  const { subscribeToIncomingCalls, rejectCall, socket } = useSocket();
  const { hideFloatingCall, forceHideFloatingCall } = useFloatingCall();
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [incomingCallInfo, setIncomingCallInfo] = useState<CallData | null>(null);
  const navigation = useNavigation<any>();

  // 使用 ref 存储最新状态
  const isIncomingCallRef = useRef(isIncomingCall);
  const incomingCallInfoRef = useRef(incomingCallInfo);

  // 同步状态到 ref
  useEffect(() => {
    isIncomingCallRef.current = isIncomingCall;
    incomingCallInfoRef.current = incomingCallInfo;
  }, [isIncomingCall, incomingCallInfo]);

  // 处理来电被取消（拨打者挂断）
  const handleCallCancelled = useCallback((data: any) => {
    const { callId } = data;
    console.log('📴 [PlatformCallManager] 来电被取消:', callId);
    
    // 使用 ref 获取最新状态
    const currentIsIncomingCall = isIncomingCallRef.current;
    const currentIncomingCallInfo = incomingCallInfoRef.current;
    
    // 检查是否是当前显示的来电
    if (currentIsIncomingCall && currentIncomingCallInfo && currentIncomingCallInfo.callId === callId) {
      console.log('🔄 [PlatformCallManager] 关闭来电界面 - 拨打者已挂断');
      setIsIncomingCall(false);
      setIncomingCallInfo(null);
    }
    
    // iOS特殊处理
    if (Platform.OS === 'ios') {
      IOSCallService.cancelCurrentCall();
    }
  }, []);

  // 处理来电
  const handleIncomingCall = useCallback((callData: CallData) => {
    console.log('🔔 [PlatformCallManager] 收到全局事件:', callData);
    console.log('🔔 [PlatformCallManager] 当前平台:', Platform.OS);
    
    // 检查是否是取消事件
    if (callData.eventType === 'call_cancelled') {
      console.log('🔔 [PlatformCallManager] 这是call_cancelled事件，调用handleCallCancelled');
      handleCallCancelled(callData);
      return;
    }
    
    // 平台特定的来电处理
    if (Platform.OS === 'ios') {
      console.log('🍎 [PlatformCallManager] iOS设备，使用iOS通话服务');
      // iOS使用iOS通话服务，这里只处理前台显示
      if (AppState.currentState === 'active') {
        console.log('🍎 [PlatformCallManager] iOS前台，显示来电界面');
        setIsIncomingCall(true);
        setIncomingCallInfo(callData);
      } else {
        console.log('🍎 [PlatformCallManager] iOS后台，iOS通话服务已处理');
      }
    } else {
      // Android设备，使用原有的全局来电显示
      console.log('🤖 [PlatformCallManager] Android设备，显示全局来电界面');
      setIsIncomingCall(true);
      setIncomingCallInfo(callData);
    }
  }, [handleCallCancelled]);

  // 处理通话被拒绝（接听者拒绝）
  const handleCallRejected = useCallback((data: any) => {
    const { callId } = data;
    console.log('❌ [PlatformCallManager] 通话被拒绝:', callId);
    
    // 使用 ref 获取最新状态
    const currentIsIncomingCall = isIncomingCallRef.current;
    const currentIncomingCallInfo = incomingCallInfoRef.current;
    
    // 检查是否是当前显示的来电
    if (currentIsIncomingCall && currentIncomingCallInfo && currentIncomingCallInfo.callId === callId) {
      console.log('🔄 [PlatformCallManager] 关闭来电界面 - 已拒绝');
      setIsIncomingCall(false);
      setIncomingCallInfo(null);
    }
    
    // iOS特殊处理
    if (Platform.OS === 'ios') {
      IOSCallService.cancelCurrentCall();
    }
  }, []);

  // 处理通话结束（对方主动挂断）
  const handleCallEnded = useCallback((data: any) => {
    const { callId, enderId } = data;
    console.log('📴 [PlatformCallManager] 通话已结束:', { callId, enderId });
    
    // 强制立即隐藏悬浮窗并清理所有资源
    forceHideFloatingCall();
    
    // 使用 ref 获取最新状态
    const currentIsIncomingCall = isIncomingCallRef.current;
    const currentIncomingCallInfo = incomingCallInfoRef.current;
    
    // 检查是否是当前显示的来电
    if (currentIsIncomingCall && currentIncomingCallInfo && currentIncomingCallInfo.callId === callId) {
      console.log('🔄 [PlatformCallManager] 关闭来电界面 - 通话已结束');
      setIsIncomingCall(false);
      setIncomingCallInfo(null);
    }
    
    // iOS特殊处理
    if (Platform.OS === 'ios') {
      IOSCallService.cancelCurrentCall();
    }
  }, [forceHideFloatingCall]);

  // 接听来电
  const handleAcceptCall = () => {
    console.log('✅ [PlatformCallManager] 接听全局来电');
    setIsIncomingCall(false);
    
    // 导航到通话页面
    navigation.navigate('VoiceCall', {
      contactId: incomingCallInfo?.callerId,
      contactName: incomingCallInfo?.callerName || '未知联系人',
      contactAvatar: incomingCallInfo?.callerAvatar,
      isIncoming: true,
      callId: incomingCallInfo?.callId,
      conversationId: incomingCallInfo?.conversationId
    });
  };

  // 拒绝来电
  const handleRejectCall = () => {
    console.log('❌ [PlatformCallManager] 拒绝全局来电');
    
    // 发送拒绝信号
    if (incomingCallInfo?.callId && incomingCallInfo?.callerId) {
      rejectCall(incomingCallInfo.callId, incomingCallInfo.callerId, incomingCallInfo.conversationId);
    }
    
    setIsIncomingCall(false);
    setIncomingCallInfo(null);
  };

  // 订阅全局来电事件
  useEffect(() => {
    if (!userInfo) return;

    console.log('🔗 [PlatformCallManager] 设置全局来电监听');
    const unsubscribe = subscribeToIncomingCalls(handleIncomingCall);

    return () => {
      console.log('🧹 [PlatformCallManager] 清理全局来电监听');
      unsubscribe();
    };
  }, [userInfo, subscribeToIncomingCalls, handleIncomingCall]);

  // 监听通话相关事件
  useEffect(() => {
    if (!socket || !userInfo) return;

    console.log('🔗 [PlatformCallManager] 设置通话状态监听');
    
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_ended', handleCallEnded);

    return () => {
      console.log('🧹 [PlatformCallManager] 清理通话状态监听');
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
    };
  }, [socket, userInfo, handleCallRejected, handleCallEnded]);

  // 监听应用状态变化（iOS特殊处理）
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`📱 [PlatformCallManager] iOS应用状态变化: ${AppState.currentState} -> ${nextAppState}`);
      
      if (nextAppState === 'active' && incomingCallInfo) {
        console.log('🍎 [PlatformCallManager] iOS回到前台，检查是否有待处理来电');
        // 这里可以添加检查待处理来电的逻辑
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [incomingCallInfo]);

  // 渲染来电界面
  if (isIncomingCall && incomingCallInfo) {
    return (
      <IncomingCallScreen
        contactName={incomingCallInfo.callerName || '未知联系人'}
        contactAvatar={incomingCallInfo.callerAvatar}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />
    );
  }

  return null;
};

export default PlatformCallManager;
