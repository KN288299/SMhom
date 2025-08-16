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
 * iOS优化的网络连接检测（轻量级版本）
 * @param state NetInfo状态
 * @returns 优化后的连接状态
 */
export const getOptimizedConnectionStatus = (state: NetInfoState): boolean => {
  if (Platform.OS === 'ios') {
    // iOS简化处理逻辑，减少性能开销
    if (state.isConnected === false) {
      return false;
    }
    
    // iOS上如果isConnected为true，就认为有网络
    // 不再进行复杂的isInternetReachable检查，避免性能问题
    return Boolean(state.isConnected);
  } else {
    // Android使用原有逻辑
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  }
};

// 移除不再使用的shouldTrustConnection函数以减少代码体积

/**
 * 获取详细的网络状态信息（轻量级版本）
 * @returns Promise<OptimizedNetworkState>
 */
export const getDetailedNetworkInfo = async (): Promise<OptimizedNetworkState> => {
  try {
    const state = await NetInfo.fetch();
    
    return {
      isConnected: getOptimizedConnectionStatus(state),
      type: state.type || 'unknown',
      isInternetReachable: state.isInternetReachable,
      details: {} // 减少详细信息获取以提升性能
    };
  } catch (error) {
    return {
      isConnected: false,
      type: 'unknown',
      isInternetReachable: null,
      details: {}
    };
  }
};

/**
 * 测试服务器连接性（轻量级版本）
 * @param serverUrl 服务器URL
 * @param timeout 超时时间（毫秒）
 * @returns Promise<boolean>
 */
export const testServerConnection = async (
  serverUrl: string, 
  timeout: number = 5000 // 减少超时时间
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
    // 减少错误日志输出
    return false;
  }
};

/**
 * iOS网络状态监听器包装器（轻量级版本）
 * @param callback 状态变化回调
 * @returns 取消监听函数
 */
export const addOptimizedNetworkListener = (
  callback: (isConnected: boolean, details: OptimizedNetworkState) => void
) => {
  return NetInfo.addEventListener((state) => {
    const isConnected = getOptimizedConnectionStatus(state);
    
    // 轻量级状态对象，避免异步调用
    const details: OptimizedNetworkState = {
      isConnected,
      type: state.type || 'unknown',
      isInternetReachable: state.isInternetReachable,
      details: {} // 减少详细信息获取
    };
    
    // 减少日志输出频率
    if (Math.random() < 0.1) { // 只有10%的概率输出日志
      console.log(`📱 网络状态:`, { isConnected, type: state.type });
    }
    
    callback(isConnected, details);
  });
};

export default {
  getOptimizedConnectionStatus,
  getDetailedNetworkInfo,
  testServerConnection,
  addOptimizedNetworkListener,
};
