#!/bin/bash

# 修复上传限制问题的部署脚本
echo "🔧 开始修复上传限制问题..."

# 1. 检查当前配置
echo "📋 检查当前配置..."
if grep -q "express.json({ limit:" server.js; then
    echo "✅ Express JSON配置已更新"
else
    echo "❌ Express JSON配置需要更新"
fi

if grep -q "fileSize: 20 \* 1024 \* 1024" src/routes/staffRoutes.js; then
    echo "✅ Multer文件大小限制已更新"
else
    echo "❌ Multer文件大小限制需要更新"
fi

# 2. 重启服务
echo "🔄 重启Node.js服务..."
pm2 restart all

# 3. 检查Nginx配置
echo "📋 检查Nginx配置..."
if [ -f /etc/nginx/sites-available/homeservicechat ]; then
    if grep -q "client_max_body_size 50M" /etc/nginx/sites-available/homeservicechat; then
        echo "✅ Nginx client_max_body_size已配置"
    else
        echo "❌ Nginx client_max_body_size需要配置"
        echo "请在Nginx配置中添加: client_max_body_size 50M;"
    fi
else
    echo "⚠️ 未找到Nginx配置文件"
fi

# 4. 测试配置
echo "🧪 测试配置..."
curl -I http://localhost:3000/api/health

echo "✅ 修复完成！"
echo "📝 如果问题仍然存在，请检查:"
echo "1. Nginx配置中的client_max_body_size设置"
echo "2. 服务器内存使用情况"
echo "3. 网络连接稳定性" 