#!/bin/bash

echo "🔍 检查服务器上的wangye部署状态..."
echo "服务器: 38.207.176.241"
echo "域名: uu68.icu"
echo "=================================="

# 检查服务器文件
echo "1. 📁 检查服务器上的文件..."
echo "检查 /opt/HomeSM/wangye/ 目录:"

# 检查主要HTML文件
echo "  📄 HTML文件:"
ls -la /opt/HomeSM/wangye/*.html 2>/dev/null || echo "  ❌ HTML文件不存在或路径错误"

# 检查Android文件
echo "  📱 Android文件:"
ls -la /opt/HomeSM/wangye/android/ 2>/dev/null || echo "  ❌ Android目录不存在"
ls -la /opt/HomeSM/wangye/android/xiazai/app-release.apk 2>/dev/null || echo "  ❌ APK文件不存在"

# 检查iOS文件
echo "  🍎 iOS文件:"
ls -la /opt/HomeSM/wangye/ios/ 2>/dev/null || echo "  ❌ iOS目录不存在"

echo ""
echo "2. 🔧 检查Nginx配置..."
echo "Active Nginx sites:"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "  ❌ Nginx sites-enabled目录不存在"

echo ""
echo "检查Nginx配置文件内容:"
if [ -f "/etc/nginx/sites-enabled/wangye" ]; then
    echo "  ✅ wangye配置文件存在"
    grep -n "server_name\|location\|alias" /etc/nginx/sites-enabled/wangye
else
    echo "  ❌ wangye配置文件不存在"
    echo "  检查其他配置文件:"
    for config in /etc/nginx/sites-enabled/*; do
        if [ -f "$config" ]; then
            echo "    配置文件: $(basename $config)"
            grep -n "wangye\|uu68.icu" "$config" 2>/dev/null || echo "      (未找到相关配置)"
        fi
    done
fi

echo ""
echo "3. 🌐 检查Nginx状态..."
systemctl status nginx --no-pager -l || echo "  ❌ 无法检查Nginx状态"

echo ""
echo "4. 🧪 测试Nginx配置..."
nginx -t || echo "  ❌ Nginx配置有错误"

echo ""
echo "5. 🔗 测试本地访问..."
echo "测试主页:"
curl -I http://localhost/ 2>/dev/null || echo "  ❌ 本地访问失败"

echo ""
echo "测试wangye路径:"
curl -I http://localhost/index.html 2>/dev/null || echo "  ❌ wangye路径访问失败"

echo ""
echo "6. 🌍 测试域名解析..."
echo "检查域名 uu68.icu 的DNS解析:"
nslookup uu68.icu || echo "  ❌ DNS解析失败"

echo ""
echo "测试域名访问:"
curl -I http://uu68.icu/ 2>/dev/null || echo "  ❌ 域名访问失败"

echo ""
echo "7. 📊 检查文件时间戳..."
echo "检查最近修改的文件:"
find /opt/HomeSM/wangye/ -name "*.html" -exec ls -la {} \; 2>/dev/null || echo "  ❌ 无法检查文件时间戳"

echo ""
echo "8. 🔍 检查文件内容..."
echo "检查 android.html 中的自动下载时间设置:"
grep -n "setTimeout.*10000\|10秒" /opt/HomeSM/wangye/android.html 2>/dev/null || echo "  ❌ 未找到10秒设置"

echo "检查 ios.html 中的自动跳转时间设置:"
grep -n "setTimeout.*10000\|10秒" /opt/HomeSM/wangye/ios.html 2>/dev/null || echo "  ❌ 未找到10秒设置"

echo ""
echo "=================================="
echo "🎯 快速修复建议:"
echo ""
echo "如果文件不存在，重新上传文件:"
echo "  1. 删除旧文件: rm -rf /opt/HomeSM/wangye"
echo "  2. 重新上传wangye文件夹到 /opt/HomeSM/"
echo "  3. 设置正确的文件权限"
echo "  4. 检查Web服务器配置"
echo ""
echo "如果需要强制刷新缓存:"
echo "  systemctl reload nginx"
echo "  # 或者重启nginx"
echo "  systemctl restart nginx"
echo ""
echo "检查端口占用:"
echo "  netstat -tlnp | grep :80"
echo "  netstat -tlnp | grep :443"
