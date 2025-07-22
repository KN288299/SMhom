import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import AudioManager from '../utils/AudioManager';

interface FloatingCallState {
  visible: boolean;
  contactName: string;
  contactId: string;
  callId: string;
  callDuration: number;
  onEndCall?: () => void;
  // WebRTC相关状态
  peerConnection?: any;
  localStream?: any;
  remoteStream?: any;
  callStatus?: string;
  webrtcConnected?: boolean;
  conversationId?: string;
  contactAvatar?: string;
  // 计时器引用
  timerRef?: NodeJS.Timeout | null;
}

interface FloatingCallContextType {
  floatingCall: FloatingCallState | null;
  showFloatingCall: (callInfo: Omit<FloatingCallState, 'visible'>) => void;
  hideFloatingCall: () => void;
  updateCallDuration: (duration: number) => void;
  isFloatingCallVisible: boolean;
  forceCleanupWebRTC: () => void;
  forceHideFloatingCall: () => void;
}

const FloatingCallContext = createContext<FloatingCallContextType | undefined>(undefined);

interface FloatingCallProviderProps {
  children: ReactNode;
}

export const FloatingCallProvider: React.FC<FloatingCallProviderProps> = ({ children }) => {
  const [floatingCall, setFloatingCall] = useState<FloatingCallState | null>(null);

  const showFloatingCall = (callInfo: Omit<FloatingCallState, 'visible'>) => {
    console.log('📱 [FloatingCall] 显示悬浮窗:', callInfo);
    setFloatingCall({
      ...callInfo,
      visible: true,
    });
  };

  const hideFloatingCall = () => {
    console.log('📱 [FloatingCall] 隐藏悬浮窗并清理WebRTC资源');
    
    // 在重置状态之前先清理WebRTC资源
    if (floatingCall) {
      console.log('📱 [FloatingCall] 开始清理WebRTC资源');
      cleanupWebRTCResources(floatingCall);
    }
    
    // 重置状态
    setFloatingCall(null);
  };

  const forceCleanupWebRTC = () => {
    console.log('🧹 [FloatingCall] 强制清理WebRTC资源');
    
    if (!floatingCall) {
      console.log('🧹 [FloatingCall] 没有悬浮窗状态，跳过清理');
      return;
    }

    cleanupWebRTCResources(floatingCall);
  };

  // 独立的清理函数，不依赖状态
  const cleanupWebRTCResources = (callState: FloatingCallState) => {
    try {
      console.log('🧹 [FloatingCall] 执行WebRTC资源清理');

      // 停止音频管理
      AudioManager.stopAll();
      console.log('🧹 [FloatingCall] 已停止音频管理');

      // 清理计时器
      if (callState.timerRef) {
        console.log('🧹 [FloatingCall] 清理计时器');
        clearInterval(callState.timerRef);
      }

      // 停止本地媒体流
      if (callState.localStream) {
        console.log('🧹 [FloatingCall] 停止本地媒体流');
        callState.localStream.getTracks().forEach((track: any) => {
          track.stop();
          console.log('🧹 [FloatingCall] 已停止轨道:', track.kind);
        });
      }

      // 关闭PeerConnection
      if (callState.peerConnection) {
        console.log('🧹 [FloatingCall] 关闭PeerConnection');
        callState.peerConnection.close();
        console.log('🧹 [FloatingCall] PeerConnection已关闭');
      }

      console.log('🧹 [FloatingCall] WebRTC资源清理完成');
    } catch (error) {
      console.error('🧹 [FloatingCall] 清理WebRTC资源时出错:', error);
    }
  };

  // 立即清理并隐藏悬浮窗的函数
  const forceHideFloatingCall = () => {
    console.log('📱 [FloatingCall] 强制立即隐藏悬浮窗');
    
    // 如果有悬浮窗状态，先清理资源
    if (floatingCall) {
      cleanupWebRTCResources(floatingCall);
    }
    
    // 立即重置状态
    setFloatingCall(null);
  };

  const updateCallDuration = (duration: number) => {
    setFloatingCall(prev => {
      if (!prev) return null;
      return {
        ...prev,
        callDuration: duration,
      };
    });
  };

  const isFloatingCallVisible = floatingCall?.visible === true;

  const value: FloatingCallContextType = {
    floatingCall,
    showFloatingCall,
    hideFloatingCall,
    updateCallDuration,
    isFloatingCallVisible,
    forceCleanupWebRTC,
    forceHideFloatingCall,
  };

  return (
    <FloatingCallContext.Provider value={value}>
      {children}
    </FloatingCallContext.Provider>
  );
};

export const useFloatingCall = (): FloatingCallContextType => {
  const context = useContext(FloatingCallContext);
  if (!context) {
    throw new Error('useFloatingCall must be used within a FloatingCallProvider');
  }
  return context;
};

export { FloatingCallContext }; 