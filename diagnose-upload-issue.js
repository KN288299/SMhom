#!/usr/bin/env node

/**
 * 详细诊断上传问题
 * 检查所有可能导致413错误的配置
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🔍 详细诊断上传问题...\n');

// 1. 检查Express配置
console.log('📋 1. Express配置检查:');
try {
  const serverJs = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  
  // 检查express.json配置
  const jsonLimitMatch = serverJs.match(/express\.json\(\s*\{\s*limit:\s*['"`]([^'"`]+)['"`]/);
  if (jsonLimitMatch) {
    console.log(`✅ Express JSON限制: ${jsonLimitMatch[1]}`);
  } else {
    console.log('❌ Express JSON未配置大小限制');
  }
  
  // 检查express.urlencoded配置
  const urlLimitMatch = serverJs.match(/express\.urlencoded\(\s*\{\s*extended:\s*false,\s*limit:\s*['"`]([^'"`]+)['"`]/);
  if (urlLimitMatch) {
    console.log(`✅ Express URL编码限制: ${urlLimitMatch[1]}`);
  } else {
    console.log('❌ Express URL编码未配置大小限制');
  }
} catch (error) {
  console.log('❌ 无法读取server.js文件:', error.message);
}

// 2. 检查Multer配置
console.log('\n📋 2. Multer配置检查:');
try {
  const staffRoutes = fs.readFileSync(path.join(__dirname, 'src/routes/staffRoutes.js'), 'utf8');
  
  // 检查文件大小限制
  const fileSizeMatch = staffRoutes.match(/fileSize:\s*(\d+)\s*\*\s*1024\s*\*\s*1024/);
  if (fileSizeMatch) {
    const sizeInMB = parseInt(fileSizeMatch[1]);
    console.log(`✅ 员工上传文件大小限制: ${sizeInMB}MB`);
  } else {
    console.log('❌ 未找到文件大小限制配置');
  }
  
  // 检查多文件上传配置
  const maxCountMatch = staffRoutes.match(/maxCount:\s*(\d+)/g);
  if (maxCountMatch) {
    console.log(`✅ 多文件上传配置: 找到 ${maxCountMatch.length} 个maxCount配置`);
    maxCountMatch.forEach((match, index) => {
      const count = match.match(/\d+/)[0];
      console.log(`   - 配置 ${index + 1}: ${count} 个文件`);
    });
  } else {
    console.log('❌ 多文件上传配置可能有问题');
  }
  
  // 检查文件过滤器
  if (staffRoutes.includes('fileFilter')) {
    console.log('✅ 文件类型过滤器已配置');
  } else {
    console.log('❌ 文件类型过滤器未配置');
  }
} catch (error) {
  console.log('❌ 无法读取staffRoutes.js文件:', error.message);
}

// 3. 检查上传目录权限
console.log('\n📋 3. 上传目录检查:');
const uploadDirs = [
  'uploads/employees',
  'uploads/chat-images', 
  'uploads/chat-videos',
  'uploads/audio'
];

uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  try {
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      console.log(`✅ ${dir} 目录存在 (权限: ${stats.mode.toString(8)})`);
      
      // 检查写入权限
      try {
        fs.accessSync(fullPath, fs.constants.W_OK);
        console.log(`   ✅ ${dir} 目录可写`);
      } catch (error) {
        console.log(`   ❌ ${dir} 目录不可写`);
      }
    } else {
      console.log(`❌ ${dir} 目录不存在`);
    }
  } catch (error) {
    console.log(`❌ 检查 ${dir} 目录时出错: ${error.message}`);
  }
});

// 4. 检查环境变量
console.log('\n📋 4. 环境变量检查:');
console.log('NODE_ENV:', process.env.NODE_ENV || '未设置');
console.log('PORT:', process.env.PORT || '未设置');
console.log('PWD:', process.env.PWD || '未设置');

// 5. 检查进程信息
console.log('\n📋 5. 进程信息:');
console.log('Node.js版本:', process.version);
console.log('平台:', process.platform);
console.log('架构:', process.arch);
console.log('内存使用:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');

// 6. 检查网络配置
console.log('\n📋 6. 网络配置检查:');
console.log('当前工作目录:', process.cwd());
console.log('服务器IP: 45.144.136.37');
console.log('API端口: 3000');

// 7. 提供修复建议
console.log('\n🎯 7. 修复建议:');

// 检查是否已经应用了我们的修复
const serverContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
if (serverContent.includes('express.json({ limit:') && serverContent.includes('express.urlencoded({ extended: false, limit:')) {
  console.log('✅ Express配置已修复');
} else {
  console.log('❌ Express配置需要修复');
}

const staffContent = fs.readFileSync(path.join(__dirname, 'src/routes/staffRoutes.js'), 'utf8');
if (staffContent.includes('fileSize: 20 * 1024 * 1024')) {
  console.log('✅ Multer配置已修复');
} else {
  console.log('❌ Multer配置需要修复');
}

console.log('\n📝 8. 下一步操作:');
console.log('1. 确保Nginx配置包含: client_max_body_size 50M;');
console.log('2. 重启Nginx: systemctl reload nginx');
console.log('3. 重启Node.js: pm2 restart all');
console.log('4. 测试上传功能');
console.log('5. 如果问题持续，检查服务器内存和磁盘空间');

console.log('\n🔧 9. 快速修复命令:');
console.log('# 修复Git权限:');
console.log('git config --global --add safe.directory /var/www/HomeServiceChat');
console.log('');
console.log('# 检查Nginx配置:');
console.log('cat /etc/nginx/sites-available/homeservicechat | grep client_max_body_size');
console.log('');
console.log('# 重启服务:');
console.log('pm2 restart all && systemctl reload nginx'); 