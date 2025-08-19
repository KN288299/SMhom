const fs = require('fs');
const path = require('path');

function scanForPhotos() {
  console.log('正在扫描所有可能的照片文件...\n');
  
  const searchDirs = [
    path.join(__dirname, 'public'),
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'images'),
    path.join(__dirname, 'temp')
  ];
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const foundImages = [];
  
  function scanDirectory(dir, relativePath = '') {
    try {
      if (!fs.existsSync(dir)) {
        return;
      }
      
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        const itemRelativePath = path.join(relativePath, item);
        
        if (stats.isDirectory()) {
          // 递归扫描子目录
          scanDirectory(fullPath, itemRelativePath);
        } else if (stats.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (imageExtensions.includes(ext)) {
            foundImages.push({
              name: item,
              fullPath: fullPath,
              relativePath: itemRelativePath,
              size: stats.size,
              mtime: stats.mtime,
              directory: path.dirname(fullPath)
            });
          }
        }
      }
    } catch (error) {
      console.log(`无法扫描目录 ${dir}: ${error.message}`);
    }
  }
  
  // 扫描所有目录
  for (const searchDir of searchDirs) {
    console.log(`扫描目录: ${searchDir}`);
    scanDirectory(searchDir);
  }
  
  console.log(`\n找到 ${foundImages.length} 个图片文件:\n`);
  
  // 按目录分组显示
  const byDirectory = {};
  foundImages.forEach(img => {
    const dir = img.directory;
    if (!byDirectory[dir]) {
      byDirectory[dir] = [];
    }
    byDirectory[dir].push(img);
  });
  
  for (const [dir, images] of Object.entries(byDirectory)) {
    console.log(`📁 ${dir} (${images.length} 个文件):`);
    images.forEach(img => {
      const sizeKB = Math.round(img.size / 1024);
      console.log(`   ${img.name} (${sizeKB}KB, ${img.mtime.toISOString().split('T')[0]})`);
    });
    console.log('');
  }
  
  // 查找可能的员工ID模式
  console.log('=== 分析文件名模式 ===');
  const objectIdPattern = /^[0-9a-fA-F]{24}/;
  const numberPattern = /^\d+/;
  
  let objectIdFiles = 0;
  let numberFiles = 0;
  let otherFiles = 0;
  
  foundImages.forEach(img => {
    const baseName = path.basename(img.name, path.extname(img.name));
    if (objectIdPattern.test(baseName)) {
      objectIdFiles++;
    } else if (numberPattern.test(baseName)) {
      numberFiles++;
    } else {
      otherFiles++;
    }
  });
  
  console.log(`ObjectId格式文件: ${objectIdFiles}`);
  console.log(`数字格式文件: ${numberFiles}`);
  console.log(`其他格式文件: ${otherFiles}`);
  
  // 检查是否有按ID分组的目录
  console.log('\n=== 检查目录结构模式 ===');
  const directoriesWithObjectIds = [];
  const directoriesWithNumbers = [];
  
  for (const [dir, images] of Object.entries(byDirectory)) {
    const dirName = path.basename(dir);
    if (objectIdPattern.test(dirName)) {
      directoriesWithObjectIds.push(dir);
    } else if (numberPattern.test(dirName)) {
      directoriesWithNumbers.push(dir);
    }
  }
  
  if (directoriesWithObjectIds.length > 0) {
    console.log(`找到 ${directoriesWithObjectIds.length} 个ObjectId命名的目录:`);
    directoriesWithObjectIds.slice(0, 10).forEach(dir => {
      console.log(`   ${dir}`);
    });
  }
  
  if (directoriesWithNumbers.length > 0) {
    console.log(`找到 ${directoriesWithNumbers.length} 个数字命名的目录:`);
    directoriesWithNumbers.slice(0, 10).forEach(dir => {
      console.log(`   ${dir}`);
    });
  }
  
  // 生成修复建议
  console.log('\n=== 修复建议 ===');
  if (foundImages.length === 0) {
    console.log('❌ 没有找到任何图片文件，可能需要重新导入数据');
  } else if (objectIdFiles > 0 || directoriesWithObjectIds.length > 0) {
    console.log('✅ 找到ObjectId格式的文件/目录，这是正确的格式');
    console.log('   可以运行 fix-photo-paths.js 来修复路径');
  } else {
    console.log('⚠️  图片文件存在但格式可能不匹配员工ID');
    console.log('   需要检查员工ID和文件名的对应关系');
  }
  
  return foundImages;
}

// 运行扫描
const images = scanForPhotos();
