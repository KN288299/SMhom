import axios from 'axios';
import { API_URL } from '../config/api';

export interface PageConfig {
  centerButtonText: string;
  centerButtonColor: string;
  bannerImages: string[];
}

let configCache: PageConfig | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 获取页面配置
 * 带缓存机制，避免频繁请求
 */
export const getPageConfig = async (): Promise<PageConfig> => {
  const now = Date.now();
  
  // 如果缓存有效，直接返回缓存
  if (configCache && (now - lastFetchTime) < CACHE_DURATION) {
    console.log('📄 [PageConfigService] 使用缓存的页面配置');
    return configCache;
  }
  
  try {
    console.log('📄 [PageConfigService] 从服务器获取页面配置');
    const response = await axios.get(`${API_URL}/page-config`);
    
    if (response.data.success && response.data.data) {
      configCache = {
        centerButtonText: response.data.data.centerButtonText || '御足堂',
        centerButtonColor: response.data.data.centerButtonColor || '#ff6b81',
        bannerImages: (response.data.data.bannerImages || []).map((url: string) => 
          url.startsWith('http') ? url : `${API_URL.replace('/api', '')}${url}`
        )
      };
      lastFetchTime = now;
      
      console.log('📄 [PageConfigService] 页面配置获取成功:', configCache);
      return configCache;
    } else {
      throw new Error('页面配置响应格式不正确');
    }
  } catch (error) {
    console.error('📄 [PageConfigService] 获取页面配置失败:', error);
    
    // 返回默认配置
    const defaultConfig: PageConfig = {
      centerButtonText: '御足堂',
      centerButtonColor: '#ff6b81',
      bannerImages: []
    };
    
    return defaultConfig;
  }
};

/**
 * 清除配置缓存
 * 在配置更新后调用
 */
export const clearConfigCache = () => {
  configCache = null;
  lastFetchTime = 0;
  console.log('📄 [PageConfigService] 清除配置缓存');
}; 