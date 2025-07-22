@echo off
echo 🏭 开始生产环境打包...

echo 📋 检查环境...
where java >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 未找到Java，请安装Java JDK
    pause
    exit /b 1
)

where gradle >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️ 未找到Gradle，将使用项目内置的Gradle
)

echo 🔧 安装依赖...
call npm install

echo 🧹 清理项目...
cd android
call gradlew clean
cd ..

echo 📦 生成Bundle文件...
call npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

echo 🔐 检查签名配置...
if not exist "android\app\release.keystore" (
    echo ❌ 未找到生产环境签名证书！
    echo 💡 请先运行 generate-release-keystore.bat 生成证书
    pause
    exit /b 1
)

echo 📱 构建Release APK...
cd android
call gradlew assembleRelease
cd ..

if %ERRORLEVEL% EQU 0 (
    echo ✅ 生产环境打包成功！
    echo 📱 APK位置: android\app\build\outputs\apk\release\app-release.apk
    echo 📊 APK大小: 
    for %%A in ("android\app\build\outputs\apk\release\app-release.apk") do echo %%~zA bytes
) else (
    echo ❌ 打包失败，请检查错误信息
)

echo 📋 验证APK签名...
jarsigner -verify -verbose -certs android\app\build\outputs\apk\release\app-release.apk

pause 