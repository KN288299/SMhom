#!/bin/bash

echo "🔐 生成生产环境签名证书..."

echo "📝 使用预配置信息："
echo "证书密码: yuzutangdeapp.2024"
echo "密钥别名: yuzutang_release_key"
echo "密钥密码: yuzutangdeapp.2024"
echo "组织名称: YuZuTang Technology Co., Ltd."
echo "组织单位: Mobile Development Team"
echo "通用名称: YuZuTang Dating App"
echo "国家代码: CN"
echo

echo "🎯 生成证书..."
keytool -genkeypair -v -keystore android/app/release.keystore -alias yuzutang_release_key -keyalg RSA -keysize 2048 -validity 10000 -storepass yuzutangdeapp.2024 -keypass yuzutangdeapp.2024 -dname "CN=YuZuTang Dating App, OU=Mobile Development Team, O=YuZuTang Technology Co., Ltd., L=, S=, C=CN"

if [ $? -eq 0 ]; then
    echo "✅ 证书生成成功！"
    echo "📁 证书位置: android/app/release.keystore"
    
    echo "🔧 更新gradle.properties配置..."
    cat > android/gradle.properties.temp << EOF
# 生产环境签名配置
MYAPP_RELEASE_STORE_FILE=release.keystore
MYAPP_RELEASE_KEY_ALIAS=yuzutang_release_key
MYAPP_RELEASE_STORE_PASSWORD=yuzutangdeapp.2024
MYAPP_RELEASE_KEY_PASSWORD=yuzutangdeapp.2024
EOF
    
    cat android/gradle.properties >> android/gradle.properties.temp
    mv android/gradle.properties.temp android/gradle.properties
    
    echo "✅ 配置已更新！"
    echo "📋 证书信息："
    keytool -list -v -keystore android/app/release.keystore -storepass yuzutangdeapp.2024
    
    echo
    echo "🎉 证书生成和配置完成！"
    echo "💡 下一步：运行 ./build-production.sh 进行打包"
else
    echo "❌ 证书生成失败！"
    echo "💡 请确保已安装Java JDK并配置环境变量"
fi 