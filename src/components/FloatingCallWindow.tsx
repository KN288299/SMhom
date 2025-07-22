import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSocket } from '../context/SocketContext';

interface FloatingCallWindowProps {
  visible: boolean;
  contactName: string;
  callDuration: string;
  onEndCall: () => void;
  onExpand: () => void;
  callId?: string;
  contactId?: string;
}

const FloatingCallWindow: React.FC<FloatingCallWindowProps> = ({
  visible,
  contactName,
  callDuration,
  onEndCall,
  onExpand,
  callId,
  contactId,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const { socket } = useSocket();
  
  // 悬浮窗位置动画
  const pan = useRef(new Animated.ValueXY({ x: screenWidth - 130, y: 100 })).current;
  
  // 拖动手势处理
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gestureState) => {
        // 限制悬浮窗在屏幕内
        const newX = Math.max(10, Math.min(screenWidth - 130, gestureState.moveX - 60));
        const newY = Math.max(50, Math.min(screenHeight - 130, gestureState.moveY - 60));
        
        Animated.spring(pan, {
          toValue: { x: newX, y: newY },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  // 监听通话结束事件，确保悬浮窗能及时响应
  useEffect(() => {
    if (!socket || !visible || !callId) return;

    console.log('🔗 [FloatingCallWindow] 设置通话结束监听, callId:', callId);

    const handleCallEnded = (data: any) => {
      console.log('🔴 [FloatingCallWindow] 收到通话结束事件:', data);
      
      // 检查是否是当前通话
      if (data.callId === callId) {
        console.log('🔴 [FloatingCallWindow] 当前通话已结束，调用onEndCall');
        onEndCall();
      }
    };

    const handleCallRejected = (data: any) => {
      console.log('❌ [FloatingCallWindow] 收到通话拒绝事件:', data);
      
      // 检查是否是当前通话
      if (data.callId === callId) {
        console.log('❌ [FloatingCallWindow] 当前通话被拒绝，调用onEndCall');
        onEndCall();
      }
    };

    const handleCallCancelled = (data: any) => {
      console.log('🚫 [FloatingCallWindow] 收到通话取消事件:', data);
      
      // 检查是否是当前通话
      if (data.callId === callId) {
        console.log('🚫 [FloatingCallWindow] 当前通话被取消，调用onEndCall');
        onEndCall();
      }
    };

    // 使用onAny作为备用监听，确保不遗漏任何通话结束事件
    const handleAnyEvent = (eventName: string, data: any) => {
      if (eventName.includes('call_') && eventName.includes('end') || 
          eventName.includes('call_') && eventName.includes('reject') ||
          eventName.includes('call_') && eventName.includes('cancel')) {
        console.log(`🔍 [FloatingCallWindow] 通过onAny捕获到事件: ${eventName}`, data);
        
        if (data && data.callId === callId) {
          console.log(`🔍 [FloatingCallWindow] 匹配当前通话ID，调用onEndCall`);
          onEndCall();
        }
      }
    };

    // 监听通话结束相关事件
    socket.on('call_ended', handleCallEnded);
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_cancelled', handleCallCancelled);
    
    // 备用监听器，确保捕获所有可能的事件
    socket.onAny(handleAnyEvent);

    // 清理监听器
    return () => {
      console.log('🧹 [FloatingCallWindow] 清理通话事件监听');
      socket.off('call_ended', handleCallEnded);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_cancelled', handleCallCancelled);
      socket.offAny(handleAnyEvent);
    };
  }, [socket, visible, callId, onEndCall]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.floatingContainer,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
          ],
        }
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.expandArea}>
        <Text style={styles.contactName} numberOfLines={1}>
          {contactName}
        </Text>
        <Text style={styles.duration}>
          {callDuration}
        </Text>
      </View>
      
      <View style={styles.buttonsRow}>
        <TouchableOpacity 
          style={styles.endButton}
          onPress={onEndCall}
        >
          <Icon name="call" size={18} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 20,
    backgroundColor: 'rgba(42, 42, 42, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 9999,
  },
  expandArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  duration: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  endButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FloatingCallWindow; 