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
  const { subscribeToIncomingCalls, rejectCall, socket, releaseIncomingCallDedup } = useSocket();
  const { hideFloatingCall, forceHideFloatingCall } = useFloatingCall();
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [incomingCallInfo, setIncomingCallInfo] = useState<CallData | null>(null);
  const navigation = useNavigation<any>();

  // 使用 ref 存储最新状态
  const isIncomingCallRef = useRef(isIncomingCall);
  const incomingCallInfoRef = useRef(incomingCallInfo);
  // 记录已处理/正在处理的来电，防止重复弹出
  const handledCallIdsRef = useRef<Set<string>>(new Set());
  // 缩短本地去重TTL，避免同一callId短时间复用导致下一次来电被忽略
  const PLATFORM_HANDLED_TTL_MS = 8 * 1000;

  // 标记某个callId已被处理，带TTL自动过期
  const markCallHandled = useCallback((callId?: string) => {
    if (!callId) return;
    handledCallIdsRef.current.add(callId);
    // TTL后清理，防止集合无限增长
    setTimeout(() => {
      handledCallIdsRef.current.delete(callId);
    }, PLATFORM_HANDLED_TTL_MS);
  }, []);

  // 🔧 修复：统一的状态重置函数，确保第二次来电能正常显示
  const resetIncomingCallState = useCallback((callId?: string, reason?: string) => {
    console.log('🔧 [PlatformCallManager] 统一重置来电状态:', { callId, reason });
    
    // 强制重置来电显示状态
    setIsIncomingCall(false);
    setIncomingCallInfo(null);
    
    // 清理去重集合
    if (callId) {
      handledCallIdsRef.current.delete(callId);
      // 同步释放全局Socket去重
      releaseIncomingCallDedup(callId);
      console.log('🧹 [PlatformCallManager] 已清理去重集合:', callId);
    } else {
      // 如果没有callId，清理所有去重记录（兜底处理）
      console.log('🧹 [PlatformCallManager] 兜底清理：清理所有去重记录');
      handledCallIdsRef.current.clear();
    }
    
    // iOS特殊处理
    if (Platform.OS === 'ios') {
      IOSCallService.cancelCurrentCall();
    }
    
    console.log('✅ [PlatformCallManager] 状态重置完成，下次来电应该能正常显示');
  }, [releaseIncomingCallDedup]);

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
    
    // 🔧 修复：使用统一的重置函数
    resetIncomingCallState(callId, '来电被取消');
  }, [resetIncomingCallState]);

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
    
    // 去重：同一callId若已处理，直接忽略
    if (handledCallIdsRef.current.has(callData.callId)) {
      console.log('🛑 [PlatformCallManager] 重复的incoming_call，已忽略。callId:', callData.callId);
      return;
    }

    // 平台特定的来电处理
    if (Platform.OS === 'ios') {
      console.log('🍎 [PlatformCallManager] iOS设备，使用优化的来电处理');
      const appState = AppState.currentState;
      console.log('🍎 [PlatformCallManager] 当前应用状态:', appState);
      
      if (appState === 'active') {
        // iOS前台时立即显示，跳过所有延迟处理
        console.log('⚡ [PlatformCallManager] iOS前台，立即显示来电界面（快速路径）');
        markCallHandled(callData.callId); // 标记已处理，防止授权返回时重复
        setIsIncomingCall(true);
        setIncomingCallInfo(callData);
      } else {
        // iOS后台时使用通话服务处理
        console.log('🍎 [PlatformCallManager] iOS后台，使用iOS通话服务');
        markCallHandled(callData.callId); // 标记已处理，防止回到前台后重复
        IOSCallService.showIncomingCallNotification(callData);
      }
    } else {
      // Android设备，使用原有的全局来电显示
      console.log('🤖 [PlatformCallManager] Android设备，显示全局来电界面');
      markCallHandled(callData.callId);
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
    
    // 🔧 修复：使用统一的重置函数
    resetIncomingCallState(callId, '通话被拒绝');
  }, [resetIncomingCallState]);

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
    
    // 🔧 修复：使用统一的重置函数
    resetIncomingCallState(callId, '通话已结束');
  }, [forceHideFloatingCall, resetIncomingCallState]);

  // 接听来电
  const handleAcceptCall = () => {
    console.log('✅ [PlatformCallManager] 接听全局来电');
    setIsIncomingCall(false);
    // 清理可能存在的iOS本地来电通知（若权限弹窗期间触发了后台通知）
    if (Platform.OS === 'ios') {
      IOSCallService.cancelCurrentCall();
    }
    // 标记本次callId为已处理，避免权限弹窗返回后再次收到重复incoming_call
    if (incomingCallInfo?.callId) {
      markCallHandled(incomingCallInfo.callId);
      // 接听后立即释放全局incoming_call去重，避免下一次来电被吞
      releaseIncomingCallDedup(incomingCallInfo.callId);
    }
    
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
    // 清理iOS本地来电通知
    if (Platform.OS === 'ios') {
      IOSCallService.cancelCurrentCall();
    }
    // 标记为已处理
    if (incomingCallInfo?.callId) {
      markCallHandled(incomingCallInfo.callId);
    }
    
    setIsIncomingCall(false);
    setIncomingCallInfo(null);
    // 立即释放本地去重标记，允许同一callId（如后端复用极短时间内ID）再次弹出
    if (incomingCallInfo?.callId) {
      handledCallIdsRef.current.delete(incomingCallInfo.callId);
      // 同步释放全局Socket去重
      releaseIncomingCallDedup(incomingCallInfo.callId);
    }
  };

  // 订阅全局来电事件
  useEffect(() => {
    if (!userInfo) return;

    console.log('🔗 [PlatformCallManager] 设置全局来电监听');
    const unsubscribe = subscribeToIncomingCalls((data) => {
      // 统一入口：兼容直接转发和onAny兜底的事件
      handleIncomingCall(data);
    });

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
    // 直接监听取消事件，作为兜底，避免遗漏转发
    socket.on('call_cancelled', handleCallCancelled);

    return () => {
      console.log('🧹 [PlatformCallManager] 清理通话状态监听');
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
      socket.off('call_cancelled', handleCallCancelled);
    };
  }, [socket, userInfo, handleCallRejected, handleCallEnded, handleCallCancelled]);

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
