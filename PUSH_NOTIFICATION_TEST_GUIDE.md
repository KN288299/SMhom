# 📱 Android推送通知完整测试指南

## 🎯 当前完成状态

### ✅ 已完成的功能
1. **Android原生推送配置** - Firebase配置完整
2. **应用内弹窗系统** - 消息、来电、系统通知
3. **FCM Token管理** - 自动获取、上传、刷新
4. **导航集成** - 点击通知自动跳转页面
5. **测试组件** - 在首页添加了测试按钮
6. **服务器端示例** - 推送发送脚本

### 🔧 配置文件状态
- ✅ `android/build.gradle` - Google Services插件已添加
- ✅ `android/app/build.gradle` - Firebase依赖已添加
- ✅ `AndroidManifest.xml` - Firebase服务已配置
- ✅ `MyFirebaseMessagingService.kt` - 消息处理服务已创建
- ✅ `google-services.json` - 已正确放置

## 🚀 测试步骤

### 第一步：安装Firebase依赖
```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

### 第二步：构建应用
```bash
# 清理构建
cd android
./gradlew clean
cd ..

# 构建并运行
npx react-native run-android
```

### 第三步：测试应用内弹窗
1. 打开应用，进入首页
2. 在首页顶部找到"🔔 推送通知测试中心"
3. 点击测试按钮：
   - **💬 测试消息弹窗** - 模拟收到消息
   - **📞 测试来电弹窗** - 模拟收到来电
   - **🔔 测试系统通知** - 模拟系统通知
   - **ℹ️ 查看功能说明** - 查看功能完成情况

### 第四步：获取FCM Token
1. 打开应用并登录
2. 查看控制台日志，找到类似这样的输出：
```
🔑 [AndroidPush] FCM Token获取成功: exxxxxxxxxxxxxxx...
```
3. 复制完整的FCM Token

### 第五步：Firebase控制台测试
1. 打开 [Firebase Console](https://console.firebase.google.com/)
2. 选择你的项目
3. 左侧菜单选择"Cloud Messaging"
4. 点击"发送您的第一条消息"
5. 填写：
   - **通知标题**：`新消息`
   - **通知文本**：`这是一条测试推送消息`
6. 点击"发送测试消息"
7. 输入你的FCM Token
8. 点击"测试"

### 第六步：测试不同应用状态
- **前台状态**：应用打开时，应该显示弹窗
- **后台状态**：应用在后台时，通知栏显示通知
- **关闭状态**：应用完全关闭时，点击通知打开应用

## 🔧 高级测试（服务器端推送）

### 安装服务器依赖
```bash
npm install firebase-admin node-fetch
```

### 使用测试脚本
1. 编辑`test-firebase-push.js`文件
2. 将`YOUR_DEVICE_FCM_TOKEN_HERE`替换为实际的FCM Token
3. 运行测试：
```bash
node test-firebase-push.js
```

### 自定义推送测试
```javascript
const { sendPushWithHTTP } = require('./test-firebase-push');

// 发送消息推送
await sendPushWithHTTP(
  'your_fcm_token',
  '新消息',
  '您收到了一条消息',
  {
    type: 'message',
    conversationId: 'conv_123',
    senderName: '张三'
  }
);

// 发送来电推送
await sendPushWithHTTP(
  'your_fcm_token',
  '来电',
  '李四正在呼叫您',
  {
    type: 'voice_call',
    callId: 'call_456',
    conversationId: 'conv_789',
    senderName: '李四'
  }
);
```

## 📋 测试检查清单

### 基础功能测试
- [ ] 应用可以正常启动
- [ ] FCM Token可以正常获取
- [ ] 测试按钮可以正常工作
- [ ] 消息弹窗正常显示
- [ ] 来电弹窗正常显示

### 推送通知测试
- [ ] Firebase控制台可以发送测试消息
- [ ] 前台状态下收到推送显示弹窗
- [ ] 后台状态下收到推送显示通知栏
- [ ] 关闭状态下收到推送显示通知栏
- [ ] 点击通知可以打开应用

### 数据处理测试
- [ ] 推送数据正确解析
- [ ] 根据推送类型显示不同界面
- [ ] 导航功能正常工作
- [ ] FCM Token正确上传到服务器

## 🐛 常见问题解决

### 问题1：构建失败
**解决方案**：
1. 确保`google-services.json`在正确位置
2. 检查Firebase依赖版本
3. 清理项目重新构建

### 问题2：收不到推送
**解决方案**：
1. 检查通知权限是否允许
2. 检查FCM Token是否正确
3. 检查Firebase项目配置
4. 检查服务器密钥

### 问题3：弹窗不显示
**解决方案**：
1. 检查控制台错误日志
2. 确认推送数据格式正确
3. 检查NotificationService是否初始化

### 问题4：导航不工作
**解决方案**：
1. 确认navigationRef正确设置
2. 检查路由名称是否正确
3. 查看导航相关错误日志

## 🎉 测试成功标志

当你看到以下现象时，说明推送通知功能正常：

1. **应用前台时**：收到推送显示弹窗，可以点击查看或关闭
2. **应用后台时**：通知栏显示推送，点击可以打开应用并导航到相应页面
3. **应用关闭时**：通知栏显示推送，点击可以启动应用并导航
4. **控制台日志**：显示FCM Token获取成功，推送事件处理正常

## 📞 技术支持

如果遇到问题，请检查：
1. React Native版本：0.72+
2. Firebase版本：最新稳定版
3. Android版本：支持Android 6.0+
4. 网络连接：确保可以访问Firebase服务

恭喜！你现在拥有一个完整的Android推送通知系统！🎊 