#!/bin/bash

# 真机APK下载速度测试工具
# 用于诊断移动设备下载问题

echo "=== 真机APK下载速度测试工具 ==="

# 获取服务器IP
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "服务器IP: $SERVER_IP"

# 检查APK文件
APK_PATH="/opt/HomeSM/wangye"
echo -e "\n1. 检查可用的APK文件:"
find $APK_PATH -name "*.apk" -exec ls -lh {} \; | head -5

# 生成测试用的不同大小文件
echo -e "\n2. 创建测试文件 (用于速度测试):"
mkdir -p /tmp/download_test

# 创建1MB测试文件
dd if=/dev/zero of=/tmp/download_test/test_1mb.apk bs=1M count=1 2>/dev/null
echo "创建 1MB 测试文件: /tmp/download_test/test_1mb.apk"

# 创建5MB测试文件
dd if=/dev/zero of=/tmp/download_test/test_5mb.apk bs=1M count=5 2>/dev/null
echo "创建 5MB 测试文件: /tmp/download_test/test_5mb.apk"

# 创建10MB测试文件
dd if=/dev/zero of=/tmp/download_test/test_10mb.apk bs=1M count=10 2>/dev/null
echo "创建 10MB 测试文件: /tmp/download_test/test_10mb.apk"

# 复制到nginx根目录
cp /tmp/download_test/*.apk $APK_PATH/

echo -e "\n3. 测试URL列表 (用手机浏览器或下载工具测试):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔗 1MB测试文件:"
echo "   http://$SERVER_IP/test_1mb.apk"
echo "   https://$SERVER_IP/test_1mb.apk"
echo ""
echo "🔗 5MB测试文件:"
echo "   http://$SERVER_IP/test_5mb.apk"
echo "   https://$SERVER_IP/test_5mb.apk"
echo ""
echo "🔗 10MB测试文件:"
echo "   http://$SERVER_IP/test_10mb.apk"
echo "   https://$SERVER_IP/test_10mb.apk"

# 如果有真实APK文件，也显示
REAL_APK=$(find $APK_PATH -name "*.apk" -not -name "test_*" | head -1)
if [ ! -z "$REAL_APK" ]; then
    APK_NAME=$(basename "$REAL_APK")
    APK_SIZE=$(ls -lh "$REAL_APK" | awk '{print $5}')
    echo ""
    echo "🔗 真实APK文件 ($APK_SIZE):"
    echo "   http://$SERVER_IP/$APK_NAME"
    echo "   https://$SERVER_IP/$APK_NAME"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n4. 服务器端监控命令:"
echo "在另一个终端窗口运行以下命令来监控下载:"
echo ""
echo "# 监控nginx访问日志"
echo "tail -f /var/log/nginx/access.log | grep -E '\\.apk'"
echo ""
echo "# 监控网络流量"
echo "watch -n 1 'cat /proc/net/dev'"
echo ""
echo "# 监控连接数"
echo "watch -n 1 'netstat -an | grep :80 | wc -l'"

echo -e "\n5. 真机测试步骤:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 方法1: 使用手机浏览器"
echo "   1. 打开手机浏览器"
echo "   2. 输入上面的测试URL"
echo "   3. 观察下载速度和时间"
echo ""
echo "📱 方法2: 使用wget/curl (如果手机支持)"
echo "   curl -o /dev/null -s -w 'Speed: %{speed_download} bytes/sec, Time: %{time_total}s\\n' http://$SERVER_IP/test_5mb.apk"
echo ""
echo "📱 方法3: 使用下载管理器APP"
echo "   1. 安装下载管理器(如ADM, IDM+)"
echo "   2. 添加下载任务"
echo "   3. 观察实时下载速度"

echo -e "\n6. 问题诊断指南:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐌 如果下载很慢 (<1MB/s):"
echo "   - 检查手机网络连接(WiFi vs 4G/5G)"
echo "   - 检查服务器带宽限制"
echo "   - 查看nginx错误日志: tail -f /var/log/nginx/error.log"
echo ""
echo "⚡ 如果下载正常 (>5MB/s):"
echo "   - 问题可能在特定APK文件"
echo "   - 检查APK文件权限和完整性"
echo ""
echo "🔄 如果下载中断:"
echo "   - 检查nginx超时设置"
echo "   - 验证断点续传功能"
echo ""
echo "📊 速度参考标准:"
echo "   - WiFi: 应该 >10MB/s"
echo "   - 4G: 应该 >2MB/s"
echo "   - 5G: 应该 >20MB/s"

echo -e "\n7. 生成测试报告:"
echo "请将以下信息提供给技术支持:"

# 生成系统信息报告
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🖥️  服务器信息:"
echo "   时间: $(date)"
echo "   服务器IP: $SERVER_IP"
echo "   系统: $(uname -a)"
echo "   内存: $(free -h | grep Mem)"
echo "   磁盘: $(df -h $APK_PATH | tail -1)"

echo ""
echo "🌐 网络配置:"
echo "   nginx状态: $(systemctl is-active nginx)"
echo "   监听端口: $(netstat -tlnp | grep nginx)"

echo ""
echo "📁 APK文件信息:"
ls -lah $APK_PATH/*.apk 2>/dev/null | head -5

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 测试环境准备完成！"
echo "现在可以使用真机进行下载速度测试了。"
echo ""
echo "💡 提示: 建议同时在服务器端运行监控命令来观察实时情况。"
