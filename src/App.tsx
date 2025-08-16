/**
 * HomeServiceChat - 上门服务实时聊天应用
 *
 * @format
 */

// 移除不再需要的polyfill
// import 'react-native-get-random-values';

import React, { useEffect, useRef } from 'react';
import {StatusBar} from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { FloatingCallProvider } from './context/FloatingCallContext';
import BackgroundNotificationManager from './components/BackgroundNotificationManager';
import AndroidPushService from './services/AndroidPushService';

// 声明全局类型
declare global {
  var navigationRef: any;
  var socketRef: any;
}

function App(): React.JSX.Element {
  const socketRef = useRef<any>(null);

  // 设置全局引用 (移除 navigationRef，由 AppNavigator 负责)
  useEffect(() => {
    (global as any).socketRef = socketRef;
    console.log('🔗 [App] 全局Socket引用已设置');
  }, []);

  // 初始化本地通知服务（原Android推送服务）
  useEffect(() => {
    console.log('🚀 [App] 初始化本地通知服务');
    AndroidPushService.initialize();
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