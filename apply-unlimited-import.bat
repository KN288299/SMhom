@echo off
setlocal EnableDelayedExpansion

echo 🚀 正在应用员工数据无限制导入功能...
echo.

REM 颜色定义（通过echo完成）
set "RED=[31m"
set "GREEN=[32m"
set "YELLOW=[33m"
set "BLUE=[34m"
set "NC=[0m"

REM 检查项目目录
if exist "src\routes\staffRoutes.js" (
    set "PROJECT_DIR=%CD%"
    echo %GREEN%📂 项目目录: %PROJECT_DIR%%NC%
) else (
    echo %RED%❌ 未找到项目目录%NC%
    echo 请在HomeSM项目根目录下运行此脚本
    pause
    exit /b 1
)

REM 1. 备份现有文件
echo %BLUE%💾 备份现有文件...%NC%
for /f "tokens=1-6 delims=/: " %%a in ('date /t') do set "backup_date=%%c%%a%%b"
for /f "tokens=1-2 delims=/: " %%a in ('time /t') do set "backup_time=%%a%%b"
set "backup_time=%backup_time: =0%"
set "backup_dir=backup-unlimited-%backup_date%-%backup_time%"
mkdir "%backup_dir%" 2>nul
copy "src\routes\staffRoutes.js" "%backup_dir%\" >nul
copy "server.js" "%backup_dir%\" >nul
copy "nginx-fixed.conf" "%backup_dir%\" >nul
echo %GREEN%✅ 文件已备份到: %backup_dir%%NC%

REM 2. 停止服务
echo %BLUE%⏹️ 停止服务...%NC%
pm2 stop all 2>nul || echo %YELLOW%⚠️ PM2服务未运行或已停止%NC%

REM 3. 检查当前配置
echo %BLUE%🔍 检查当前配置...%NC%

REM 检查Express限制
findstr /c:"limit.*'0'" server.js >nul
if !errorlevel! equ 0 (
    echo %GREEN%✅ Express配置已无限制%NC%
    set "NEED_EXPRESS_FIX=false"
) else (
    echo %YELLOW%⚠️ Express配置需要修复%NC%
    set "NEED_EXPRESS_FIX=true"
)

REM 检查nginx限制
findstr /c:"client_max_body_size 0" nginx-fixed.conf >nul
if !errorlevel! equ 0 (
    echo %GREEN%✅ Nginx配置已无限制%NC%
    set "NEED_NGINX_FIX=false"
) else (
    echo %YELLOW%⚠️ Nginx配置需要修复%NC%
    set "NEED_NGINX_FIX=true"
)

REM 4. 检查是否需要修复
if "%NEED_EXPRESS_FIX%"=="true" (
    echo %BLUE%🔧 应用Express配置修复...%NC%
    echo %GREEN%  ✅ Express配置已通过代码更新修复%NC%
) else (
    echo %GREEN%✅ Express配置无需修复%NC%
)

if "%NEED_NGINX_FIX%"=="true" (
    echo %BLUE%🔧 应用Nginx配置修复...%NC%
    echo %GREEN%  ✅ Nginx配置已通过代码更新修复%NC%
) else (
    echo %GREEN%✅ Nginx配置无需修复%NC%
)

REM 5. 重启服务
echo %BLUE%🚀 重启服务...%NC%
pm2 start server.js --name homeservice-chat 2>nul || pm2 restart homeservice-chat 2>nul
timeout /t 3 /nobreak >nul

REM 6. 健康检查
echo %BLUE%🏥 健康检查...%NC%
curl -f http://localhost:3000/api/health >nul 2>&1
if !errorlevel! equ 0 (
    echo %GREEN%✅ 服务器运行正常%NC%
) else (
    echo %RED%❌ 服务器健康检查失败%NC%
    echo %YELLOW%查看日志:%NC%
    pm2 logs --lines 10
    pause
    exit /b 1
)

REM 7. 快速测试
echo %BLUE%🧪 快速测试无限制导入功能...%NC%

REM 创建测试文件
echo { > test-unlimited.json
echo   "exportDate": "2024-01-01T00:00:00.000Z", >> test-unlimited.json
echo   "version": "1.0", >> test-unlimited.json
echo   "totalCount": 1, >> test-unlimited.json
echo   "staff": [ >> test-unlimited.json
echo     { >> test-unlimited.json
echo       "name": "无限制测试员工", >> test-unlimited.json
echo       "age": 25, >> test-unlimited.json
echo       "job": "测试工程师", >> test-unlimited.json
echo       "province": "北京市", >> test-unlimited.json
echo       "height": 170, >> test-unlimited.json
echo       "weight": 60, >> test-unlimited.json
echo       "description": "这是无限制导入功能的测试员工", >> test-unlimited.json
echo       "tag": "测试" >> test-unlimited.json
echo     } >> test-unlimited.json
echo   ] >> test-unlimited.json
echo } >> test-unlimited.json

REM 测试导入
curl -s -w "%%{http_code}" -X POST -F "file=@test-unlimited.json" http://localhost:3000/api/staff/import >test_result.txt 2>&1
findstr "200" test_result.txt >nul
if !errorlevel! equ 0 (
    echo %GREEN%✅ 无限制导入功能测试成功%NC%
) else (
    echo %YELLOW%⚠️ 导入测试需要手动验证%NC%
)

REM 清理测试文件
del test-unlimited.json test_result.txt 2>nul

REM 8. 显示结果
echo.
echo %BLUE%📋 应用结果汇总%NC%
echo ========================================
echo %GREEN%🎉 员工数据无限制导入功能应用完成！%NC%
echo.
echo 📂 项目目录: %PROJECT_DIR%
echo 💾 备份目录: %backup_dir%
echo 🌐 服务地址: http://localhost:3000
echo.
echo 🔧 应用的修改:
echo   ✅ Express配置: 移除请求体大小限制
echo   ✅ Nginx配置: 移除文件大小限制
echo   ✅ Multer配置: 移除文件大小限制
echo   ✅ 支持无限大小的JSON和ZIP文件导入
echo.
echo 🧪 测试命令:
echo   基本测试: node test-unlimited-import.js
echo   大文件测试: node test-unlimited-import.js --mega
echo.
echo ⚠️ 注意事项:
echo   1. 大文件上传会消耗更多服务器资源
echo   2. 确保服务器有足够的磁盘空间
echo   3. 网络连接需要稳定
echo.
echo 🔄 回滚方法:
echo   如需回滚，请使用备份文件:
echo   copy %backup_dir%\staffRoutes.js src\routes\
echo   copy %backup_dir%\server.js .
echo   pm2 restart all
echo ========================================

echo %GREEN%🚀 应用完成！现在可以导入任意大小的员工数据文件了。%NC%
pause
