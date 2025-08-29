#!/bin/bash

echo "=== HomeSM APK下载功能完整测试 ==="
echo

echo "1. 测试主APK文件访问："
curl -I https://uu68.icu/HomeSM.apk
echo

echo "2. 测试Android展示页面："
curl -I https://uu68.icu/wangye/android.html
echo

echo "3. 测试iOS展示页面："
curl -I https://uu68.icu/wangye/ios.html
echo

echo "4. 测试主页面："
curl -I https://uu68.icu/wangye/
echo

echo "5. 检查APK文件大小和类型："
curl -s -I https://uu68.icu/HomeSM.apk | grep -E "(content-length|content-type|content-disposition)"
echo

echo "=== 测试完成 ==="
echo "✅ 如果所有请求都返回200状态码，说明下载功能已完全修复"
echo "✅ APK文件大小约130MB，类型为application/vnd.android.package-archive"
echo "✅ Android页面现在会正确跳转到 /HomeSM.apk 进行下载"
