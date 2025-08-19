#!/usr/bin/env node

/**
 * 员工数据和图片清理脚本
 * 功能：
 * 1. 备份现有数据
 * 2. 清理员工数据库记录
 * 3. 清理相关图片文件
 * 4. 提供安全的预览和回滚功能
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// 引入模型
const Staff = require('./src/models/staffModel');

// 异步文件操作
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (color, ...messages) => {
  console.log(`${colors[color]}${messages.join(' ')}${colors.reset}`);
};

// 配置选项
const CLEANUP_OPTIONS = {
  // 是否备份数据库
  BACKUP_DATABASE: true,
  // 是否备份图片文件
  BACKUP_FILES: true,
  // 备份目录
  BACKUP_DIR: './backups',
  // 图片目录列表
  IMAGE_DIRS: [
    './uploads/employees',
    './uploads/images'
  ],
  // 是否删除孤立的图片文件（数据库中不存在的图片）
  REMOVE_ORPHANED_FILES: true,
  // 是否删除无效的员工记录（图片文件不存在的记录）
  REMOVE_INVALID_RECORDS: false,
  // 是否进行实际删除（false为预览模式）
  DRY_RUN: false
};

// 连接数据库
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homeservicechat';
    await mongoose.connect(mongoURI);
    log('green', '✅ 数据库连接成功');
  } catch (error) {
    log('red', '❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
};

// 创建备份目录
const createBackupDir = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(CLEANUP_OPTIONS.BACKUP_DIR, `staff-cleanup-${timestamp}`);
  
  try {
    fs.mkdirSync(backupDir, { recursive: true });
    log('blue', `📁 创建备份目录: ${backupDir}`);
    return backupDir;
  } catch (error) {
    log('red', `❌ 创建备份目录失败: ${error.message}`);
    return null;
  }
};

// 备份数据库
const backupDatabase = async (backupDir) => {
  try {
    log('blue', '📋 开始备份员工数据...');
    
    const staffData = await Staff.find({});
    const backupFile = path.join(backupDir, 'staff-data-backup.json');
    
    fs.writeFileSync(backupFile, JSON.stringify(staffData, null, 2));
    
    log('green', `✅ 数据库备份完成: ${staffData.length} 条员工记录`);
    log('blue', `📄 备份文件: ${backupFile}`);
    
    return staffData;
  } catch (error) {
    log('red', `❌ 数据库备份失败: ${error.message}`);
    throw error;
  }
};

// 备份图片文件
const backupFiles = async (backupDir) => {
  try {
    log('blue', '🖼️ 开始备份图片文件...');
    
    const imageBackupDir = path.join(backupDir, 'images');
    fs.mkdirSync(imageBackupDir, { recursive: true });
    
    let totalFiles = 0;
    
    for (const imageDir of CLEANUP_OPTIONS.IMAGE_DIRS) {
      if (!fs.existsSync(imageDir)) {
        log('yellow', `⚠️ 目录不存在: ${imageDir}`);
        continue;
      }
      
      const files = await readdir(imageDir);
      const imageFiles = files.filter(file => 
        /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
      );
      
      if (imageFiles.length > 0) {
        const targetDir = path.join(imageBackupDir, path.basename(imageDir));
        fs.mkdirSync(targetDir, { recursive: true });
        
        for (const file of imageFiles) {
          const srcPath = path.join(imageDir, file);
          const destPath = path.join(targetDir, file);
          await copyFile(srcPath, destPath);
          totalFiles++;
        }
        
        log('blue', `📂 备份 ${imageDir}: ${imageFiles.length} 个文件`);
      }
    }
    
    log('green', `✅ 图片备份完成: 总共 ${totalFiles} 个文件`);
    
  } catch (error) {
    log('red', `❌ 图片备份失败: ${error.message}`);
    throw error;
  }
};

// 分析当前数据状况
const analyzeData = async () => {
  try {
    log('blue', '🔍 分析当前数据状况...');
    
    // 获取所有员工数据
    const staffData = await Staff.find({});
    
    // 收集数据库中引用的图片路径
    const referencedImages = new Set();
    staffData.forEach(staff => {
      if (staff.image && staff.image !== 'https://via.placeholder.com/150') {
        // 提取文件名
        const imageName = path.basename(staff.image);
        referencedImages.add(imageName);
      }
      
      if (staff.photos && Array.isArray(staff.photos)) {
        staff.photos.forEach(photo => {
          if (photo && photo !== 'https://via.placeholder.com/150') {
            const photoName = path.basename(photo);
            referencedImages.add(photoName);
          }
        });
      }
    });
    
    // 扫描实际存在的图片文件
    const existingFiles = new Set();
    const orphanedFiles = [];
    const invalidRecords = [];
    
    for (const imageDir of CLEANUP_OPTIONS.IMAGE_DIRS) {
      if (!fs.existsSync(imageDir)) continue;
      
      const files = await readdir(imageDir);
      const imageFiles = files.filter(file => 
        /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
      );
      
      imageFiles.forEach(file => {
        existingFiles.add(file);
        if (!referencedImages.has(file)) {
          orphanedFiles.push(path.join(imageDir, file));
        }
      });
    }
    
    // 检查无效记录（引用不存在的图片）
    staffData.forEach(staff => {
      let hasInvalidImage = false;
      
      if (staff.image && staff.image !== 'https://via.placeholder.com/150') {
        const imageName = path.basename(staff.image);
        if (!existingFiles.has(imageName) && !staff.image.startsWith('http')) {
          hasInvalidImage = true;
        }
      }
      
      if (staff.photos && Array.isArray(staff.photos)) {
        staff.photos.forEach(photo => {
          if (photo && photo !== 'https://via.placeholder.com/150') {
            const photoName = path.basename(photo);
            if (!existingFiles.has(photoName) && !photo.startsWith('http')) {
              hasInvalidImage = true;
            }
          }
        });
      }
      
      if (hasInvalidImage) {
        invalidRecords.push(staff);
      }
    });
    
    // 输出分析结果
    log('cyan', '\n📊 数据分析结果:');
    log('blue', `👥 员工记录总数: ${staffData.length}`);
    log('blue', `🖼️ 数据库中引用的图片: ${referencedImages.size} 个`);
    log('blue', `📁 实际存在的图片文件: ${existingFiles.size} 个`);
    log('yellow', `🗑️ 孤立的图片文件: ${orphanedFiles.length} 个`);
    log('red', `❌ 无效的员工记录: ${invalidRecords.length} 个`);
    
    if (orphanedFiles.length > 0) {
      log('yellow', '\n🗑️ 孤立的图片文件列表:');
      orphanedFiles.forEach(file => log('yellow', `   - ${file}`));
    }
    
    if (invalidRecords.length > 0) {
      log('red', '\n❌ 无效的员工记录:');
      invalidRecords.forEach(record => {
        log('red', `   - ${record.name} (ID: ${record._id})`);
      });
    }
    
    return {
      staffData,
      referencedImages: Array.from(referencedImages),
      existingFiles: Array.from(existingFiles),
      orphanedFiles,
      invalidRecords
    };
    
  } catch (error) {
    log('red', `❌ 数据分析失败: ${error.message}`);
    throw error;
  }
};

// 清理孤立文件
const cleanupOrphanedFiles = async (orphanedFiles, backupDir) => {
  if (orphanedFiles.length === 0) {
    log('green', '✅ 没有孤立文件需要清理');
    return;
  }
  
  log('blue', `🗑️ 准备清理 ${orphanedFiles.length} 个孤立文件...`);
  
  let deletedCount = 0;
  
  for (const filePath of orphanedFiles) {
    try {
      if (CLEANUP_OPTIONS.DRY_RUN) {
        log('yellow', `[预览] 将删除: ${filePath}`);
      } else {
        await unlink(filePath);
        log('green', `✅ 已删除: ${filePath}`);
        deletedCount++;
      }
    } catch (error) {
      log('red', `❌ 删除失败 ${filePath}: ${error.message}`);
    }
  }
  
  if (!CLEANUP_OPTIONS.DRY_RUN) {
    log('green', `✅ 成功删除 ${deletedCount} 个孤立文件`);
  }
};

// 清理无效记录
const cleanupInvalidRecords = async (invalidRecords) => {
  if (invalidRecords.length === 0) {
    log('green', '✅ 没有无效记录需要清理');
    return;
  }
  
  log('blue', `🗑️ 准备清理 ${invalidRecords.length} 个无效员工记录...`);
  
  let deletedCount = 0;
  
  for (const record of invalidRecords) {
    try {
      if (CLEANUP_OPTIONS.DRY_RUN) {
        log('yellow', `[预览] 将删除员工: ${record.name} (ID: ${record._id})`);
      } else {
        await Staff.findByIdAndDelete(record._id);
        log('green', `✅ 已删除员工: ${record.name}`);
        deletedCount++;
      }
    } catch (error) {
      log('red', `❌ 删除员工失败 ${record.name}: ${error.message}`);
    }
  }
  
  if (!CLEANUP_OPTIONS.DRY_RUN) {
    log('green', `✅ 成功删除 ${deletedCount} 个无效员工记录`);
  }
};

// 清理所有员工数据
const cleanupAllStaffData = async () => {
  try {
    log('blue', '🗑️ 准备清理所有员工数据...');
    
    const staffData = await Staff.find({});
    
    if (staffData.length === 0) {
      log('green', '✅ 没有员工数据需要清理');
      return;
    }
    
    if (CLEANUP_OPTIONS.DRY_RUN) {
      log('yellow', `[预览] 将删除 ${staffData.length} 个员工记录`);
      staffData.forEach(staff => {
        log('yellow', `[预览] 将删除员工: ${staff.name} (ID: ${staff._id})`);
      });
    } else {
      const result = await Staff.deleteMany({});
      log('green', `✅ 成功删除 ${result.deletedCount} 个员工记录`);
    }
    
  } catch (error) {
    log('red', `❌ 清理员工数据失败: ${error.message}`);
    throw error;
  }
};

// 清理所有员工相关图片
const cleanupAllStaffImages = async () => {
  try {
    log('blue', '🖼️ 准备清理所有员工相关图片...');
    
    let totalFiles = 0;
    let deletedFiles = 0;
    
    for (const imageDir of CLEANUP_OPTIONS.IMAGE_DIRS) {
      if (!fs.existsSync(imageDir)) {
        log('yellow', `⚠️ 目录不存在: ${imageDir}`);
        continue;
      }
      
      const files = await readdir(imageDir);
      const imageFiles = files.filter(file => 
        /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
      );
      
      totalFiles += imageFiles.length;
      
      for (const file of imageFiles) {
        const filePath = path.join(imageDir, file);
        
        try {
          if (CLEANUP_OPTIONS.DRY_RUN) {
            log('yellow', `[预览] 将删除: ${filePath}`);
          } else {
            await unlink(filePath);
            log('green', `✅ 已删除: ${filePath}`);
            deletedFiles++;
          }
        } catch (error) {
          log('red', `❌ 删除失败 ${filePath}: ${error.message}`);
        }
      }
    }
    
    if (CLEANUP_OPTIONS.DRY_RUN) {
      log('yellow', `[预览] 将删除 ${totalFiles} 个图片文件`);
    } else {
      log('green', `✅ 成功删除 ${deletedFiles} 个图片文件`);
    }
    
  } catch (error) {
    log('red', `❌ 清理图片失败: ${error.message}`);
    throw error;
  }
};

// 主清理函数
const cleanupStaffData = async (mode = 'analyze') => {
  try {
    log('magenta', '🧹 开始清理员工数据...\n');
    
    // 连接数据库
    await connectDB();
    
    // 创建备份目录
    let backupDir = null;
    if (CLEANUP_OPTIONS.BACKUP_DATABASE || CLEANUP_OPTIONS.BACKUP_FILES) {
      backupDir = createBackupDir();
      if (!backupDir) {
        log('red', '❌ 备份目录创建失败，终止操作');
        return;
      }
      log('blue', `📁 备份目录: ${backupDir}\n`);
    }
    
    // 备份数据库
    if (CLEANUP_OPTIONS.BACKUP_DATABASE) {
      await backupDatabase(backupDir);
    }
    
    // 备份文件
    if (CLEANUP_OPTIONS.BACKUP_FILES) {
      await backupFiles(backupDir);
    }
    
    // 分析数据
    const analysis = await analyzeData();
    
    // 根据模式执行不同操作
    switch (mode) {
      case 'analyze':
        log('blue', '\n📋 分析完成，使用以下命令执行清理:');
        log('cyan', '  node cleanup-staff-data.js orphaned  # 清理孤立文件');
        log('cyan', '  node cleanup-staff-data.js invalid   # 清理无效记录');
        log('cyan', '  node cleanup-staff-data.js all       # 清理所有员工数据');
        break;
        
      case 'orphaned':
        if (CLEANUP_OPTIONS.REMOVE_ORPHANED_FILES && analysis.orphanedFiles.length > 0) {
          log('blue', '\n🗑️ 开始清理孤立文件...');
          await cleanupOrphanedFiles(analysis.orphanedFiles, backupDir);
        }
        break;
        
      case 'invalid':
        if (CLEANUP_OPTIONS.REMOVE_INVALID_RECORDS && analysis.invalidRecords.length > 0) {
          log('blue', '\n🗑️ 开始清理无效记录...');
          await cleanupInvalidRecords(analysis.invalidRecords);
        }
        break;
        
      case 'all':
        log('blue', '\n🗑️ 开始清理所有员工数据...');
        await cleanupAllStaffData();
        await cleanupAllStaffImages();
        break;
        
      default:
        log('red', `❌ 未知的清理模式: ${mode}`);
        break;
    }
    
    // 输出清理模式提示
    if (CLEANUP_OPTIONS.DRY_RUN) {
      log('yellow', '\n⚠️ 当前为预览模式，没有实际删除任何数据');
      log('yellow', '   要执行实际清理，请修改脚本中的 DRY_RUN: false');
    }
    
    log('green', '\n✅ 员工数据清理完成!');
    
  } catch (error) {
    log('red', `❌ 清理过程出错: ${error.message}`);
  } finally {
    await mongoose.connection.close();
    log('blue', '🔌 数据库连接已关闭');
  }
};

// 显示帮助信息
const showHelp = () => {
  log('cyan', '\n📖 员工数据清理脚本使用说明:');
  log('blue', '');
  log('blue', '用法:');
  log('green', '  node cleanup-staff-data.js [模式]');
  log('blue', '');
  log('blue', '模式:');
  log('green', '  analyze   - 分析数据状况（默认）');
  log('green', '  orphaned  - 清理孤立的图片文件');
  log('green', '  invalid   - 清理无效的员工记录');
  log('green', '  all       - 清理所有员工数据和图片');
  log('green', '  help      - 显示此帮助信息');
  log('blue', '');
  log('blue', '配置:');
  log('yellow', '  修改脚本中的 CLEANUP_OPTIONS 来调整清理选项');
  log('yellow', '  设置 DRY_RUN: false 来执行实际清理操作');
  log('blue', '');
  log('blue', '安全特性:');
  log('green', '  ✅ 默认预览模式，不会实际删除数据');
  log('green', '  ✅ 自动备份数据库和图片文件');
  log('green', '  ✅ 详细的操作日志和进度提示');
  log('blue', '');
};

// 主程序入口
const main = async () => {
  const mode = process.argv[2] || 'analyze';
  
  if (mode === 'help' || mode === '-h' || mode === '--help') {
    showHelp();
    return;
  }
  
  await cleanupStaffData(mode);
};

// 运行主程序
if (require.main === module) {
  main().catch(error => {
    log('red', `❌ 程序执行失败: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  cleanupStaffData,
  analyzeData,
  CLEANUP_OPTIONS
};