@echo off
chcp 65001 >nul
echo 🔍 远程检查服务器部署状态...

set SERVER_IP=38.207.176.241
set USERNAME=root

echo.
echo 🌐 连接到服务器: %SERVER_IP%
echo 👤 用户名: %USERNAME%
echo.

echo 📋 请选择操作：
echo [1] SSH连接并运行检查脚本
echo [2] 显示SSH连接命令
echo [3] 显示检查脚本的正确运行方法
echo.

set /p choice=请选择操作 (1-3): 

if "%choice%"=="1" goto ssh_run
if "%choice%"=="2" goto ssh_command
if "%choice%"=="3" goto run_method

:ssh_run
echo.
echo 🚀 正在连接服务器并运行检查脚本...
echo.
ssh %USERNAME%@%SERVER_IP% "cd /opt/HomeSM/wangye && chmod +x check-server-deployment.sh && ./check-server-deployment.sh"
pause
goto end

:ssh_command
echo.
echo 🎯 SSH连接命令：
echo.
echo ssh %USERNAME%@%SERVER_IP%
echo.
echo 连接后执行：
echo cd /opt/HomeSM/wangye
echo chmod +x check-server-deployment.sh
echo ./check-server-deployment.sh
echo.
pause
goto end

:run_method
echo.
echo 🎯 在服务器上运行检查脚本的正确方法：
echo.
echo ❌ 错误方法: node check-server-deployment.sh
echo ✅ 正确方法: ./check-server-deployment.sh
echo ✅ 或者使用: bash check-server-deployment.sh
echo.
echo 🔧 如果提示权限不足，先运行：
echo chmod +x check-server-deployment.sh
echo.
echo 📝 完整步骤：
echo 1. ssh root@38.207.176.241
echo 2. cd /opt/HomeSM/wangye
echo 3. chmod +x check-server-deployment.sh
echo 4. ./check-server-deployment.sh
echo.
pause
goto end

:end
echo.
echo 💡 提示：
echo - 这是一个bash脚本，需要在Linux环境下运行
echo - 不要使用node命令运行.sh文件
echo - 如需帮助，请查看脚本内容或联系管理员
echo.
pause
