# 📋 HomeServiceChat 快速参考卡片

## 🔑 关键信息记录表

```
服务器IP: ________________
域名1: api.______________.com  
域名2: admin.____________.com
服务器密码: ______________
数据库密码: ______________  
Firebase项目: ____________
APK签名密码: _____________
```

---

## ⚡ 常用命令速查

### 连接服务器
```bash
# Windows用户用PuTTY，输入IP和密码
# Mac用户用终端：
ssh root@你的服务器IP
```

### 查看服务状态
```bash
pm2 status                    # 查看应用状态
systemctl status nginx       # 查看Nginx状态  
systemctl status mongod      # 查看数据库状态
pm2 logs                      # 查看应用日志
```

### 重启服务
```bash
pm2 restart all              # 重启应用
systemctl restart nginx     # 重启Nginx
systemctl restart mongod    # 重启数据库
```

### 部署更新
```bash
cd /var/www/HomeServiceChat
git pull origin main         # 更新代码
npm install                  # 安装新依赖
cd admin && npm run build && cd ..  # 构建前端
pm2 restart all              # 重启应用
```

---

## 🌐 重要网址

| 功能 | 网址 | 用途 |
|------|------|------|
| API健康检查 | `https://api.你的域名.com/api/health` | 检查后端是否正常 |
| 管理后台 | `https://admin.你的域名.com` | 管理用户和内容 |
| 阿里云控制台 | `https://ecs.console.aliyun.com` | 管理服务器 |
| Firebase控制台 | `https://console.firebase.google.com` | 管理推送通知 |

---

## 🔧 关键配置文件位置

| 文件 | 路径 | 用途 |
|------|------|------|
| 环境变量 | `/var/www/HomeServiceChat/.env` | 数据库、JWT等配置 |
| Nginx配置 | `/etc/nginx/sites-available/homeservicechat` | 域名和代理设置 |
| PM2配置 | `/var/www/HomeServiceChat/ecosystem.config.js` | 进程管理配置 |
| API配置 | `src/config/api.ts` | 移动端API地址 |
| 管理后台API | `admin/src/api/api.ts` | 后台API地址 |

---

## 🚨 紧急故障处理

### 网站打不开
```bash
# 1. 检查服务状态
pm2 status
systemctl status nginx

# 2. 查看错误日志
pm2 logs
tail -f /var/log/nginx/error.log

# 3. 重启服务
pm2 restart all
systemctl restart nginx
```

### 数据库连接失败
```bash
# 1. 检查MongoDB状态
systemctl status mongod

# 2. 重启MongoDB
systemctl restart mongod

# 3. 检查连接
mongo --eval "db.stats()"
```

### 推送通知不工作
1. 检查 `serviceAccountKey.json` 文件是否存在
2. 验证 Firebase 项目配置
3. 确认 `google-services.json` 位置正确

---

## 📱 移动端打包

### Android APK构建
```bash
cd /var/www/HomeServiceChat/android
./gradlew assembleRelease
```

**APK位置**: `android/app/build/outputs/apk/release/app-release.apk`

### 签名配置检查
```bash
# 检查签名文件
ls -la android/app/*.keystore

# 验证APK签名
jarsigner -verify -verbose android/app/build/outputs/apk/release/app-release.apk
```

---

## 💾 备份命令

### 数据库备份
```bash
# 创建备份目录
mkdir -p /backup/$(date +%Y%m%d)

# 备份数据库
mongodump --db homeservicechat --out /backup/$(date +%Y%m%d)

# 压缩备份
tar -czf /backup/homeservicechat-$(date +%Y%m%d).tar.gz /backup/$(date +%Y%m%d)
```

### 代码备份
```bash
# 备份整个项目
tar -czf /backup/homeservicechat-code-$(date +%Y%m%d).tar.gz /var/www/HomeServiceChat
```

---

## 🔍 性能监控

### 系统资源监控
```bash
htop                         # 查看CPU和内存使用
df -h                        # 查看磁盘使用
free -h                      # 查看内存使用
pm2 monit                    # PM2监控界面
```

### 网络连接测试
```bash
# 测试域名解析
nslookup api.你的域名.com

# 测试端口连接
telnet localhost 5000
telnet localhost 80
telnet localhost 443
```

---

## 🔐 安全设置

### 防火墙状态
```bash
# 查看防火墙状态
ufw status

# 允许特定端口
ufw allow 22
ufw allow 80  
ufw allow 443
```

### SSL证书管理
```bash
# 查看证书状态
certbot certificates

# 手动续期证书
certbot renew

# 测试自动续期
certbot renew --dry-run
```

---

## 📞 默认账户信息

### 管理后台登录
- **用户名**: `admin`
- **密码**: `admin123`
- **地址**: `https://admin.你的域名.com`

### 移动端注册
- **邀请码**: `6969` (固定)
- **注册方式**: 手机号 + 邀请码

---

## 🎯 检查清单

部署完成后必须检查的项目：

- [ ] API健康检查正常 (`/api/health`)
- [ ] 管理后台可以访问和登录
- [ ] Socket.io连接无错误
- [ ] 移动端可以注册和登录
- [ ] 图片上传功能正常
- [ ] 推送通知配置正确
- [ ] SSL证书有效
- [ ] 防火墙配置正确
- [ ] 数据库连接正常
- [ ] 备份脚本可执行

---

## 📧 获取帮助

### 日志文件位置
- **应用日志**: `/var/log/pm2/homeservicechat-*.log`
- **Nginx日志**: `/var/log/nginx/error.log`
- **系统日志**: `/var/log/syslog`

### 常用调试命令
```bash
# 查看实时日志
tail -f /var/log/pm2/homeservicechat-error.log
tail -f /var/log/nginx/error.log

# 检查配置文件语法
nginx -t
pm2 startup
```

---

**📌 提示**: 将此文档保存为书签，部署过程中遇到问题时快速查阅！ 