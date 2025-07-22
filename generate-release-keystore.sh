#!/bin/bash

echo "🔐 生成生产环境签名证书..."

echo "📝 请输入证书信息："
read -p "证书密码: " KEYSTORE_PASSWORD
read -p "密钥别名: " KEY_ALIAS
read -p "密钥密码: " KEY_PASSWORD
read -p "组织名称: " ORGANIZATION
read -p "组织单位: " ORGANIZATIONAL_UNIT
read -p "通用名称: " COMMON_NAME
read -p "国家代码(CN): " COUNTRY_CODE

if [ -z "$COUNTRY_CODE" ]; then
    COUNTRY_CODE="CN"
fi

echo "🎯 生成证书..."
keytool -genkeypair -v -keystore android/app/release.keystore -alias "$KEY_ALIAS" -keyalg RSA -keysize 2048 -validity 10000 -storepass "$KEYSTORE_PASSWORD" -keypass "$KEY_PASSWORD" -dname "CN=$COMMON_NAME, OU=$ORGANIZATIONAL_UNIT, O=$ORGANIZATION, L=, S=, C=$COUNTRY_CODE"

if [ $? -eq 0 ]; then
    echo "✅ 证书生成成功！"
    echo "📁 证书位置: android/app/release.keystore"
    echo "🔑 证书信息已保存到 android/gradle.properties"
else
    echo "❌ 证书生成失败！"
    echo "💡 请确保已安装Java JDK并配置环境变量"
fi 