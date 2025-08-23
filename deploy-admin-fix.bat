@echo off
echo ==========================================
echo 部署管理后台修复到服务器
echo ==========================================
echo.

echo 服务器信息:
echo IP: 38.207.176.241
echo 端口: 55122
echo 用户名: root
echo 密码: NkGKaEDJmF0t
echo 服务器路径: /var/www/HomeSM/admin/dist
echo.

echo 部署步骤:
echo 1. 使用 WinSCP 连接到服务器
echo 2. 导航到 /var/www/HomeSM/admin/
echo 3. 删除旧的 dist 目录内容
echo 4. 上传新的 dist 目录内容
echo 5. 重启 nginx 服务
echo.

echo 推荐使用 WinSCP:
echo 1. 下载 WinSCP: https://winscp.net/
echo 2. 连接信息:
echo    - 文件协议: SFTP
echo    - 主机名: 38.207.176.241
echo    - 端口号: 55122
echo    - 用户名: root
echo    - 密码: NkGKaEDJmF0t
echo.

echo 上传完成后，在服务器上执行:
echo cd /var/www/HomeSM
echo sudo systemctl restart nginx
echo.

echo 测试地址: http://38.207.176.241/admin
echo.

pause 