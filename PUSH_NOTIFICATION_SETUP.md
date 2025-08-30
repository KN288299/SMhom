# 推送通知功能安装指南

## 当前状态
目前已实现基础的**应用内通知**功能，包括：
- ✅ 消息通知弹窗
- ✅ 来电通知弹窗  
- ✅ 后台状态检测
- ✅ 权限管理

## 功能说明

### 1. 应用内通知
- 当应用在后台时，收到消息会显示Alert弹窗
- 来电时会显示带"接听/拒绝"按钮的弹窗
- 自动检测应用前后台状态

### 2. 权限管理
- 自动检查通知权限状态
- 引导用户开启通知权限
- 跨平台权限处理

### 3. 测试功能
添加了测试按钮组件 `NotificationTestButton`，可以：
- 测试消息通知
- 测试来电通知
- 检查权限状态

## 升级到真正的推送通知

要实现**真正的系统级推送通知**（应用完全关闭时也能收到），需要以下步骤：

### 第一步：安装依赖
```bash
# 运行安装脚本
./install-push-notifications.bat

# 或手动安装
npm install @react-native-firebase/app @react-native-firebase/messaging
npm install react-native-push-notification @react-native-community/push-notification-ios
```

### 第二步：配置Firebase
1. 在 [Firebase Console](https://console.firebase.google.com/) 创建项目
2. 下载 `google-services.json` (Android) 和 `GoogleService-Info.plist` (iOS)
3. 将配置文件放到对应位置：
   - Android: `android/app/google-services.json`
   - iOS: `ios/SMhom/GoogleService-Info.plist`

### 第三步：原生代码配置

#### Android 配置
1. 修改 `android/build.gradle`:
```gradle
dependencies {
    classpath 'com.google.gms:google-services:4.3.15'
}
```

2. 修改 `android/app/build.gradle`:
```gradle
apply plugin: 'com.google.gms.google-services'
```

#### iOS 配置
1. 在 Xcode 中添加 Push Notifications capability
2. 配置 APNs 证书

### 第四步：服务器端推送
需要在服务器端集成 Firebase Admin SDK，在以下情况发送推送：
- 收到新消息时
- 有来电时
- 其他重要通知

## 测试方法

### 方法1：使用测试按钮
在任何页面添加测试组件：
```tsx
import NotificationTestButton from '../components/NotificationTestButton';

// 在render中添加
<NotificationTestButton />
```

### 方法2：直接调用服务
```tsx
import notificationService from '../services/NotificationService';

// 测试消息通知
notificationService.showMessageNotification('测试用户', '测试消息', 'conv-123');

// 测试来电通知
notificationService.showCallNotification('测试客服', 'call-123', 'conv-123');
```

## 当前文件结构
```
src/
├── services/
│   ├── NotificationService.ts          # 通知服务（简化版）
│   └── PushNotificationService.ts      # 完整推送服务（需要安装依赖）
├── components/
│   ├── BackgroundNotificationManager.tsx  # 后台通知管理
│   └── NotificationTestButton.tsx         # 测试按钮
└── App.tsx                             # 已集成BackgroundNotificationManager
```

## 注意事项
1. **iOS模拟器**不支持真实推送通知，需要真机测试
2. **Android 13+** 需要用户手动授权通知权限
3. **应用关闭状态**的推送需要Firebase/APNs配置
4. **来电通知**建议使用高优先级推送

## 下一步
1. 运行 `install-push-notifications.bat` 安装依赖
2. 配置Firebase项目
3. 替换 `NotificationService.ts` 为 `PushNotificationService.ts`
4. 在服务器端集成推送功能 