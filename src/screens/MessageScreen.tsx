import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import axios from 'axios';
import { API_URL, API_ENDPOINTS, BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { iOSMainHeaderStyles, getPlatformStyles } from '../styles/iOSStyles';

interface MessageScreenProps {
  navigation: any;
}

interface User {
  _id: string;
  phoneNumber: string;
  name?: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  conversationId?: string;
  lastMessageTimestamp?: Date;
  isNewOnline?: boolean; // 新增：标记是否为新上线用户
  onlineTimestamp?: Date; // 新增：用户上线时间戳
  createdAt?: string; // 新增：用户注册时间
}

const MessageScreen: React.FC<MessageScreenProps> = ({ navigation }) => {
  const { userInfo, userToken, isCustomerService } = useAuth();
  const { subscribeToMessages, unreadMessageCount, socket } = useSocket();
  const [contacts, setContacts] = useState<User[]>([]);
  const [loading, setLoading] = useState(false); // 🚀 优化：初始不显示loading
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 🚀 性能优化：分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [newOnlineUsers, setNewOnlineUsers] = useState<Set<string>>(new Set()); // 记录新上线的用户ID
  
  // 🆕 新增：静默更新状态
  const [isUpdatingInBackground, setIsUpdatingInBackground] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // 🆕 检查是否为最近注册的用户（5分钟内）
  const isRecentlyRegistered = useCallback((user: User) => {
    if (!user.createdAt) return false;
    const createdTime = new Date(user.createdAt).getTime();
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000); // 5分钟前
    return createdTime > fiveMinutesAgo;
  }, []);

  // 🔧 统一的联系人排序函数 - 确保所有地方使用相同的排序逻辑
  const sortContacts = useCallback((contacts: User[]) => {
    return contacts.sort((a, b) => {
      // 判断是否为新用户（Socket上线 或 最近注册）
      const isNewUserA = a.isNewOnline || isRecentlyRegistered(a);
      const isNewUserB = b.isNewOnline || isRecentlyRegistered(b);
      
      // 第1优先级：新用户（上线或注册）排在最前面
      if (isNewUserA && !isNewUserB) return -1;
      if (!isNewUserA && isNewUserB) return 1;
      
      // 如果都是新用户，按优先级排序
      if (isNewUserA && isNewUserB) {
        // 先按Socket上线时间排序（最新的在前）
        if (a.isNewOnline && b.isNewOnline && a.onlineTimestamp && b.onlineTimestamp) {
          return b.onlineTimestamp.getTime() - a.onlineTimestamp.getTime();
        }
        // 如果其中一个是Socket上线，优先显示
        if (a.isNewOnline && !b.isNewOnline) return -1;
        if (!a.isNewOnline && b.isNewOnline) return 1;
        // 都是新注册的，按注册时间排序（最新的在前）
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      }
      
      // 第2优先级：有未读消息的排在前面
      if (a.unreadCount && !b.unreadCount) return -1;
      if (!a.unreadCount && b.unreadCount) return 1;
      
      // 第3优先级：按最后消息时间排序
      if (a.lastMessageTimestamp && b.lastMessageTimestamp) {
        return new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime();
      }
      if (a.lastMessageTimestamp && !b.lastMessageTimestamp) return -1;
      if (!a.lastMessageTimestamp && b.lastMessageTimestamp) return 1;
      
      // 第4优先级：按注册时间排序（最新注册的在前）
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (a.createdAt && !b.createdAt) return -1;
      if (!a.createdAt && b.createdAt) return 1;
      
      // 第5优先级：按名称排序
      const nameA = a.name || a.phoneNumber || '';
      const nameB = b.name || b.phoneNumber || '';
      return nameA.localeCompare(nameB);
    });
  }, [isRecentlyRegistered]);

  // 🚀 性能优化：分页获取联系人列表
  const fetchContacts = useCallback(async (page = 1, isSilentUpdate: boolean = false) => {
    try {
      if (isSilentUpdate) {
        console.log('🔄 静默更新联系人列表...');
        setIsUpdatingInBackground(true);
      } else {
        console.log(`📄 正在获取联系人列表 - 第${page}页`);
        setLoading(true);
      }
      setError(null);
      
      // 根据用户类型决定获取的列表
      const endpoint = isCustomerService() 
        ? API_ENDPOINTS.USER_LIST // 客服查看用户列表
        : API_ENDPOINTS.ACTIVE_CUSTOMER_SERVICE_LIST; // 用户查看活跃客服列表
      
      // 🚀 性能优化：添加分页参数（首次加载第一页）
      const params = new URLSearchParams({
        page: page.toString(),
        limit: isCustomerService() ? '20' : '50' // 客服看用户分页更小，用户看客服可以多一些
      });
      
      console.log(`📄 正在获取联系人列表 - 端点: ${endpoint}, 第${page}页`);
      
      // 确保使用正确的令牌
      const response = await axios.get(`${API_URL}${endpoint}?${params}`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      
      // 🚀 性能优化：处理分页响应数据
      if (response.data) {
        let contactList = [];
        let pagination = null;
        
        // 根据API返回的数据结构处理
        if (Array.isArray(response.data)) {
          // 旧格式兼容：直接数组（在线客服列表）
          contactList = response.data;
          console.log(`📱 获取到在线客服: ${contactList.length}个`);
        } else {
          // 新格式：分页数据
          if (response.data.users && Array.isArray(response.data.users)) {
            contactList = response.data.users;
            pagination = response.data.pagination;
          } else if (response.data.customerServices && Array.isArray(response.data.customerServices)) {
            contactList = response.data.customerServices;
            pagination = response.data.pagination;
          } else {
            console.warn('⚠️ 响应数据格式异常:', response.data);
            contactList = [];
          }
        }
        
        // 🚀 性能优化：更新分页状态
        if (pagination) {
          setCurrentPage(pagination.currentPage);
          setTotalPages(pagination.totalPages);
          setTotalCount(pagination.totalCount);
          setHasNextPage(pagination.hasNext);
          console.log(`📊 分页信息: 第${pagination.currentPage}页/${pagination.totalPages}页, 共${pagination.totalCount}条记录`);
        } else {
          // 非分页数据（如在线客服列表）
          setCurrentPage(1);
          setTotalPages(1);
          setTotalCount(contactList.length);
          setHasNextPage(false);
        }
        
        console.log(`✅ 获取到 ${contactList.length} 个联系人`);
        
        // 获取现有会话信息，增强联系人数据
        const enhancedContacts = await enhanceContactsWithConversations(contactList);
        
        // 标记新上线的用户并按优先级排序
        const contactsWithNewStatus = enhancedContacts.map(contact => ({
          ...contact,
          isNewOnline: newOnlineUsers.has(contact._id),
          onlineTimestamp: newOnlineUsers.has(contact._id) ? new Date() : undefined
        }));

        // 智能排序：新用户 > 未读消息 > 最近消息 > 其他
        const sortedContacts = sortContacts(contactsWithNewStatus);
        
        setContacts(sortedContacts);
        setLastUpdateTime(new Date());
        
        // 缓存联系人列表，根据用户ID保存
        if (userInfo && userInfo._id) {
          await AsyncStorage.setItem(
            `contacts_${userInfo._id}`,
            JSON.stringify({
              data: enhancedContacts,
              timestamp: Date.now(),
              pagination: pagination
            })
          );
          console.log('联系人列表已缓存');
        }
      }
      
    } catch (error: any) {
      console.error('获取联系人列表失败:', error.response?.data || error.message);
      if (!isSilentUpdate) {
        setError('获取联系人失败，请检查网络连接');
        // 尝试从缓存加载
        await loadContactsFromCache();
      }
      // 静默更新失败时不显示错误，只记录日志
    } finally {
      if (isSilentUpdate) {
        setIsUpdatingInBackground(false);
      } else {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [userInfo, userToken, isCustomerService, sortContacts]);

  // 增强联系人数据，添加会话ID信息
  const enhanceContactsWithConversations = useCallback(async (contacts: User[]) => {
    try {
      // 如果没有用户信息或者没有联系人，直接返回原数据
      if (!userInfo || !contacts.length) return contacts;
      
      // 尝试获取会话信息
      const enhancedContacts = [...contacts];
      
      // 对每个联系人查找会话
      for (const contact of enhancedContacts) {
        let userId, customerServiceId;
        
        if (isCustomerService()) {
          customerServiceId = userInfo._id;
          userId = contact._id;
        } else {
          userId = userInfo._id;
          customerServiceId = contact._id;
        }
        
        try {
          // 查找会话
          const response = await axios.get(
            `${API_URL}/conversations/find/${userId}/${customerServiceId}`,
            {
              headers: { Authorization: `Bearer ${userToken}` }
            }
          );
          
          if (response.data && response.data._id) {
            contact.conversationId = response.data._id;
            
            // 如果有未读消息计数，更新到联系人信息中
            if (isCustomerService()) {
              contact.unreadCount = response.data.unreadCountCS || 0;
              console.log(`[客服端] 联系人 ${contact.name || contact.phoneNumber} 未读计数: ${contact.unreadCount} (服务器返回 unreadCountCS: ${response.data.unreadCountCS})`);
            } else {
              contact.unreadCount = response.data.unreadCountUser || 0;
              console.log(`[用户端] 联系人 ${contact.name || contact.phoneNumber} 未读计数: ${contact.unreadCount} (服务器返回 unreadCountUser: ${response.data.unreadCountUser})`);
            }
            
            // 更新最后消息
            if (response.data.lastMessage) {
              contact.lastMessage = response.data.lastMessage;
              contact.lastMessageTime = formatTime(new Date(response.data.lastMessageTime));
              contact.lastMessageTimestamp = new Date(response.data.lastMessageTime);
            }
          }
        } catch (error) {
          // 没找到会话不需要特殊处理
          console.log(`没有找到用户 ${contact._id} 的会话`);
        }
      }
      
      return enhancedContacts;
      
    } catch (error) {
      console.error('增强联系人数据失败:', error);
      return contacts;  // 返回原始数据
    }
  }, [userInfo, userToken, isCustomerService]);

  // 🚀 性能优化：加载更多联系人
  const loadMoreContacts = useCallback(async () => {
    if (!hasNextPage || loadingMore || loading) {
      console.log('📄 无法加载更多:', { hasNextPage, loadingMore, loading });
      return;
    }

    const nextPage = currentPage + 1;
    console.log(`📄 加载第${nextPage}页联系人...`);
    
    try {
      setLoadingMore(true);
      
      const endpoint = isCustomerService() 
        ? API_ENDPOINTS.USER_LIST 
        : API_ENDPOINTS.ACTIVE_CUSTOMER_SERVICE_LIST;
      
      const params = new URLSearchParams({
        page: nextPage.toString(),
        limit: isCustomerService() ? '20' : '50'
      });
      
      const response = await axios.get(`${API_URL}${endpoint}?${params}`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      
      if (response.data) {
        let newContacts = [];
        let pagination = null;
        
        if (Array.isArray(response.data)) {
          newContacts = response.data;
        } else if (response.data.users && Array.isArray(response.data.users)) {
          newContacts = response.data.users;
          pagination = response.data.pagination;
        } else if (response.data.customerServices && Array.isArray(response.data.customerServices)) {
          newContacts = response.data.customerServices;
          pagination = response.data.pagination;
        }
        
        if (newContacts.length > 0) {
          // 增强新联系人数据
          const enhancedNewContacts = await enhanceContactsWithConversations(newContacts);
          
          // 合并到现有联系人列表
          const allContacts = [...contacts, ...enhancedNewContacts];
          const sortedContacts = sortContacts(allContacts);
          setContacts(sortedContacts);
          
          // 更新分页状态
          if (pagination) {
            setCurrentPage(pagination.currentPage);
            setTotalPages(pagination.totalPages);
            setHasNextPage(pagination.hasNext);
            console.log(`📊 加载第${pagination.currentPage}页/${pagination.totalPages}页成功`);
          }
          
          // 更新缓存
          if (userInfo && userInfo._id) {
            await AsyncStorage.setItem(
              `contacts_${userInfo._id}`,
              JSON.stringify({
                data: allContacts,
                timestamp: Date.now()
              })
            );
          }
        }
      }
    } catch (error) {
      console.error('❌ 加载更多联系人失败:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, hasNextPage, loadingMore, loading, contacts, isCustomerService, userToken, userInfo, enhanceContactsWithConversations, sortContacts]);

  // 从缓存加载联系人列表
  const loadContactsFromCache = async () => {
    try {
      if (!userInfo || !userInfo._id) return false;
      
      const cachedData = await AsyncStorage.getItem(`contacts_${userInfo._id}`);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const ageInMinutes = (Date.now() - timestamp) / (1000 * 60);
        
        // 如果缓存不超过10分钟，使用缓存数据
        if (ageInMinutes < 10 && data && data.length > 0) {
          console.log(`使用缓存的联系人数据 (${data.length}条)`);
          setContacts(data);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('加载缓存联系人失败:', error);
      return false;
    }
  };

  // 格式化时间：今天显示时间，其他显示日期
  const formatTime = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (messageDate.getTime() === today.getTime()) {
      // 今天，显示时间
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (now.getFullYear() === date.getFullYear()) {
      // 今年，显示月日
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    } else {
      // 其他，显示年月日
      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    }
  };

  // 防抖刷新函数 - 避免频繁的网络请求
  const debouncedRefresh = useCallback(() => {
    // 清除之前的定时器
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // 设置新的定时器
    refreshTimeoutRef.current = setTimeout(() => {
      console.log('🔄 [MessageScreen] 防抖刷新联系人列表');
      fetchContacts();
    }, 1000); // 1秒防抖延迟
  }, [fetchContacts]);

  // 🔧 iOS首次使用修复：监听Socket事件 - 实时更新用户列表，加强iOS连接稳定性
  useEffect(() => {
    if (!socket || !isCustomerService()) return;

    console.log('📡 [MessageScreen] 客服端开始监听用户上线/下线事件');
    
    // 🍎 iOS优化：监听Socket连接状态，确保事件监听器在重连后正常工作
    const handleSocketConnect = () => {
      console.log('✅ [MessageScreen] Socket重新连接，事件监听器已就绪');
      // Socket重连后，事件监听器会自动重新设置（由于useEffect的依赖）
    };
    
    const handleSocketDisconnect = (reason: string) => {
      console.log('⚠️ [MessageScreen] Socket连接断开:', reason);
      if (Platform.OS === 'ios' && reason === 'transport close') {
        console.log('🍎 [MessageScreen] iOS检测到传输层断开，准备重连...');
      }
    };
    
    // 监听Socket连接状态（iOS特别需要）
    socket.on('connect', handleSocketConnect);
    socket.on('disconnect', handleSocketDisconnect);

    // 监听用户上线事件
    const handleUserOnline = (data: { userId: string; timestamp: Date }) => {
      console.log('📢 [MessageScreen] 收到用户上线通知:', data);
      
      // 标记为新上线用户
      setNewOnlineUsers(prev => new Set([...prev, data.userId]));
      console.log('🆕 [MessageScreen] 标记新用户:', data.userId);
      
      // 只有客服端才需要刷新列表以显示新用户
      if (isCustomerService()) {
        console.log('🔄 [MessageScreen] 客服端检测到新用户上线，刷新列表');
        debouncedRefresh();
      }
      
      // 5分钟后移除新用户标记
      setTimeout(() => {
        setNewOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          console.log('⏰ [MessageScreen] 移除新用户标记:', data.userId);
          return newSet;
        });
      }, 5 * 60 * 1000); // 5分钟
    };

    // 监听用户下线事件
    const handleUserOffline = (data: { userId: string; timestamp: Date }) => {
      console.log('📢 [MessageScreen] 收到用户下线通知:', data);
      // 用户下线时可以选择不刷新，或者更新在线状态
      console.log('用户下线，暂不刷新列表');
    };

    // 监听新消息事件 - 当有新消息时也刷新列表以更新未读计数
    // 注意：这里不需要刷新整个列表，因为subscribeToMessages已经处理了消息更新
    const handleNewMessage = () => {
      console.log('📢 [MessageScreen] 收到新消息，但不需要刷新列表（由subscribeToMessages处理）');
      // 移除这里的刷新，避免重复处理
      // debouncedRefresh();
    };

    // 注册事件监听器
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);
    socket.on('receive_message', handleNewMessage);

    // 清理函数
    return () => {
      console.log('📡 [MessageScreen] 清理Socket事件监听器');
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);  
      socket.off('receive_message', handleNewMessage);
      socket.off('connect', handleSocketConnect);       // 🔧 新增：清理连接监听器
      socket.off('disconnect', handleSocketDisconnect); // 🔧 新增：清理断开监听器
      
      // 清理防抖定时器
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [socket, isCustomerService, debouncedRefresh]);

  // 首次加载和刷新时获取数据
  useEffect(() => {
    const initialize = async () => {
      console.log('🚀 初始化MessageScreen...');
      
      // 先尝试从缓存加载
      const loadedFromCache = await loadContactsFromCache();
      
      if (loadedFromCache) {
        console.log('✅ 从缓存加载成功，立即显示数据');
        // 缓存加载成功，立即显示，不显示loading
        // 在后台静默更新最新数据
        setTimeout(() => {
          fetchContacts(1, true).catch(console.error);
        }, 1000); // 延迟1秒开始后台更新
      } else {
        console.log('❌ 缓存加载失败，从网络获取');
        // 缓存失败，显示loading并从网络获取
        fetchContacts();
      }
    };
    
    initialize();
  }, [fetchContacts]);

  // 页面聚焦时刷新数据
  useFocusEffect(
    useCallback(() => {
      // 当页面获得焦点时，静默更新联系人列表
      console.log('MessageScreen获得焦点，静默更新数据');
      fetchContacts(1, true).catch(console.error);
    }, [fetchContacts])
  );

  // 监听实时消息，更新聊天列表
  useEffect(() => {
    const unsubscribe = subscribeToMessages((message: any) => {
      console.log('📨 [MessageScreen] 收到新消息，更新联系人列表');
      
      // 更新对应联系人的最后一条消息和未读计数
      setContacts(prevContacts => {
        let hasChanges = false;
        const updatedContacts = prevContacts.map(contact => {
          // 判断消息是否属于这个联系人的会话
          const isContactMessage = 
            message.conversationId === contact.conversationId ||
            message.senderId === contact._id ||
            message.receiverId === contact._id;
          
          if (isContactMessage) {
            hasChanges = true;
            let newUnreadCount = contact.unreadCount || 0;
            
            // 如果消息不是当前用户发送的，增加未读计数
            if (message.senderId !== userInfo?._id) {
              newUnreadCount += 1;
              console.log(`📨 [MessageScreen] 联系人 ${contact.name || contact.phoneNumber} 未读计数增加: ${newUnreadCount}`);
            }
            
            return {
              ...contact,
              lastMessage: getLastMessageText(message),
              lastMessageTime: formatTime(new Date(message.timestamp)),
              unreadCount: newUnreadCount,
              lastMessageTimestamp: new Date(message.timestamp) // 用于排序
            };
          }
          
          return contact;
        });
        
        // 只有在有变化时才重新排序，避免不必要的计算
        if (hasChanges) {
          console.log('🔄 [MessageScreen] 联系人列表有变化，重新排序');
          return sortContacts(updatedContacts);
        }
        
        return updatedContacts;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [subscribeToMessages, userInfo?._id, sortContacts]);

  // 获取最后一条消息的显示文本
  const getLastMessageText = (message: any) => {
    switch (message.messageType) {
      case 'voice':
        return '[语音消息]';
      case 'image':
        return '[图片消息]';
      case 'video':
        return '[视频消息]';
      case 'text':
      default:
        return message.content || '新消息';
    }
  };

  // 下拉刷新
  const onRefresh = () => {
    setRefreshing(true);
    fetchContacts(1, false); // 下拉刷新时显示loading
  };

  // 清除服务器端未读计数
  const clearServerUnreadCount = async (conversationId: string) => {
    try {
      console.log('🧹 [MessageScreen] 清除服务器端未读计数');
      console.log('  会话ID:', conversationId);
      console.log('  用户角色:', isCustomerService() ? '客服' : '用户');
      console.log('  用户ID:', userInfo?._id);
      
      // 调用API清除未读消息
      const response = await axios.put(
        `${BASE_URL}/api/messages/conversation/${conversationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ [MessageScreen] 服务器端未读计数已清除:', response.data);
      
      // 清除未读后立即刷新联系人列表，确保显示最新状态
      console.log('🔄 [MessageScreen] 刷新联系人列表以更新未读状态');
      
      // 清除缓存并刷新数据
      if (userInfo && userInfo._id) {
        await AsyncStorage.removeItem(`contacts_${userInfo._id}`);
        console.log('📤 [MessageScreen] 联系人缓存已清除');
      }
      
      setTimeout(() => {
        fetchContacts();
      }, 300); // 稍微延迟确保服务器数据已更新
      
    } catch (error: any) {
      console.error('❌ [MessageScreen] 清除服务器端未读计数失败:', error.response?.data || error.message);
      console.error('  错误状态码:', error.response?.status);
      console.error('  请求URL:', `${BASE_URL}/api/messages/conversation/${conversationId}/read`);
    }
  };

  // 点击联系人
  const handleContactPress = (contact: User) => {
    // 清除该联系人的未读计数
    setContacts(prevContacts => {
      return prevContacts.map(c => 
        c._id === contact._id ? { ...c, unreadCount: 0 } : c
      );
    });
    
    // 如果有会话ID，清除服务器端未读计数
    if (contact.conversationId) {
      clearServerUnreadCount(contact.conversationId);
    }
    
    // 导航到聊天页面，优先使用已知的会话ID
    console.log('点击联系人:', contact);
    navigation.navigate('Chat', { 
      contactId: contact._id, 
      contactName: contact.name || contact.phoneNumber,
      conversationId: contact.conversationId, // 如果有会话ID，直接传递
      contactAvatar: contact.avatar ? BASE_URL + contact.avatar : null // 传递联系人头像
    });
    
    // 如果已知会话ID，预加载消息
    if (contact.conversationId) {
      preloadMessages(contact.conversationId);
    }
  };
  
  // 预加载会话的消息
  const preloadMessages = async (conversationId: string) => {
    try {
      // 在后台获取消息，不影响用户体验
      console.log(`预加载会话 ${conversationId} 的消息...`);
      const response = await axios.get(`${API_URL}/messages/${conversationId}`, {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });
      
      if (response.data && response.data.messages) {
        // 将消息存入缓存
        await AsyncStorage.setItem(
          `messages_${conversationId}_${userInfo._id}`,
          JSON.stringify({
            data: response.data.messages,
            timestamp: Date.now()
          })
        );
        console.log(`已缓存会话 ${conversationId} 的消息，共 ${response.data.messages.length} 条`);
      }
    } catch (error) {
      console.error('预加载消息失败:', error);
    }
  };

  // 渲染联系人项
  const renderContactItem = ({ item }: { item: User }) => {
    // 构建头像URL
    const avatarUrl = item.avatar ? BASE_URL + item.avatar : null;
    
    // 🆕 检查是否为新用户（Socket上线 或 最近注册）
    const isNewUser = item.isNewOnline || isRecentlyRegistered(item);
    const newUserLabel = item.isNewOnline ? '刚上线' : isRecentlyRegistered(item) ? '新注册' : '';
    const newUserMessage = item.isNewOnline ? 
      '新用户刚上线，快来打个招呼吧！' : 
      isRecentlyRegistered(item) ? 
      '新用户刚注册，欢迎联系！' : 
      '暂无消息';
    
    return (
      <TouchableOpacity 
        style={[
          styles.contactItem,
          isNewUser && styles.newUserItem // 新用户高亮背景
        ]}
        onPress={() => handleContactPress(item)}
      >
        <View style={styles.avatarContainer}>
          <Image 
            source={
              avatarUrl 
                ? { uri: avatarUrl }
                : require('../assets/images/moren.png') // 使用默认头像
            }
            style={styles.avatar}
            onError={() => {
              console.error('头像加载失败:', avatarUrl);
              // 头像加载失败时的处理可以在这里添加
            }}
          />
          {/* 新用户指示器 */}
          {isNewUser && (
            <View style={styles.newUserIndicator}>
              <Text style={styles.newUserIndicatorText}>新</Text>
            </View>
          )}
        </View>
        <View style={styles.contactInfo}>
          <View style={styles.contactHeader}>
            <View style={styles.nameContainer}>
              <Text style={styles.contactName}>{item.name || item.phoneNumber}</Text>
              {/* 新用户标签 */}
              {isNewUser && (
                <View style={styles.newUserBadge}>
                  <Text style={styles.newUserBadgeText}>{newUserLabel}</Text>
                </View>
              )}
            </View>
            <Text style={styles.messageTime}>{item.lastMessageTime || ''}</Text>
          </View>
          <View style={styles.messageContainer}>
            <Text style={[
              styles.lastMessage,
              isNewUser && styles.newUserMessage
            ]} numberOfLines={1}>
              {item.lastMessage || newUserMessage}
            </Text>
            {item.unreadCount && item.unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <View style={getPlatformStyles(iOSMainHeaderStyles.headerContainer, styles.header)}>
        <Text style={getPlatformStyles(iOSMainHeaderStyles.headerTitle, styles.headerTitle)}>
          {isCustomerService() ? '用户列表' : '客服列表'}
        </Text>
      </View>
      
      {/* 🆕 静默更新指示器 */}
      {(isUpdatingInBackground || lastUpdateTime) && (
        <View style={styles.updateIndicator}>
          {isUpdatingInBackground ? (
            <View style={styles.updatingContainer}>
              <ActivityIndicator size="small" color="#ff6b81" />
              <Text style={styles.updatingText}>正在更新...</Text>
            </View>
          ) : (
            <Text style={styles.lastUpdateText}>
              最后更新: {lastUpdateTime?.toLocaleTimeString()}
            </Text>
          )}
        </View>
      )}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6b81" />
        </View>
      ) : error && contacts.length === 0 ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchContacts()}>
            <Text style={styles.retryText}>重试</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContactItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#ff6b81']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {isCustomerService() ? '暂无用户' : '暂无客服'}
              </Text>
            </View>
          }
          // 🚀 性能优化：分页加载更多
          onEndReached={loadMoreContacts}
          onEndReachedThreshold={0.1}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#ff6b81" />
                <Text style={styles.loadMoreText}>加载更多...</Text>
              </View>
            ) : hasNextPage ? (
              <TouchableOpacity 
                style={styles.loadMoreButton} 
                onPress={loadMoreContacts}
              >
                <Text style={styles.loadMoreButtonText}>
                  点击加载更多 ({totalCount - contacts.length}条)
                </Text>
              </TouchableOpacity>
            ) : totalCount > 0 ? (
              <View style={styles.endContainer}>
                <Text style={styles.endText}>
                  已显示全部 {totalCount} 条记录
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    height: 80,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 44 : 30, // 为状态栏留出空间
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flexGrow: 1,
  },
  contactItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  contactInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
  },
  newUserItem: {
    backgroundColor: '#f0f9ff', // 浅蓝色背景
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6', // 蓝色左边框
  },
  newUserIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444', // 红色背景
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  newUserIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  newUserBadge: {
    backgroundColor: '#10b981', // 绿色背景
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  newUserBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  newUserMessage: {
    color: '#059669', // 绿色文字
    fontStyle: 'italic',
  },
  messageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#ff6b81',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ff6b81',
    borderRadius: 20,
  },
  retryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // 🚀 性能优化：分页加载样式
  loadMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#f5f5f5',
  },
  loadMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  loadMoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    backgroundColor: '#ff6b81',
    borderRadius: 6,
    alignItems: 'center',
  },
  loadMoreButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // 🆕 静默更新指示器样式
  updateIndicator: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  updatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updatingText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  endContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  endText: {
    fontSize: 12,
    color: '#999',
  },
});

export default MessageScreen; 