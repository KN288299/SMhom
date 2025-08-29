#!/bin/bash

echo "==================================="
echo "移动端APK下载速度优化检查报告"
echo "==================================="
echo "检查时间: $(date)"
echo ""

# 1. 检查APK文件状态
echo "1. APK文件检查："
APK_PATH="/opt/HomeSM/wangye/android/xiazai/app-release.apk"
if [ -f "$APK_PATH" ]; then
    echo "✅ APK文件存在"
    echo "   文件大小: $(ls -lh $APK_PATH | awk '{print $5}')"
    echo "   修改时间: $(ls -l $APK_PATH | awk '{print $6, $7, $8}')"
else
    echo "❌ APK文件不存在: $APK_PATH"
fi
echo ""

# 2. 检查nginx速度限制
echo "2. nginx速度限制检查："
LIMIT_CHECK=$(grep -r "limit_rate" /etc/nginx/sites-enabled/wangye 2>/dev/null)
if [ -z "$LIMIT_CHECK" ]; then
    echo "✅ 无速度限制配置"
else
    echo "⚠️  发现速度限制:"
    echo "$LIMIT_CHECK"
fi
echo ""

# 3. 检查nginx优化配置
echo "3. nginx传输优化配置："
echo "   sendfile: $(grep sendfile /etc/nginx/sites-enabled/wangye | head -1 | awk '{print $2}' | tr -d ';')"
echo "   tcp_nopush: $(grep tcp_nopush /etc/nginx/sites-enabled/wangye | head -1 | awk '{print $2}' | tr -d ';')"
echo "   client_max_body_size: $(grep client_max_body_size /etc/nginx/sites-enabled/wangye | head -1 | awk '{print $2}' | tr -d ';')"
echo ""

# 4. 系统性能检查
echo "4. 系统性能状态："
echo "   负载: $(uptime | awk -F'load average:' '{print $2}')"
echo "   nginx进程数: $(ps aux | grep 'nginx: worker' | grep -v grep | wc -l)"
echo "   worker_connections: $(grep worker_connections /etc/nginx/nginx.conf | awk '{print $2}' | tr -d ';')"
echo ""

# 5. 下载测试
echo "5. 下载速度测试："
echo "   正在测试下载速度..."
START_TIME=$(date +%s)
wget -q --timeout=10 -O /tmp/download_test.apk "http://localhost/wangye/android/xiazai/app-release.apk" 2>/dev/null
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ -f "/tmp/download_test.apk" ]; then
    FILE_SIZE=$(stat -f%z /tmp/download_test.apk 2>/dev/null || stat -c%s /tmp/download_test.apk 2>/dev/null)
    SPEED_MBPS=$(echo "scale=2; ($FILE_SIZE / 1024 / 1024) / $DURATION" | bc 2>/dev/null || echo "计算失败")
    echo "   ✅ 下载成功"
    echo "   下载时间: ${DURATION}秒"
    echo "   下载速度: ${SPEED_MBPS} MB/s"
    rm -f /tmp/download_test.apk
else
    echo "   ❌ 下载失败或超时"
fi
echo ""

# 6. 移动端优化建议
echo "6. 移动端下载优化建议："
echo "   📱 确保APK文件压缩良好"
echo "   🌐 检查CDN配置（如适用）"
echo "   📊 监控用户网络环境（3G/4G/5G/WiFi）"
echo "   🔄 提供断点续传支持（已配置）"
echo "   ⚡ 考虑分包下载或增量更新"
echo ""

echo "==================================="
echo "检查完成！"
echo "==================================="
