import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MessageBanner, { MessageBannerData } from './MessageBanner';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';

type RootRouteName = 'MainTabs' | 'Main' | 'Chat' | 'YuZuTang' | 'Settings' | 'AudioTest' | 'VoiceCall' | 'Auth' | 'StaffDetail' | 'DataUpload' | 'UserAgreement' | 'PrivacyPolicy' | 'AboutApp';

const MESSAGE_HIDE_MS = 4500;

const GlobalMessageBannerManager: React.FC = () => {
  const navigation = useNavigation<any>();
  const { userInfo } = useAuth();
  const { subscribeToMessages } = useSocket();

  const [visible, setVisible] = useState(false);
  const [bannerData, setBannerData] = useState<MessageBannerData | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 工具：格式化媒体预览
  const getPreviewText = useCallback((message: any): string => {
    const type = message?.messageType || message?.contentType || 'text';
    if (type === 'text') return message?.content || '新消息';
    if (type === 'voice') return '[语音]';
    if (type === 'image') return '[图片]';
    if (type === 'video') return '[视频]';
    if (type === 'location') return '[位置]';
    return '[消息]';
  }, []);

  const formatAvatarUrl = useCallback((url?: string | null) => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    // 若为相对路径，拼接BASE
    return `${API_URL.replace('/api','')}${url.startsWith('/') ? url : '/' + url}`;
  }, []);

  // 当前是否应抑制弹窗
  const shouldSuppress = useCallback((message: any): boolean => {
    try {
      const navRef = (global as any)?.navigationRef;
      const currentRoute = navRef?.getCurrentRoute ? navRef.getCurrentRoute() : undefined;
      const currentRouteName: string | undefined = currentRoute?.name;
      const params: any = (currentRoute as any)?.params || {};

      // 1) 消息列表页不弹
      if (currentRouteName === 'Message') return true;
      // 2) 正在对应聊天页不弹（若当前是Chat并且会话或联系人匹配）
      if (currentRouteName === 'Chat') {
        const sameConversation = params?.conversationId && message?.conversationId && params.conversationId === message.conversationId;
        const sameContact = params?.contactId && message?.senderId && params.contactId === message.senderId;
        if (sameConversation || sameContact) return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // 清理计时器
  const clearTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // 显示横幅
  const showBanner = useCallback((data: MessageBannerData) => {
    clearTimer();
    setBannerData(data);
    setVisible(true);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, MESSAGE_HIDE_MS);
  }, [clearTimer]);

  // 点击横幅跳转
  const handlePress = useCallback(() => {
    const data = bannerData;
    setVisible(false);
    if (!data) return;
    try {
      navigation.navigate('Chat', {
        contactId: data.contactId,
        contactName: data.contactName || '聊天',
        conversationId: data.conversationId,
        contactAvatar: data.contactAvatar || undefined,
      });
    } catch (e) {
      console.warn('导航到Chat失败:', e);
    }
  }, [bannerData, navigation]);

  // 订阅消息
  useEffect(() => {
    if (!userInfo) return;
    const unsubscribe = subscribeToMessages((message: any) => {
      // 仅在前台时弹窗（AppState active）
      if (AppState.currentState !== 'active') return;
      if (shouldSuppress(message)) return;

      // 组装展示数据
      const previewText = getPreviewText(message);
      const isFromCustomerService = message?.senderRole === 'customer_service';
      const contactName = isFromCustomerService ? '客服' : '用户';
      const data: MessageBannerData = {
        conversationId: message?.conversationId,
        contactId: message?.senderId,
        contactName,
        // 优先展示发送者头像（客服发送时显示客服头像；用户发送时显示用户头像）
        contactAvatar: formatAvatarUrl(message?.senderAvatar || message?.contactAvatar || null),
        previewText,
      };
      showBanner(data);
    });
    return unsubscribe;
  }, [userInfo, subscribeToMessages, shouldSuppress, getPreviewText, showBanner, formatAvatarUrl]);

  // AppState 变更时关闭当前横幅，避免状态错乱
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next !== 'active') {
        setVisible(false);
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  // 卸载时清理定时器
  useEffect(() => clearTimer, [clearTimer]);

  if (!visible) return null;
  return (
    <MessageBanner
      visible={visible}
      data={bannerData}
      onPress={handlePress}
    />
  );
};

export default GlobalMessageBannerManager;


