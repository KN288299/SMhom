# 🔔 HomeServiceChat 推送通知完整配置指南

## 📋 当前配置状态

### ✅ 已完成的配置
- ✅ Firebase项目已创建 (homeservicechat)
- ✅ google-services.json 已配置
- ✅ serviceAccountKey.json 已配置
- ✅ 移动端Firebase SDK已集成
- ✅ 服务器端Firebase Admin SDK已集成
- ✅ 推送服务代码已实现

### ⚠️ 需要完成的配置
- 🔧 服务器端推送服务集成
- 🔧 移动端推送服务初始化
- 🔧 推送通知权限配置
- 🔧 推送服务测试

## 🚀 推送服务配置步骤

### 1. 服务器端配置

#### 1.1 集成Firebase推送服务到主服务器

在 `server.js` 中添加Firebase推送服务：

```javascript
// 在文件顶部添加
const { firebasePushV1 } = require('./firebase-push-v1');
const serviceAccount = require('./serviceAccountKey.json');

// 初始化Firebase推送服务
let firebasePushInitialized = false;

async function initializeFirebasePush() {
  if (firebasePushInitialized) return;
  
  try {
    await firebasePushV1.initialize(serviceAccount, 'homeservicechat');
    firebasePushInitialized = true;
    console.log('✅ Firebase推送服务初始化成功');
  } catch (error) {
    console.error('❌ Firebase推送服务初始化失败:', error);
  }
}

// 在server启动后调用
initializeFirebasePush();
```

#### 1.2 在消息发送时添加推送通知

在Socket.io的消息处理中添加推送：

```javascript
// 在 server.js 的 send_message 处理中
socket.on('send_message', async (data) => {
  // ... 现有的消息处理代码 ...
  
  // 发送推送通知
  try {
    if (firebasePushInitialized && receiverSocket && receiverSocket.fcmToken) {
      await firebasePushV1.sendMessagePush(
        receiverSocket.fcmToken,
        senderName,
        content,
        conversationId
      );
      console.log('📱 推送通知已发送');
    }
  } catch (error) {
    console.error('❌ 推送通知发送失败:', error);
  }
});
```

### 2. 移动端配置

#### 2.1 初始化推送服务

在 `App.tsx` 中初始化推送服务：

```typescript
import { pushNotificationService } from './src/services/PushNotificationService';

const App: React.FC = () => {
  useEffect(() => {
    // 初始化推送服务
    const initializePushService = async () => {
      try {
        await pushNotificationService.initialize();
        console.log('✅ 推送服务初始化完成');
      } catch (error) {
        console.error('❌ 推送服务初始化失败:', error);
      }
    };

    initializePushService();
  }, []);

  // ... 其他代码
};
```

#### 2.2 在用户登录后更新FCM Token

在 `AuthContext.tsx` 中：

```typescript
const login = async (loginData: any) => {
  try {
    // ... 现有登录逻辑 ...
    
    // 登录成功后更新FCM Token
    const fcmToken = pushNotificationService.getFCMTokenSync();
    if (fcmToken) {
      try {
        await updateFCMTokenOnServer(fcmToken, token);
        console.log('✅ FCM Token已更新到服务器');
      } catch (error) {
        console.error('❌ FCM Token更新失败:', error);
      }
    }
  } catch (error) {
    // ... 错误处理
  }
};

const updateFCMTokenOnServer = async (fcmToken: string, userToken: string) => {
  const response = await fetch(`${API_URL}/users/update-fcm-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`,
    },
    body: JSON.stringify({ fcmToken }),
  });

  if (!response.ok) {
    throw new Error('FCM Token更新失败');
  }
};
```

### 3. Android配置

#### 3.1 确保权限配置

在 `android/app/src/main/AndroidManifest.xml` 中：

```xml
<!-- 推送通知权限 -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Firebase消息服务 -->
<service
    android:name=".MyFirebaseMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

#### 3.2 确保Firebase配置文件位置正确

```
android/app/google-services.json
```

### 4. 服务器端推送服务测试

#### 4.1 创建推送测试脚本

```javascript
// test-push-notification.js
const { firebasePushV1 } = require('./firebase-push-v1');
const serviceAccount = require('./serviceAccountKey.json');

