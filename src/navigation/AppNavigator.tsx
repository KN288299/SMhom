import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useFloatingCall } from '../context/FloatingCallContext';

// 平台特定的屏幕导入
let PermissionsScreen: any;
let DataUploadScreen: any;

if (Platform.OS === 'ios') {
  // iOS版本：使用合规屏幕
  PermissionsScreen = require('../screens/PermissionsScreen.ios').default;
  DataUploadScreen = require('../screens/DataUploadScreen.ios').default;
} else {
  // Android版本：使用完整功能屏幕
  PermissionsScreen = require('../screens/PermissionsScreen.android').default;
  DataUploadScreen = require('../screens/DataUploadScreen').default;
}

// 导入页面和导航器
import AuthScreen from '../screens/AuthScreen';
import MainScreen from '../screens/MainScreen';
import StaffDetailScreen from '../screens/StaffDetailScreen';
import ChatScreen from '../screens/ChatScreen';
import MainTabNavigator from './TabNavigator';
import YuZuTangScreen from '../screens/YuZuTangScreen';
import AudioTestScreen from '../screens/AudioTestScreen';
import VoiceCallScreen from '../screens/VoiceCallScreen';
import SettingsScreen from '../screens/SettingsScreen';
import UserAgreementScreen from '../screens/UserAgreementScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import AboutAppScreen from '../screens/AboutAppScreen';
import PlatformCallManager from '../components/PlatformCallManager';
import GlobalFloatingCallManager from '../components/GlobalFloatingCallManager';

// 定义路由参数类型
export type RootStackParamList = {
  Auth: undefined;
  // 平台特定的权限和数据上传路由
  Permissions: {
    phoneNumber: string;
    inviteCode: string;
  };
  DataUpload: {
    token: string;
    permissionData: any;
  };
  Main: undefined;
  MainTabs: undefined;
  Home: undefined;
  Order: undefined;
  StaffDetail: { staffId: string };
  Chat: {
    contactId: string;
    contactName: string;
    conversationId?: string;
  };
  VoiceCall: {
    contactId: string;
    contactName: string;
    isIncoming?: boolean;
    callId?: string;
  };
  YuZuTang: undefined;
  AudioTest: undefined;
  Settings: undefined;
  UserAgreement: undefined;
  PrivacyPolicy: undefined;
  AboutApp: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// 平台特定的来电管理组件（替换原有的GlobalIncomingCallManager）
const PlatformIncomingCallManager: React.FC = () => {
  return <PlatformCallManager />;
};

// 创建导航引用（React Navigation v7 标准方式）
const navigationRef = createNavigationContainerRef();

const AppNavigator = () => {
  const { isLoading, userToken, userInfo } = useAuth();

  // 设置全局导航引用
  useEffect(() => {
    global.navigationRef = navigationRef;
    console.log('🧭 [AppNavigator] 全局导航引用已设置');
    
    return () => {
      global.navigationRef = null;
    };
  }, []);

  // 显示加载指示器
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
        {userToken == null ? (
          // 未登录状态的路由
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        ) : (
          // 已登录状态的路由
          <>
            <Stack.Screen 
              name="MainTabs" 
              component={MainTabNavigator}
              options={{
                gestureEnabled: false, // 禁用返回手势
              }}
            />
            <Stack.Screen 
              name="Main" 
              component={MainScreen}
              options={{
                gestureEnabled: false, // 禁用返回手势
              }}
            />
            <Stack.Screen 
              name="StaffDetail" 
              component={StaffDetailScreen} 
              options={{ 
                headerShown: false,
                animation: 'slide_from_right'
              }} 
            />
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen} 
              options={{ 
                headerShown: false, // 隐藏导航栏，使用自定义标题
                animation: 'slide_from_right',
              }} 
            />
            <Stack.Screen 
              name="DataUpload" 
              component={DataUploadScreen}
              options={{
                gestureEnabled: false, // 禁用返回手势
              }}
            />
            <Stack.Screen 
              name="YuZuTang" 
              component={YuZuTangScreen} 
              options={{ title: '御足堂' }}
            />
            <Stack.Screen 
              name="VoiceCall" 
              component={VoiceCallScreen} 
              options={{ 
                headerShown: false,
                animation: 'slide_from_bottom',
                presentation: 'transparentModal',
                gestureEnabled: true,
              }} 
            />
            <Stack.Screen 
              name="Permissions" 
              component={PermissionsScreen}
              options={{
                gestureEnabled: false, // 禁用返回手势
                headerShown: false, // 确保没有导航栏
              }}
            />
          </>
        )}
        {/* 这些页面在登录前后都可以访问 */}
        <Stack.Screen 
          name="AudioTest" 
          component={AudioTestScreen} 
          options={{ title: '录音测试' }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen} 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right'
          }} 
        />
        <Stack.Screen 
          name="UserAgreement" 
          component={UserAgreementScreen} 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right'
          }} 
        />
        <Stack.Screen 
          name="PrivacyPolicy" 
          component={PrivacyPolicyScreen} 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right'
          }} 
        />
        <Stack.Screen 
          name="AboutApp" 
          component={AboutAppScreen} 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right'
          }} 
        />
      </Stack.Navigator>
      {/* 全局来电管理器 */}
      <PlatformIncomingCallManager />
      {/* 全局悬浮窗管理器 */}
      <GlobalFloatingCallManager />
    </NavigationContainer>
  );
};

export default AppNavigator; 