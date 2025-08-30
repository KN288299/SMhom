@echo off
echo 🔧 设置HomeSM环境变量...

REM TURN服务器配置
set TURN_HOST=38.207.178.173
set TURN_STATIC_USER=webrtcuser
set TURN_STATIC_PASS=webrtcpass

REM 可选配置
set TURN_HOSTNAME=
set TURN_SECRET=
set TURN_TTL=600

REM 公共TURN服务器配置（作为备用）
set TURN_SERVER_URL=turn:openrelay.metered.ca:80
set TURN_SERVER_URL_2=turn:openrelay.metered.ca:443
set TURN_SERVER_URL_3=turn:openrelay.metered.ca:443?transport=tcp
set TURN_SERVER_USERNAME=openrelayproject
set TURN_SERVER_CREDENTIAL=openrelayproject

REM STUN服务器配置
set STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun2.l.google.com:19302

REM WebRTC优化配置
set WEBRTC_ICE_TRANSPORT_POLICY=all
set WEBRTC_BUNDLE_POLICY=max-bundle
set WEBRTC_RTCP_MUX_POLICY=require

echo ✅ 环境变量设置完成！
echo.
echo 当前TURN配置：
echo   TURN_HOST=%TURN_HOST%
echo   TURN_STATIC_USER=%TURN_STATIC_USER%
echo   TURN_STATIC_PASS=%TURN_STATIC_PASS%
echo.
echo 这些变量仅在当前命令行窗口中有效
echo 要永久设置，请在系统环境变量中添加它们
pause
