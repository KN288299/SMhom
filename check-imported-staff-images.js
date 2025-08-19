const mongoose = require('mongoose');
const Staff = require('./src/models/staffModel');
const fs = require('fs');
const path = require('path');

// 连接数据库
mongoose.connect('mongodb://localhost:27017/homeservice', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkImportedStaffImages() {
  try {
    console.log('🔍 检查导入的员工图片数据...');
    
    // 获取最近导入的员工（按创建时间排序）
    const recentStaff = await Staff.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('name image photos createdAt');
    
    console.log(`📋 找到 ${recentStaff.length} 名员工`);
    
    let imageStats = {
      total: recentStaff.length,
      withMainImage: 0,
      withPhotos: 0,
      placeholderImage: 0,
      noImages: 0
    };
    
    recentStaff.forEach((staff, index) => {
      console.log(`\n${index + 1}. ${staff.name} (${staff.createdAt.toLocaleString()})`);
      console.log(`   主图: ${staff.image}`);
      console.log(`   照片数量: ${staff.photos ? staff.photos.length : 0}`);
      
      if (staff.image) {
        if (staff.image.includes('placeholder.com')) {
          imageStats.placeholderImage++;
          console.log(`   ⚠️ 使用占位图`);
        } else if (staff.image.startsWith('/uploads/')) {
          imageStats.withMainImage++;
          console.log(`   ✅ 有主图`);
        } else {
          imageStats.withMainImage++;
          console.log(`   ✅ 有主图 (外部URL)`);
        }
      } else {
        imageStats.noImages++;
        console.log(`   ❌ 无主图`);
      }
      
      if (staff.photos && staff.photos.length > 0) {
        imageStats.withPhotos++;
        console.log(`   ✅ 有照片集`);
        staff.photos.forEach((photo, photoIndex) => {
          console.log(`     照片${photoIndex + 1}: ${photo}`);
        });
      } else {
        console.log(`   ❌ 无照片集`);
      }
    });
    
    console.log('\n📊 图片统计:');
    console.log(`总员工数: ${imageStats.total}`);
    console.log(`有主图: ${imageStats.withMainImage}`);
    console.log(`有照片集: ${imageStats.withPhotos}`);
    console.log(`使用占位图: ${imageStats.placeholderImage}`);
    console.log(`无图片: ${imageStats.noImages}`);
    
    // 检查uploads目录
    const uploadsDir = path.join(__dirname, 'uploads/employees');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log(`\n📁 uploads/employees 目录文件数: ${files.length}`);
      
      if (files.length > 0) {
        console.log('最近的文件:');
        files.slice(-10).forEach(file => {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);
          console.log(`  ${file} (${stats.size} bytes, ${stats.mtime.toLocaleString()})`);
        });
      }
    } else {
      console.log('\n❌ uploads/employees 目录不存在');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkImportedStaffImages();
