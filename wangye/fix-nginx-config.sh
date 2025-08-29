#!/bin/bash

echo "🔧 修复Nginx配置以正确指向wangye目录..."
echo "=================================="

# 检查当前配置
echo "1. 📋 检查当前wangye配置..."
cat /etc/nginx/sites-available/wangye

echo ""
echo "2. 🔍 检查文件实际路径..."
echo "文件确实存在于:"
ls -la /opt/HomeSM/wangye/*.html

echo ""
echo "3. 🛠️ 创建正确的Nginx配置..."

# 备份当前配置
cp /etc/nginx/sites-available/wangye /etc/nginx/sites-available/wangye.backup.$(date +%Y%m%d_%H%M%S)

# 创建新的配置
cat > /etc/nginx/sites-available/wangye << 'EOF'
server {
    listen 80;
    server_name uu68.icu www.uu68.icu;
    
    # 主要的wangye目录
    root /opt/HomeSM/wangye;
    index index.html android.html ios.html;
    
    # 启用gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    
    # 主页面路由
    location / {
        try_files $uri $uri/ /index.html;
        
        # 添加缓存控制
        add_header Cache-Control "public, max-age=300";
    }
    
    # Android页面路由
    location /android {
        try_files /android.html =404;
    }
    
    location /android/ {
        try_files /android.html =404;
    }
    
    # iOS页面路由  
    location /ios {
        try_files /ios.html =404;
    }
    
    location /ios/ {
        try_files /ios.html =404;
    }
    
    # QQ下载页面
    location /qq {
        try_files /qq-download.html =404;
    }
    
    # 静态资源处理
    location ~* \.(png|jpg|jpeg|gif|ico|svg)$ {
        root /opt/HomeSM/wangye;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
    
    # APK文件下载
    location ~* \.apk$ {
        root /opt/HomeSM/wangye;
        add_header Content-Disposition 'attachment';
        add_header Content-Type 'application/vnd.android.package-archive';
        try_files $uri =404;
    }
    
    # 错误页面
    error_page 404 /index.html;
    
    # 日志
    access_log /var/log/nginx/wangye_access.log;
    error_log /var/log/nginx/wangye_error.log;
}

# HTTPS重定向配置（如果需要SSL）
server {
    listen 443 ssl http2;
    server_name uu68.icu www.uu68.icu;
    
    # SSL证书配置（需要根据实际情况调整）
    # ssl_certificate /path/to/certificate.crt;
    # ssl_certificate_key /path/to/private.key;
    
    # 如果没有SSL证书，重定向到HTTP
    return 301 http://uu68.icu$request_uri;
}
EOF

echo "4. ✅ 新配置已创建"

echo ""
echo "5. 🧪 测试Nginx配置..."
nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "6. 🔄 重新加载Nginx配置..."
    systemctl reload nginx
    
    echo ""
    echo "7. 🧪 测试修复结果..."
    echo "测试主页:"
    curl -I http://localhost/
    
    echo ""
    echo "测试Android页面:"
    curl -I http://localhost/android
    
    echo ""
    echo "测试iOS页面:"
    curl -I http://localhost/ios
    
    echo ""
    echo "✅ 修复完成！"
    echo ""
    echo "🌐 现在可以通过以下URL访问:"
    echo "  主页: http://uu68.icu/"
    echo "  Android: http://uu68.icu/android"
    echo "  iOS: http://uu68.icu/ios"
    echo "  QQ下载: http://uu68.icu/qq"
else
    echo ""
    echo "❌ Nginx配置测试失败，请检查配置文件"
    echo "可以查看备份文件: /etc/nginx/sites-available/wangye.backup.*"
fi

echo ""
echo "📋 故障排除命令:"
echo "  查看Nginx错误日志: tail -f /var/log/nginx/wangye_error.log"
echo "  查看访问日志: tail -f /var/log/nginx/wangye_access.log"
echo "  重启Nginx: systemctl restart nginx"
echo "  检查配置: nginx -t"
