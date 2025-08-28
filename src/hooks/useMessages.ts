import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BASE_URL } from '../config/api';

interface Message {
  _id: string;
  conversationId?: string; // 关键字段：消息所属的对话ID
  senderId: string;
  senderRole?: 'user' | 'customer_service';
  content: string;
  timestamp: Date;
  isRead?: boolean;
  isDeleted?: boolean;
  isRecalled?: boolean;
  messageType?: 'text' | 'voice' | 'image' | 'video' | 'location';
  contentType?: 'text' | 'voice' | 'image' | 'video' | 'file' | 'location';
  voiceDuration?: string;
  voiceUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  videoDuration?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  videoWidth?: number;
  videoHeight?: number;
  aspectRatio?: number;
  fileUrl?: string;
  // 仅本地使用：iOS 自发视频的本地路径，用于预览/播放回退
  localFileUri?: string;
  // 新增：本地缩略图路径（发送/接收时用于立即渲染）
  videoThumbLocalPath?: string | null;
  // 视频缩略图URL（从服务器获取）
  videoThumbnailUrl?: string;
  isCallRecord?: boolean;
  callerId?: string;
  callDuration?: string;
  missed?: boolean;
  rejected?: boolean;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  address?: string;
}

interface UseMessagesProps {
  conversationId: string | undefined;
  userToken: string | null;
  isCustomerService: () => boolean;
  onError: (error: any, message: string) => void;
}

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  loadingMore: boolean;
  hasMoreMessages: boolean;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  fetchMessages: (page?: number) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
}

const MESSAGES_PER_PAGE = 20;
const MAX_MESSAGES_IN_MEMORY = 200; // 内存中最大消息数量

