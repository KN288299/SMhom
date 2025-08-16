import { Platform } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

/**
 * iOS网络检测辅助工具
 * 解决iOS上NetInfo的isInternetReachable检测过于严格的问题
 */

export interface OptimizedNetworkState {
  isConnected: boolean;
  type: string;
  isInternetReachable: boolean | null;
  details: any; // 使用any类型以兼容不同网络类型的详细信息
}

/**
 * iOS优化的网络连接检测
 * @param state NetInfo状态
 * @returns 优化后的连接状态
 */
export const getOptimizedConnectionStatus = (state: NetInfoState): boolean => {
  if (Platform.OS === 'ios') {
    // iOS特殊处理逻辑
    if (state.isConnected === false) {
      return false; // 明确断开连接
    }
    
    if (state.isConnected === true) {
      // 如果isConnected为true，但isInternetReachable为null或false
      if (state.isInternetReachable === null) {
        // null表示未检测，认为连接正常
        return true;
      }
      
      if (state.isInternetReachable === false) {
        // 可能是假阳性，再进行额外检查
        return shouldTrustConnection(state);
      }
      
      return true; // isInternetReachable为true
    }
  } else {
    // Android使用原有逻辑
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  }
  
  return false;
};

/**
 * 当isInternetReachable为false时的额外连接信任检查
 * @param state NetInfo状态
 * @returns 是否信任连接
 */
const shouldTrustConnection = (state: NetInfoState): boolean => {
  // WiFi连接且有详细信息，通常表示真实连接
  if (state.type === 'wifi' && state.details && (state.details as any).ssid) {
    return true;
  }
  
  // 蜂窝网络连接
  if (state.type === 'cellular') {
    return true;
  }
  
  // 以太网连接
  if (state.type === 'ethernet') {
    return true;
  }
  
  return false;
};

/**
 * 获取详细的网络状态信息
 * @returns Promise<OptimizedNetworkState>
 */
export const getDetailedNetworkInfo = async (): Promise<OptimizedNetworkState> => {
  try {
    const state = await NetInfo.fetch();
    
    return {
      isConnected: getOptimizedConnectionStatus(state),
      type: state.type || 'unknown',
      isInternetReachable: state.isInternetReachable,
      details: state.details || {}
    };
  } catch (error) {
    console.error('获取网络信息失败:', error);
    return {
      isConnected: false,
      type: 'unknown',
      isInternetReachable: null,
      details: {}
    };
  }
};

/**
 * 测试服务器连接性
 * @param serverUrl 服务器URL
 * @param timeout 超时时间（毫秒）
 * @returns Promise<boolean>
 */
export const testServerConnection = async (
  serverUrl: string, 
  timeout: number = 10000
): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${serverUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log('服务器连接测试失败:', error);
    return false;
  }
};

/**
 * iOS网络状态监听器包装器
 * @param callback 状态变化回调
 * @returns 取消监听函数
 */
export const addOptimizedNetworkListener = (
  callback: (isConnected: boolean, details: OptimizedNetworkState) => void
) => {
  return NetInfo.addEventListener(async (state) => {
    const isConnected = getOptimizedConnectionStatus(state);
    const details = await getDetailedNetworkInfo();
    
    console.log(`📱 ${Platform.OS} 优化网络检测:`, {
      原始状态: {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type
      },
      优化结果: {
        isConnected,
        details
      }
    });
    
    callback(isConnected, details);
  });
};

export default {
  getOptimizedConnectionStatus,
  getDetailedNetworkInfo,
  testServerConnection,
  addOptimizedNetworkListener,
};
