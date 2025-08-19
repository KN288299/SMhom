const fs = require('fs');
const path = require('path');

console.log('🔍 检查文件是否存在...');

const filesToCheck = [
  'admin/src/pages/StaffManagement.tsx',
  'src/pages/StaffManagement.tsx',
  'StaffManagement.tsx',
  'admin/src/api/api.ts',
  'src/api/api.ts',
  'src/routes/staffRoutes.js'
];

filesToCheck.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${filePath} 存在`);
    const stats = fs.statSync(fullPath);
    console.log(`   大小: ${stats.size} 字节`);
  } else {
    console.log(`❌ ${filePath} 不存在`);
  }
});

console.log('\n📁 当前目录内容:');
try {
  const currentDir = fs.readdirSync(__dirname);
  currentDir.forEach(item => {
    const itemPath = path.join(__dirname, item);
    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
      console.log(`📁 ${item}/`);
    } else {
      console.log(`📄 ${item}`);
    }
  });
} catch (error) {
  console.error('读取目录失败:', error.message);
}
