import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
  _id: string;
  senderId: string;
  senderRole?: 'user' | 'customer_service';
  content: string;
  timestamp: Date;
  isRead?: boolean;
  messageType?: 'text' | 'voice' | 'image' | 'video';
  contentType?: 'text' | 'voice' | 'image' | 'video' | 'file';
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
  isCallRecord?: boolean;
  callerId?: string;
  callDuration?: string;
  missed?: boolean;
  rejected?: boolean;
}

interface CacheData {
  messages: Message[];
  timestamp: number;
  lastSyncTime: number;
  conversationId: string;
}

class MessageCache {
  private static readonly CACHE_KEY_PREFIX = 'chat_messages_';
  private static readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时
  private static readonly MAX_CACHE_SIZE = 500; // 最多缓存500条消息

  /**
   * 缓存消息到本地存储
   */
  static async cacheMessages(conversationId: string, messages: Message[], userId: string): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${conversationId}_${userId}`;
      
      // 限制缓存大小
      const limitedMessages = messages.length > this.MAX_CACHE_SIZE 
        ? messages.slice(-this.MAX_CACHE_SIZE) 
        : messages;

      const cacheData: CacheData = {
        messages: limitedMessages,
        timestamp: Date.now(),
        lastSyncTime: Date.now(),
        conversationId,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`📦 缓存了 ${limitedMessages.length} 条消息到本地`);
    } catch (error) {
      console.error('缓存消息失败:', error);
    }
  }

  /**
   * 从本地存储获取缓存的消息
   */
  static async getCachedMessages(conversationId: string, userId: string): Promise<Message[] | null> {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${conversationId}_${userId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedData) {
        return null;
      }

      const cacheData: CacheData = JSON.parse(cachedData);
      
      // 检查缓存是否过期
      const isExpired = Date.now() - cacheData.timestamp > this.CACHE_EXPIRY;
      if (isExpired) {
        await this.clearCache(conversationId, userId);
        return null;
      }

      // 转换时间字符串回Date对象
      const messages = cacheData.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));

      console.log(`📦 从缓存加载了 ${messages.length} 条消息`);
      return messages;
    } catch (error) {
      console.error('获取缓存消息失败:', error);
      return null;
    }
  }

  /**
   * 添加单条消息到缓存
   */
  static async addMessageToCache(conversationId: string, message: Message, userId: string): Promise<void> {
    try {
      const existingMessages = await this.getCachedMessages(conversationId, userId) || [];
      
      // 检查消息是否已存在（避免重复）
      const messageExists = existingMessages.some(msg => msg._id === message._id);
      if (messageExists) {
        return;
      }

      const updatedMessages = [...existingMessages, message];
      await this.cacheMessages(conversationId, updatedMessages, userId);
    } catch (error) {
      console.error('添加消息到缓存失败:', error);
    }
  }

  /**
   * 更新缓存中的消息
   */
  static async updateMessageInCache(
    conversationId: string, 
    messageId: string, 
    updates: Partial<Message>, 
    userId: string
  ): Promise<void> {
    try {
      const existingMessages = await this.getCachedMessages(conversationId, userId) || [];
      
      const updatedMessages = existingMessages.map(msg => 
        msg._id === messageId ? { ...msg, ...updates } : msg
      );

      await this.cacheMessages(conversationId, updatedMessages, userId);
    } catch (error) {
      console.error('更新缓存消息失败:', error);
    }
  }

  /**
   * 清除特定会话的缓存
   */
  static async clearCache(conversationId: string, userId: string): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${conversationId}_${userId}`;
      await AsyncStorage.removeItem(cacheKey);
      console.log(`🗑️ 清除了会话 ${conversationId} 的缓存`);
    } catch (error) {
      console.error('清除缓存失败:', error);
    }
  }

  /**
   * 清除所有聊天缓存
   */
  static async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const chatKeys = keys.filter(key => key.startsWith(this.CACHE_KEY_PREFIX));
      
      if (chatKeys.length > 0) {
        await AsyncStorage.multiRemove(chatKeys);
        console.log(`🗑️ 清除了 ${chatKeys.length} 个聊天缓存`);
      }
    } catch (error) {
      console.error('清除所有缓存失败:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  static async getCacheStats(): Promise<{ totalCaches: number; totalSize: string }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const chatKeys = keys.filter(key => key.startsWith(this.CACHE_KEY_PREFIX));
      
      let totalSize = 0;
      for (const key of chatKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += data.length;
        }
      }

      return {
        totalCaches: chatKeys.length,
        totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      };
    } catch (error) {
      console.error('获取缓存统计失败:', error);
      return { totalCaches: 0, totalSize: '0 KB' };
    }
  }
}

export default MessageCache; 