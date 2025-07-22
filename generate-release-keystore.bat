@echo off
echo 🔐 生成生产环境签名证书...

echo 📝 请输入证书信息：
set /p KEYSTORE_PASSWORD=证书密码: 
set /p KEY_ALIAS=密钥别名: 
set /p KEY_PASSWORD=密钥密码: 
set /p ORGANIZATION=组织名称: 
set /p ORGANIZATIONAL_UNIT=组织单位: 
set /p COMMON_NAME=通用名称: 
set /p COUNTRY_CODE=国家代码(CN): 

if "%COUNTRY_CODE%"=="" set COUNTRY_CODE=CN

echo 🎯 生成证书...
keytool -genkeypair -v -keystore android/app/release.keystore -alias %KEY_ALIAS% -keyalg RSA -keysize 2048 -validity 10000 -storepass %KEYSTORE_PASSWORD% -keypass %KEY_PASSWORD% -dname "CN=%COMMON_NAME%, OU=%ORGANIZATIONAL_UNIT%, O=%ORGANIZATION%, L=, S=, C=%COUNTRY_CODE%"

if %ERRORLEVEL% EQU 0 (
    echo ✅ 证书生成成功！
    echo 📁 证书位置: android/app/release.keystore
    echo 🔑 证书信息已保存到 android/gradle.properties
) else (
    echo ❌ 证书生成失败！
    echo 💡 请确保已安装Java JDK并配置环境变量
)

pause 