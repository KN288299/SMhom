#!/bin/bash

echo "🔧 设置HomeSM环境变量..."

# TURN服务器配置
export TURN_HOST=38.207.178.173
export TURN_STATIC_USER=webrtcuser
export TURN_STATIC_PASS=webrtcpass

# 可选配置
export TURN_HOSTNAME=""
export TURN_SECRET=""
export TURN_TTL=600

# 公共TURN服务器配置（作为备用）
export TURN_SERVER_URL=turn:openrelay.metered.ca:80
export TURN_SERVER_URL_2=turn:openrelay.metered.ca:443
export TURN_SERVER_URL_3=turn:openrelay.metered.ca:443?transport=tcp
export TURN_SERVER_USERNAME=openrelayproject
export TURN_SERVER_CREDENTIAL=openrelayproject

# STUN服务器配置
export STUN_SERVERS="stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun2.l.google.com:19302"

# WebRTC优化配置
export WEBRTC_ICE_TRANSPORT_POLICY=all
export WEBRTC_BUNDLE_POLICY=max-bundle
export WEBRTC_RTCP_MUX_POLICY=require

echo "✅ 环境变量设置完成！"
echo ""
echo "当前TURN配置："
echo "  TURN_HOST=$TURN_HOST"
echo "  TURN_STATIC_USER=$TURN_STATIC_USER"
echo "  TURN_STATIC_PASS=$TURN_STATIC_PASS"
echo ""
echo "要使这些变量在当前shell中生效，请运行："
echo "  source setup-env-vars.sh"
echo ""
echo "要永久设置这些变量，请将它们添加到 ~/.bashrc 或 ~/.profile 中"
