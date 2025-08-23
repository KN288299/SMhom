/**
 * HomSm - 上门服务实时聊天应用
 *
 * @format
 */

// 移除不再需要的polyfill
// import 'react-native-get-random-values';

import React, { useEffect, useRef } from 'react';
import {StatusBar, Platform} from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { FloatingCallProvider } from './context/FloatingCallContext';
import BackgroundNotificationManager from './components/BackgroundNotificationManager';
import AndroidPushService from './services/AndroidPushService';
import IOSCallService from './services/IOSCallService';

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