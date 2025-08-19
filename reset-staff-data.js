#!/usr/bin/env node

/**
 * 重置员工数据脚本
 * 
 * 这个脚本会完全清理：
 * 1. 数据库中的所有员工数据
 * 2. 服务器上的员工图片文件
 * 3. 临时导入目录
 * 4. 批次导入记录
 * 
 * ⚠️ 警告：此操作不可逆，请确保你真的想要删除所有员工数据！
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const readline = require('readline');
require('dotenv').config();

// 连接数据库
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/homeservice');
    console.log(`✅ MongoDB 连接成功: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
};

// 导入模型
const Staff = require('./src/models/staffModel');

// 创建确认提示
const askConfirmation = (question) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
};

// 删除数据库中的员工数据
const clearStaffDatabase = async () => {
  try {
    console.log('\n🗄️ 清理数据库中的员工数据...');
    
    const staffCount = await Staff.countDocuments();
    console.log(`📊 找到 ${staffCount} 个员工记录`);
    
    if (staffCount === 0) {
      console.log('✅ 数据库中没有员工数据需要清理');
      return;
    }
    
    // 删除所有员工记录
    const result = await Staff.deleteMany({});
    console.log(`✅ 已删除 ${result.deletedCount} 个员工记录`);
    
    // 重置自增ID（如果使用的话）
    try {
      await mongoose.connection.db.collection('counters').deleteMany({ _id: /staff/ });
      console.log('✅ 已重置员工ID计数器');
    } catch (error) {
      // 如果没有计数器集合，忽略错误
      console.log('ℹ️ 没有找到计数器集合（正常情况）');
    }
    
  } catch (error) {
    console.error('❌ 清理数据库失败:', error);
    throw error;
  }
};

// 删除员工图片文件
const clearStaffImages = async () => {
  try {
    console.log('\n🖼️ 清理员工图片文件...');
    
    const imagesDir = path.join(__dirname, 'uploads', 'images');
    
    if (!fs.existsSync(imagesDir)) {
      console.log('✅ 图片目录不存在，无需清理');
      return;
    }
    
    const files = fs.readdirSync(imagesDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });
    
    console.log(`📊 找到 ${imageFiles.length} 个图片文件`);
    
    if (imageFiles.length === 0) {
      console.log('✅ 没有图片文件需要清理');
      return;
    }
    
    let deletedCount = 0;
    for (const file of imageFiles) {
      try {
        const filePath = path.join(imagesDir, file);
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`🗑️ 删除图片: ${file}`);
      } catch (error) {
        console.error(`❌ 删除图片失败 ${file}:`, error.message);
      }
    }
    
    console.log(`✅ 已删除 ${deletedCount} 个图片文件`);
    
  } catch (error) {
    console.error('❌ 清理图片文件失败:', error);
    throw error;
  }
};

// 清理临时目录
const clearTempDirectories = async () => {
  try {
    console.log('\n📁 清理临时目录...');
    
    const tempDirs = [
      path.join(__dirname, 'uploads', 'batch-temp'),
      path.join(__dirname, 'uploads', 'admin-temp'),
      path.join(__dirname, 'uploads', 'temp'),
      path.join(__dirname, 'uploads', 'extract')
    ];
    
    let cleanedCount = 0;
    
    for (const tempDir of tempDirs) {
      if (fs.existsSync(tempDir)) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
          console.log(`🗑️ 删除临时目录: ${path.basename(tempDir)}`);
          cleanedCount++;
        } catch (error) {
          console.error(`❌ 删除临时目录失败 ${tempDir}:`, error.message);
        }
      }
    }
    
    if (cleanedCount === 0) {
      console.log('✅ 没有临时目录需要清理');
    } else {
      console.log(`✅ 已清理 ${cleanedCount} 个临时目录`);
    }
    
  } catch (error) {
    console.error('❌ 清理临时目录失败:', error);
    throw error;
  }
};

// 清理其他相关数据
const clearRelatedData = async () => {
  try {
    console.log('\n🔧 清理其他相关数据...');
    
    // 清理可能的批次导入记录（如果有单独的集合）
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const batchCollection = collections.find(col => col.name.includes('batch') || col.name.includes('import'));
      
      if (batchCollection) {
        await mongoose.connection.db.collection(batchCollection.name).deleteMany({});
        console.log(`✅ 清理批次导入记录: ${batchCollection.name}`);
      }
    } catch (error) {
      console.log('ℹ️ 没有找到批次导入记录集合');
    }
    
    // 清理可能的缓存文件
    const cacheFiles = [
      path.join(__dirname, 'staff-cache.json'),
      path.join(__dirname, 'import-log.json'),
      path.join(__dirname, 'batch-log.json')
    ];
    
    let cacheCleanedCount = 0;
    for (const cacheFile of cacheFiles) {
      if (fs.existsSync(cacheFile)) {
        try {
          fs.unlinkSync(cacheFile);
          console.log(`🗑️ 删除缓存文件: ${path.basename(cacheFile)}`);
          cacheCleanedCount++;
        } catch (error) {
          console.error(`❌ 删除缓存文件失败 ${cacheFile}:`, error.message);
        }
      }
    }
    
    if (cacheCleanedCount === 0) {
      console.log('✅ 没有缓存文件需要清理');
    }
    
  } catch (error) {
    console.error('❌ 清理相关数据失败:', error);
  }
};

// 验证清理结果
const verifyCleanup = async () => {
  try {
    console.log('\n🔍 验证清理结果...');
    
    // 检查数据库
    const staffCount = await Staff.countDocuments();
    console.log(`📊 数据库员工记录数: ${staffCount}`);
    
    // 检查图片目录
    const imagesDir = path.join(__dirname, 'uploads', 'images');
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      });
      console.log(`📊 剩余图片文件数: ${imageFiles.length}`);
    } else {
      console.log('📊 图片目录: 不存在');
    }
    
    // 检查临时目录
    const tempDirs = [
      'uploads/batch-temp',
      'uploads/admin-temp', 
      'uploads/temp'
    ];
    
    const existingTempDirs = tempDirs.filter(dir => 
      fs.existsSync(path.join(__dirname, dir))
    );
    console.log(`📊 剩余临时目录数: ${existingTempDirs.length}`);
    
    if (staffCount === 0 && existingTempDirs.length === 0) {
      console.log('✅ 清理完成！所有员工数据已成功删除');
    } else {
      console.log('⚠️ 可能还有一些数据未完全清理');
    }
    
  } catch (error) {
    console.error('❌ 验证清理结果失败:', error);
  }
};

// 主重置函数
const resetStaffData = async () => {
  try {
    console.log('🚨 员工数据重置工具');
    console.log('================');
    console.log('⚠️ 此操作将删除：');
    console.log('   • 所有员工数据库记录');
    console.log('   • 所有员工图片文件');
    console.log('   • 所有临时导入目录');
    console.log('   • 相关缓存和日志文件');
    console.log('\n❗ 此操作不可逆！请确保你有数据备份！\n');
    
    // 第一次确认
    const confirm1 = await askConfirmation('确定要继续吗？(输入 "yes" 确认): ');
    if (confirm1 !== 'yes') {
      console.log('❌ 操作已取消');
      return;
    }
    
    // 第二次确认
    const confirm2 = await askConfirmation('再次确认：真的要删除所有员工数据吗？(输入 "DELETE" 确认): ');
    if (confirm2 !== 'delete') {
      console.log('❌ 操作已取消');
      return;
    }
    
    console.log('\n🔄 开始重置员工数据...\n');
    
    // 执行清理步骤
    await clearStaffDatabase();
    await clearStaffImages();
    await clearTempDirectories();
    await clearRelatedData();
    
    // 验证结果
    await verifyCleanup();
    
    console.log('\n🎉 员工数据重置完成！');
    console.log('💡 现在你可以重新导入员工数据了');
    
  } catch (error) {
    console.error('\n❌ 重置过程中出错:', error);
    throw error;
  }
};

// 只重置数据库（保留文件）
const resetDatabaseOnly = async () => {
  try {
    console.log('🗄️ 仅重置数据库中的员工数据');
    console.log('===============================');
    console.log('⚠️ 此操作将只删除数据库记录，保留图片文件');
    
    const confirm = await askConfirmation('确定要继续吗？(输入 "yes" 确认): ');
    if (confirm !== 'yes') {
      console.log('❌ 操作已取消');
      return;
    }
    
    await clearStaffDatabase();
    
    const staffCount = await Staff.countDocuments();
    if (staffCount === 0) {
      console.log('✅ 数据库重置完成！');
    } else {
      console.log('⚠️ 数据库可能未完全清理');
    }
    
  } catch (error) {
    console.error('❌ 数据库重置失败:', error);
    throw error;
  }
};

// 只清理文件（保留数据库）
const clearFilesOnly = async () => {
  try {
    console.log('📁 仅清理员工相关文件');
    console.log('===================');
    console.log('⚠️ 此操作将只删除图片文件和临时目录，保留数据库记录');
    
    const confirm = await askConfirmation('确定要继续吗？(输入 "yes" 确认): ');
    if (confirm !== 'yes') {
      console.log('❌ 操作已取消');
      return;
    }
    
    await clearStaffImages();
    await clearTempDirectories();
    
    console.log('✅ 文件清理完成！');
    
  } catch (error) {
    console.error('❌ 文件清理失败:', error);
    throw error;
  }
};

// 主执行函数
const main = async () => {
  try {
    const conn = await connectDB();
    
    // 检查命令行参数
    const args = process.argv.slice(2);
    
    if (args.includes('--database-only')) {
      await resetDatabaseOnly();
    } else if (args.includes('--files-only')) {
      await clearFilesOnly();
    } else if (args.includes('--help') || args.includes('-h')) {
      console.log('员工数据重置工具');
      console.log('================');
      console.log('用法:');
      console.log('  node reset-staff-data.js           # 完全重置（数据库+文件）');
      console.log('  node reset-staff-data.js --database-only  # 仅重置数据库');
      console.log('  node reset-staff-data.js --files-only     # 仅清理文件');
      console.log('  node reset-staff-data.js --help           # 显示帮助');
    } else {
      await resetStaffData();
    }
    
    await conn.disconnect();
    console.log('\n✅ 数据库连接已关闭');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  }
};

// 如果直接运行此文件
if (require.main === module) {
  main();
}

module.exports = {
  resetStaffData,
  clearStaffDatabase,
  clearStaffImages,
  clearTempDirectories
};
