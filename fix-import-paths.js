/**
 * 此脚本修复React Native文件中的import路径问题
 * 用于解决React/Base/RCTDefines.h和React/RCTDefines.h的路径冲突
 */

const fs = require('fs');
const path = require('path');

// Node modules根目录
const nodeModulesPath = path.resolve(process.cwd(), 'node_modules');
const reactNativePath = path.join(nodeModulesPath, 'react-native');

console.log('开始修复React Native导入路径问题...');

function processFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`文件不存在: ${filePath}`);
    return;
  }

  console.log(`处理文件: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 替换错误的引用路径
  const originalContent = content;
  content = content.replace(
    /#import\s+<React\/Base\/RCTDefines\.h>/g,
    '#import <React/RCTDefines.h>'
  );
  
  if (content !== originalContent) {
    // 创建备份
    const backupPath = `${filePath}.import-original`;
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`已修复文件中的引用路径: ${filePath}`);
  }
}

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`目录不存在: ${dir}`);
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && 
              (entry.name.endsWith('.h') || 
               entry.name.endsWith('.m') || 
               entry.name.endsWith('.mm') ||
               entry.name.endsWith('.cpp'))) {
      processFile(fullPath);
    }
  });
}

// 确保RCTDefines.h在两个位置都存在
const baseDefinesPath = path.join(reactNativePath, 'React/Base/RCTDefines.h');
const reactDefinesPath = path.join(reactNativePath, 'React/RCTDefines.h');

if (fs.existsSync(baseDefinesPath) && !fs.existsSync(reactDefinesPath)) {
  console.log(`创建React/RCTDefines.h链接到Base目录...`);
  const reactDir = path.dirname(reactDefinesPath);
  
  if (!fs.existsSync(reactDir)) {
    fs.mkdirSync(reactDir, { recursive: true });
  }
  
  fs.copyFileSync(baseDefinesPath, reactDefinesPath);
}

if (!fs.existsSync(baseDefinesPath) && fs.existsSync(reactDefinesPath)) {
  console.log(`创建React/Base/RCTDefines.h链接到React目录...`);
  const baseDir = path.dirname(baseDefinesPath);
  
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  
  fs.copyFileSync(reactDefinesPath, baseDefinesPath);
}

// 扫描Fabric目录
console.log('扫描React/Fabric目录...');
scanDirectory(path.join(reactNativePath, 'React/Fabric'));

// 扫描其他关键目录
console.log('扫描其他相关目录...');
const otherDirs = [
  path.join(reactNativePath, 'ReactCommon'),
  path.join(reactNativePath, 'Libraries')
];

otherDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    scanDirectory(dir);
  }
});

console.log('修复完成！'); 