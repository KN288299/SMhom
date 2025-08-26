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
  isNetworkTypeChanged?: boolean; // 🔧 网络切换修复：添加网络类型变化标识
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

// 🔧 网络切换修复：添加网络类型追踪
let lastNetworkType: string | null = null;
let lastNetworkConnected: boolean | null = null;

/**
 * iOS网络状态监听器包装器（增强版本 - 支持网络切换检测）
 * @param callback 状态变化回调
 * @returns 取消监听函数
 */
export const addOptimizedNetworkListener = (
  callback: (isConnected: boolean, details: OptimizedNetworkState) => void
) => {
  return NetInfo.addEventListener((state) => {
    const isConnected = getOptimizedConnectionStatus(state);
    const currentNetworkType = state.type || 'unknown';
    
    // 🔧 网络切换修复：检测网络类型变化
    const isNetworkTypeChanged = lastNetworkType !== null && 
                                lastNetworkType !== currentNetworkType &&
                                lastNetworkConnected === true && 
                                isConnected === true;
    
    // 🔧 网络切换修复：特别关注蜂窝数据到WiFi的切换
    const isCellularToWifi = lastNetworkType === 'cellular' && currentNetworkType === 'wifi';
    const isWifiToCellular = lastNetworkType === 'wifi' && currentNetworkType === 'cellular';
    
    // 轻量级状态对象，避免异步调用
    const details: OptimizedNetworkState = {
      isConnected,
      type: currentNetworkType,
      isInternetReachable: state.isInternetReachable,
      details: {}, // 减少详细信息获取
      isNetworkTypeChanged
    };
    
    // 🔧 网络切换修复：增强日志输出，特别关注网络切换
    if (isNetworkTypeChanged || isCellularToWifi || isWifiToCellular) {
      console.log(`🔄 [NetSwitch] 网络切换检测:`, {
        from: lastNetworkType,
        to: currentNetworkType,
        isConnected,
        isCellularToWifi,
        isWifiToCellular,
        timestamp: new Date().toISOString()
      });
    } else if (Math.random() < 0.05) { // 减少到5%的概率输出普通日志
      console.log(`📱 网络状态:`, { isConnected, type: currentNetworkType });
    }
    
    // 更新追踪状态
    lastNetworkType = currentNetworkType;
    lastNetworkConnected = isConnected;
    
    callback(isConnected, details);
  });
};

/**
 * 🔧 网络切换修复：检测WiFi连接稳定性
 * @param maxWaitTime 最大等待时间（毫秒）
 * @param checkInterval 检查间隔（毫秒）
 * @returns Promise<boolean> WiFi是否稳定
 */
export const waitForWifiStability = async (
  maxWaitTime: number = 3000,
  checkInterval: number = 500
): Promise<boolean> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const state = await NetInfo.fetch();
      
      if (state.type === 'wifi' && state.isConnected && state.isInternetReachable !== false) {
        console.log('✅ [WiFiStability] WiFi连接已稳定');
        return true;
      }
      
      // 等待一段时间后再次检查
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    } catch (error) {
      console.warn('⚠️ [WiFiStability] WiFi稳定性检查失败:', error);
    }
  }
  
  console.warn('⚠️ [WiFiStability] WiFi连接稳定性检查超时');
  return false;
};

/**
 * 🔧 网络切换修复：强制Socket重连的辅助函数
 * @param socketRef Socket引用
 * @param delay 延迟时间（毫秒）
 */
export const forceSocketReconnectAfterNetworkSwitch = (
  socketRef: any,
  delay: number = 1000
): void => {
  setTimeout(() => {
    try {
      if (socketRef?.current) {
        console.log('🔄 [NetSwitch] 网络切换后强制Socket重连');
        
        // 先断开现有连接
        if (socketRef.current.connected) {
          socketRef.current.disconnect();
        }
        
        // 短暂延迟后重新连接
        setTimeout(() => {
          if (socketRef.current) {
            socketRef.current.connect();
          }
        }, 200);
      }
    } catch (error) {
      console.error('❌ [NetSwitch] 强制Socket重连失败:', error);
    }
  }, delay);
};

export default {
  getOptimizedConnectionStatus,
  getDetailedNetworkInfo,
  testServerConnection,
  addOptimizedNetworkListener,
  waitForWifiStability,
  forceSocketReconnectAfterNetworkSwitch,
};
