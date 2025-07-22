# 🎙️ 语音通话系统优化指南

## 📋 优化总览

本文档提供了HomeServiceChat语音通话系统的全面优化方案，涵盖性能、稳定性、用户体验等多个方面。

## 🚀 核心优化点

### 1. WebRTC连接稳定性优化

#### A. ICE服务器配置增强
```typescript
// 优化前：单一STUN服务器
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' }
];

// 优化后：多STUN服务器 + TURN备用
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.stunprotocol.org:3478' },
  // TURN服务器（生产环境推荐）
  { 
    urls: 'turn:your-turn-server.com:3478', 
    username: 'user', 
    credential: 'pass' 
  }
];
```

#### B. 连接重试机制
```typescript
const rtcConfig = {
  iceServers,
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all',
  bundlePolicy: 'balanced',
  rtcpMuxPolicy: 'require',
};

// 添加连接监控和重试
let reconnectAttempts = 0;
const maxReconnects = 3;

peerConnection.oniceconnectionstatechange = () => {
  if (state === 'failed' && reconnectAttempts < maxReconnects) {
    reconnectAttempts++;
    setTimeout(() => restartIce(), 1000 * reconnectAttempts);
  }
};
```

### 2. 音频质量优化

#### A. 音频会话管理增强
```typescript
// AudioManager优化
InCallManager.start({ 
  media: 'audio', 
  ringback: '_BUNDLE_',
  auto: true // 启用自动音频管理
});

// 平台特定优化
if (Platform.OS === 'android') {
  InCallManager.requestAudioFocus();
  InCallManager.setForceSpeakerphoneOn(enabled);
  InCallManager.chooseAudioRoute(enabled ? 'SPEAKER_PHONE' : 'EARPIECE');
}
```

#### B. 音频流优化
```typescript
// 音频约束优化
const audioConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100,
    channelCount: 1
  },
  video: false
};

const stream = await mediaDevices.getUserMedia(audioConstraints);
```

### 3. 通话状态持久化

#### A. 状态管理优化
```typescript
// 通话状态持久化
interface CallState {
  callId: string;
  contactId: string;
  contactName: string;
  status: 'connecting' | 'ringing' | 'connected';
  startTime: number;
  webrtcState?: string;
}

// AsyncStorage状态缓存
const saveCallState = async (state: CallState) => {
  await AsyncStorage.setItem('active_call_state', JSON.stringify(state));
};

// 应用恢复时检查状态
const restoreCallState = async () => {
  const savedState = await AsyncStorage.getItem('active_call_state');
  if (savedState) {
    const callState = JSON.parse(savedState);
    // 恢复通话界面
    return callState;
  }
};
```

### 4. 网络异常处理

#### A. Socket重连优化
```typescript
// Socket.IO重连配置
const socketConfig = {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
};

// 重连事件处理
socket.on('reconnect', (attemptNumber) => {
  console.log(`Socket重连成功，尝试次数: ${attemptNumber}`);
  // 恢复通话状态
  if (activeCallId) {
    rejoinCall(activeCallId);
  }
});
```

#### B. 通话断线重连
```typescript
// WebRTC断线检测
peerConnection.oniceconnectionstatechange = () => {
  const state = peerConnection.iceConnectionState;
  
  if (state === 'disconnected') {
    // 启动重连倒计时
    setTimeout(() => {
      if (peerConnection.iceConnectionState === 'disconnected') {
        attemptReconnection();
      }
    }, 3000);
  }
};

const attemptReconnection = async () => {
  try {
    // 重新创建Offer
    const offer = await peerConnection.createOffer({ iceRestart: true });
    await peerConnection.setLocalDescription(offer);
    socket.emit('webrtc_restart', { callId, sdp: offer });
  } catch (error) {
    console.error('重连失败:', error);
    endCall();
  }
};
```

### 5. 用户体验优化

#### A. 加载状态优化
```typescript
// 分阶段加载状态
enum CallPhase {
  INITIALIZING = 'initializing',     // 初始化中
  REQUESTING_PERMISSION = 'permission', // 请求权限
  CONNECTING = 'connecting',         // 建立连接
  RINGING = 'ringing',              // 等待接听
  CONNECTED = 'connected',          // 通话中
  ENDING = 'ending'                 // 结束中
}

// 详细状态文案
const getStatusText = (phase: CallPhase) => {
  switch (phase) {
    case CallPhase.INITIALIZING: return '正在初始化通话...';
    case CallPhase.REQUESTING_PERMISSION: return '请求麦克风权限...';
    case CallPhase.CONNECTING: return '正在建立连接...';
    case CallPhase.RINGING: return '等待对方接听...';
    case CallPhase.CONNECTED: return formatDuration(callDuration);
    case CallPhase.ENDING: return '正在结束通话...';
  }
};
```

