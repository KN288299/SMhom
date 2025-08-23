# 🚀 家政服务APP手动部署指南

## 📋 服务器信息
- **服务器IP**: `38.207.176.241`
- **SSH端口**: `55122`
- **目标目录**: `/opt/homeservice`

---

## 🔑 第一步：连接服务器

打开终端/PowerShell，连接到服务器：

```bash
ssh root@38.207.176.241 -p 55122
```

输入密码后，你应该看到服务器的命令行界面。

---

## 📦 第二步：安装基础软件

### 2.1 更新系统
```bash
apt update
apt upgrade -y
```

### 2.2 安装基础工具
```bash
apt install -y curl wget git htop tree unzip
```

### 2.3 安装Node.js 18.x
```bash
# 添加Node.js官方仓库
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# 安装Node.js
apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

你应该看到类似这样的输出：
```
v18.19.0
9.2.0
```

### 2.4 安装PM2进程管理器
```bash
npm install -g pm2

# 验证安装
pm2 --version
```

### 2.5 安装Nginx
```bash
apt install -y nginx

# 启动并设置开机自启
systemctl start nginx
systemctl enable nginx

# 检查状态
systemctl status nginx
```

你应该看到Nginx状态为 `active (running)`。

### 2.6 安装MongoDB
```bash
# 导入MongoDB公钥
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -

# 添加MongoDB仓库
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# 更新包列表
apt-get update

# 安装MongoDB
apt-get install -y mongodb-org

# 启动并设置开机自启
systemctl start mongod
systemctl enable mongod

# 检查状态
systemctl status mongod
```

---

## 📁 第三步：创建应用目录

```bash
# 创建主目录
mkdir -p /opt/homeservice

# 进入目录
cd /opt/homeservice

# 创建子目录
mkdir -p logs uploads backups

# 设置权限
chmod 755 uploads
```

---

## 📤 第四步：上传项目文件

### 方式一：使用Git（推荐）
如果你的代码在Git仓库中：
```bash
# 在服务器上克隆代码
cd /opt/homeservice
git clone [你的Git仓库地址] .
```

### 方式二：从本地上传
在本地电脑上打开PowerShell/终端：

```bash
# 创建压缩包（排除不必要的文件）
# 在项目根目录运行
tar --exclude=node_modules --exclude=android/app/build --exclude=ios/build --exclude=admin/node_modules --exclude=admin/dist --exclude=.git -czf homeservice.tar.gz .

# 上传到服务器
scp -P 55122 homeservice.tar.gz root@38.207.176.241:/opt/homeservice/
```

然后在服务器上解压：
```bash
cd /opt/homeservice
tar -xzf homeservice.tar.gz
rm homeservice.tar.gz
```

---

## ⚙️ 第五步：配置环境变量

### 5.1 创建环境变量文件
```bash
cd /opt/homeservice
cp config-template.txt .env
```

### 5.2 编辑环境变量
```bash
nano .env
```

将文件内容修改为：
```env
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/homeservicechat

# 服务器配置
SERVER_HOST=0.0.0.0
SERVER_PORT=3000

# JWT密钥（请修改为安全的密钥）
JWT_SECRET=your_super_secure_jwt_secret_key_please_change_this

# 上传文件存储路径
UPLOAD_PATH=./uploads

# CORS允许的域名
CORS_ORIGINS=http://38.207.176.241:3000,http://38.207.176.241:8080,http://38.207.176.241

# 环境设置
NODE_ENV=production
```

按 `Ctrl+X`，然后按 `Y`，再按 `Enter` 保存文件。

---

## 📋 第六步：安装项目依赖

### 6.1 安装主项目依赖
```bash
cd /opt/homeservice
npm install --production
```

这个过程可能需要5-10分钟，等待完成。

### 6.2 安装管理后台依赖
```bash
cd /opt/homeservice/admin
npm install
```

---

## 🏗️ 第七步：构建管理后台

```bash
cd /opt/homeservice/admin
npm run build
```

构建完成后，检查是否生成了dist目录：
```bash
ls -la dist/
```

你应该看到生成的静态文件。

---

## 🚀 第八步：启动后端服务

### 8.1 启动服务
```bash
cd /opt/homeservice
pm2 start server.js --name "homeservice-api"
```

### 8.2 设置开机自启
```bash
pm2 startup
pm2 save
```

### 8.3 检查服务状态
```bash
pm2 status
```

你应该看到服务状态为 `online`。

### 8.4 查看日志
```bash
pm2 logs homeservice-api
```

如果看到类似 "Server running on port 3000" 的消息，说明服务启动成功。

---

## 🌐 第九步：配置Nginx

### 9.1 创建Nginx配置文件
```bash
nano /etc/nginx/sites-available/homeservice
```

将以下内容粘贴到文件中：

```nginx
server {
    listen 80;
    server_name 38.207.176.241;

    # 增加客户端最大上传大小
    client_max_body_size 50M;

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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
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

    # 健康检查
    location /health {
        proxy_pass http://localhost:3000/api/health;
    }

    # 默认重定向到管理后台
    location / {
        return 301 /admin/;
    }

    # 日志配置
    access_log /var/log/nginx/homeservice_access.log;
    error_log /var/log/nginx/homeservice_error.log;
}
```

按 `Ctrl+X`，然后按 `Y`，再按 `Enter` 保存文件。

### 9.2 启用站点配置
```bash
# 创建软链接
ln -s /etc/nginx/sites-available/homeservice /etc/nginx/sites-enabled/

