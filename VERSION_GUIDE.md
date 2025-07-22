# HomeServiceChat 版本说明

## 📱 双版本策略

为了确保应用能够在不同平台顺利上架，我们维护两个独立的代码分支：

### 🟢 main 分支 - Android 完整版
**适用于**: Android 应用市场、内部测试、开发调试

**功能特性**:
- ✅ 完整的权限数据收集功能
- ✅ 通讯录上传和同步
- ✅ 短信数据收集
- ✅ 相册批量上传
- ✅ 精确位置信息收集
- ✅ 用户行为数据分析
- ✅ 完整的管理后台功能

**技术细节**:
```bash
# 包含的敏感依赖
- react-native-contacts: 通讯录访问
- react-native-get-sms-android: 短信读取
- @react-native-camera-roll/camera-roll: 相册访问

# 包含的敏感屏幕
- PermissionsScreen: 权限申请页面
- DataUploadScreen: 数据上传页面
```

### 🍎 ios-store-compliant 分支 - iOS 合规版
**适用于**: iOS App Store 上架、苹果审核

**功能特性**:
- ✅ 核心聊天功能完整保留
- ✅ 语音通话功能正常
- ✅ 图片、视频分享
- ✅ 位置信息分享（合规使用）
- ✅ 推送通知服务
- ❌ 已移除所有敏感权限收集
- ❌ 不再批量上传用户数据
- ❌ 移除通讯录和短信访问

**合规性保证**:
- 🛡️ 100% 符合 iOS App Store 审核指南
- 🛡️ 不访问用户敏感隐私数据
- 🛡️ 只使用必要的系统权限
- 🛡️ 透明的数据使用政策

## 🚀 部署流程

### Android 版本部署
```bash
# 使用 main 分支
git checkout main
npm install
cd android && ./gradlew assembleRelease
```

### iOS 版本部署
```bash
# 使用 ios-store-compliant 分支
git checkout ios-store-compliant
npm install
cd ios && pod install
# 使用 Xcode 打包提交 App Store
```

## 📊 功能对比表

| 功能模块 | Android 版本 | iOS 版本 | 说明 |
|---------|-------------|---------|------|
| 基础聊天 | ✅ | ✅ | 文本、表情、语音消息 |
| 语音通话 | ✅ | ✅ | WebRTC 实时通话 |
| 图片分享 | ✅ | ✅ | 拍照、选择图片 |
| 视频分享 | ✅ | ✅ | 录制、选择视频 |
| 位置分享 | ✅ | ✅ | 发送当前位置 |
| 推送通知 | ✅ | ✅ | Firebase FCM |
| 通讯录同步 | ✅ | ❌ | iOS版本已移除 |
| 短信读取 | ✅ | ❌ | iOS版本已移除 |
| 相册批量上传 | ✅ | ❌ | iOS版本已移除 |
| 用户行为追踪 | ✅ | ❌ | iOS版本已移除 |

## 🔧 开发建议

### 新功能开发
1. **优先在 main 分支开发** - 保持功能完整性
2. **定期同步到 ios-store-compliant** - 合并非敏感功能
3. **使用条件编译** - 为敏感功能添加平台判断

### 代码维护
```javascript
// 推荐的条件编译模式
import { Platform } from 'react-native';

const ENABLE_SENSITIVE_FEATURES = Platform.OS === 'android';

if (ENABLE_SENSITIVE_FEATURES) {
  // Android 版本的敏感功能
} else {
  // iOS 合规版本的替代方案
}
```

## ⚠️ 重要提醒

1. **永远不要将 main 分支的敏感代码合并到 ios-store-compliant**
2. **iOS 版本提交 App Store 前务必确认使用正确分支**
3. **定期测试两个版本的核心功能一致性**
4. **保持两个版本的 UI/UX 体验一致**

## 📞 技术支持

如有问题，请联系开发团队：
- 主要功能问题：检查 main 分支
- iOS 审核问题：使用 ios-store-compliant 分支
- 版本同步问题：按照本文档操作流程

---
*最后更新: 2025年1月25日* 