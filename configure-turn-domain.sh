#!/bin/bash

# 配置TURN服务器域名的脚本
# 使用方法: ./configure-turn-domain.sh your-domain.com

echo "🔧 HomeServiceChat TURN服务器域名配置工具"
echo "============================================="

if [ $# -eq 0 ]; then
    echo "❌ 请提供域名参数"
    echo "使用方法: $0 <your-domain.com>"
    echo ""
    echo "示例:"
    echo "  $0 turn.yourdomain.com"
    echo "  $0 webrtc.example.com"
    exit 1
fi

DOMAIN=$1
ENV_FILE=".env"

echo "📝 配置域名: $DOMAIN"

# 检查.env文件是否存在
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  未找到.env文件，创建新的配置文件..."
    cat > "$ENV_FILE" << EOF
# HomeServiceChat Environment Configuration
MONGODB_URI=mongodb://localhost:27017/homeservice
JWT_SECRET=your-super-secret-jwt-key-here
PORT=3000
NODE_ENV=production

# TURN Server Configuration
TURN_HOST=38.207.178.173
TURN_HOSTNAME=$DOMAIN
TURN_SECRET=your-turn-secret-key
TURN_TTL=600
TURN_STATIC_USER=webrtcuser
TURN_STATIC_PASS=webrtcpass
EOF
    echo "✅ 已创建.env文件并设置域名: $DOMAIN"
else
    # 更新现有.env文件中的TURN_HOSTNAME
    if grep -q "TURN_HOSTNAME=" "$ENV_FILE"; then
        sed -i "s/^TURN_HOSTNAME=.*/TURN_HOSTNAME=$DOMAIN/" "$ENV_FILE"
        echo "✅ 已更新.env文件中的TURN_HOSTNAME: $DOMAIN"
    else
        echo "TURN_HOSTNAME=$DOMAIN" >> "$ENV_FILE"
        echo "✅ 已添加TURN_HOSTNAME到.env文件: $DOMAIN"
    fi
fi

echo ""
echo "🔍 当前TURN配置:"
echo "----------------------------------------"
grep "TURN_" "$ENV_FILE" || echo "未找到TURN配置"

echo ""
echo "📋 接下来的步骤:"
echo "1. 确保域名 $DOMAIN 指向服务器IP: 38.207.178.173"
echo "2. 为域名配置SSL证书（推荐使用Let's Encrypt）"
echo "3. 配置coturn服务器支持TLS/DTLS:"
echo "   - cert=/path/to/your/cert.pem"
echo "   - pkey=/path/to/your/private.key"
echo "4. 重启HomeServiceChat服务"
echo "5. 测试语音通话功能"

echo ""
echo "🧪 测试TURN服务器连通性:"
echo "curl -k https://$DOMAIN:443"
echo ""
echo "✅ 配置完成！"
