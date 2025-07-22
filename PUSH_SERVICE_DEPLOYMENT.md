# 🚀 推送服务快速部署指南

## 📊 当前配置状态

✅ **基础配置完成**
- ✅ Firebase项目配置完整
- ✅ 配置文件已就绪
- ✅ 推送服务代码已实现
- ✅ 推送管理器已创建
- ✅ 测试脚本已生成

## 🔧 立即部署步骤

### 步骤1: 服务器端集成推送服务

在服务器上修改 `server.js`，添加以下代码：

```bash
# 在服务器上执行
cd /var/www/HomeServiceChat
nano server.js
```

在 `server.js` 文件顶部添加：

```javascript
// 添加推送服务
const PushNotificationManager = require('./src/services/PushNotificationManager');

// 在服务器启动后初始化推送服务
PushNotificationManager.initialize().catch(console.error);
```

在Socket.io的消息处理中添加推送：

```javascript
// 在 send_message 处理中添加推送通知
socket.on('send_message', async (data) => {
  // ... 现有的消息处理代码 ...
  
  // 发送推送通知
  try {
    await PushNotificationManager.sendMessageNotification(
      receiverId,
      senderName || '未知用户',
      content,
      conversationId
    );
  } catch (error) {
    console.error('推送通知发送失败:', error);
  }
});
```

### 步骤2: 重启服务器

```bash
# 重启后端服务
pm2 restart homeservice-chat

# 检查服务状态
pm2 logs homeservice-chat
```

### 步骤3: 移动端推送服务初始化

在移动端 `App.tsx` 中添加推送服务初始化：

```typescript
import React, { useEffect } from 'react';
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

### 步骤4: 在用户登录后更新FCM Token

在 `AuthContext.tsx` 的登录函数中添加：

```typescript
const login = async (loginData: any) => {
  try {
    // ... 现有登录逻辑 ...
    
    // 登录成功后更新FCM Token
    setTimeout(async () => {
      const fcmToken = pushNotificationService.getFCMTokenSync();
      if (fcmToken) {
        try {
          const response = await fetch(`${API_URL}/users/update-fcm-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ fcmToken }),
          });
          
          if (response.ok) {
            console.log('✅ FCM Token已更新到服务器');
          }
        } catch (error) {
          console.error('❌ FCM Token更新失败:', error);
        }
      }
    }, 2000); // 延迟2秒确保推送服务初始化完成
    
  } catch (error) {
    // ... 错误处理
  }
};
```

### 步骤5: 测试推送服务

#### 5.1 获取FCM Token

在移动端应用中添加调试代码：

```typescript
// 在任何组件中添加
import { pushNotificationService } from '../services/PushNotificationService';

const debugFCMToken = () => {
  const token = pushNotificationService.getFCMTokenSync();
  console.log('当前FCM Token:', token);
  // 在真实设备上可以通过网络请求发送到服务器进行测试
};
```

#### 5.2 运行测试脚本

```bash
# 修改测试脚本中的FCM Token
nano test-push-service.js

# 将 YOUR_TEST_FCM_TOKEN_HERE 替换为真实的FCM Token

# 运行测试
node test-push-service.js
```

## 📱 Android配置验证

确保 `android/app/src/main/AndroidManifest.xml` 包含：

```xml
<!-- 推送通知权限 -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Firebase消息服务 -->
<service
    android:name=".MyFirebaseMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

确保 `android/app/google-services.json` 文件存在且正确。

## 🧪 推送服务测试检查清单

### ✅ 服务器端检查
- [ ] 推送管理器已初始化
- [ ] 消息发送包含推送逻辑
- [ ] PM2服务重启正常
- [ ] 服务器日志无错误

### ✅ 移动端检查
- [ ] 推送服务已初始化
- [ ] FCM Token正常获取
- [ ] FCM Token已上传到服务器
- [ ] 应用通知权限已授予

### ✅ 功能测试
- [ ] 发送消息能收到推送通知
- [ ] 推送通知点击能正确导航
- [ ] 来电推送正常显示
- [ ] 前台/后台推送都正常

## 🚨 常见问题快速解决

### 1. FCM Token获取失败
```bash
# 检查Firebase配置
ls -la google-services.json
ls -la serviceAccountKey.json

# 检查网络连接
ping fcm.googleapis.com
```

### 2. 推送发送失败
```bash
# 检查服务器日志
pm2 logs homeservice-chat

# 验证推送管理器
node -e "console.log(require('./src/services/PushNotificationManager'))"
```

### 3. 推送不显示
- 检查设备通知权限
- 确认应用在前台/后台状态
- 验证FCM Token有效性

## 📈 推送服务监控

添加推送发送统计：

```javascript
// 在推送管理器中添加统计
let pushStats = {
  sent: 0,
  failed: 0
};

// 在发送成功后
pushStats.sent++;

// 在发送失败后
pushStats.failed++;

// 定期输出统计
setInterval(() => {
  console.log('📊 推送统计:', pushStats);
}, 300000); // 每5分钟
```

## ✅ 部署完成验证

推送服务部署成功标志：

1. ✅ 服务器日志显示"推送通知管理器初始化成功"
2. ✅ 移动端日志显示"推送服务初始化完成"
3. ✅ FCM Token能正常获取和上传
4. ✅ 发送消息后收到推送通知
5. ✅ 推送通知点击能正确导航

---

**🎉 推送服务部署完成后，用户体验将大大提升！**

立即开始部署：
1. 修改 `server.js` 集成推送服务
2. 重启PM2服务
3. 更新移动端推送初始化代码
4. 测试推送功能

需要帮助？参考完整文档：`PUSH_NOTIFICATION_SETUP_COMPLETE.md` 