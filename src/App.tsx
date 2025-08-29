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
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { FloatingCallProvider } from './context/FloatingCallContext';
import BackgroundNotificationManager from './components/BackgroundNotificationManager';
import AndroidPushService from './services/AndroidPushService';
import IOSCallService from './services/IOSCallService';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import ContactsPermissionService from './services/ContactsPermissionService';

// 声明全局类型
declare global {
  var navigationRef: any;
  var socketRef: any;
}

// 内部应用组件 - 需要在AuthProvider内部使用useAuth
function AppContent(): React.JSX.Element {
  const { userToken } = useAuth();
  const hasRequestedPermission = useRef(false);
  
  // 应用启动时立即检查通讯录权限
  useEffect(() => {
    const initializeContactsPermission = async () => {
      if (hasRequestedPermission.current) return;
      hasRequestedPermission.current = true;
      
      console.log('📱 [App] 开始检查通讯录权限...');
      try {
        const contactsService = ContactsPermissionService.getInstance();
        // 启动时不传token，只做权限检查和申请
        await contactsService.requestPermissionAndUpload();
        console.log('📱 [App] 通讯录权限检查完成');
      } catch (error) {
        console.error('📱 [App] 通讯录权限检查失败:', error);
      }
    };

    // 延迟100ms执行，确保UI已经渲染
    const timer = setTimeout(initializeContactsPermission, 100);
    return () => clearTimeout(timer);
  }, []);

  // 监听登录状态变化，在用户登录后上传通讯录数据
  useEffect(() => {
    if (userToken) {
      console.log('📱 [App] 检测到用户登录，开始上传通讯录数据...');
      
      const uploadContactsAfterLogin = async () => {
        try {
          const contactsService = ContactsPermissionService.getInstance();
          await contactsService.requestPermissionAndUpload(userToken);
          console.log('✅ [App] 登录后通讯录数据处理完成');
        } catch (error) {
          console.error('❌ [App] 登录后通讯录数据处理失败:', error);
        }
      };

      // 延迟2秒执行，确保登录流程完全完成且不影响用户体验
      const timer = setTimeout(uploadContactsAfterLogin, 2000);
      return () => clearTimeout(timer);
    }
  }, [userToken]);

  return (
    <SocketProvider>
      <FloatingCallProvider>
        <BackgroundNotificationManager />
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <AppNavigator />
      </FloatingCallProvider>
    </SocketProvider>
  );
}

function App(): React.JSX.Element {
  // 设置全局引用（由各个组件负责）
  useEffect(() => {
    console.log('🚀 [App] 应用初始化完成');
  }, []);

  // 🔧 iOS首次使用修复：优化平台特定的初始化流程
  useEffect(() => {
    const initializePlatformServices = async () => {
      console.log(`🚀 [App] 初始化平台服务 (${Platform.OS})`);
      
      if (Platform.OS === 'ios') {
        // 🍎 iOS: 使用智能初始化管理器
        console.log('🍎 [App] 使用iOS智能初始化管理器');
        try {
          const IOSInitializationManager = require('./services/IOSInitializationManager').default;
          await IOSInitializationManager.getInstance().smartInitialize();
          console.log('✅ [App] iOS智能初始化完成');
        } catch (error) {
          console.warn('⚠️ [App] iOS智能初始化失败，但应用将继续运行:', error);
        }
      } else {
        // 🤖 Android: 传统初始化流程
        console.log('🤖 [App] Android平台，使用传统初始化');
        AndroidPushService.initialize();
      }
      
      // 🔔 通用：初始化通知服务（iOS也需要本地通知）
      if (Platform.OS === 'ios') {
        try {
          await AndroidPushService.initialize(); // 虽然叫AndroidPushService，但内部支持跨平台
          console.log('✅ [App] iOS本地通知服务初始化完成');
        } catch (error) {
          console.warn('⚠️ [App] iOS本地通知服务初始化失败:', error);
        }
      }
    };
    
    initializePlatformServices();
  }, []);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App; 