@echo off
echo ==========================================
echo 同步文件到服务器 38.207.176.241
echo ==========================================
echo.

echo 服务器信息:
echo IP: 38.207.176.241
echo 端口: 55122
echo 用户名: root
echo 密码: NkGKaEDJmF0t
echo 服务器路径: /var/www/HomeServiceChat
echo.

echo 需要同步的文件:
echo 1. server.js
echo 2. src/services/AndroidPushService.ts
echo 3. src/context/AuthContext.tsx
echo 4. test-push-integration.js
echo 5. check-push-integration.js
echo 6. simple-check.js
echo.

echo 请选择同步方法:
echo 1. 使用 WinSCP (推荐)
echo 2. 使用 PowerShell SSH (需要OpenSSH)
echo 3. 手动复制文件内容
echo.

echo 方法1: WinSCP
echo 1. 下载并安装 WinSCP: https://winscp.net/
echo 2. 连接信息:
echo    - 主机名: 38.207.176.241
echo    - 端口: 55122
echo    - 用户名: root
echo    - 密码: NkGKaEDJmF0t
echo 3. 上传以下文件到 /var/www/HomeServiceChat/
echo.

echo 方法2: PowerShell SSH
echo 如果您有OpenSSH，可以使用以下命令:
echo pscp -P 55122 server.js root@38.207.176.241:/var/www/HomeServiceChat/
echo pscp -P 55122 src/services/AndroidPushService.ts root@38.207.176.241:/var/www/HomeServiceChat/src/services/
echo pscp -P 55122 src/context/AuthContext.tsx root@38.207.176.241:/var/www/HomeServiceChat/src/context/
echo pscp -P 55122 test-push-integration.js root@38.207.176.241:/var/www/HomeServiceChat/
echo pscp -P 55122 check-push-integration.js root@38.207.176.241:/var/www/HomeServiceChat/
echo pscp -P 55122 simple-check.js root@38.207.176.241:/var/www/HomeServiceChat/
echo.

echo 同步完成后，请在服务器上运行:
echo pm2 restart homeservice-chat
echo.

pause 