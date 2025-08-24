/**
 * HomSm - 上门服务实时聊天应用
 *
 * @format
 */

// 移除不再需要的polyfill
// import 'react-native-get-random-values';

import React, { useEffect, useRef } from 'react';
import {StatusBar, Platform, PermissionsAndroid} from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { FloatingCallProvider } from './context/FloatingCallContext';
import BackgroundNotificationManager from './components/BackgroundNotificationManager';
import AndroidPushService from './services/AndroidPushService';
import IOSCallService from './services/IOSCallService';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';

// 声明全局类型
declare global {
  var navigationRef: any;
  var socketRef: any;
}

function App(): React.JSX.Element {
  // 设置全局引用（由各个组件负责）
  useEffect(() => {
    console.log('🚀 [App] 应用初始化完成');
  }, []);

  // 初始化本地通知服务（原Android推送服务）
  useEffect(() => {
    console.log('🚀 [App] 初始化本地通知服务');
    AndroidPushService.initialize();
    
    // 初始化iOS通话服务
    if (Platform.OS === 'ios') {
      console.log('🍎 [App] 初始化iOS通话服务');
      IOSCallService.initialize();
    }
  }, []);

  // 检查麦克风权限状态（确保语音通话功能正常）
  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        console.log('🔍 [App] 检查麦克风权限状态...');
        
        if (Platform.OS === 'android') {
          // 检查Android麦克风权限
          const hasPermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
          );
          console.log('📱 [App] Android麦克风权限状态:', hasPermission ? '已授权' : '未授权');
          
          if (!hasPermission) {
            console.log('⚠️ [App] Android麦克风权限未授权，语音通话功能可能受影响');
          }
        } else {
          // 检查iOS麦克风权限
          const permissionStatus = await check(PERMISSIONS.IOS.MICROPHONE);
          console.log('🍎 [App] iOS麦克风权限状态:', permissionStatus);
          
          if (permissionStatus !== RESULTS.GRANTED) {
            console.log('⚠️ [App] iOS麦克风权限未授权，语音通话功能可能受影响');
          }
        }
      } catch (error) {
        console.error('❌ [App] 检查麦克风权限失败:', error);
      }
    };

    // 延迟检查权限，确保应用完全初始化
    const timer = setTimeout(checkMicrophonePermission, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      <SocketProvider>
        <FloatingCallProvider>
          <BackgroundNotificationManager />
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <AppNavigator />
        </FloatingCallProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App; 