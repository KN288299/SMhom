@echo off
chcp 65001 >nul
echo 🚀 上传wangye文件夹到服务器...

set SERVER_IP=45.144.136.37
set USERNAME=root
set LOCAL_PATH=%~dp0
set REMOTE_PATH=/root/HomeServiceChat/

echo.
echo 📂 本地路径: %LOCAL_PATH%
echo 🌐 服务器: %SERVER_IP%
echo 👤 用户名: %USERNAME%
echo 📁 远程路径: %REMOTE_PATH%
echo.

echo ⚠️  请确保您已经安装了以下工具之一：
echo    1. WinSCP (推荐)
echo    2. PuTTY + pscp
echo    3. WSL with scp
echo.

echo 📋 上传方法选择：
echo [1] 使用WinSCP GUI上传 (推荐新手)
echo [2] 使用pscp命令上传 (需要PuTTY)
echo [3] 显示手动上传说明
echo [4] 生成scp命令 (Linux/Mac用户)
echo.

set /p choice=请选择上传方法 (1-4): 

if "%choice%"=="1" goto winSCP
if "%choice%"=="2" goto pscp
if "%choice%"=="3" goto manual
if "%choice%"=="4" goto scp_command

:winSCP
echo.
echo 🎯 WinSCP 上传步骤：
echo 1. 下载并安装 WinSCP: https://winscp.net/
echo 2. 打开 WinSCP，新建连接：
echo    - 主机名: %SERVER_IP%
echo    - 用户名: %USERNAME%
echo    - 密码: [您的服务器密码]
echo 3. 连接成功后：
echo    - 右侧服务器端进入: /root/HomeServiceChat/
echo    - 左侧本地端进入: %LOCAL_PATH%
echo    - 将整个 wangye 文件夹拖拽到右侧
echo 4. 上传完成后，继续执行部署脚本
echo.
pause
goto end

:pscp
echo.
echo 🎯 pscp 命令上传：
echo.
echo pscp -r "%LOCAL_PATH%wangye" %USERNAME%@%SERVER_IP%:%REMOTE_PATH%
echo.
echo 执行上述命令后输入服务器密码
echo.
pause
goto end

:manual
echo.
echo 🎯 手动上传步骤：
echo.
echo 方法1 - 使用任意FTP/SFTP工具：
echo   服务器: %SERVER_IP%
echo   用户名: %USERNAME%
echo   协议: SFTP (端口22)
echo   上传到: /root/HomeServiceChat/
echo.
echo 方法2 - 使用云盘中转：
echo   1. 将wangye文件夹压缩为zip
echo   2. 上传到云盘（百度云、阿里云盘等）
echo   3. 在服务器上下载并解压
echo.
echo 方法3 - 使用Git：
echo   1. 将代码推送到Git仓库
echo   2. 在服务器上git pull更新
echo.
pause
goto end

:scp_command
echo.
echo 🎯 Linux/Mac用户使用的scp命令：
echo.
echo scp -r ./wangye %USERNAME%@%SERVER_IP%:%REMOTE_PATH%
echo.
echo 或者（如果在wangye父目录）：
echo cd "%LOCAL_PATH%.."
echo scp -r ./HomeServiceChat/wangye %USERNAME%@%SERVER_IP%:%REMOTE_PATH%
echo.
pause
goto end

:end
echo.
echo ✅ 上传完成后，请在服务器上执行部署脚本：
echo.
echo ssh %USERNAME%@%SERVER_IP%
echo cd /root/HomeServiceChat/wangye
echo chmod +x deploy-wangye.sh
echo ./deploy-wangye.sh
echo.
echo 🎉 部署完成后访问: http://%SERVER_IP%/wangye/
echo.
pause 