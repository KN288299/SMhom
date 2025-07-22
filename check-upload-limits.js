#!/usr/bin/env node

/**
 * 检查服务器上传限制配置
 * 用于诊断413错误问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 检查服务器上传限制配置...\n');

// 检查Express配置
console.log('📋 Express配置检查:');
try {
  const serverJs = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  
  // 检查express.json配置
  if (serverJs.includes('express.json({ limit:')) {
    console.log('✅ Express JSON解析器已配置大小限制');
  } else {
    console.log('❌ Express JSON解析器未配置大小限制');
  }
  
  // 检查express.urlencoded配置
  if (serverJs.includes('express.urlencoded({ extended: false, limit:')) {
    console.log('✅ Express URL编码解析器已配置大小限制');
  } else {
    console.log('❌ Express URL编码解析器未配置大小限制');
  }
} catch (error) {
  console.log('❌ 无法读取server.js文件');
}

// 检查Multer配置
console.log('\n📋 Multer配置检查:');
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
  if (staffRoutes.includes('maxCount: 10')) {
    console.log('✅ 多文件上传配置: 最多10张照片');
  } else {
    console.log('❌ 多文件上传配置可能有问题');
  }
} catch (error) {
  console.log('❌ 无法读取staffRoutes.js文件');
}

// 检查Nginx配置建议
console.log('\n📋 Nginx配置建议:');
console.log('请确保Nginx配置中包含以下设置:');
console.log('client_max_body_size 50M;');

// 检查环境变量
console.log('\n📋 环境变量检查:');
console.log('NODE_ENV:', process.env.NODE_ENV || '未设置');
console.log('PORT:', process.env.PORT || '未设置');

// 检查上传目录
console.log('\n📋 上传目录检查:');
const uploadDirs = [
  'uploads/employees',
  'uploads/chat-images',
  'uploads/chat-videos',
  'uploads/audio'
];

uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${dir} 目录存在`);
  } else {
    console.log(`❌ ${dir} 目录不存在`);
  }
});

console.log('\n🎯 建议操作:');
console.log('1. 重启Node.js服务器以应用新的Express配置');
console.log('2. 检查Nginx配置中的client_max_body_size设置');
console.log('3. 如果问题持续，考虑分批上传图片');
console.log('4. 监控服务器内存使用情况'); 