#### B. 错误处理优化
```typescript
// 用户友好的错误信息
const handleCallError = (error: any) => {
  const errorMessages = {
    'NotAllowedError': '需要麦克风权限才能进行语音通话',
    'NotFoundError': '未找到可用的音频设备',
    'NetworkError': '网络连接不稳定，请检查网络后重试',
    'TimeoutError': '连接超时，请稍后再试',
    'UnknownError': '通话过程中发生错误，请重试'
  };
  
  const message = errorMessages[error.name] || errorMessages['UnknownError'];
  
  Alert.alert('通话失败', message, [
    { text: '确定', style: 'default' },
    { 
      text: '重试', 
      onPress: () => retryCall(),
      style: 'default' 
    }
  ]);
};
```

### 6. 性能优化

#### A. 内存管理
```typescript
// 组件卸载时的清理优化
useEffect(() => {
  return () => {
    // 清理WebRTC资源
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // 清理媒体流
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      localStreamRef.current = null;
    }
    
    // 清理音频会话
    AudioManager.stopAll();
    
    // 清理定时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // 清理状态缓存
    clearCallState();
  };
}, []);
```

#### B. 渲染优化
```typescript
// 使用React.memo避免不必要的重渲染
const VoiceCallScreen = React.memo(() => {
  // ... 组件逻辑
}, (prevProps, nextProps) => {
  // 自定义比较逻辑
  return (
    prevProps.callId === nextProps.callId &&
    prevProps.contactId === nextProps.contactId
  );
});

// 使用useCallback缓存函数
const handleEndCall = useCallback(() => {
  endCall();
}, [endCall]);
```

### 7. 服务器端优化

#### A. 通话记录优化
```javascript
// 批量创建通话记录
const createCallRecordsBatch = async (records) => {
  try {
    const results = await CallRecord.insertMany(records);
    console.log(`批量创建${results.length}条通话记录`);
    return results;
  } catch (error) {
    console.error('批量创建通话记录失败:', error);
    throw error;
  }
};

// 通话状态去重
const ensureUniqueCallRecord = async (callId) => {
  const existingRecord = await CallRecord.findOne({ callId });
  if (existingRecord) {
    console.log(`通话${callId}记录已存在，跳过创建`);
    return existingRecord;
  }
  return null;
};
```

#### B. Socket事件优化
```javascript
// 事件防抖处理
const debounceMap = new Map();

const debouncedEmit = (socket, event, data, delay = 100) => {
  const key = `${socket.id}_${event}`;
  
  if (debounceMap.has(key)) {
    clearTimeout(debounceMap.get(key));
  }
  
  const timeoutId = setTimeout(() => {
    socket.emit(event, data);
    debounceMap.delete(key);
  }, delay);
  
  debounceMap.set(key, timeoutId);
};

// 通话事件处理优化
socket.on('end_call', async (data) => {
  try {
    // 防止重复处理
    if (processingCalls.has(data.callId)) {
      console.log(`通话${data.callId}正在处理中，忽略重复请求`);
      return;
    }
    
    processingCalls.add(data.callId);
    
    // 处理通话结束逻辑
    await handleCallEnd(data);
    
  } finally {
    processingCalls.delete(data.callId);
  }
});
```

## 📊 性能监控

### 1. 关键指标监控
```typescript
// 通话质量指标
interface CallQualityMetrics {
  connectionTime: number;        // 连接建立时间
  audioPacketsLost: number;     // 音频包丢失数
  jitter: number;               // 网络抖动
  roundTripTime: number;        // 往返时延
  callDuration: number;         // 通话时长
}

// 定期收集统计数据
const collectCallStats = async () => {
  if (peerConnection) {
    const stats = await peerConnection.getStats();
    const audioStats = Array.from(stats.values())
      .find(stat => stat.type === 'inbound-rtp' && stat.mediaType === 'audio');
    
    return {
      packetsReceived: audioStats.packetsReceived,
      packetsLost: audioStats.packetsLost,
      jitter: audioStats.jitter,
      roundTripTime: audioStats.roundTripTime
    };
  }
};
```

### 2. 错误日志收集
```typescript
// 结构化错误日志
const logCallError = (error: any, context: any) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    callId: context.callId,
    userId: context.userId,
    errorType: error.name,
    errorMessage: error.message,
    stackTrace: error.stack,
    deviceInfo: {
      platform: Platform.OS,
      version: Platform.Version
    },
    networkInfo: context.networkInfo
  };
  
  // 发送到日志服务
  console.error('Call Error:', JSON.stringify(errorLog, null, 2));
};
```

## 🎯 部署建议

### 1. 生产环境配置
- **TURN服务器**: 部署专用TURN服务器确保NAT穿透
- **CDN加速**: 静态资源使用CDN加速加载
- **负载均衡**: Socket.IO使用sticky session配置
- **监控告警**: 部署实时监控和告警系统

### 2. 性能优化清单
- [ ] WebRTC多ICE服务器配置
- [ ] 音频质量参数优化
- [ ] 通话状态持久化
- [ ] 断线重连机制
- [ ] 错误处理优化
- [ ] 内存泄漏检查
- [ ] 性能监控集成
- [ ] 日志系统完善

通过以上优化措施，语音通话系统将在稳定性、性能和用户体验方面得到显著提升。 