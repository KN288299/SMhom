import { useState, useEffect, useRef } from 'react';
import { Image, Platform } from 'react-native';
import RNFS from 'react-native-fs';

interface MediaFile {
  url: string;
  type: 'image' | 'audio' | 'video';
  size?: number;
  cached?: boolean;
}

interface PreloadStats {
  totalFiles: number;
  loadedFiles: number;
  failedFiles: number;
  cacheSize: string;
}

export const useMessagePreloader = () => {
  const [preloadStats, setPreloadStats] = useState<PreloadStats>({
    totalFiles: 0,
    loadedFiles: 0,
    failedFiles: 0,
    cacheSize: '0 MB',
  });

  const preloadQueueRef = useRef<MediaFile[]>([]);
  const isPreloadingRef = useRef(false);
  const maxConcurrentLoads = 3;
  const maxCacheSize = 100 * 1024 * 1024; // 100MB

  /**
   * 预加载图片
   */
  const preloadImage = async (imageUrl: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn(`图片预加载超时: ${imageUrl}`);
        resolve(false);
      }, 10000); // 10秒超时

      Image.prefetch(imageUrl)
        .then(() => {
          clearTimeout(timeout);
          console.log(`✅ 图片预加载成功: ${imageUrl}`);
          resolve(true);
        })
        .catch((error) => {
          clearTimeout(timeout);
          console.error(`❌ 图片预加载失败: ${imageUrl}`, error);
          resolve(false);
        });
    });
  };

  /**
   * 预加载音频文件
   */
  const preloadAudio = async (audioUrl: string): Promise<boolean> => {
    try {
      const fileName = audioUrl.split('/').pop() || 'audio.mp3';
      const localPath = `${RNFS.CachesDirectoryPath}/audio_cache/${fileName}`;
      
      // 检查文件是否已存在
      const exists = await RNFS.exists(localPath);
      if (exists) {
        console.log(`📱 音频文件已缓存: ${fileName}`);
        return true;
      }

      // 确保缓存目录存在
      const cacheDir = `${RNFS.CachesDirectoryPath}/audio_cache`;
      const dirExists = await RNFS.exists(cacheDir);
      if (!dirExists) {
        await RNFS.mkdir(cacheDir);
      }

      // 下载并缓存音频
      const downloadResult = await RNFS.downloadFile({
        fromUrl: audioUrl,
        toFile: localPath,
        connectionTimeout: 10000,
        readTimeout: 30000,
      }).promise;

      if (downloadResult.statusCode === 200) {
        console.log(`✅ 音频预加载成功: ${fileName}`);
        return true;
      } else {
        console.error(`❌ 音频预加载失败: ${fileName}, 状态码: ${downloadResult.statusCode}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ 音频预加载异常: ${audioUrl}`, error);
      return false;
    }
  };

  /**
   * 获取文件大小
   */
  const getFileSize = async (url: string): Promise<number> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength, 10) : 0;
    } catch {
      return 0;
    }
  };

  /**
   * 检查缓存大小
   */
  const checkCacheSize = async (): Promise<number> => {
    try {
      let totalSize = 0;

      // 计算音频缓存大小
      const audioCacheDir = `${RNFS.CachesDirectoryPath}/audio_cache`;
      const dirExists = await RNFS.exists(audioCacheDir);
      
      if (dirExists) {
        const audioFiles = await RNFS.readDir(audioCacheDir);
        for (const file of audioFiles) {
          totalSize += file.size;
        }
      }

      return totalSize;
    } catch {
      return 0;
    }
  };

  /**
   * 清理过期缓存
   */
  const cleanupCache = async () => {
    try {
      const cacheSize = await checkCacheSize();
      
      if (cacheSize > maxCacheSize) {
        console.log('🧹 开始清理缓存...');
        
        // 清理音频缓存（按修改时间排序，删除最旧的）
        const audioCacheDir = `${RNFS.CachesDirectoryPath}/audio_cache`;
        const dirExists = await RNFS.exists(audioCacheDir);
        
        if (dirExists) {
          const audioFiles = await RNFS.readDir(audioCacheDir);
          const sortedFiles = audioFiles
            .filter(file => file.isFile())
            .sort((a, b) => {
              const aTime = a.mtime ? new Date(a.mtime).getTime() : 0;
              const bTime = b.mtime ? new Date(b.mtime).getTime() : 0;
              return aTime - bTime;
            });
          
          let currentSize = cacheSize;
          for (const file of sortedFiles) {
            if (currentSize <= maxCacheSize * 0.8) break; // 保留80%空间
            
            await RNFS.unlink(file.path);
            currentSize -= file.size;
            console.log(`🗑️ 删除缓存文件: ${file.name}`);
          }
        }

        console.log('✅ 缓存清理完成');
      }
    } catch (error) {
      console.error('缓存清理失败:', error);
    }
  };

  /**
   * 处理预加载队列
   */
  const processPreloadQueue = async () => {
    if (isPreloadingRef.current || preloadQueueRef.current.length === 0) {
      return;
    }

    isPreloadingRef.current = true;
    const batch = preloadQueueRef.current.splice(0, maxConcurrentLoads);
    
    const results = await Promise.allSettled(
      batch.map(async (file) => {
        try {
          let success = false;
          
          switch (file.type) {
            case 'image':
              success = await preloadImage(file.url);
              break;
            case 'audio':
              success = await preloadAudio(file.url);
              break;
            case 'video':
              // 视频预加载暂时跳过（文件太大）
              success = true;
              break;
            default:
              success = false;
          }

          return success;
        } catch (error) {
          console.error(`预加载失败: ${file.url}`, error);
          return false;
        }
      })
    );

    // 更新统计
    setPreloadStats(prev => {
      const successful = results.filter(result => 
        result.status === 'fulfilled' && result.value === true
      ).length;
      const failed = results.length - successful;

      return {
        ...prev,
        loadedFiles: prev.loadedFiles + successful,
        failedFiles: prev.failedFiles + failed,
      };
    });

    isPreloadingRef.current = false;

    // 继续处理剩余队列
    if (preloadQueueRef.current.length > 0) {
      setTimeout(processPreloadQueue, 1000); // 1秒延迟，避免占用太多资源
    }
  };

  /**
   * 添加文件到预加载队列
   */
  const addToPreloadQueue = (files: MediaFile[]) => {
    const newFiles = files.filter(file => 
      !preloadQueueRef.current.some(existing => existing.url === file.url)
    );

    preloadQueueRef.current.push(...newFiles);
    
    setPreloadStats(prev => ({
      ...prev,
      totalFiles: prev.totalFiles + newFiles.length,
    }));

    // 异步开始处理队列
    setTimeout(processPreloadQueue, 100);
  };

  /**
   * 从消息列表中提取媒体文件
   */
  const extractMediaFromMessages = (messages: any[]): MediaFile[] => {
    const mediaFiles: MediaFile[] = [];

    messages.forEach(message => {
      if (message.imageUrl) {
        mediaFiles.push({
          url: message.imageUrl,
          type: 'image',
        });
      }
      
      if (message.voiceUrl) {
        mediaFiles.push({
          url: message.voiceUrl,
          type: 'audio',
        });
      }
      
      if (message.videoUrl) {
        mediaFiles.push({
          url: message.videoUrl,
          type: 'video',
        });
      }
    });

    return mediaFiles;
  };

  /**
   * 预加载消息中的媒体文件
   */
  const preloadMessagesMedia = (messages: any[]) => {
    const mediaFiles = extractMediaFromMessages(messages);
    if (mediaFiles.length > 0) {
      console.log(`📥 添加 ${mediaFiles.length} 个媒体文件到预加载队列`);
      addToPreloadQueue(mediaFiles);
    }
  };

  /**
   * 更新缓存大小统计
   */
  const updateCacheStats = async () => {
    try {
      const cacheSize = await checkCacheSize();
      setPreloadStats(prev => ({
        ...prev,
        cacheSize: `${(cacheSize / (1024 * 1024)).toFixed(2)} MB`,
      }));
    } catch (error) {
      console.error('更新缓存统计失败:', error);
    }
  };

  // 定期更新缓存统计和清理
  useEffect(() => {
    const interval = setInterval(() => {
      updateCacheStats();
      cleanupCache();
    }, 30000); // 30秒检查一次

    return () => clearInterval(interval);
  }, []);

  return {
    preloadStats,
    preloadMessagesMedia,
    addToPreloadQueue,
    cleanupCache,
    updateCacheStats,
  };
}; 