@echo off
echo 🔐 证书管理工具...

:menu
echo.
echo 请选择操作：
echo 1. 生成新的生产环境证书
echo 2. 查看现有证书信息
echo 3. 验证证书有效性
echo 4. 备份证书
echo 5. 退出
echo.
set /p choice=请输入选择 (1-5): 

if "%choice%"=="1" goto generate
if "%choice%"=="2" goto view
if "%choice%"=="3" goto verify
if "%choice%"=="4" goto backup
if "%choice%"=="5" goto exit
goto menu

:generate
echo.
echo 🔐 生成新的生产环境证书...
call generate-release-keystore.bat
goto menu

:view
echo.
echo 📋 查看证书信息...
if exist "android\app\release.keystore" (
    echo ✅ 找到生产环境证书
    keytool -list -v -keystore android\app\release.keystore
) else (
    echo ❌ 未找到生产环境证书
)
pause
goto menu

:verify
echo.
echo 🔍 验证证书有效性...
if exist "android\app\release.keystore" (
    echo 验证生产环境证书...
    keytool -list -v -keystore android\app\release.keystore
    echo.
    echo 验证APK签名（如果存在）...
    if exist "android\app\build\outputs\apk\release\app-release.apk" (
        jarsigner -verify -verbose -certs android\app\build\outputs\apk\release\app-release.apk
    ) else (
        echo ⚠️ 未找到已打包的APK文件
    )
) else (
    echo ❌ 未找到生产环境证书
)
pause
goto menu

:backup
echo.
echo 💾 备份证书...
if exist "android\app\release.keystore" (
    set backup_name=keystore_backup_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.keystore
    set backup_name=%backup_name: =0%
    copy "android\app\release.keystore" "%backup_name%"
    echo ✅ 证书已备份为: %backup_name%
    echo ⚠️ 请妥善保管备份文件，丢失将无法更新应用！
) else (
    echo ❌ 未找到生产环境证书
)
pause
goto menu

:exit
echo �� 退出证书管理工具
exit /b 0 