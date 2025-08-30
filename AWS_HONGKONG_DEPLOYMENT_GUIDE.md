# 🌏 AWS香港服务器部署指南（面向国内用户）

> **适合场景**: 国内用户使用，但想避免备案或获得更好的国际连通性  
> **服务器位置**: AWS亚太区域（香港）  
> **预计成本**: 约400-600元/月  

## ✅ 使用AWS香港的优势

### 🚀 **技术优势**
- **无需备案**：.com域名 + 香港服务器 = 免备案
- **网络稳定**：香港到大陆网络质量较好
- **延迟较低**：香港到国内延迟通常 < 50ms
- **国际服务**：Firebase、APNs等服务连接更稳定

### 📱 **对国内用户的影响**
- **✅ 可正常使用**：国内用户可以正常访问香港服务器
- **✅ 速度可接受**：延迟比国内服务器稍高但完全可用
- **✅ 推送正常**：Firebase推送服务在香港运行良好
- **✅ 合法合规**：个人应用使用海外服务器完全合法

---

## 📋 AWS香港部署配置

### 1. AWS账户准备

#### 1.1 注册AWS账户
1. **访问**: `https://aws.amazon.com/cn/`
2. **点击"创建AWS账户"**
3. **填写信息**:
   - 邮箱地址（建议用Gmail）
   - 账户名称
   - 密码
4. **验证手机号码**
5. **绑定信用卡**（Visa/MasterCard，用于计费）

#### 1.2 身份验证
- 上传身份证或护照
- 接听AWS验证电话
- 等待账户激活（通常1-24小时）

### 2. 创建EC2实例

#### 2.1 选择区域
1. **登录AWS控制台**
2. **右上角选择区域**: "亚太地区(香港) ap-east-1"

#### 2.2 启动EC2实例
1. **进入EC2控制台**
2. **点击"启动实例"**

**推荐配置**:
```
名称: HomeServiceChat-HK
AMI: Ubuntu Server 20.04 LTS
实例类型: t3.medium (2核4GB) 
密钥对: 创建新密钥对并下载 .pem 文件
网络设置: 创建安全组，允许以下端口:
  - SSH (22) - 仅限你的IP
  - HTTP (80) - 0.0.0.0/0
  - HTTPS (443) - 0.0.0.0/0
  - 自定义 (5000) - 0.0.0.0/0
存储: 20GB gp3
```

#### 2.3 获取服务器信息
启动后记录:
- **公有IP地址**: 如 `18.162.123.45`
- **密钥文件路径**: 如 `~/Downloads/homeservice-key.pem`

### 3. 域名配置（免备案方案）

#### 3.1 域名注册选择
**推荐域名商**:
- **Namecheap**: 支持支付宝，价格便宜
- **GoDaddy**: 知名度高，服务稳定
- **阿里云国际版**: 中文界面，但需要国际信用卡

#### 3.2 DNS解析配置
使用 **Cloudflare**（免费CDN + DNS）:

1. **注册Cloudflare账户**: `https://cloudflare.com`
2. **添加网站**，输入你的域名
3. **更改域名DNS服务器**到Cloudflare提供的地址
4. **添加A记录**:
```
类型: A
名称: api
IPv4地址: 你的AWS香港服务器IP
代理状态: 仅限DNS（灰色云朵）

类型: A
名称: admin  
IPv4地址: 你的AWS香港服务器IP
代理状态: 仅限DNS（灰色云朵）
```

### 4. 连接AWS服务器

#### 4.1 Windows用户
**使用PuTTY + PuTTYgen**:

1. **下载PuTTY**: `https://www.putty.org/`
2. **转换密钥格式**:
   - 打开PuTTYgen
   - 点击"Load"，选择下载的.pem文件
   - 点击"Save private key"，保存为.ppk文件
3. **连接服务器**:
   - 打开PuTTY
   - Host Name: ubuntu@你的服务器IP
   - Connection → SSH → Auth → 浏览选择.ppk文件
   - 点击Open连接

#### 4.2 Mac用户
```bash
# 设置密钥权限
chmod 400 ~/Downloads/homeservice-key.pem

# 连接服务器
ssh -i ~/Downloads/homeservice-key.pem ubuntu@你的服务器IP
```

### 5. 服务器基础配置

#### 5.1 更新系统和切换用户
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 切换到root用户（简化后续操作）
sudo su -
```

#### 5.2 安装必要软件
```bash
# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 安装MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update && apt install -y mongodb-org

# 安装其他工具
apt install -y nginx git htop unzip

# 安装PM2
npm install -g pm2

