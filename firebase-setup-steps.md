    # Firebase项目配置步骤

## 1. 创建Firebase项目
1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 点击"添加项目"
3. 输入项目名称：`HomeServiceChat`
4. 选择是否启用Google Analytics（推荐启用）
5. 点击"创建项目"

## 2. 添加Android应用
1. 在项目概览页面，点击Android图标
2. 填写应用信息：
   - **Android包名**：`com.homeservicechat`
   - **应用昵称**：`HomeServiceChat`
   - **SHA-1证书指纹**：（可选，用于后续功能）

## 3. 下载配置文件
1. 点击"下载google-services.json"
2. 将文件放到 `android/app/` 目录下

## 4. 启用Cloud Messaging
1. 在Firebase控制台左侧菜单中选择"Cloud Messaging"
2. 如果是新项目，系统会自动启用
3. 记录下服务器密钥（Server Key），后续服务器端推送需要用到

## 5. 生成SHA-1证书指纹（用于发布版本）
在项目根目录运行：
```bash
# Debug版本
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Release版本（如果有release keystore）
keytool -list -v -keystore android/app/release.keystore -alias your-key-alias
``` 