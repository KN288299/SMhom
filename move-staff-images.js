const fs = require('fs');
const path = require('path');

async function moveStaffImages() {
  try {
    const staffDir = path.join(__dirname, 'uploads/staff');
    const imagesDir = path.join(__dirname, 'uploads/images');

    console.log('📁 检查目录状态...');
    
    // 检查源目录是否存在
    if (!fs.existsSync(staffDir)) {
      console.log('⚠️ /uploads/staff/ 目录不存在，可能已经移动或删除');
      return;
    }

    // 确保目标目录存在
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
      console.log('✅ 创建 /uploads/images/ 目录');
    }

    // 获取staff目录下的所有文件
    const files = fs.readdirSync(staffDir);
    console.log(`📊 找到 ${files.length} 个文件需要移动`);

    if (files.length === 0) {
      console.log('✅ /uploads/staff/ 目录为空，无需移动文件');
      return;
    }

    let movedCount = 0;
    let errorCount = 0;

    // 移动每个文件
    for (const file of files) {
      const sourcePath = path.join(staffDir, file);
      const targetPath = path.join(imagesDir, file);

      try {
        // 检查是否是文件（不是目录）
        const stats = fs.statSync(sourcePath);
        if (stats.isFile()) {
          // 检查目标文件是否已存在
          if (fs.existsSync(targetPath)) {
            console.log(`⚠️ 文件已存在，跳过: ${file}`);
            continue;
          }

          // 移动文件
          fs.renameSync(sourcePath, targetPath);
          console.log(`✅ 移动成功: ${file}`);
          movedCount++;
        } else {
          console.log(`⏭️ 跳过目录: ${file}`);
        }
      } catch (error) {
        console.error(`❌ 移动失败 ${file}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 移动统计:');
    console.log(`   成功移动: ${movedCount} 个文件`);
    console.log(`   移动失败: ${errorCount} 个文件`);

    // 检查staff目录是否为空，如果为空则删除
    const remainingFiles = fs.readdirSync(staffDir);
    if (remainingFiles.length === 0) {
      fs.rmdirSync(staffDir);
      console.log('🗑️ 删除空的 /uploads/staff/ 目录');
    } else {
      console.log(`⚠️ /uploads/staff/ 目录仍有 ${remainingFiles.length} 个文件/目录`);
    }

    // 验证移动结果
    console.log('\n🔍 验证移动结果...');
    const imagesFiles = fs.readdirSync(imagesDir);
    console.log(`📊 /uploads/images/ 目录现有 ${imagesFiles.length} 个文件`);

    // 显示前10个文件作为示例
    const sampleFiles = imagesFiles.slice(0, 10);
    sampleFiles.forEach(file => {
      console.log(`   ✅ ${file}`);
    });

    if (imagesFiles.length > 10) {
      console.log(`   ... 还有 ${imagesFiles.length - 10} 个文件`);
    }

    console.log('\n✅ 图片文件移动完成！');

  } catch (error) {
    console.error('❌ 移动过程中发生错误:', error);
  }
}

// 运行移动
if (require.main === module) {
  moveStaffImages();
}

module.exports = { moveStaffImages };
