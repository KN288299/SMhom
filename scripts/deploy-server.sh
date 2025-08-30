#!/bin/bash

# 🚀 家政服务APP服务器部署脚本
# 使用方法: ./deploy-server.sh

set -e  # 遇到错误立即退出

echo "🚀 开始部署家政服务APP到服务器..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 服务器配置
SERVER_HOST="38.207.178.173"
SERVER_PORT="55122"
APP_DIR="/opt/homeservice"

echo -e "${BLUE}📋 部署配置:${NC}"
echo -e "  服务器: ${SERVER_HOST}:${SERVER_PORT}"
echo -e "  应用目录: ${APP_DIR}"
echo ""

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

# 检查本地环境
print_step "1" "检查本地环境"
if ! command -v scp &> /dev/null; then
    print_error "SCP命令未找到，请安装OpenSSH客户端"
    exit 1
fi

if ! command -v ssh &> /dev/null; then
    print_error "SSH命令未找到，请安装OpenSSH客户端"
    exit 1
fi
print_success "本地环境检查完成"

# 打包项目
print_step "2" "打包项目文件"
echo "正在排除不必要的文件并打包..."

# 创建临时目录
TEMP_DIR=$(mktemp -d)
echo "临时目录: $TEMP_DIR"

# 复制项目文件（排除不必要的文件）
rsync -av \
  --exclude='node_modules' \
  --exclude='android/app/build' \
  --exclude='android/.gradle' \
  --exclude='ios/build' \
  --exclude='ios/Pods' \
  --exclude='admin/node_modules' \
  --exclude='admin/dist' \
  --exclude='.git' \
  --exclude='uploads/*' \
  --exclude='*.log' \
  --exclude='.env' \
  ./ "$TEMP_DIR/"

# 打包
cd "$TEMP_DIR"
tar -czf homeservice-deploy.tar.gz .
print_success "项目打包完成"

# 上传到服务器
print_step "3" "上传文件到服务器"
echo "正在上传到 ${SERVER_HOST}:${SERVER_PORT}..."

# 创建服务器目录
ssh -p $SERVER_PORT root@$SERVER_HOST "mkdir -p $APP_DIR/backup && mkdir -p $APP_DIR/logs"

# 备份现有版本（如果存在）
ssh -p $SERVER_PORT root@$SERVER_HOST "
if [ -f $APP_DIR/server.js ]; then
    echo '备份现有版本...'
    tar -czf $APP_DIR/backup/backup-\$(date +%Y%m%d_%H%M%S).tar.gz -C $APP_DIR --exclude='backup' --exclude='uploads' --exclude='node_modules' --exclude='admin/node_modules' .
    echo '备份完成'
fi
"

# 上传新版本
scp -P $SERVER_PORT homeservice-deploy.tar.gz root@$SERVER_HOST:$APP_DIR/
print_success "文件上传完成"

# 清理临时文件
rm -rf "$TEMP_DIR"

# 在服务器上部署
print_step "4" "在服务器上部署应用"
ssh -p $SERVER_PORT root@$SERVER_HOST "
cd $APP_DIR

# 解压新版本
echo '解压应用文件...'
tar -xzf homeservice-deploy.tar.gz
rm homeservice-deploy.tar.gz

# 检查并创建环境变量文件
if [ ! -f .env ]; then
    echo '创建环境变量文件...'
    cp config-template.txt .env
    echo 'MONGODB_URI=mongodb://localhost:27017/homeservicechat
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
JWT_SECRET=your_super_secure_jwt_secret_key_here
UPLOAD_PATH=./uploads
CORS_ORIGINS=http://$SERVER_HOST:3000,http://$SERVER_HOST:8080,http://$SERVER_HOST
NODE_ENV=production' > .env
    echo '请编辑 .env 文件配置正确的参数'
fi

# 创建上传目录
mkdir -p uploads
chmod 755 uploads

echo '部署完成，现在需要安装依赖和启动服务'
"

print_success "应用部署完成"

# 提供后续步骤指导
echo ""
echo -e "${YELLOW}🔧 后续步骤 (需要在服务器上执行):${NC}"
echo ""
echo "1. 连接到服务器:"
echo "   ssh root@${SERVER_HOST} -p ${SERVER_PORT}"
echo ""
echo "2. 进入应用目录:"
echo "   cd $APP_DIR"
echo ""
echo "3. 安装依赖:"
echo "   npm install --production"
echo "   cd admin && npm install && npm run build && cd .."
echo ""
echo "4. 配置环境变量:"
echo "   nano .env"
echo ""
echo "5. 启动服务:"
echo "   pm2 start server.js --name homeservice-api"
echo "   pm2 save"
echo ""
echo "6. 配置Nginx (如果需要):"
echo "   nano /etc/nginx/sites-available/homeservice"
echo ""
echo -e "${GREEN}🎉 部署脚本执行完成！${NC}"
echo -e "📚 详细部署指南请查看: ${BLUE}COMPLETE_DEPLOYMENT_GUIDE.md${NC}"
