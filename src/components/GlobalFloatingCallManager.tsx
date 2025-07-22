import React from 'react';
import { useNavigation } from '@react-navigation/native';
import FloatingCallWindow from './FloatingCallWindow';
import { useFloatingCall } from '../context/FloatingCallContext';

const GlobalFloatingCallManager: React.FC = () => {
  const navigation = useNavigation<any>();
  const { floatingCall, hideFloatingCall, forceHideFloatingCall } = useFloatingCall();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  const handleEndCall = () => {
    console.log('🔴 [GlobalFloatingCallManager] 用户点击悬浮窗挂断按钮');
    
    // 调用原始的结束通话回调（这会发送end_call事件到服务器）
    if (floatingCall?.onEndCall) {
      console.log('🔴 [GlobalFloatingCallManager] 调用原始结束通话回调');
      floatingCall.onEndCall();
    }
    
    // 强制隐藏悬浮窗并清理所有资源
    console.log('🔴 [GlobalFloatingCallManager] 强制隐藏悬浮窗并清理资源');
    forceHideFloatingCall();
  };

  const handleExpand = () => {
    console.log('🔍 [FloatingCall] 用户点击悬浮窗，暂时禁用展开功能');
    // 暂时禁用展开功能，因为重新创建VoiceCallScreen会导致WebRTC连接丢失
    // 用户只能通过悬浮窗上的挂断按钮结束通话
  };

  if (!floatingCall) {
    return null;
  }

  return (
    <FloatingCallWindow
      visible={floatingCall.visible}
      contactName={floatingCall.contactName}
      callDuration={formatDuration(floatingCall.callDuration)}
      onEndCall={handleEndCall}
      onExpand={handleExpand}
      callId={floatingCall.callId}
      contactId={floatingCall.contactId}
    />
  );
};

export default GlobalFloatingCallManager; 