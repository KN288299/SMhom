@echo off
echo 🚀 开始构建Android APK...

echo 📱 清理项目...
cd android
call gradlew clean
cd ..

echo 🔧 安装依赖...
call npm install

echo 📦 构建Android APK...
cd android
call gradlew assembleRelease
cd ..

echo ✅ 构建完成！
echo 📱 APK位置: android/app/build/outputs/apk/release/app-release.apk
echo 📱 调试版APK位置: android/app/build/outputs/apk/debug/app-debug.apk

pause 