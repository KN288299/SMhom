Write-Host "==========================================" -ForegroundColor Green
Write-Host "同步文件到服务器 38.207.176.241" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

Write-Host "服务器信息:" -ForegroundColor Yellow
Write-Host "IP: 38.207.176.241"
Write-Host "端口: 55122"
Write-Host "用户名: root"
Write-Host "密码: NkGKaEDJmF0t"
Write-Host "服务器路径: /var/www/HomeSM"
Write-Host ""

Write-Host "需要同步的文件:" -ForegroundColor Yellow
Write-Host "1. server.js"
Write-Host "2. src/services/AndroidPushService.ts"
Write-Host "3. src/context/AuthContext.tsx"
Write-Host "4. test-push-integration.js"
Write-Host "5. check-push-integration.js"
Write-Host "6. simple-check.js"
Write-Host ""

Write-Host "推荐同步方法:" -ForegroundColor Cyan
Write-Host ""

Write-Host "方法1: 使用 WinSCP (最简单)" -ForegroundColor Green
Write-Host "1. 下载 WinSCP: https://winscp.net/"
Write-Host "2. 安装并打开 WinSCP"
Write-Host "3. 新建会话，填入连接信息:"
Write-Host "   - 文件协议: SFTP"
Write-Host "   - 主机名: 38.207.176.241"
Write-Host "   - 端口号: 55122"
Write-Host "   - 用户名: root"
Write-Host "   - 密码: NkGKaEDJmF0t"
Write-Host "4. 连接到服务器"
Write-Host "5. 导航到 /var/www/HomeSM"
Write-Host "6. 上传修改的文件"
Write-Host ""

Write-Host "方法2: 使用 SSH + 手动编辑" -ForegroundColor Green
Write-Host "1. 使用 PuTTY 或其他SSH客户端连接服务器"
Write-Host "2. 连接信息: root@38.207.176.241:55122"
Write-Host "3. 在服务器上编辑文件:"
Write-Host "   sudo nano /var/www/HomeSM/server.js"
Write-Host "   sudo nano /var/www/HomeSM/src/services/AndroidPushService.ts"
Write-Host "   sudo nano /var/www/HomeSM/src/context/AuthContext.tsx"
Write-Host "4. 创建新文件:"
Write-Host "   sudo nano /var/www/HomeSM/test-push-integration.js"
Write-Host "   sudo nano /var/www/HomeSM/check-push-integration.js"
Write-Host "   sudo nano /var/www/HomeSM/simple-check.js"
Write-Host ""

Write-Host "同步完成后的操作:" -ForegroundColor Red
Write-Host "1. 重启服务器应用:"
Write-Host "   pm2 restart homeservice-chat"
Write-Host "2. 检查服务状态:"
Write-Host "   pm2 status"
Write-Host "3. 查看日志:"
Write-Host "   pm2 logs homeservice-chat"
Write-Host ""

Write-Host "测试推送服务:" -ForegroundColor Cyan
Write-Host "在服务器上运行:"
Write-Host "cd /var/www/HomeSM"
Write-Host "node simple-check.js"
Write-Host ""

Read-Host "按回车键继续..." 