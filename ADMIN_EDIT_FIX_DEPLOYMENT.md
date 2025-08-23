# 管理后台员工编辑功能修复部署指南

## 问题描述
员工管理页面的编辑功能无法正常工作，点击编辑按钮后显示"编辑功能待开发"。

## 修复内容
1. 修复了 `formatImageUrl` 函数定义顺序问题
2. 添加了调试信息来帮助诊断问题
3. 确保编辑模态框能正确打开和填充数据

## 部署步骤

### 方法1：使用 WinSCP（推荐）

1. **下载并安装 WinSCP**
   - 访问：https://winscp.net/
   - 下载并安装 WinSCP

2. **连接到服务器**
   - 打开 WinSCP
   - 新建会话，填入以下信息：
     - 文件协议：SFTP
     - 主机名：38.207.176.241
     - 端口号：55122
     - 用户名：root
     - 密码：NkGKaEDJmF0t

3. **上传文件**
   - 连接到服务器后，导航到 `/var/www/HomeSM/admin/`
   - 删除 `dist` 目录下的所有文件
   - 将本地的 `admin/dist` 目录下的所有文件上传到服务器的 `dist` 目录

4. **重启服务**
   - 在服务器上执行：
   ```bash
   cd /var/www/HomeSM
   sudo systemctl restart nginx
   ```

### 方法2：使用 SSH 连接

1. **连接到服务器**
   ```bash
   ssh -p 55122 root@38.207.176.241
   ```

2. **备份当前文件**
   ```bash
   cd /var/www/HomeSM/admin
   cp -r dist dist_backup_$(date +%Y%m%d_%H%M%S)
   ```

3. **删除旧文件并上传新文件**
   ```bash
   rm -rf dist/*
   # 然后使用 scp 或 WinSCP 上传新的 dist 文件
   ```

4. **重启服务**
   ```bash
   sudo systemctl restart nginx
   ```

## 验证修复

1. **访问管理后台**
   - 打开浏览器访问：http://38.207.176.241/admin
   - 登录管理后台

2. **测试编辑功能**
   - 进入"员工管理"页面
   - 点击任意员工的"编辑"按钮
   - 应该能看到编辑模态框打开，并显示员工信息

3. **检查控制台**
   - 打开浏览器开发者工具（F12）
   - 查看 Console 标签页
   - 应该能看到调试信息，没有错误

## 故障排除

如果编辑功能仍然不工作：

1. **检查浏览器控制台**
   - 查看是否有 JavaScript 错误
   - 检查网络请求是否成功

2. **检查服务器日志**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log
   ```

3. **重新构建前端**
   ```bash
   cd /var/www/HomeSM/admin
   npm run build
   ```

4. **检查文件权限**
   ```bash
   chown -R www-data:www-data /var/www/HomeSM/admin/dist
   chmod -R 755 /var/www/HomeSM/admin/dist
   ```

## 联系信息

如果遇到问题，请检查：
1. 浏览器控制台错误信息
2. 服务器日志
3. 网络连接状态 