# 删除默认站点
rm -f /etc/nginx/sites-enabled/default

# 测试配置
nginx -t
```

如果看到 "syntax is ok" 和 "test is successful"，说明配置正确。

### 9.3 重启Nginx
```bash
systemctl restart nginx
```

---

## 🧪 第十步：测试部署

### 10.1 测试API
```bash
curl http://localhost:3000/api/health
```

应该返回健康检查信息。

### 10.2 测试Web访问
在浏览器中访问：
- `http://38.207.176.241` - 应该重定向到管理后台
- `http://38.207.176.241/admin/` - 管理后台界面
- `http://38.207.176.241/api/health` - API健康检查

### 10.3 检查服务状态
```bash
# 检查PM2服务
pm2 status

# 检查Nginx状态
systemctl status nginx

# 检查MongoDB状态
systemctl status mongod

# 查看应用日志
pm2 logs homeservice-api
```

---

## 📱 第十一步：移动端APP配置

### 11.1 更新API地址
在移动端代码中，确保API地址指向你的服务器：
```javascript
// 在相关配置文件中
const API_BASE_URL = 'http://38.207.176.241/api';
const SOCKET_URL = 'http://38.207.176.241';
```

### 11.2 打包Android APK
在开发机器上：
```bash
# 清理项目
npx react-native clean

# 构建APK
cd android
./gradlew assembleRelease

# APK文件位置：android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔧 第十二步：维护命令

### 常用监控命令
```bash
# 查看服务状态
pm2 status

# 查看应用日志
pm2 logs homeservice-api

# 重启应用
pm2 restart homeservice-api

# 查看系统资源
htop

# 查看磁盘使用
df -h

# 查看Nginx日志
tail -f /var/log/nginx/homeservice_access.log
tail -f /var/log/nginx/homeservice_error.log
```

### 备份数据库
```bash
# 备份MongoDB
mongodump --db homeservicechat --out /opt/homeservice/backups/mongodb_$(date +%Y%m%d_%H%M%S)

# 备份上传文件
tar -czf /opt/homeservice/backups/uploads_$(date +%Y%m%d_%H%M%S).tar.gz /opt/homeservice/uploads/
```

---

## ✅ 部署完成检查清单

- [ ] 服务器连接成功
- [ ] Node.js、PM2、Nginx、MongoDB安装完成
- [ ] 项目代码上传成功
- [ ] 环境变量配置正确
- [ ] 项目依赖安装完成
- [ ] 管理后台构建成功
- [ ] 后端服务启动正常
- [ ] Nginx配置生效
- [ ] API接口测试通过
- [ ] Web管理后台可访问
- [ ] 移动端APP可连接

---

## 🆘 常见问题解决

### 问题1：端口被占用
```bash
# 查看端口占用
netstat -tulpn | grep :3000
# 杀死进程
kill -9 [PID]
```

### 问题2：权限问题
```bash
# 修复上传目录权限
chmod 755 /opt/homeservice/uploads
chown -R www-data:www-data /opt/homeservice/uploads
```

### 问题3：MongoDB连接失败
```bash
# 检查MongoDB状态
systemctl status mongod
# 重启MongoDB
systemctl restart mongod
```

### 问题4：Nginx配置错误
```bash
# 测试配置
nginx -t
# 重新加载配置
nginx -s reload
```

---

**🎉 恭喜！如果所有步骤都完成了，你的家政服务APP应该已经成功部署并运行在服务器上了！**

**访问地址**:
- Web管理后台: `http://38.207.176.241/admin/`
- API接口: `http://38.207.176.241/api/`
- Socket.io: `http://38.207.176.241`
