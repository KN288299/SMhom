import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import {NavigationContainer, useNavigation, createNavigationContainerRef} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import { ActivityIndicator, View, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import IncomingCallScreen from '../components/IncomingCallScreen';
import GlobalFloatingCallManager from '../components/GlobalFloatingCallManager';
import { useFloatingCall } from '../context/FloatingCallContext';
import { getCurrentPlatformFeatures, getNavigationFlow } from '../config/platformFeatures';

// 导入页面和导航器
import AuthScreen from '../screens/AuthScreen';
import PhoneLoginScreen from '../screens/PhoneLoginScreen';

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

// 定义路由参数类型
export type RootStackParamList = {
  Auth: undefined;
  PhoneLogin: undefined;
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

// 全局来电管理组件（在NavigationContainer内部）
const GlobalIncomingCallManager: React.FC = () => {
  const { userInfo } = useAuth();
  const { subscribeToIncomingCalls, rejectCall, socket } = useSocket();
  const { hideFloatingCall, forceHideFloatingCall } = useFloatingCall();
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [incomingCallInfo, setIncomingCallInfo] = useState<any>(null);
  const navigation = useNavigation<any>();

  // 使用 ref 存储最新状态
  const isIncomingCallRef = useRef(isIncomingCall);
  const incomingCallInfoRef = useRef(incomingCallInfo);

  // 同步状态到 ref
  useEffect(() => {
    isIncomingCallRef.current = isIncomingCall;
    incomingCallInfoRef.current = incomingCallInfo;
  }, [isIncomingCall, incomingCallInfo]);

  // 处理来电
  const handleIncomingCall = (callData: any) => {
    console.log('🔔 [GlobalNavigator] 收到全局事件:', callData);
    
    // 检查是否是取消事件
    if (callData.eventType === 'call_cancelled') {
      console.log('🔔 [GlobalNavigator] 这是call_cancelled事件，调用handleCallCancelled');
      handleCallCancelled(callData);
      return;
    }
    
    // 正常的来电事件
    console.log('🔔 [GlobalNavigator] 这是正常来电事件');
    setIsIncomingCall(true);
    setIncomingCallInfo(callData);
  };

  // 处理来电被取消（拨打者挂断）
  const handleCallCancelled = useCallback((data: any) => {
    const { callId } = data;
    console.log('📴 [GlobalNavigator] 来电被取消:', callId);
    
    // 使用 ref 获取最新状态
    const currentIsIncomingCall = isIncomingCallRef.current;
    const currentIncomingCallInfo = incomingCallInfoRef.current;
    
    // 检查是否是当前显示的来电
    if (currentIsIncomingCall && currentIncomingCallInfo && currentIncomingCallInfo.callId === callId) {
      console.log('🔄 [GlobalNavigator] 关闭来电界面 - 拨打者已挂断');
      setIsIncomingCall(false);
      setIncomingCallInfo(null);
    }
  }, []);

  // 处理通话被拒绝（接听者拒绝）
  const handleCallRejected = useCallback((data: any) => {
    const { callId } = data;
    console.log('❌ [GlobalNavigator] 通话被拒绝:', callId);
    
    // 使用 ref 获取最新状态
    const currentIsIncomingCall = isIncomingCallRef.current;
    const currentIncomingCallInfo = incomingCallInfoRef.current;
    
    // 检查是否是当前显示的来电
    if (currentIsIncomingCall && currentIncomingCallInfo && currentIncomingCallInfo.callId === callId) {
      console.log('🔄 [GlobalNavigator] 关闭来电界面 - 已拒绝');
      setIsIncomingCall(false);
      setIncomingCallInfo(null);
    }
  }, []);

  // 处理通话结束（对方主动挂断）
  const handleCallEnded = useCallback((data: any) => {
    const { callId, enderId } = data;
    console.log('📴 [GlobalNavigator] 通话已结束:', { callId, enderId });
    
    // 强制立即隐藏悬浮窗并清理所有资源
    forceHideFloatingCall();
    
    // 使用 ref 获取最新状态
    const currentIsIncomingCall = isIncomingCallRef.current;
    const currentIncomingCallInfo = incomingCallInfoRef.current;
    
    // 检查是否是当前显示的来电
    if (currentIsIncomingCall && currentIncomingCallInfo && currentIncomingCallInfo.callId === callId) {
      console.log('🔄 [GlobalNavigator] 关闭来电界面 - 通话已结束');
      setIsIncomingCall(false);
      setIncomingCallInfo(null);
    }
  }, [forceHideFloatingCall]);

  // 接听来电
  const handleAcceptCall = () => {
    console.log('✅ [GlobalNavigator] 接听全局来电');
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
    console.log('❌ [GlobalNavigator] 拒绝全局来电');
    
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

    console.log('🔗 [GlobalNavigator] 设置全局来电监听');
    const unsubscribe = subscribeToIncomingCalls(handleIncomingCall);

    return () => {
      console.log('🧹 [GlobalNavigator] 清理全局来电监听');
      unsubscribe();
    };
  }, [userInfo, subscribeToIncomingCalls]);

  // 监听通话相关事件
  useEffect(() => {
    if (!socket || !userInfo) return;

    console.log('🔗 [GlobalNavigator] 设置通话状态监听');
    
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_ended', handleCallEnded);

    return () => {
      console.log('🧹 [GlobalNavigator] 清理通话状态监听');
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
    };
  }, [socket, userInfo, handleCallRejected, handleCallEnded]);

  // 渲染全局来电界面
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
            <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
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
      <GlobalIncomingCallManager />
      {/* 全局悬浮窗管理器 */}
      <GlobalFloatingCallManager />
    </NavigationContainer>
  );
};

export default AppNavigator; 