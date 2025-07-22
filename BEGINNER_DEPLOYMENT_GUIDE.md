# 🚀 HomeServiceChat 零基础部署指南

> **适合对象**: 完全不懂代码的用户  
> **预计时间**: 4-6小时  
> **总成本**: 约300-500元/月

## 📝 准备工作清单

在开始之前，请准备以下物品：
- [ ] 一张信用卡或支付宝（用于购买服务器和域名）
- [ ] 一台电脑（Windows/Mac都可以）
- [ ] 稳定的网络连接
- [ ] 手机（用于接收验证码）

---

## 第一步：购买云服务器 (30分钟)

### 1.1 选择云服务商

**推荐选择**：
- 🇨🇳 **阿里云** (国内用户首选，需要备案)
- 🇨🇳 **腾讯云** (国内用户备选)
- 🌍 **vultr** (海外用户，无需备案)

我们以**阿里云**为例：

### 1.2 注册阿里云账户

1. **打开浏览器**，输入：`https://www.aliyun.com`
2. **点击右上角"免费注册"**
3. **输入手机号**，接收验证码
4. **设置密码**，完成注册
5. **实名认证**：上传身份证照片（必须完成）

### 1.3 购买ECS服务器

1. **登录阿里云控制台**
2. **搜索"ECS"**，点击"云服务器ECS"
3. **点击"立即购买"**

**配置选择**：
```
地域：选择离你最近的城市（如：华东1-杭州）
实例规格：2核4G（ecs.t6-c1m2.large）
镜像：Ubuntu 20.04 64位
系统盘：40GB SSD
公网带宽：5M
购买时长：1个月（测试用）
```

4. **设置实例密码**：
   - 勾选"自定义密码"
   - 设置root密码（必须记住！）
   - 例如：`MyServer123!`

5. **安全组设置**：
   - 勾选"开放22,80,443,3389端口"

6. **确认订单**，支付费用（约150元/月）

### 1.4 获取服务器信息

购买完成后：
1. **进入ECS控制台**
2. **找到你的实例**
3. **记录下"公网IP地址"**，例如：`47.96.123.456`

---

## 第二步：购买域名 (20分钟)

### 2.1 在阿里云购买域名

1. **在阿里云首页搜索"域名"**
2. **点击"域名注册"**
3. **输入你想要的域名**，例如：`myservice`
4. **选择后缀**：`.com`（推荐）或 `.cn`
5. **检查可用性**，选择一个可用域名
6. **购买1年**（约60-80元）

### 2.2 域名实名认证和备案

**如果选择.com域名**：
- 只需要实名认证（1天内完成）

**如果选择.cn域名**：
- 需要实名认证 + ICP备案（15-20天）

### 2.3 设置域名解析

1. **进入阿里云控制台**
2. **点击"域名"菜单**
3. **点击你的域名后面的"解析"按钮**
4. **添加解析记录**：

```
记录类型：A
主机记录：api
解析线路：默认
记录值：你的服务器IP（如：47.96.123.456）
TTL：10分钟

记录类型：A  
主机记录：admin
解析线路：默认
记录值：你的服务器IP（如：47.96.123.456）
TTL：10分钟
```

5. **保存设置**

现在你有了：
- `api.你的域名.com` → 指向你的服务器
- `admin.你的域名.com` → 指向你的服务器

---

## 第三步：连接服务器 (15分钟)

### 3.1 下载SSH工具

**Windows用户**：
1. 下载 **PuTTY**：`https://www.putty.org/`
2. 安装PuTTY

**Mac用户**：
- 使用自带的终端即可

### 3.2 连接服务器

**Windows (PuTTY)**：
1. **打开PuTTY**
2. **在"Host Name"输入**：你的服务器IP
3. **Port保持22**
4. **点击"Open"**
5. **弹出安全警告，点击"是"**
6. **输入用户名**：`root`
7. **输入密码**：你设置的服务器密码

**Mac (终端)**：
1. **打开终端应用**
2. **输入命令**：`ssh root@你的服务器IP`
3. **输入密码**

成功连接后，你会看到类似这样的界面：
```
root@iZbp1234567890Z:~#
```

---

## 第四步：安装基础软件 (30分钟)

### 4.1 更新系统

**复制下面的命令，粘贴到终端，按回车**：

```bash
apt update && apt upgrade -y
```

等待5-10分钟，系统会自动更新。

### 4.2 安装Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
```

**验证安装**：
```bash
node --version
npm --version
```

应该显示版本号，如：`v18.17.0`

### 4.3 安装MongoDB

```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update
apt install -y mongodb-org
```

**启动MongoDB**：
```bash
systemctl start mongod
systemctl enable mongod
```

### 4.4 安装Nginx

```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 4.5 安装PM2

```bash
npm install -g pm2
```

### 4.6 验证安装

输入这个命令检查所有软件是否安装成功：
```bash
node --version && npm --version && nginx -v && pm2 --version
```

---

## 第五步：创建Firebase项目 (20分钟)

### 5.1 注册Google账户

