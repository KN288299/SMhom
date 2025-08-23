#!/bin/bash

echo "🚀 开始部署wangye智能下载系统..."

# 设置变量
PROJECT_ROOT="/root/HomeServiceChat"
WANGYE_SRC="$PROJECT_ROOT/wangye"
WEB_ROOT="/var/www/html"
WANGYE_DEST="$WEB_ROOT/wangye"
NGINX_CONFIG="/etc/nginx/sites-available/wangye"

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用root用户运行此脚本"
    echo "使用: sudo $0"
    exit 1
fi

# 检查wangye源文件是否存在
if [ ! -d "$WANGYE_SRC" ]; then
    echo "❌ 错误: wangye源目录不存在: $WANGYE_SRC"
    echo "请先上传wangye文件夹到服务器"
    exit 1
fi

echo "✅ 找到wangye源文件: $WANGYE_SRC"

# 创建web根目录（如果不存在）
if [ ! -d "$WEB_ROOT" ]; then
    echo "📁 创建web根目录: $WEB_ROOT"
    mkdir -p "$WEB_ROOT"
fi

# 备份现有文件（如果存在）
if [ -d "$WANGYE_DEST" ]; then
    BACKUP_DIR="/root/backup-wangye-$(date +%Y%m%d-%H%M%S)"
    echo "📦 备份现有文件到: $BACKUP_DIR"
    cp -r "$WANGYE_DEST" "$BACKUP_DIR"
fi

# 复制wangye文件到web目录
echo "📋 复制wangye文件到web目录..."
cp -r "$WANGYE_SRC" "$WANGYE_DEST"

# 设置正确的文件权限
echo "🔧 设置文件权限..."
chown -R www-data:www-data "$WANGYE_DEST"
chmod -R 755 "$WANGYE_DEST"

# 确保APK文件权限正确
if [ -f "$WANGYE_DEST/android/xiazai/app-release.apk" ]; then
    echo "📱 设置APK文件权限..."
    chmod 644 "$WANGYE_DEST/android/xiazai/app-release.apk"
fi

# 检查Nginx是否安装
if ! command -v nginx &> /dev/null; then
    echo "❌ Nginx未安装，请先安装Nginx"
    echo "运行: apt update && apt install nginx -y"
    exit 1
fi

# 检查是否已有域名配置
DOMAIN_CONFIG_EXISTS=false
for config in /etc/nginx/sites-available/*; do
    if [ -f "$config" ] && grep -q "location /" "$config" && grep -q "wangye" "$config"; then
        echo "✅ 检测到现有域名配置: $(basename $config)"
        DOMAIN_CONFIG_EXISTS=true
        break
    fi
done

if [ "$DOMAIN_CONFIG_EXISTS" = false ]; then
    echo "⚙️ 创建默认Nginx配置..."
    cat > "$NGINX_CONFIG" << 'EOF'
server {
    listen 80 default_server;
    server_name _;
    
    # wangye智能下载系统
    location / {
        alias /var/www/html/wangye/;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # 设置文件类型
        location ~* \.(png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        location ~* \.(js|css)$ {
            expires 1y;
            add_header Cache-Control "public";
        }
        
        location ~* \.(html)$ {
            expires 1h;
            add_header Cache-Control "public";
        }
    }
    
    # APK下载文件
    location /android/xiazai/ {
        alias /var/www/html/wangye/android/xiazai/;
        autoindex off;
        
        # 设置APK文件的正确MIME类型
        location ~* \.apk$ {
            add_header Content-Type application/vnd.android.package-archive;
            add_header Content-Disposition 'attachment; filename="HomeServiceChat.apk"';
        }
    }
    
    # iOS下载页面
    location /ios/xiazai/ {
        alias /var/www/html/wangye/ios/xiazai/;
        autoindex off;
    }
    
    # API代理到Node.js应用
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Socket.io支持
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 文件上传目录
    location /uploads/ {
        alias /root/HomeServiceChat/uploads/;
        autoindex off;
        expires 1y;
        add_header Cache-Control "public";
    }
}
EOF

    # 启用配置
    ln -sf "$NGINX_CONFIG" "/etc/nginx/sites-enabled/wangye"
    
    # 禁用默认配置（避免冲突）
    if [ -L "/etc/nginx/sites-enabled/default" ]; then
        rm "/etc/nginx/sites-enabled/default"
    fi
fi

# 测试nginx配置
echo "🧪 测试Nginx配置..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx配置测试通过"
    echo "🔄 重新加载Nginx..."
    systemctl reload nginx
    echo "✅ Nginx重新加载完成"
else
    echo "❌ Nginx配置测试失败"
    exit 1
fi

# 验证部署
echo "🔍 验证部署..."
if [ -f "$WANGYE_DEST/index.html" ]; then
    echo "✅ index.html 部署成功"
fi

if [ -f "$WANGYE_DEST/android.html" ]; then
    echo "✅ android.html 部署成功"
fi

if [ -f "$WANGYE_DEST/ios.html" ]; then
    echo "✅ ios.html 部署成功"
fi

if [ -f "$WANGYE_DEST/android/xiazai/app-release.apk" ]; then
    echo "✅ APK文件部署成功"
    ls -lh "$WANGYE_DEST/android/xiazai/app-release.apk"
fi

if [ -f "$WANGYE_DEST/ios/xiazai/wangyeQQ.png" ]; then
    echo "✅ iOS下载图片部署成功"
fi

echo ""
echo "🎉 wangye智能下载系统部署完成！"
echo ""
echo "📱 访问地址："
echo "   主入口: http://45.144.136.37/"
echo "   Android: http://45.144.136.37/android.html"
echo "   iOS: http://45.144.136.37/ios.html"
echo "   QQ下载: http://45.144.136.37/qq-download.html"
echo ""
echo "🔧 测试命令："
echo "   curl -I http://45.144.136.37/"
echo ""
echo "🌐 如需配置域名，请运行:"
echo "   ./configure-domain.sh"
echo ""
echo "📝 功能说明:"
echo "   • 智能设备检测：自动跳转到对应平台页面"
echo "   • APK下载：Android设备直接下载应用"
echo "   • iOS引导：显示iOS安装步骤"
echo "   • QQ下载：提供QQ下载选项" 