# Firebase Cloud Messaging HTTP v1 API 升级指南

## 📋 概述

Firebase Cloud Messaging (FCM) 正在从传统的Legacy API过渡到新的HTTP v1 API。Legacy API将在2024年6月20日之后逐步弃用，建议立即升级到新版API。

## 🆚 新旧版本对比

### 🔴 Legacy API (旧版)
- **认证方式**: 服务器密钥 (Server Key)
- **端点**: `https://fcm.googleapis.com/fcm/send`
- **请求头**: `Authorization: key=<server_key>`
- **功能**: 基础推送功能
- **状态**: 即将弃用 ⚠️

### 🟢 HTTP v1 API (新版)
- **认证方式**: 服务账号密钥 (Service Account) + OAuth 2.0
- **端点**: `https://fcm.googleapis.com/v1/projects/{project-id}/messages:send`
- **请求头**: `Authorization: Bearer <access_token>`
- **功能**: 更丰富的推送配置，更好的错误处理
- **状态**: 官方推荐，长期支持 ✅

## 🚀 升级步骤

### 1. 获取Firebase服务账号密钥

1. 访问 [Firebase控制台](https://console.firebase.google.com/)
2. 选择你的项目 `homeservicechat-dd8d3`
3. 点击 ⚙️ (设置) → 项目设置
4. 选择"服务账号"标签页
5. 选择"Node.js"
6. 点击"生成新的私钥"
7. 下载JSON文件并重命名为 `serviceAccountKey.json`
8. 将文件放在项目根目录下

### 2. 安装必要依赖

```bash
npm install firebase-admin google-auth-library
```

### 3. 配置环境

运行设置向导检查配置：

```bash
node firebase-v1-setup.js
```

### 4. 测试新版API

运行新版API测试：

```bash
node test-firebase-push-v1.js
```

对比旧版API测试：

```bash
node test-firebase-push.js
```

## 📁 文件结构

```
HomeServiceChat/
├── firebase-push-v1.js              # 新版API实现
├── firebase-v1-setup.js             # 设置向导
├── test-firebase-push-v1.js         # 新版API测试
├── test-firebase-push.js            # 旧版API测试（对比用）
├── serviceAccountKey.json           # 服务账号密钥（需下载）
├── google-services.json             # Android配置文件
└── firebase-config.json             # 配置文件（自动生成）
```

## 🔧 代码迁移示例

### 旧版Legacy API代码

```javascript
const response = await fetch('https://fcm.googleapis.com/fcm/send', {
  method: 'POST',
  headers: {
    'Authorization': 'key=AAAA...',  // 服务器密钥
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: fcmToken,
    notification: {
      title: '消息标题',
      body: '消息内容',
    },
    data: {
      type: 'message',
    },
  }),
});
```

### 新版HTTP v1 API代码

#### 方式1: 使用Firebase Admin SDK (推荐)

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const message = {
  notification: {
    title: '消息标题',
    body: '消息内容',
  },
  data: {
    type: 'message',
  },
  token: fcmToken,
};

const response = await admin.messaging().send(message);
```

#### 方式2: 直接HTTP v1 API调用

```javascript
const { GoogleAuth } = require('google-auth-library');

const auth = new GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
});

const accessToken = await auth.getAccessToken();

const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: {
      token: fcmToken,
      notification: {
        title: '消息标题',
        body: '消息内容',
      },
      data: {
        type: 'message',
      },
    },
  }),
});
```

## 🎯 具体使用方法

### 使用新版推送服务

```javascript
const { firebasePushV1 } = require('./firebase-push-v1');
const serviceAccount = require('./serviceAccountKey.json');

// 初始化
await firebasePushV1.initialize(serviceAccount, 'homeservicechat-dd8d3');

// 发送消息推送
await firebasePushV1.sendMessagePush(
  fcmToken,
  '发送者姓名',
  '消息内容',
  'conversationId'
);

// 发送来电推送
await firebasePushV1.sendCallPush(
  fcmToken,
  '来电者姓名',
  'callId',
  'conversationId'
);

// 发送系统推送
await firebasePushV1.sendSystemPush(
  fcmToken,
  '标题',
  '内容',
  { customData: 'value' }
);
```

## 🔐 安全注意事项

### 服务账号密钥管理

1. **保密性**: 服务账号密钥是机密信息，切勿公开
2. **版本控制**: 将 `serviceAccountKey.json` 添加到 `.gitignore`
3. **轮换**: 定期生成新的服务账号密钥
4. **权限**: 服务账号只授予必要的权限

### .gitignore 配置

确保你的 `.gitignore` 包含：

```gitignore
# Firebase私钥
serviceAccountKey.json
firebase-config.json

# 环境配置
.env
.env.local
```

## 📊 性能和功能提升

### HTTP v1 API的优势

1. **更好的错误处理**: 详细的错误信息和状态码
2. **丰富的消息配置**: 支持更多平台特定设置
3. **OAuth 2.0安全性**: 基于令牌的认证，更安全
4. **统一的API接口**: 一致的请求/响应格式
5. **长期支持**: Google官方推荐，长期维护

### 推送配置增强

```javascript
const advancedMessage = {
  notification: {
    title: '高级推送',
    body: '支持更多配置选项',
  },
  data: {
    type: 'advanced',
    timestamp: Date.now().toString(),
  },
  android: {
    priority: 'high',
    notification: {
      channelId: 'important_channel',
      icon: 'ic_notification',
      color: '#FF6B81',
      sound: 'custom_sound.mp3',
      vibrate: [1000, 500, 1000],
      ledColor: '#FF0000',
      ledLightOnMs: 1000,
      ledLightOffMs: 500,
    },
    data: {
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    },
  },
  apns: {
    payload: {
      aps: {
        category: 'MESSAGE_CATEGORY',
        sound: 'custom_sound.wav',
        badge: 1,
        'mutable-content': 1,
      },
    },
  },
  webpush: {
    headers: {
      TTL: '86400',
    },
    notification: {
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
    },
  },
};
```

## 🧪 测试指南

### 测试流程

1. **配置检查**: 运行 `node firebase-v1-setup.js`
2. **功能测试**: 运行 `node test-firebase-push-v1.js`
3. **对比测试**: 运行 `node test-firebase-push.js`
4. **生产验证**: 在实际设备上测试推送接收

### 测试清单

- [ ] 服务账号密钥配置正确
- [ ] Firebase项目ID配置正确
- [ ] 消息推送测试通过
- [ ] 来电推送测试通过
- [ ] 系统推送测试通过
- [ ] 错误处理机制正常
- [ ] 推送到达率满足预期

## 🔄 迁移时间表

### 立即执行 (推荐)

1. 下载并配置服务账号密钥
2. 安装新版依赖包
3. 测试新版API功能
4. 逐步替换项目中的推送代码

### 最晚期限

- **2024年6月20日**: Legacy API开始限制
- **2024年底**: Legacy API完全停用

## 📞 技术支持

如果在升级过程中遇到问题：

1. 查看 [Firebase官方文档](https://firebase.google.com/docs/cloud-messaging/migrate-v1)
2. 运行诊断脚本检查配置
3. 查看错误日志和状态码
4. 确认网络连接和Firebase项目设置

## ✅ 完成确认

升级完成后，确认以下项目：

- [ ] 新版API测试全部通过
- [ ] 生产环境推送功能正常
- [ ] 旧版API代码已替换
- [ ] 服务账号密钥安全存储
- [ ] 团队成员了解新版API使用方法

---

**⚠️ 重要提醒**: Legacy API即将弃用，请尽快完成升级以避免服务中断！ 