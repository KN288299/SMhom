# 🚀 完整APP部署指南

## 📋 部署概览

**目标服务器**: `38.207.178.173:55122`
**应用类型**: 家政服务聊天APP
**包含组件**:
- React Native移动端APP (Android/iOS)
- Web管理后台 (React + Vite)
- Node.js后端API服务器
- MongoDB数据库
- Socket.io实时通信

---

## 🏗️ 第一步：服务器环境准备

### 1.1 连接到服务器
```bash
ssh root@38.207.178.173 -p 55122
```

### 1.2 安装必要软件
```bash
# 更新系统
apt update && apt upgrade -y

# 安装Node.js 18+ (推荐使用NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 验证安装
node --version  # 应该显示 v18.x.x
npm --version

# 安装PM2 (进程管理器)
npm install -g pm2

# 安装Nginx (Web服务器)
apt install -y nginx

# 安装MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org

# 启动MongoDB
systemctl start mongod
systemctl enable mongod

# 安装其他工具
apt install -y git htop tree
```

### 1.3 创建应用目录
```bash
# 创建应用目录
mkdir -p /opt/homeservice
cd /opt/homeservice

# 创建必要的子目录
mkdir -p logs uploads backups
chmod 755 uploads
```

---

## 📦 第二步：上传代码到服务器

### 2.1 方式一：使用Git (推荐)
```bash
# 在服务器上
cd /opt/homeservice
git clone [你的Git仓库地址] .

# 或者从本地推送到服务器的Git仓库
```

### 2.2 方式二：使用SCP上传
```bash
# 在本地电脑上运行 (PowerShell/CMD)
# 压缩项目 (排除不必要的文件)
tar --exclude=node_modules --exclude=android/app/build --exclude=ios/build --exclude=admin/node_modules --exclude=admin/dist -czf homeservice.tar.gz .

# 上传到服务器
scp -P 55122 homeservice.tar.gz root@38.207.178.173:/opt/homeservice/

# 在服务器上解压
cd /opt/homeservice
tar -xzf homeservice.tar.gz
rm homeservice.tar.gz
```

### 2.3 方式三：使用同步脚本
```bash
# 使用现有的sync-to-server.ps1脚本 (需要修改服务器地址)
```

---

## ⚙️ 第三步：后端服务部署

### 3.1 安装依赖
```bash
cd /opt/homeservice

# 安装主项目依赖
npm install --production

# 安装管理后台依赖
cd admin
npm install
cd ..
```

### 3.2 创建环境变量文件
```bash
# 复制模板并编辑
cp config-template.txt .env

# 编辑环境变量
nano .env
```

**`.env` 文件内容**:
```env
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/homeservicechat

# 服务器配置
SERVER_HOST=0.0.0.0
SERVER_PORT=3000

# JWT密钥（生产环境请使用更安全的密钥）
JWT_SECRET=your_super_secure_jwt_secret_key_here

# 上传文件存储路径
UPLOAD_PATH=./uploads

# CORS允许的域名
CORS_ORIGINS=http://38.207.178.173:3000,http://38.207.178.173:8080,http://38.207.178.173

# 环境设置
NODE_ENV=production
```

### 3.3 启动后端服务
```bash
# 使用PM2启动服务
pm2 start server.js --name "homeservice-api"

# 设置开机自启
pm2 startup
pm2 save

# 检查服务状态
pm2 status
pm2 logs homeservice-api
```

---

## 🌐 第四步：Web管理后台部署

### 4.1 构建管理后台
```bash
cd /opt/homeservice/admin

# 构建生产版本
npm run build

# 验证构建结果
ls -la dist/
```

### 4.2 配置Nginx
```bash
# 创建Nginx配置文件
nano /etc/nginx/sites-available/homeservice
```

**Nginx配置文件内容**:
```nginx
server {
    listen 80;
    server_name 38.207.178.173;

    # API代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.io代理
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 管理后台静态文件
    location /admin/ {
        alias /opt/homeservice/admin/dist/;
        try_files $uri $uri/ /admin/index.html;
        
        # 设置缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # 上传文件访问
    location /uploads/ {
        alias /opt/homeservice/uploads/;
        add_header Access-Control-Allow-Origin *;
    }

    # 默认重定向到管理后台
    location / {
        return 301 /admin/;
    }
}
```

### 4.3 启用Nginx配置
```bash
# 启用站点
ln -s /etc/nginx/sites-available/homeservice /etc/nginx/sites-enabled/

# 删除默认站点
rm -f /etc/nginx/sites-enabled/default

# 测试配置
nginx -t

# 重启Nginx
systemctl restart nginx
systemctl enable nginx
```

---

## 🗄️ 第五步：数据库配置

### 5.1 MongoDB基本配置
```bash
# 连接到MongoDB
mongo

# 创建数据库和用户
use homeservicechat

# 创建管理员用户 (可选，用于安全)
db.createUser({
  user: "homeservice_admin",
  pwd: "your_secure_password",
  roles: [{role: "readWrite", db: "homeservicechat"}]
})

# 退出
exit
```

