#!/bin/bash

# 修复Nginx配置脚本
echo "🔧 检查并修复Nginx配置..."

# 检查Nginx配置文件
CONFIG_FILE="/etc/nginx/sites-available/homeservicechat"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Nginx配置文件不存在: $CONFIG_FILE"
    exit 1
fi

echo "📋 当前Nginx配置:"
cat "$CONFIG_FILE"

echo ""
echo "🔍 检查client_max_body_size配置..."

# 检查是否已配置client_max_body_size
if grep -q "client_max_body_size" "$CONFIG_FILE"; then
    echo "✅ 已找到client_max_body_size配置:"
    grep "client_max_body_size" "$CONFIG_FILE"
else
    echo "❌ 未找到client_max_body_size配置，正在添加..."
    
    # 备份原配置文件
    cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # 添加client_max_body_size配置
    sed -i '/server {/a\    client_max_body_size 50M;' "$CONFIG_FILE"
    
    echo "✅ 已添加client_max_body_size 50M;"
fi

echo ""
echo "🧪 测试Nginx配置语法..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx配置语法正确"
    echo "🔄 重新加载Nginx配置..."
    systemctl reload nginx
    echo "✅ Nginx配置已重新加载"
else
    echo "❌ Nginx配置语法错误"
    exit 1
fi

echo ""
echo "📋 最终配置检查:"
grep -A 5 -B 5 "client_max_body_size" "$CONFIG_FILE"

echo ""
echo "🎯 修复完成！"
echo "📝 下一步: 测试上传功能" 