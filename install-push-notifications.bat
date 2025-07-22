@echo off
echo 安装推送通知依赖...

echo 安装Firebase Messaging...
npm install @react-native-firebase/app @react-native-firebase/messaging

echo 安装推送通知库...
npm install react-native-push-notification @react-native-community/push-notification-ios

echo 安装权限库...
npm install react-native-permissions

echo 依赖安装完成！
echo.
echo 接下来需要：
echo 1. 配置Firebase项目
echo 2. 添加Android和iOS配置文件
echo 3. 修改原生代码
echo.
pause 