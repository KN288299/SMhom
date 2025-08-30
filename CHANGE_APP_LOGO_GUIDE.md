# 🎨 更换App Logo和打包指南

## 📋 准备工作

### 1. 准备Logo图片
- 使用1024x1024像素的PNG图片作为源文件
- 图片应该是正方形，背景透明或纯色
- 确保图片清晰，没有模糊或锯齿

### 2. 准备新的App名称
- 中文名称：御足堂交友
- 英文名称：YuZuTang Dating

## 🔄 更换步骤

### 第一步：更换App名称

#### 1.1 修改app.json
```json
{
  "name": "HomeServiceChat",
  "displayName": "御足堂交友"
}
```

#### 1.2 修改Android应用名称
文件：`android/app/src/main/res/values/strings.xml`
```xml
<resources>
    <string name="app_name">御足堂交友</string>
</resources>
```

### 第二步：更换Logo

#### 2.1 自动生成所有尺寸的Logo
1. 将您的logo图片重命名为 `logo.png`
2. 将logo.png放在项目根目录
3. 运行生成脚本：
```bash
node generate-icons.js
```

#### 2.2 手动替换Logo（可选）
如果您想手动替换，需要准备以下尺寸的图片：

**Android图标：**
- `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48)
- `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192)

**iOS图标：**
- `ios/SMhom/Images.xcassets/AppIcon.appiconset/` 目录下的所有PNG文件

### 第三步：测试更改

#### 3.1 测试Android
```bash
# 清理并重新构建
cd android
./gradlew clean
cd ..

# 运行Android应用
npm run android
```

#### 3.2 测试iOS
```bash
# 清理iOS构建
cd ios
rm -rf build
cd ..

# 运行iOS应用
npm run ios
```

## 📦 打包应用

### Android APK打包

#### 方法一：使用脚本（推荐）
```bash
# Windows
build-android.bat

# Linux/Mac
chmod +x build-android.sh
./build-android.sh
```

#### 方法二：手动打包
```bash
# 1. 安装依赖
npm install

# 2. 清理项目
cd android
./gradlew clean
cd ..

# 3. 构建Release APK
cd android
./gradlew assembleRelease
cd ..

# 4. 构建Debug APK（可选）
cd android
./gradlew assembleDebug
cd ..
```

### 打包结果
- **Release APK**: `android/app/build/outputs/apk/release/app-release.apk`
- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk`

### iOS IPA打包

#### 使用Xcode打包
1. 打开 `ios/SMhom.xcworkspace`
2. 选择 "Product" → "Archive"
3. 在Organizer中选择 "Distribute App"
4. 选择分发方式（App Store、Ad Hoc等）

## 🔧 常见问题解决

### 1. 图标显示不正确
- 确保图片尺寸正确
- 检查图片格式是否为PNG
- 清理项目后重新构建

### 2. 应用名称没有更新
- 检查 `strings.xml` 文件
- 清理项目缓存
- 重新安装应用

### 3. 打包失败
- 检查Java和Android SDK版本
- 确保所有依赖已安装
- 查看错误日志

### 4. 签名问题
- 检查 `android/app/build.gradle` 中的签名配置
- 确保keystore文件存在
- 验证签名密码

## 📱 验证更改

### 1. 检查应用图标
- 在设备上安装新APK
- 检查桌面图标是否正确显示
- 检查应用内图标

### 2. 检查应用名称
- 检查桌面显示的应用名称
- 检查应用内标题
- 检查设置中的应用名称

### 3. 功能测试
- 测试所有主要功能
- 确保更改没有破坏现有功能
- 测试不同设备尺寸

## 🎯 最佳实践

### 1. Logo设计建议
- 使用简洁、清晰的设计
- 确保在小尺寸下仍然清晰
- 使用透明背景或纯色背景
- 避免使用过多细节

### 2. 应用名称建议
- 使用简洁、易记的名称
- 避免使用特殊字符
- 考虑不同语言的显示效果

### 3. 打包前检查清单
- [ ] Logo已正确替换所有尺寸
- [ ] 应用名称已更新
- [ ] 功能测试通过
- [ ] 签名配置正确
- [ ] 版本号已更新（如需要）

## 📞 获取帮助

如果遇到问题，请检查：
1. 控制台错误信息
2. 构建日志
3. 设备日志
4. 项目配置文件

常见错误和解决方案请参考项目文档或React Native官方文档。 