export const useMessages = ({
  conversationId,
  userToken,
  isCustomerService,
  onError,
}: UseMessagesProps): UseMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // 生成唯一ID - 增强版本
  const generateUniqueId = () => {
    const timestamp = Date.now();
    const timestampStr = timestamp.toString(36);
    const randomStr1 = Math.random().toString(36).substring(2, 10);
    const randomStr2 = Math.random().toString(36).substring(2, 10);
    const processId = Math.floor(Math.random() * 10000).toString(36);
    
    return `hook_${timestampStr}_${randomStr1}_${randomStr2}_${processId}_${timestamp}`;
  };

  // 获取消息
  const fetchMessages = useCallback(async (page = 1) => {
    if (!conversationId || !userToken) {
      // 调试日志已清理 - 缺少必要参数
      setLoading(false);
      return;
    }

    try {
      if (page === 1) {
        // 首次加载不显示loading，实现无感进入
        setLoading(false);
      } else {
        setLoadingMore(true);
      }

      // 调试日志已清理 - 获取消息页面信息
      
      const response = await axios.get(`${BASE_URL}/api/messages/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          page,
          limit: MESSAGES_PER_PAGE,
        },
      });

      // 调试日志已清理 - 消息获取响应

      if (response.data) {
        const fetchedMessages = response.data.messages || response.data || [];
        
        // 转换消息格式（适配原有数据结构）
        const formattedMessages = fetchedMessages
          // 客户端兜底过滤（即使后端已过滤）
          .filter((msg: any) => !msg.isDeleted && !msg.isRecalled)
          .map((msg: any) => {
          // 检查是否是通话记录消息
          const isCallRecord = msg.isCallRecord || 
                               msg.content?.includes('语音通话') || 
                               msg.content?.includes('未接通') || 
                               msg.content?.includes('已拒绝');
          
          // 创建基本消息结构
          const processedMsg: any = {
            _id: msg._id,
            senderId: msg.senderId,
            senderRole: msg.senderRole,
            content: msg.content,
            timestamp: new Date(msg.createdAt || msg.timestamp),
            isRead: msg.isRead || false,
            messageType: msg.contentType || 'text',
            contentType: msg.contentType || 'text',
            fileUrl: msg.fileUrl || '',
            // 处理通话记录相关字段
            isCallRecord: isCallRecord,
            callerId: msg.callerId,
            callDuration: msg.callDuration || (msg.content?.includes('语音通话:') ? 
              msg.content.split('语音通话:')[1]?.trim() : undefined),
            missed: msg.missed || msg.content?.includes('未接通') || false,
            rejected: msg.rejected || msg.content?.includes('已拒绝') || false
          };
          
          // 根据消息类型添加额外字段
          if (msg.contentType === 'voice' || msg.messageType === 'voice') {
            processedMsg.voiceUrl = msg.voiceUrl || msg.fileUrl || '';
            processedMsg.voiceDuration = msg.voiceDuration || '00:00';
            processedMsg.messageType = 'voice';
          }
          
          if (msg.contentType === 'image' || msg.messageType === 'image') {
            processedMsg.imageUrl = msg.imageUrl || msg.fileUrl || '';
            processedMsg.messageType = 'image';
          }
          
          if (msg.contentType === 'video' || msg.messageType === 'video') {
            // 统一：fileUrl 优先，保持向后兼容
            processedMsg.videoUrl = msg.fileUrl || msg.videoUrl || '';
            processedMsg.videoDuration = msg.videoDuration || '00:00';
            processedMsg.videoWidth = msg.videoWidth || 0;
            processedMsg.videoHeight = msg.videoHeight || 0;
            processedMsg.aspectRatio = msg.aspectRatio || 1.78;
            processedMsg.videoThumbnailUrl = msg.videoThumbnailUrl || '';
            processedMsg.messageType = 'video';
          }
          
          // 处理位置消息
          if (msg.contentType === 'location' || msg.messageType === 'location') {
            processedMsg.latitude = msg.latitude;
            processedMsg.longitude = msg.longitude;
            processedMsg.locationName = msg.locationName || '';
            processedMsg.address = msg.address || '';
            processedMsg.messageType = 'location';
            
            console.log('📍 [useMessages] 处理位置消息:', {
              latitude: processedMsg.latitude,
              longitude: processedMsg.longitude,
              locationName: processedMsg.locationName,
              address: processedMsg.address,
              contentType: msg.contentType
            });
          }
          
          return processedMsg;
        });

        // 调试日志已清理 - 格式化后的消息

        if (page === 1) {
          // 首次加载消息，按时间倒序排列（新消息在前，配合inverted=true）
          const sortedMessages = formattedMessages.sort((a: any, b: any) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setMessages(sortedMessages);
        } else {
          // 加载更多历史消息，添加到数组末尾（因为是更早的消息，在倒序数组中应该在后面）
          setMessages(prev => {
            const sortedHistoryMessages = formattedMessages.sort((a: any, b: any) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            // 去重：过滤掉已存在于 prev 中的消息（按 _id）
            const existingIds = new Set(prev.map(m => m._id));
            const filteredHistory = sortedHistoryMessages.filter((m: any) => !existingIds.has(m._id));
            // 历史消息添加到末尾，因为在倒序数组中更早的消息在后面
            const newMessages = [...prev, ...filteredHistory];
            return newMessages;
          });
        }

        // 更新分页信息
        const { page: serverPage, pages: totalPagesFromServer } = response.data;
        if (serverPage && totalPagesFromServer) {
          setCurrentPage(serverPage);
          setTotalPages(totalPagesFromServer);
          setHasMoreMessages(serverPage < totalPagesFromServer);
        } else {
          // 如果没有分页信息，根据返回的消息数量判断
          setCurrentPage(page);
          setHasMoreMessages(fetchedMessages.length >= MESSAGES_PER_PAGE);
        }
      } else {
        // 调试日志已清理 - 未获取到历史消息
        if (page === 1) {
          setMessages([]);
        }
        setHasMoreMessages(false);
      }
    } catch (error: any) {
      console.error('获取消息时发生错误:', error);
      
      if (error.response?.status === 401) {
        onError(error, '登录已过期，请重新登录');
      } else if (error.response?.status === 404) {
        // 调试日志已清理 - 会话不存在或无消息
        setMessages([]);
      } else {
        onError(error, '网络错误，请检查网络连接');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [conversationId, userToken, isCustomerService, onError]);

  // 添加新消息（带内存限制和倒序排序）
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => {
      const stableId = message._id || generateUniqueId();
      // 去重：如果已存在相同 _id 的消息，执行合并更新而不是新增
      const existedIndex = prev.findIndex(m => m._id === stableId);
      if (existedIndex !== -1) {
        const merged = { ...prev[existedIndex], ...message, _id: stableId } as Message;
        const updated = [...prev];
        updated[existedIndex] = merged;
        // 维持倒序排序
        return updated.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }

      const newMessage: Message = {
        ...message,
        _id: stableId,
        timestamp: message.timestamp || new Date(),
      };
      
      // 将新消息插入到正确位置以保持时间倒序排序（最新的在前面）
      const newMessages = [newMessage, ...prev].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // 如果消息数量超过限制，保留最新的消息（倒序数组的前面部分）
      if (newMessages.length > MAX_MESSAGES_IN_MEMORY) {
        return newMessages.slice(0, MAX_MESSAGES_IN_MEMORY);
      }
      
      return newMessages;
    });
  }, []);

  // 更新消息
  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages(prev => {
      const newId = (updates && (updates as any)._id) ? (updates as any)._id as string : messageId;
      // 找到可合并的基准消息（原ID或目标新ID）
      const base = prev.find(m => m._id === messageId) || prev.find(m => m._id === newId);
      const merged: Message = {
        ...(base || ({ _id: newId, timestamp: new Date() } as Message)),
        ...updates,
        _id: newId,
      } as Message;

      // 移除旧的可能重复项（原ID和新ID都移除）
      const remaining = prev.filter(m => m._id !== messageId && m._id !== newId);

      // 重新插入并按时间倒序排序
      const result = [merged, ...remaining].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // 维持内存上限
      return result.length > MAX_MESSAGES_IN_MEMORY
        ? result.slice(0, MAX_MESSAGES_IN_MEMORY)
        : result;
    });
  }, []);

  // 当conversationId变化时重新获取消息
  useEffect(() => {
    if (conversationId) {
      setCurrentPage(1);
      setHasMoreMessages(true);
      fetchMessages(1);
    }
  }, [conversationId, fetchMessages]);

  return {
    messages,
    loading,
    currentPage,
    totalPages,
    loadingMore,
    hasMoreMessages,
    setMessages,
    fetchMessages,
    addMessage,
    updateMessage,
  };
}; 