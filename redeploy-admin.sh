#!/bin/bash

echo "开始重新构建和部署管理后台..."

# 进入admin目录
cd /var/www/HomeServiceChat/admin

# 清理旧的构建文件
echo "清理旧的构建文件..."
rm -rf dist/

# 重新构建
echo "重新构建管理后台..."
npm run build

# 检查构建是否成功
if [ ! -d "dist" ]; then
    echo "构建失败，dist目录不存在！"
    exit 1
fi

# 设置正确的权限
echo "设置文件权限..."
chown -R www-data:www-data dist/
chmod -R 755 dist/

# 测试nginx配置
echo "测试nginx配置..."
nginx -t

if [ $? -eq 0 ]; then
    echo "nginx配置测试通过，重启nginx..."
    systemctl restart nginx
    echo "nginx重启完成"
else
    echo "nginx配置测试失败！"
    exit 1
fi

# 检查nginx状态
echo "检查nginx状态..."
systemctl status nginx --no-pager

echo "管理后台重新部署完成！"
echo "请访问: http://38.207.178.173/admin" 