# 启动服务
systemctl start mongod nginx
systemctl enable mongod nginx
```

### 6. 针对国内用户的特殊优化

#### 6.1 使用国内NPM镜像源
```bash
# 设置淘宝镜像源
npm config set registry https://registry.npmmirror.com
```

#### 6.2 配置时区
```bash
# 设置为中国时区
timedatectl set-timezone Asia/Shanghai
```

#### 6.3 优化网络连接
```bash
# 优化TCP参数（提高国内连接速度）
echo 'net.core.rmem_max = 16777216' >> /etc/sysctl.conf
echo 'net.core.wmem_max = 16777216' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_rmem = 4096 65536 16777216' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_wmem = 4096 65536 16777216' >> /etc/sysctl.conf
sysctl -p
```

### 7. Cloudflare CDN配置（可选但推荐）

#### 7.1 启用CDN加速
1. **在Cloudflare中开启代理**（橙色云朵）
2. **配置缓存规则**:
   - 静态文件（图片、CSS、JS）缓存7天
   - API请求不缓存

#### 7.2 SSL配置
1. **在Cloudflare中选择"完全(严格)"SSL模式**
2. **开启"始终使用HTTPS"**
3. **启用HSTS**

### 8. Firebase配置优化

#### 8.1 网络优化
由于在香港服务器，Firebase连接更稳定：
```javascript
// 在firebase配置中可以不用特殊设置
// 香港服务器连接Firebase服务质量很好
```

#### 8.2 推送通知测试
国内用户接收推送通知:
- **Android**: 正常接收（基于Firebase FCM）
- **iOS**: 正常接收（基于APNs）

### 9. 性能监控和优化

#### 9.1 安装监控工具
```bash
# 安装htop监控
apt install htop

# 安装网络测试工具
apt install speedtest-cli

# 测试到国内的网络速度
speedtest-cli --server 5083  # 测试到上海的速度
```

#### 9.2 设置备份到国内
```bash
# 可以设置定期备份到阿里云OSS或腾讯云COS
# 这样既享受香港服务器的优势，又有国内备份
```

---

## 💰 成本对比分析

### AWS香港 vs 阿里云国内

| 项目 | AWS香港 | 阿里云国内 |
|------|---------|------------|
| 服务器成本 | $65/月 (~450元) | ¥150/月 |
| 域名备案 | ❌ 不需要 | ✅ 需要15-20天 |
| Firebase连接 | ✅ 稳定 | ⚠️ 可能不稳定 |
| 国内访问速度 | ⚠️ 稍慢50-100ms | ✅ 很快 |
| SSL证书 | ✅ Cloudflare免费 | ✅ Let's Encrypt |
| 国际化扩展 | ✅ 容易 | ❌ 困难 |

### 💡 **建议**
- **如果主要用户在国内**: AWS香港完全可行
- **如果用户量很大(>10万)**: 可考虑国内+国外双部署
- **如果需要快速上线**: AWS香港免备案是优势

---

## 🌐 网络连通性测试

### 测试国内各地到香港的延迟
```bash
# 在服务器上安装测试工具
apt install mtr

# 测试从香港到国内主要城市的网络
mtr --report --report-cycles 10 114.114.114.114
```

**预期延迟**:
- 深圳/广州: 10-20ms
- 上海/杭州: 30-40ms  
- 北京: 40-60ms
- 成都/重庆: 50-70ms

### 国内用户测试方法
让国内朋友测试连接:
```bash
# Windows用户在cmd中运行
ping api.yourdomain.com
tracert api.yourdomain.com

# 查看延迟是否可接受（一般<100ms都很好）
```

---

## 📱 移动端特殊配置

### Android网络优化
在 `src/config/api.ts` 中可以添加：
```typescript
// 针对网络不稳定的优化配置
export const API_CONFIG = {
  baseURL: API_URL,
  timeout: 15000, // 增加超时时间到15秒
  retry: 3, // 失败重试3次
  headers: {
    'Content-Type': 'application/json',
  },
};
```

### iOS网络配置
在 `ios/SMhom/Info.plist` 中确保:
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSAllowsLocalNetworking</key>
    <true/>
    <!-- 允许连接香港服务器 -->
    <key>NSExceptionDomains</key>
    <dict>
        <key>yourdomain.com</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <false/>
            <key>NSExceptionMinimumTLSVersion</key>
            <string>TLSv1.2</string>
        </dict>
    </dict>
</dict>
```

---

## 🔍 常见问题解答

### Q1: 国内用户访问会很慢吗？
**A**: 不会。香港到国内网络质量很好，延迟通常在50ms以内，用户感知差异很小。

### Q2: 需要什么特殊的网络配置吗？
**A**: 不需要。国内用户可以直接访问，无需VPN或特殊设置。

### Q3: 推送通知能正常工作吗？
**A**: 完全正常。Firebase在香港服务器上运行得很好，推送通知没有问题。

### Q4: 费用会比国内贵很多吗？
**A**: 是的，大约贵2-3倍，但考虑到免备案和更好的国际连接，很多开发者认为值得。

### Q5: 如果以后用户量大了怎么办？
**A**: 可以使用CDN加速，或者采用国内+海外双节点部署的方案。

---

## 🎯 **结论**

**使用AWS香港服务器为国内用户服务是完全可行的！**

**优势**:
- ✅ 免备案，快速上线
- ✅ 网络延迟可接受（50-100ms）
- ✅ Firebase等国际服务稳定
- ✅ 便于后期国际化

**适合场景**:
- 🎯 个人开发者快速试错
- 🎯 不想等待备案的项目
- 🎯 有国际化需求的应用
- 🎯 对网络延迟不是极度敏感的应用

**建议**:
如果你的聊天应用主要面向国内用户，但希望快速上线且避免备案流程，AWS香港是一个很好的选择。用户体验差异很小，但部署更简单快捷。

---

**🚀 下一步**: 按照这个指南部署到AWS香港，你的国内用户完全可以正常使用！ 