#!/bin/bash

# 🛠️ 服务器环境安装脚本
# 在服务器上运行此脚本来安装所有必要的软件
# 使用方法: curl -sSL https://raw.githubusercontent.com/yourusername/homeservice/main/scripts/setup-server-env.sh | bash

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛠️  开始安装服务器环境...${NC}"

# 函数：打印步骤
print_step() {
    echo -e "${BLUE}📦 步骤 $1: $2${NC}"
}

# 函数：打印成功
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 函数：打印警告
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 函数：打印错误
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    print_error "请以root用户身份运行此脚本"
    exit 1
fi

# 更新系统
print_step "1" "更新系统软件包"
apt update && apt upgrade -y
print_success "系统更新完成"

# 安装基础工具
print_step "2" "安装基础工具"
apt install -y curl wget git htop tree unzip software-properties-common
print_success "基础工具安装完成"

# 安装Node.js 18.x
print_step "3" "安装Node.js"
if ! command -v node &> /dev/null; then
    echo "正在安装Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt-get install -y nodejs
    
    # 验证安装
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    echo "Node.js版本: $NODE_VERSION"
    echo "NPM版本: $NPM_VERSION"
    print_success "Node.js安装完成"
else
    NODE_VERSION=$(node --version)
    print_warning "Node.js已安装 (版本: $NODE_VERSION)"
fi

# 安装PM2
print_step "4" "安装PM2进程管理器"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    print_success "PM2安装完成"
else
    print_warning "PM2已安装"
fi

# 安装Nginx
print_step "5" "安装Nginx"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl enable nginx
    print_success "Nginx安装完成"
else
    print_warning "Nginx已安装"
fi

# 安装MongoDB
print_step "6" "安装MongoDB"
if ! command -v mongod &> /dev/null; then
    echo "正在安装MongoDB..."
    
    # 导入公钥
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
    
    # 添加MongoDB仓库
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    
    # 更新包列表并安装
    apt-get update
    apt-get install -y mongodb-org
    
    # 启动并启用MongoDB
    systemctl start mongod
    systemctl enable mongod
    
    # 等待MongoDB启动
    sleep 5
    
    # 验证安装
    if systemctl is-active --quiet mongod; then
        print_success "MongoDB安装并启动成功"
    else
        print_error "MongoDB启动失败"
        exit 1
    fi
else
    print_warning "MongoDB已安装"
fi

# 创建应用目录
print_step "7" "创建应用目录"
APP_DIR="/opt/homeservice"
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/uploads
mkdir -p $APP_DIR/backups
chmod 755 $APP_DIR/uploads
print_success "应用目录创建完成: $APP_DIR"

# 配置防火墙 (可选)
print_step "8" "配置防火墙"
if command -v ufw &> /dev/null; then
    # 允许SSH
    ufw allow 22
    ufw allow 55122  # 自定义SSH端口
    
    # 允许HTTP和HTTPS
    ufw allow 80
    ufw allow 443
    
    # 允许应用端口
    ufw allow 3000
    
    print_warning "防火墙规则已添加，但未启用。如需启用请运行: ufw enable"
else
    print_warning "UFW防火墙未安装，跳过防火墙配置"
fi

# 创建系统用户 (可选，用于安全)
print_step "9" "创建应用用户"
if ! id "homeservice" &>/dev/null; then
    useradd -r -s /bin/false -d $APP_DIR homeservice
    chown -R homeservice:homeservice $APP_DIR
    print_success "用户homeservice创建完成"
else
    print_warning "用户homeservice已存在"
fi

# 创建备份脚本
print_step "10" "创建备份脚本"
cat > $APP_DIR/backup.sh << 'EOF'
#!/bin/bash

# 家政服务APP自动备份脚本
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/homeservice/backups"
APP_DIR="/opt/homeservice"

echo "开始备份 - $DATE"

# 备份数据库
echo "备份MongoDB数据库..."
mongodump --db homeservicechat --out $BACKUP_DIR/mongodb_$DATE

# 备份上传文件
echo "备份上传文件..."
cd $APP_DIR
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz uploads/

# 备份配置文件
echo "备份配置文件..."
tar -czf $BACKUP_DIR/config_$DATE.tar.gz .env server.js package.json

# 清理旧备份 (保留最近7天)
echo "清理旧备份..."
find $BACKUP_DIR -name "mongodb_*" -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
find $BACKUP_DIR -name "uploads_*" -mtime +7 -exec rm -f {} \; 2>/dev/null || true
find $BACKUP_DIR -name "config_*" -mtime +7 -exec rm -f {} \; 2>/dev/null || true

echo "备份完成 - $DATE"
EOF

chmod +x $APP_DIR/backup.sh
print_success "备份脚本创建完成"

# 创建Nginx配置模板
print_step "11" "创建Nginx配置模板"
cat > /etc/nginx/sites-available/homeservice << 'EOF'
server {
    listen 80;
    server_name 38.207.178.173;

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
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept";
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
EOF

print_success "Nginx配置模板创建完成"

# 显示环境信息
print_step "12" "环境信息汇总"
echo ""
echo -e "${GREEN}🎉 服务器环境安装完成！${NC}"
echo ""
echo -e "${BLUE}📋 已安装软件版本:${NC}"
echo "  - Node.js: $(node --version)"
echo "  - NPM: $(npm --version)"
echo "  - PM2: $(pm2 --version)"
echo "  - Nginx: $(nginx -v 2>&1)"
echo "  - MongoDB: $(mongod --version | head -1)"
echo ""
echo -e "${BLUE}📁 重要目录:${NC}"
echo "  - 应用目录: /opt/homeservice"
echo "  - 上传目录: /opt/homeservice/uploads"
echo "  - 备份目录: /opt/homeservice/backups"
echo "  - 日志目录: /opt/homeservice/logs"
echo ""
echo -e "${BLUE}🔧 服务状态:${NC}"
echo "  - Nginx: $(systemctl is-active nginx)"
echo "  - MongoDB: $(systemctl is-active mongod)"
echo ""
echo -e "${YELLOW}📝 下一步操作:${NC}"
echo "1. 上传应用代码到 /opt/homeservice"
echo "2. 配置环境变量文件 .env"
echo "3. 安装应用依赖: npm install"
echo "4. 启动应用服务: pm2 start server.js"
echo "5. 启用Nginx站点配置"
echo ""
echo -e "${GREEN}🔗 有用的命令:${NC}"
echo "  - 查看PM2服务: pm2 status"
echo "  - 查看应用日志: pm2 logs"
echo "  - 重启Nginx: systemctl restart nginx"
echo "  - 查看MongoDB状态: systemctl status mongod"
echo "  - 运行备份: /opt/homeservice/backup.sh"