如果没有Gmail邮箱，先注册一个：`https://accounts.google.com`

### 5.2 创建Firebase项目

1. **打开Firefox浏览器**，访问：`https://console.firebase.google.com`
2. **点击"添加项目"**
3. **输入项目名称**：`homeservicechat`
4. **点击"继续"**
5. **关闭"Google Analytics"**（不需要）
6. **点击"创建项目"**

### 5.3 创建Android应用

1. **在项目首页，点击Android图标**
2. **输入包名**：`com.homeservicechat`
3. **输入应用昵称**：`HomeServiceChat`
4. **点击"注册应用"**
5. **下载google-services.json文件**（保存到桌面）

### 5.4 启用消息传递

1. **点击左侧菜单"Messaging"**
2. **点击"开始使用"**
3. **保持默认设置，点击"完成"**

### 5.5 生成服务账户密钥

1. **点击左上角齿轮图标 → "项目设置"**
2. **点击"服务账户"标签页**
3. **点击"生成新的私钥"**
4. **点击"生成密钥"**
5. **下载JSON文件**，重命名为`serviceAccountKey.json`（保存到桌面）

---

## 第六步：上传项目代码 (20分钟)

### 6.1 下载项目代码

**方法1：直接下载ZIP**
1. **在GitHub上下载项目ZIP文件**
2. **解压到桌面**

**方法2：使用Git（推荐）**
在服务器上运行：
```bash
cd /var/www
git clone https://github.com/your-username/HomeServiceChat.git
```

### 6.2 上传项目到服务器

**使用WinSCP (Windows)**：

1. **下载WinSCP**：`https://winscp.net/eng/download.php`
2. **安装并打开WinSCP**
3. **新建连接**：
   - 主机名：你的服务器IP
   - 用户名：root
   - 密码：你的服务器密码
4. **连接成功后**：
   - 左侧是你的电脑
   - 右侧是服务器
5. **在右侧进入 `/var/www` 目录**
6. **将桌面的项目文件夹拖拽到右侧**

**使用scp命令 (Mac)**：
```bash
scp -r /path/to/HomeServiceChat root@你的服务器IP:/var/www/
```

### 6.3 上传Firebase配置文件

1. **将`serviceAccountKey.json`上传到项目根目录**
2. **将`google-services.json`上传到`android/app/`目录**

---

## 第七步：配置项目 (30分钟)

### 7.1 进入项目目录

```bash
cd /var/www/HomeServiceChat
```

### 7.2 创建环境变量文件

```bash
nano .env
```

**在编辑器中输入**（把yourdomain.com改成你的域名）：
```env
MONGODB_URI=mongodb://localhost:27017/homeservicechat
JWT_SECRET=your-super-secure-jwt-secret-key-at-least-32-characters-change-this
NODE_ENV=production
PORT=5000
CORS_ORIGINS=https://api.yourdomain.com,https://admin.yourdomain.com
```

**保存文件**：
- 按 `Ctrl + X`
- 按 `Y`
- 按 `Enter`

### 7.3 修改API地址

**编辑移动端配置**：
```bash
nano src/config/api.ts
```

找到这一行：
```typescript
return 'https://your-production-api.com';
```

改为：
```typescript
return 'https://api.你的域名.com';
```

保存文件（Ctrl+X, Y, Enter）

**编辑管理后台配置**：
```bash
nano admin/src/api/api.ts
```

找到：
```typescript
export const SERVER_BASE_URL = 'http://localhost:5000';
```

改为：
```typescript
export const SERVER_BASE_URL = 'https://api.你的域名.com';
```

保存文件。

### 7.4 更新服务器CORS配置

```bash
nano server.js
```

找到大约第50行的CORS配置，改为：
```javascript
app.use(cors({
  origin: ['https://admin.你的域名.com', 'https://api.你的域名.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
```

保存文件。

### 7.5 安装依赖

```bash
npm install
```

等待5-10分钟安装完成。

**构建管理后台**：
```bash
cd admin
npm install
npm run build
cd ..
```

---

## 第八步：配置数据库 (10分钟)

### 8.1 创建数据库

```bash
mongo
```

进入MongoDB命令行后，输入：
```javascript
use homeservicechat
db.createUser({
  user: "homeservice_user",
  pwd: "your-secure-password-123",
  roles: ["readWrite"]
})
exit
```

### 8.2 初始化管理员账户

```bash
node src/models/seedAdmin.js
```

---

## 第九步：配置Nginx (20分钟)

### 9.1 创建Nginx配置文件

```bash
nano /etc/nginx/sites-available/homeservicechat
```

**输入配置内容**（把yourdomain.com改成你的域名）：
```nginx
server {
    listen 80;
    server_name api.yourdomain.com admin.yourdomain.com;
    
    client_max_body_size 500M;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name admin.yourdomain.com;
    
    root /var/www/HomeServiceChat/admin/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

保存文件。

### 9.2 启用配置

```bash
ln -s /etc/nginx/sites-available/homeservicechat /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

---

## 第十步：安装SSL证书 (15分钟)

