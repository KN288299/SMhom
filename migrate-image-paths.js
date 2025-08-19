#!/usr/bin/env node

/**
 * 迁移脚本：修复员工图片路径问题
 * 
 * 这个脚本会：
 * 1. 将临时目录中的图片移动到正式目录
 * 2. 更新数据库中的图片路径为相对路径格式
 * 3. 清理空的临时目录
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/homeservice');
    console.log(`✅ MongoDB 连接成功: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
};

// 员工模型
const Staff = require('./src/models/staffModel');

// 主迁移函数
const migrateImagePaths = async () => {
  try {
    console.log('🔧 开始迁移员工图片路径...');
    
    // 查找所有员工
    const allStaff = await Staff.find({});
    console.log(`📊 找到 ${allStaff.length} 个员工记录`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    // 确保正式目录存在
    const imagesDir = path.join(__dirname, 'uploads', 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
      console.log('✅ 创建正式图片目录:', imagesDir);
    }
    
    // 查找所有需要迁移的图片
    const imagesToMigrate = findImagesToMigrate();
    console.log(`📁 找到 ${imagesToMigrate.length} 个需要迁移的图片文件`);
    
    // 先迁移文件
    for (const imageInfo of imagesToMigrate) {
      try {
        await migrateImageFile(imageInfo);
      } catch (error) {
        console.error(`❌ 迁移图片失败 ${imageInfo.originalPath}:`, error.message);
      }
    }
    
    // 然后更新数据库记录
    for (const staff of allStaff) {
      try {
        let staffUpdated = false;
        
        // 修复主图片路径
        if (staff.image && needsPathUpdate(staff.image)) {
          const newPath = updateImagePath(staff.image);
          if (newPath !== staff.image) {
            staff.image = newPath;
            staffUpdated = true;
            console.log(`✅ 更新员工 ${staff.name} 的主图片路径: ${newPath}`);
          }
        }
        
        // 修复照片数组路径
        if (staff.photos && Array.isArray(staff.photos) && staff.photos.length > 0) {
          const updatedPhotos = staff.photos.map(photo => {
            if (photo && needsPathUpdate(photo)) {
              return updateImagePath(photo);
            }
            return photo;
          });
          
          if (JSON.stringify(updatedPhotos) !== JSON.stringify(staff.photos)) {
            staff.photos = updatedPhotos;
            staffUpdated = true;
            console.log(`✅ 更新员工 ${staff.name} 的照片路径`);
          }
        }
        
        // 保存更新
        if (staffUpdated) {
          await staff.save();
          fixedCount++;
          console.log(`💾 已保存员工 ${staff.name} 的更新`);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ 处理员工 ${staff.name} 时出错:`, error.message);
      }
    }
    
    console.log('\n📊 迁移完成统计:');
    console.log(`✅ 成功更新: ${fixedCount} 个员工`);
    console.log(`❌ 处理失败: ${errorCount} 个员工`);
    
    // 清理空的临时目录
    await cleanupTempDirs();
    
  } catch (error) {
    console.error('❌ 迁移过程中出错:', error);
  }
};

// 查找需要迁移的图片文件
const findImagesToMigrate = () => {
  const imagesToMigrate = [];
  
  // 扫描所有可能的临时目录
  const tempDirs = [
    path.join(__dirname, 'uploads', 'batch-temp'),
    path.join(__dirname, 'uploads', 'admin-temp')
  ];
  
  tempDirs.forEach(tempDir => {
    if (fs.existsSync(tempDir)) {
      const subdirs = fs.readdirSync(tempDir);
      subdirs.forEach(subdir => {
        const subdirPath = path.join(tempDir, subdir);
        if (fs.statSync(subdirPath).isDirectory()) {
          scanDirectory(subdirPath, imagesToMigrate);
        }
      });
    }
  });
  
  return imagesToMigrate;
};

// 递归扫描目录查找图片文件
const scanDirectory = (dirPath, imagesToMigrate) => {
  try {
    const items = fs.readdirSync(dirPath);
    items.forEach(item => {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        scanDirectory(itemPath, imagesToMigrate);
      } else if (isImageFile(item)) {
        imagesToMigrate.push({
          originalPath: itemPath,
          relativePath: getRelativePath(itemPath),
          filename: item
        });
      }
    });
  } catch (error) {
    console.error(`扫描目录失败 ${dirPath}:`, error.message);
  }
};

// 检查是否是图片文件
const isImageFile = (filename) => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(filename).toLowerCase();
  return imageExtensions.includes(ext);
};

// 获取相对于临时目录的路径
const getRelativePath = (fullPath) => {
  // 提取相对于临时目录的路径
  const uploadIndex = fullPath.indexOf('uploads');
  if (uploadIndex !== -1) {
    return fullPath.substring(uploadIndex + 8); // 去掉 'uploads/'
  }
  return path.basename(fullPath);
};

// 迁移单个图片文件
const migrateImageFile = async (imageInfo) => {
  const targetPath = path.join(__dirname, 'uploads', 'images', imageInfo.filename);
  
  // 如果目标文件已存在，生成新的文件名
  let finalTargetPath = targetPath;
  if (fs.existsSync(targetPath)) {
    const ext = path.extname(imageInfo.filename);
    const basename = path.basename(imageInfo.filename, ext);
    const timestamp = Date.now();
    finalTargetPath = path.join(__dirname, 'uploads', 'images', `${basename}-migrated-${timestamp}${ext}`);
  }
  
  // 复制文件
  fs.copyFileSync(imageInfo.originalPath, finalTargetPath);
  console.log(`📋 迁移图片: ${imageInfo.originalPath} -> ${finalTargetPath}`);
  
  // 删除原文件
  fs.unlinkSync(imageInfo.originalPath);
};

// 检查路径是否需要更新
const needsPathUpdate = (imagePath) => {
  if (!imagePath) return false;
  if (imagePath.startsWith('http')) return false;
  if (imagePath.startsWith('/uploads/images/')) return false;
  
  // 需要更新的情况：
  // - 包含 temp 或 batch-temp 或 admin-temp
  // - 不以 /uploads/images/ 开头的相对路径
  return imagePath.includes('temp') || 
         imagePath.includes('batch') || 
         imagePath.includes('admin') ||
         (!imagePath.startsWith('/uploads/'));
};

// 更新图片路径
const updateImagePath = (imagePath) => {
  if (!imagePath || imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // 如果已经是正确的格式，直接返回
  if (imagePath.startsWith('/uploads/images/')) {
    return imagePath;
  }
  
  // 提取文件名
  const filename = path.basename(imagePath);
  
  // 检查文件是否存在于正式目录
  const targetPath = path.join(__dirname, 'uploads', 'images', filename);
  if (fs.existsSync(targetPath)) {
    return `/uploads/images/${filename}`;
  }
  
  // 如果文件不存在，返回占位图
  console.log(`⚠️ 图片文件不存在: ${imagePath}`);
  return 'https://via.placeholder.com/150';
};

// 清理空的临时目录
const cleanupTempDirs = async () => {
  console.log('\n🧹 开始清理临时目录...');
  
  const tempDirs = [
    path.join(__dirname, 'uploads', 'batch-temp'),
    path.join(__dirname, 'uploads', 'admin-temp')
  ];
  
  for (const tempDir of tempDirs) {
    try {
      if (fs.existsSync(tempDir)) {
        const subdirs = fs.readdirSync(tempDir);
        for (const subdir of subdirs) {
          const subdirPath = path.join(tempDir, subdir);
          if (fs.statSync(subdirPath).isDirectory()) {
            if (isDirEmpty(subdirPath)) {
              fs.rmSync(subdirPath, { recursive: true, force: true });
              console.log(`🗑️ 删除空目录: ${subdirPath}`);
            } else {
              console.log(`📁 保留非空目录: ${subdirPath}`);
            }
          }
        }
        
        // 如果父目录也空了，删除它
        if (isDirEmpty(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
          console.log(`🗑️ 删除空的临时目录: ${tempDir}`);
        }
      }
    } catch (error) {
      console.error(`❌ 清理目录失败 ${tempDir}:`, error.message);
    }
  }
};

// 检查目录是否为空
const isDirEmpty = (dirPath) => {
  try {
    const items = fs.readdirSync(dirPath);
    return items.length === 0;
  } catch (error) {
    return true; // 如果读取失败，认为是空的
  }
};

// 主执行函数
const main = async () => {
  try {
    await connectDB();
    await migrateImagePaths();
    console.log('🎉 迁移完成！');
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
  migrateImagePaths,
  updateImagePath
};
