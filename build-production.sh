#!/bin/bash

echo "🏭 开始生产环境打包..."

echo "📋 检查环境..."
if ! command -v java &> /dev/null; then
    echo "❌ 未找到Java，请安装Java JDK"
    exit 1
fi

if ! command -v gradle &> /dev/null; then
    echo "⚠️ 未找到Gradle，将使用项目内置的Gradle"
fi

echo "🔧 安装依赖..."
npm install

echo "🧹 清理项目..."
cd android
./gradlew clean
cd ..

echo "📦 生成Bundle文件..."
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

echo "🔐 检查签名配置..."
if [ ! -f "android/app/release.keystore" ]; then
    echo "❌ 未找到生产环境签名证书！"
    echo "💡 请先运行 ./generate-release-keystore.sh 生成证书"
    exit 1
fi

echo "📱 构建Release APK..."
cd android
./gradlew assembleRelease
cd ..

if [ $? -eq 0 ]; then
    echo "✅ 生产环境打包成功！"
    echo "📱 APK位置: android/app/build/outputs/apk/release/app-release.apk"
    echo "📊 APK大小: $(ls -lh android/app/build/outputs/apk/release/app-release.apk | awk '{print $5}')"
else
    echo "❌ 打包失败，请检查错误信息"
    exit 1
fi

echo "📋 验证APK签名..."
jarsigner -verify -verbose -certs android/app/build/outputs/apk/release/app-release.apk 