### 5.2 数据库安全配置 (可选)
```bash
# 编辑MongoDB配置
nano /etc/mongod.conf

# 启用认证 (取消注释并修改)
security:
  authorization: enabled

# 重启MongoDB
systemctl restart mongod
```

---

## 📱 第六步：移动端APP打包

### 6.1 Android APK打包

**在开发机器上运行**:
```bash
# 生成签名密钥 (如果没有)
cd android/app
keytool -genkey -v -keystore homeservice-release-key.keystore -alias homeservice-key-alias -keyalg RSA -keysize 2048 -validity 10000

# 清理并构建
cd ../..
npx react-native clean
cd android
./gradlew clean
./gradlew assembleRelease

# APK文件位置
# android/app/build/outputs/apk/release/app-release.apk
```

### 6.2 iOS打包 (如果需要)
```bash
# 需要macOS和Xcode
cd ios
pod install
# 在Xcode中打开 HomeSM.xcworkspace 进行打包
```

---

## 🔒 第七步：SSL证书配置 (可选但推荐)

### 7.1 使用Let's Encrypt免费SSL
```bash
# 安装Certbot
apt install -y certbot python3-certbot-nginx

# 获取SSL证书 (替换为你的域名)
certbot --nginx -d yourdomain.com

# 测试自动续期
certbot renew --dry-run
```

### 7.2 更新环境变量
```bash
# 编辑.env文件，添加HTTPS支持
nano /opt/homeservice/.env

# 添加
CORS_ORIGINS=https://yourdomain.com,https://yourdomain.com:443
```

---

## 🧪 第八步：测试和验证

### 8.1 后端API测试
```bash
# 测试API是否正常
curl http://38.207.178.173:3000/api/health

# 测试Socket.io连接
node -e "
const io = require('socket.io-client');
const socket = io('http://38.207.178.173:3000');
socket.on('connect', () => {
  console.log('✅ Socket.io连接成功');
  socket.disconnect();
});
"
```

### 8.2 Web管理后台测试
```bash
# 访问管理后台
http://38.207.178.173/admin/

# 检查以下功能:
# - 登录页面加载
# - API连接正常
# - 数据显示正常
```

### 8.3 移动端APP测试
```bash
# 安装APK到测试设备
adb install android/app/build/outputs/apk/release/app-release.apk

# 测试功能:
# - 注册登录
# - 聊天功能
# - 文件上传
# - 语音通话
```

---

## 🔧 第九步：维护和监控

### 9.1 日志管理
```bash
# 查看应用日志
pm2 logs homeservice-api

# 查看Nginx日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# 查看MongoDB日志
tail -f /var/log/mongodb/mongod.log
```

### 9.2 性能监控
```bash
# 安装PM2监控
pm2 install pm2-server-monit

# 查看系统资源
htop
df -h
free -h
```

### 9.3 备份策略
```bash
# 创建备份脚本
nano /opt/homeservice/backup.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/homeservice/backups"

# 备份数据库
mongodump --db homeservicechat --out $BACKUP_DIR/mongodb_$DATE

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz uploads/

# 保留最近7天的备份
find $BACKUP_DIR -name "mongodb_*" -mtime +7 -exec rm -rf {} \;
find $BACKUP_DIR -name "uploads_*" -mtime +7 -exec rm -f {} \;

# 设置定时备份
chmod +x /opt/homeservice/backup.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/homeservice/backup.sh") | crontab -
```

---

## 🎯 部署检查清单

- [ ] 服务器环境准备 (Node.js, PM2, Nginx, MongoDB)
- [ ] 代码上传到服务器
- [ ] 安装项目依赖
- [ ] 配置环境变量
- [ ] 启动后端服务
- [ ] 构建和部署Web管理后台
- [ ] 配置Nginx反向代理
- [ ] 配置数据库
- [ ] 打包移动端APP
- [ ] 配置SSL证书 (可选)
- [ ] 功能测试验证
- [ ] 设置监控和备份

---

## 🆘 常见问题解决

### 问题1: 端口被占用
```bash
# 查看端口占用
netstat -tulpn | grep :3000
# 杀死进程
kill -9 [PID]
```

### 问题2: 权限问题
```bash
# 修复上传目录权限
chmod 755 /opt/homeservice/uploads
chown -R www-data:www-data /opt/homeservice/uploads
```

### 问题3: MongoDB连接失败
```bash
# 检查MongoDB状态
systemctl status mongod
# 重启MongoDB
systemctl restart mongod
```

### 问题4: Nginx配置错误
```bash
# 测试配置
nginx -t
# 重新加载配置
nginx -s reload
```

---

## 📞 技术支持

如果遇到问题，请检查：
1. 服务器日志: `pm2 logs homeservice-api`
2. Nginx日志: `/var/log/nginx/error.log`
3. MongoDB日志: `/var/log/mongodb/mongod.log`
4. 系统资源: `htop`, `df -h`

**部署完成后，你的应用将在以下地址可用:**
- 移动端API: `http://38.207.178.173:3000/api`
- Web管理后台: `http://38.207.178.173/admin`
- Socket.io服务: `http://38.207.178.173:3000`
