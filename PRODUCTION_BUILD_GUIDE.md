# 🏭 生产环境打包完整指南

## 📋 准备工作

### 1. 环境要求
- **Java JDK**: 版本 11 或更高
- **Android SDK**: 已安装并配置环境变量
- **Node.js**: 版本 16 或更高
- **React Native CLI**: 全局安装

### 2. 检查环境
```bash
# 检查Java版本
java -version

# 检查Android SDK
adb version

# 检查Node.js版本
node -v

# 检查npm版本
npm -v
```

## 🔐 第一步：生成生产环境签名证书

### 方法一：使用脚本（推荐）
```bash
# Windows
generate-release-keystore.bat

# Linux/Mac
chmod +x generate-release-keystore.sh
./generate-release-keystore.sh
```

### 方法二：手动生成
```bash
keytool -genkeypair -v -keystore android/app/release.keystore -alias your_key_alias -keyalg RSA -keysize 2048 -validity 10000
```

### 证书信息示例
- **证书密码**: `your_keystore_password`
- **密钥别名**: `your_key_alias`
- **密钥密码**: `your_key_password`
- **组织名称**: `YuZuTang Technology`
- **组织单位**: `Mobile Development`
- **通用名称**: `YuZuTang Dating App`
- **国家代码**: `CN`

## ⚙️ 第二步：配置签名信息

### 1. 更新 gradle.properties
编辑 `android/gradle.properties` 文件：
```properties
# 生产环境签名配置
MYAPP_RELEASE_STORE_FILE=release.keystore
MYAPP_RELEASE_KEY_ALIAS=your_key_alias
MYAPP_RELEASE_STORE_PASSWORD=your_keystore_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

### 2. 验证配置
```bash
# 查看证书信息
keytool -list -v -keystore android/app/release.keystore
```

## 📦 第三步：生产环境打包

### 方法一：使用脚本（推荐）
```bash
# Windows
build-production.bat

# Linux/Mac
chmod +x build-production.sh
./build-production.sh
```

### 方法二：手动打包
```bash
# 1. 安装依赖
npm install

# 2. 清理项目
cd android
./gradlew clean
cd ..

# 3. 生成Bundle文件
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

# 4. 构建Release APK
cd android
./gradlew assembleRelease
cd ..
```

## 📱 打包结果

### APK文件位置
- **Release APK**: `android/app/build/outputs/apk/release/app-release.apk`
- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk`

### 验证APK签名
```bash
jarsigner -verify -verbose -certs android/app/build/outputs/apk/release/app-release.apk
```

## 🔧 高级配置

### 1. 代码混淆配置
编辑 `android/app/proguard-rules.pro`：
```proguard
# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }

# 保留自定义类
-keep class com.homeservicechat.** { *; }
```

### 2. 应用版本管理
编辑 `android/app/build.gradle`：
```gradle
defaultConfig {
    applicationId "com.homeservicechat"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 2  // 每次发布递增
    versionName "1.1.0"  // 版本名称
    multiDexEnabled true
}
```

### 3. 构建优化
```gradle
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        
        // 优化配置
        debuggable false
        jniDebuggable false
        renderscriptDebuggable false
        pseudoLocalesEnabled false
        zipAlignEnabled true
    }
}
```

## 🛡️ 安全注意事项

### 1. 证书安全
- **备份证书**: 证书丢失将无法更新应用
- **安全存储**: 将证书文件存储在安全位置
- **密码管理**: 使用强密码并妥善保管

### 2. 代码安全
- **移除调试代码**: 确保生产版本不包含调试信息
- **API密钥**: 不要在代码中硬编码敏感信息
- **权限最小化**: 只申请必要的权限

### 3. 网络安全
- **HTTPS**: 确保所有API调用使用HTTPS
- **证书验证**: 验证服务器证书
- **数据加密**: 敏感数据加密存储

## 📊 性能优化

### 1. APK大小优化
```gradle
android {
    buildTypes {
        release {
            // 启用资源压缩
            shrinkResources true
            
            // 启用代码混淆
            minifyEnabled true
        }
    }
}
```

### 2. 启动性能优化
- 使用Hermes引擎
- 启用代码分割
- 优化图片资源

### 3. 内存优化
- 及时释放资源
- 避免内存泄漏
- 使用弱引用

## 🔍 故障排除

### 1. 常见错误

#### 证书相关错误
```bash
# 错误：Keystore was tampered with, or password was incorrect
# 解决：检查证书密码和别名是否正确

# 错误：Failed to read key from keystore
# 解决：确保证书文件存在且可读
```

#### 构建错误
```bash
# 错误：Execution failed for task ':app:signReleaseApk'
# 解决：检查签名配置和证书文件

# 错误：Duplicate resources
# 解决：清理项目并重新构建
```

### 2. 调试技巧
```bash
# 查看详细构建日志
cd android
./gradlew assembleRelease --info

# 验证APK完整性
aapt dump badging android/app/build/outputs/apk/release/app-release.apk

# 检查APK内容
unzip -l android/app/build/outputs/apk/release/app-release.apk
```

## 📋 发布检查清单

### 打包前检查
- [ ] 证书已正确配置
- [ ] 应用名称和图标已更新
- [ ] 版本号已递增
- [ ] 调试代码已移除
- [ ] API地址已切换到生产环境
- [ ] 推送通知配置正确

### 打包后检查
- [ ] APK签名验证通过
- [ ] APK大小合理
- [ ] 应用可以正常安装
- [ ] 所有功能正常工作
- [ ] 性能表现良好

### 发布前检查
- [ ] 应用商店截图已准备
- [ ] 应用描述已编写
- [ ] 隐私政策已更新
- [ ] 用户协议已更新
- [ ] 测试报告已完成

## 🚀 自动化部署

### 1. CI/CD配置
```yaml
# .github/workflows/build.yml
name: Build Android APK
on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-java@v2
        with:
          java-version: '11'
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: cd android && ./gradlew assembleRelease
      - uses: actions/upload-artifact@v2
        with:
          name: app-release
          path: android/app/build/outputs/apk/release/app-release.apk
```

### 2. 自动版本管理
```bash
# 自动递增版本号
npm version patch  # 小版本更新
npm version minor  # 功能版本更新
npm version major  # 大版本更新
```

## 📞 获取帮助

### 1. 日志文件位置
- **构建日志**: `android/app/build/outputs/logs/`
- **Gradle日志**: `android/build/`
- **Metro日志**: 控制台输出

### 2. 常用命令
```bash
# 清理项目
cd android && ./gradlew clean && cd ..

# 查看构建变体
cd android && ./gradlew tasks && cd ..

# 验证签名
jarsigner -verify -verbose -certs app-release.apk

# 分析APK
aapt dump badging app-release.apk
```

### 3. 技术支持
- React Native官方文档
- Android开发者文档
- Stack Overflow社区
- GitHub Issues

---

**⚠️ 重要提醒**: 生产环境证书是应用更新的关键，请务必妥善保管并定期备份！ 