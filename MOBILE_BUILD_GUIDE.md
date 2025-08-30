# 📱 HomeSM 移动端构建指南

## 🎯 概述
本指南将帮助你构建和测试HomeSM移动端应用。

## ✅ 前置条件检查
- ✅ 服务器已部署并运行正常
- ✅ 移动端API配置已更新
- ✅ 连接测试已通过

## 🚀 构建步骤

### 1. 环境准备
```bash
# 确保你在项目根目录
cd HomeSM

# 安装依赖
npm install

# 清理缓存
npx react-native-clean-project
```

### 2. Android构建

#### 2.1 开发环境构建
```bash
# 启动Metro bundler
npm start

# 在另一个终端运行Android
npx react-native run-android
```

#### 2.2 生产环境APK构建
```bash
# 进入android目录
cd android

# 生成签名APK
./gradlew assembleRelease

# APK文件位置
# android/app/build/outputs/apk/release/app-release.apk
```

### 3. iOS构建（如需要）
```bash
# 进入ios目录
cd ios

# 安装CocoaPods依赖
pod install

# 在Xcode中打开项目
open HomeSM.xcworkspace
```

## 🧪 测试指南

### 1. 开发环境测试
```bash
# 运行连接测试
node test-mobile-connection.js

# 启动开发服务器
npm run dev
```

### 2. 功能测试检查项

#### 2.1 基本功能
- [ ] 应用启动正常
- [ ] 用户注册功能
- [ ] 用户登录功能
- [ ] 界面显示正常

#### 2.2 通信功能
- [ ] 发送文本消息
- [ ] 发送图片消息
- [ ] 发送语音消息
- [ ] 发送视频消息
- [ ] 发送位置信息
- [ ] 实时消息接收

#### 2.3 通话功能
- [ ] 发起通话
- [ ] 接听通话
- [ ] 拒绝通话
- [ ] 通话记录

#### 2.4 高级功能
- [ ] 推送通知
- [ ] 文件上传
- [ ] 权限管理
- [ ] 网络状态检测

### 3. 网络连接测试
```bash
# 在移动端应用中测试以下功能
1. 打开应用，检查是否能正常加载
2. 尝试注册新用户
3. 尝试登录
4. 发送一条消息
5. 上传一张图片
6. 检查WebSocket连接状态
```

## 🔧 调试技巧

### 1. 检查网络连接
```javascript
// 在React Native中检查API连接
import { API_URL } from '../config/api';

const testConnection = async () => {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log('服务器连接正常:', data);
  } catch (error) {
    console.error('服务器连接失败:', error);
  }
};
```

### 2. 检查Socket连接
```javascript
// 在SocketContext中查看连接状态
const { isConnected, socket } = useContext(SocketContext);
console.log('Socket连接状态:', isConnected);
console.log('Socket ID:', socket?.id);
```

### 3. 查看日志
```bash
# Android日志
npx react-native log-android

# iOS日志
npx react-native log-ios
```

## 📊 服务器配置信息
- **服务器地址**: 38.207.178.173
- **API端口**: 3000
- **API基础URL**: http://38.207.178.173:3000/api
- **Socket.io URL**: http://38.207.178.173:3000
- **文件上传URL**: http://38.207.178.173:3000/uploads

## 🚨 常见问题解决

### 1. 网络连接失败
- 检查服务器是否运行：`systemctl status nginx`
- 检查防火墙端口是否开放
- 确认API地址配置正确

### 2. Socket连接失败
- 检查认证令牌是否正确
- 确认Socket.io服务运行正常
- 检查网络连接稳定性

### 3. 文件上传失败
- 检查文件大小限制
- 确认文件类型支持
- 检查上传目录权限

## 📝 构建记录

### 当前配置状态
- ✅ API地址: 38.207.178.173:3000
- ✅ Socket.io: 配置正确
- ✅ 服务器连接: 正常
- ✅ 所有测试通过

### 构建版本信息
- React Native: 0.79.3
- Node.js: 18.20.6
- 服务器: Ubuntu 22.04
- 部署时间: 2025-07-06

## 🎯 下一步计划
1. 构建Android APK
2. 测试所有功能
3. 配置推送通知
4. 发布到应用商店（可选）

---
**构建成功标志**: 当应用能够正常连接服务器、发送消息、上传文件时，表示构建成功！ 