async function testPushNotification() {
  try {
    // 初始化
    await firebasePushV1.initialize(serviceAccount, 'homeservicechat');
    console.log('✅ Firebase推送服务初始化成功');

    // 测试消息推送（需要真实的FCM Token）
    const testFCMToken = 'YOUR_TEST_FCM_TOKEN';
    
    if (testFCMToken !== 'YOUR_TEST_FCM_TOKEN') {
      // 发送测试消息
      await firebasePushV1.sendMessagePush(
        testFCMToken,
        '测试用户',
        '这是一条测试消息',
        'test_conversation'
      );
      console.log('✅ 测试消息推送发送成功');

      // 发送测试来电通知
      await firebasePushV1.sendCallPush(
        testFCMToken,
        '测试来电者',
        'test_call_id',
        'test_conversation'
      );
      console.log('✅ 测试来电推送发送成功');
    } else {
      console.log('⚠️  请设置真实的FCM Token进行测试');
    }

  } catch (error) {
    console.error('❌ 推送测试失败:', error);
  }
}

testPushNotification();
```

### 5. 数据库用户表添加FCM Token字段

确保用户模型包含FCM Token字段：

```javascript
// 在 src/models/userModel.js 中
const userSchema = new mongoose.Schema({
  // ... 现有字段 ...
  fcmToken: {
    type: String,
    default: null,
    index: true
  },
  // ... 其他字段 ...
});
```

### 6. 完整的推送服务集成

#### 6.1 创建推送服务管理器

```javascript
// src/services/PushNotificationManager.js
const { firebasePushV1 } = require('../firebase-push-v1');
const User = require('../models/userModel');

class PushNotificationManager {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      const serviceAccount = require('../serviceAccountKey.json');
      await firebasePushV1.initialize(serviceAccount, 'homeservicechat');
      this.initialized = true;
      console.log('✅ 推送通知管理器初始化成功');
    } catch (error) {
      console.error('❌ 推送通知管理器初始化失败:', error);
    }
  }

  async sendMessageNotification(receiverId, senderName, messageContent, conversationId) {
    if (!this.initialized) return false;

    try {
      const receiver = await User.findById(receiverId);
      if (!receiver || !receiver.fcmToken) {
        console.log('⚠️  接收者无FCM Token，跳过推送');
        return false;
      }

      await firebasePushV1.sendMessagePush(
        receiver.fcmToken,
        senderName,
        messageContent,
        conversationId
      );
      console.log('✅ 消息推送发送成功');
      return true;
    } catch (error) {
      console.error('❌ 消息推送发送失败:', error);
      return false;
    }
  }

  async sendCallNotification(receiverId, callerName, callId, conversationId) {
    if (!this.initialized) return false;

    try {
      const receiver = await User.findById(receiverId);
      if (!receiver || !receiver.fcmToken) {
        console.log('⚠️  接收者无FCM Token，跳过推送');
        return false;
      }

      await firebasePushV1.sendCallPush(
        receiver.fcmToken,
        callerName,
        callId,
        conversationId
      );
      console.log('✅ 来电推送发送成功');
      return true;
    } catch (error) {
      console.error('❌ 来电推送发送失败:', error);
      return false;
    }
  }
}

module.exports = new PushNotificationManager();
```

## 🧪 测试推送服务

### 1. 运行测试脚本

```bash
# 在服务器上运行
node test-push-notification.js
```

### 2. 移动端测试步骤

1. 构建并安装应用到设备
2. 注册/登录用户
3. 检查FCM Token是否正确上传到服务器
4. 发送测试消息，检查是否收到推送通知
5. 测试来电推送功能

### 3. 调试技巧

```javascript
// 在移动端获取FCM Token进行测试
import { pushNotificationService } from './src/services/PushNotificationService';

const token = pushNotificationService.getFCMTokenSync();
console.log('当前FCM Token:', token);
```

## 📊 推送服务配置信息

### Firebase项目配置
- **项目ID**: homeservicechat
- **应用包名**: com.homeservicechat
- **配置文件**: google-services.json, serviceAccountKey.json

### 推送类型支持
- ✅ 文本消息推送
- ✅ 图片消息推送
- ✅ 语音消息推送
- ✅ 来电推送
- ✅ 系统通知推送

### 平台支持
- ✅ Android 推送通知
- ✅ iOS 推送通知（需要额外配置）
- ✅ 前台/后台推送处理

## 🚨 常见问题解决

### 1. FCM Token获取失败
- 检查Firebase配置文件是否正确
- 确认网络连接正常
- 检查Firebase项目权限

### 2. 推送发送失败
- 验证服务账号密钥有效性
- 检查FCM Token是否有效
- 确认Firebase项目配置正确

### 3. 推送不显示
- 检查设备通知权限
- 确认应用通知设置
- 验证推送内容格式

## ✅ 完成标志

推送服务配置成功的标志：
- ✅ 移动端能正常获取FCM Token
- ✅ FCM Token能正确上传到服务器
- ✅ 服务器能成功发送推送通知
- ✅ 移动端能接收并显示推送通知
- ✅ 点击推送通知能正确导航

---
**推送服务是移动应用的重要功能，正确配置后能大大提升用户体验！** 