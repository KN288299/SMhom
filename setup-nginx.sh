#!/bin/bash

# HomeSM Nginx配置部署脚本
# 用法: sudo bash setup-nginx.sh

set -e

echo "=== HomeSM Nginx配置部署脚本 ==="

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then
    echo "错误: 请使用sudo权限运行此脚本"
    exit 1
fi

# 检查nginx是否已安装
if ! command -v nginx &> /dev/null; then
    echo "错误: nginx未安装，请先安装nginx"
    echo "Ubuntu/Debian: apt update && apt install nginx"
    echo "CentOS/RHEL: yum install nginx 或 dnf install nginx"
    exit 1
fi

# 创建备份目录
BACKUP_DIR="/opt/HomeSM/nginx-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "1. 创建备份目录: $BACKUP_DIR"

# 备份现有配置（如果存在）
NGINX_SITES_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"

# 检查nginx配置目录结构
if [ ! -d "$NGINX_SITES_DIR" ]; then
    echo "创建 sites-available 目录..."
    mkdir -p "$NGINX_SITES_DIR"
fi

if [ ! -d "$NGINX_ENABLED_DIR" ]; then
    echo "创建 sites-enabled 目录..."
    mkdir -p "$NGINX_ENABLED_DIR"
fi

# 备份现有配置
for config in "uu68.icu" "homeservice-chat" "wangye"; do
    if [ -f "$NGINX_SITES_DIR/$config" ]; then
        echo "备份现有配置: $config"
        cp "$NGINX_SITES_DIR/$config" "$BACKUP_DIR/"
    fi
done

echo "2. 复制新的nginx配置文件..."

# 复制配置文件
cp "/opt/HomeSM/nginx-configs/uu68.icu" "$NGINX_SITES_DIR/"
cp "/opt/HomeSM/nginx-configs/homeservice-chat" "$NGINX_SITES_DIR/"
cp "/opt/HomeSM/nginx-configs/wangye" "$NGINX_SITES_DIR/"

echo "3. 启用配置文件..."

# 启用配置（创建软链接）
ln -sf "$NGINX_SITES_DIR/uu68.icu" "$NGINX_ENABLED_DIR/"
ln -sf "$NGINX_SITES_DIR/homeservice-chat" "$NGINX_ENABLED_DIR/"
ln -sf "$NGINX_SITES_DIR/wangye" "$NGINX_ENABLED_DIR/"

echo "4. 创建必要的目录..."

# 创建必要的目录
mkdir -p /opt/HomeSM/html/wangye
mkdir -p /opt/HomeSM/admin/dist
mkdir -p /var/log/nginx

# 设置权限
chown -R www-data:www-data /opt/HomeSM/html/ 2>/dev/null || chown -R nginx:nginx /opt/HomeSM/html/ 2>/dev/null || true
chown -R www-data:www-data /opt/HomeSM/admin/ 2>/dev/null || chown -R nginx:nginx /opt/HomeSM/admin/ 2>/dev/null || true

echo "5. 检查nginx配置语法..."

# 测试nginx配置
if nginx -t; then
    echo "✓ Nginx配置语法检查通过"
else
    echo "✗ Nginx配置语法错误，请检查配置文件"
    echo "备份文件位于: $BACKUP_DIR"
    exit 1
fi

echo "6. 重新加载nginx配置..."

# 重新加载nginx
if systemctl reload nginx; then
    echo "✓ Nginx配置重新加载成功"
else
    echo "✗ Nginx重新加载失败，尝试重启nginx服务"
    if systemctl restart nginx; then
        echo "✓ Nginx重启成功"
    else
        echo "✗ Nginx重启失败，请检查错误日志"
        echo "备份文件位于: $BACKUP_DIR"
        exit 1
    fi
fi

echo "7. 显示nginx状态..."
systemctl status nginx --no-pager -l

echo ""
echo "=== 部署完成 ==="
echo "✓ 已部署3个nginx配置文件:"
echo "  - uu68.icu (域名配置，需要SSL证书)"
echo "  - homeservice-chat (IP: 38.207.176.241)"
echo "  - wangye (通用配置)"
echo ""
echo "✓ 备份文件位于: $BACKUP_DIR"
echo ""
echo "📋 后续步骤:"
echo "1. 确保/opt/HomeSM/html/wangye/目录中有网站文件"
echo "2. 确保/opt/HomeSM/admin/dist/目录中有管理后台文件"
echo "3. 确保HomeSM服务在端口3000运行"
echo "4. 如使用域名，请配置SSL证书: certbot --nginx -d uu68.icu -d www.uu68.icu"
echo ""
echo "🔍 测试访问:"
echo "- http://38.207.176.241/wangye/ (智能下载系统)"
echo "- http://38.207.176.241/admin/ (管理后台)"
echo "- http://uu68.icu (域名访问，需要DNS解析)"