### 10.1 安装Certbot

```bash
apt install certbot python3-certbot-nginx -y
```

### 10.2 获取免费SSL证书

```bash
certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com
```

**按照提示操作**：
1. 输入邮箱地址
2. 输入 `Y` 同意条款
3. 输入 `N` 拒绝邮件通知
4. 选择 `2` 强制重定向到HTTPS

### 10.3 设置自动续期

```bash
crontab -e
```

选择编辑器（输入`1`），然后添加这一行：
```
0 12 * * * /usr/bin/certbot renew --quiet
```

保存文件。

---

## 第十一步：启动服务 (10分钟)

### 11.1 创建PM2配置

```bash
nano ecosystem.config.js
```

输入：
```javascript
module.exports = {
  apps: [{
    name: 'homeservicechat-api',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/pm2/homeservicechat-error.log',
    out_file: '/var/log/pm2/homeservicechat-out.log',
    log_file: '/var/log/pm2/homeservicechat-combined.log',
    time: true
  }]
};
```

### 11.2 创建日志目录

```bash
mkdir -p /var/log/pm2
```

### 11.3 启动应用

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**按照提示执行返回的命令**，类似：
```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root
```

---

## 第十二步：测试部署 (10分钟)

### 12.1 检查服务状态

```bash
pm2 status
nginx -t
systemctl status nginx
systemctl status mongod
```

所有服务都应该显示"running"或"active"。

### 12.2 测试网站访问

**在浏览器中测试**：

1. **API健康检查**：
   访问：`https://api.你的域名.com/api/health`
   应该显示JSON响应：`{"status": "ok"}`

2. **管理后台**：
   访问：`https://admin.你的域名.com`
   应该显示登录页面

3. **Socket连接测试**：
   按F12打开开发者工具，访问管理后台，应该没有连接错误

### 12.3 登录管理后台测试

1. **访问管理后台**
2. **使用默认账户登录**：
   - 用户名：`admin`
   - 密码：`admin123`
3. **成功登录后查看用户管理等功能**

---

## 第十三步：移动端配置 (30分钟)

### 13.1 安装Android开发环境

**Windows用户**：
1. **下载Android Studio**：`https://developer.android.com/studio`
2. **安装Android Studio**
3. **启动后下载SDK**

### 13.2 生成签名密钥

在项目目录下：
```bash
cd android/app
keytool -genkeypair -v -keystore release-key.keystore -alias release-alias -keyalg RSA -keysize 2048 -validity 10000
```

**按提示输入信息**：
- 密码：设置一个密码（记住！）
- 姓名：你的姓名
- 其他信息可以随意填写

### 13.3 配置签名

编辑`android/app/build.gradle`：
```bash
nano android/app/build.gradle
```

在`android {`块中添加：
```gradle
signingConfigs {
    release {
        storeFile file('release-key.keystore')
        storePassword 'your-keystore-password'
        keyAlias 'release-alias'
        keyPassword 'your-key-password'
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
    }
}
```

### 13.4 构建APK

```bash
cd android
./gradlew assembleRelease
```

构建完成后，APK文件在：
`android/app/build/outputs/apk/release/app-release.apk`

---

## 第十四步：最终测试 (20分钟)

### 14.1 完整功能测试

1. **管理后台测试**：
   - 登录管理后台
   - 创建客服账户
   - 查看用户列表
   - 上传测试图片

2. **移动端测试**：
   - 安装APK到手机
   - 使用邀请码`6969`注册
   - 测试聊天功能
   - 测试图片上传

3. **推送通知测试**：
   - 发送消息查看是否收到推送

### 14.2 性能监控

查看服务器性能：
```bash
pm2 monit
htop
df -h
```

---

## 🎉 部署完成！

**恭喜！** 你已经成功部署了HomeServiceChat系统。

### 📝 重要信息记录

请将以下信息保存好：

```
服务器IP：_______________
域名：api._____________.com
域名：admin._____________.com
服务器root密码：_______________
数据库密码：_______________
Firebase项目ID：_______________
APK签名密码：_______________
管理后台账户：admin / admin123
```

### 🔧 日常维护

**查看日志**：
```bash
pm2 logs
tail -f /var/log/nginx/error.log
```

**重启服务**：
```bash
pm2 restart all
systemctl restart nginx
```

**备份数据库**：
```bash
mongodump --db homeservicechat --out /backup/$(date +%Y%m%d)
```

### 📞 常见问题

1. **网站打不开**：
   - 检查域名解析是否生效（24小时内）
   - 检查服务器防火墙
   - 查看nginx错误日志

2. **推送通知不工作**：
   - 检查Firebase配置文件
   - 确认应用包名正确

3. **上传文件失败**：
   - 检查uploads目录权限
   - 查看nginx文件大小限制

**需要帮助？** 通过以下方式获取支持：
- 查看服务器日志排查问题
- 搜索错误信息找解决方案
- 联系技术支持

---

**🎯 下一步**：开始使用你的聊天系统，邀请用户注册体验！ 