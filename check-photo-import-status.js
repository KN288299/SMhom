const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 连接数据库
mongoose.connect('mongodb://localhost:27017/homeservice', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Staff = require('./src/models/Staff');

async function checkPhotoImportStatus() {
  try {
    console.log('正在检查员工照片导入状态...\n');
    
    // 获取所有员工
    const allStaff = await Staff.find({});
    console.log(`数据库中总员工数: ${allStaff.length}\n`);
    
    // 统计信息
    let stats = {
      total: allStaff.length,
      withPhoto: 0,
      withoutPhoto: 0,
      photoExists: 0,
      photoMissing: 0,
      invalidPaths: 0
    };
    
    const missingPhotos = [];
    const invalidPaths = [];
    const existingPhotos = [];
    
    for (const staff of allStaff) {
      if (staff.photo && staff.photo.trim() !== '') {
        stats.withPhoto++;
        
        // 检查照片文件是否存在
        const photoPath = path.join(__dirname, 'public', staff.photo);
        
        console.log(`检查员工: ${staff.name} (ID: ${staff._id})`);
        console.log(`  照片路径: ${staff.photo}`);
        console.log(`  完整路径: ${photoPath}`);
        
        if (fs.existsSync(photoPath)) {
          stats.photoExists++;
          existingPhotos.push({
            name: staff.name,
            id: staff._id,
            photo: staff.photo,
            size: fs.statSync(photoPath).size
          });
          console.log(`  ✅ 照片存在 (大小: ${fs.statSync(photoPath).size} bytes)`);
        } else {
          stats.photoMissing++;
          missingPhotos.push({
            name: staff.name,
            id: staff._id,
            photo: staff.photo
          });
          console.log(`  ❌ 照片不存在`);
          
          // 检查是否是路径问题 - 尝试不同的可能路径
          const possiblePaths = [
            path.join(__dirname, 'public', 'uploads', 'staff', path.basename(staff.photo)),
            path.join(__dirname, 'public', 'uploads', path.basename(staff.photo)),
            path.join(__dirname, 'uploads', 'staff', path.basename(staff.photo)),
            path.join(__dirname, 'uploads', path.basename(staff.photo))
          ];
          
          let foundAlternative = false;
          for (const altPath of possiblePaths) {
            if (fs.existsSync(altPath)) {
              console.log(`  🔍 找到替代路径: ${altPath}`);
              foundAlternative = true;
              break;
            }
          }
          
          if (!foundAlternative) {
            console.log(`  🔍 未找到任何替代路径`);
          }
        }
        
        // 检查路径格式是否有效
        if (!staff.photo.startsWith('/uploads/') && !staff.photo.startsWith('uploads/')) {
          stats.invalidPaths++;
          invalidPaths.push({
            name: staff.name,
            id: staff._id,
            photo: staff.photo
          });
        }
        
        console.log('');
      } else {
        stats.withoutPhoto++;
        console.log(`员工 ${staff.name} (ID: ${staff._id}) 没有照片路径\n`);
      }
    }
    
    // 打印统计结果
    console.log('\n=== 统计结果 ===');
    console.log(`总员工数: ${stats.total}`);
    console.log(`有照片路径: ${stats.withPhoto}`);
    console.log(`无照片路径: ${stats.withoutPhoto}`);
    console.log(`照片文件存在: ${stats.photoExists}`);
    console.log(`照片文件缺失: ${stats.photoMissing}`);
    console.log(`无效路径格式: ${stats.invalidPaths}`);
    
    // 检查uploads目录结构
    console.log('\n=== 检查uploads目录结构 ===');
    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    if (fs.existsSync(uploadsDir)) {
      console.log(`uploads目录存在: ${uploadsDir}`);
      const staffDir = path.join(uploadsDir, 'staff');
      if (fs.existsSync(staffDir)) {
        console.log(`staff子目录存在: ${staffDir}`);
        const files = fs.readdirSync(staffDir);
        console.log(`staff目录中的文件数: ${files.length}`);
        if (files.length > 0) {
          console.log('前10个文件:');
          files.slice(0, 10).forEach(file => {
            const filePath = path.join(staffDir, file);
            const stats = fs.statSync(filePath);
            console.log(`  ${file} (${stats.size} bytes)`);
          });
        }
      } else {
        console.log('staff子目录不存在');
      }
    } else {
      console.log('uploads目录不存在');
    }
    
    // 检查其他可能的图片目录
    console.log('\n=== 检查其他可能的图片目录 ===');
    const possibleDirs = [
      path.join(__dirname, 'uploads'),
      path.join(__dirname, 'public', 'images'),
      path.join(__dirname, 'images')
    ];
    
    for (const dir of possibleDirs) {
      if (fs.existsSync(dir)) {
        console.log(`目录存在: ${dir}`);
        try {
          const files = fs.readdirSync(dir);
          const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
          console.log(`  图片文件数: ${imageFiles.length}`);
        } catch (err) {
          console.log(`  无法读取目录: ${err.message}`);
        }
      }
    }
    
    // 如果有缺失的照片，提供修复建议
    if (missingPhotos.length > 0) {
      console.log('\n=== 缺失照片列表 ===');
      missingPhotos.slice(0, 20).forEach(item => {
        console.log(`${item.name} (ID: ${item.id}) - ${item.photo}`);
      });
      if (missingPhotos.length > 20) {
        console.log(`... 还有 ${missingPhotos.length - 20} 个缺失照片`);
      }
    }
    
    if (invalidPaths.length > 0) {
      console.log('\n=== 无效路径格式列表 ===');
      invalidPaths.slice(0, 10).forEach(item => {
        console.log(`${item.name} (ID: ${item.id}) - ${item.photo}`);
      });
    }
    
    // 生成修复脚本建议
    console.log('\n=== 修复建议 ===');
    if (stats.photoMissing > 0) {
      console.log('1. 检查导入的ZIP文件是否包含图片');
      console.log('2. 确认图片是否被解压到正确的目录');
      console.log('3. 检查文件权限是否正确');
      console.log('4. 考虑重新导入数据');
    }
    
    if (stats.invalidPaths > 0) {
      console.log('5. 需要修复数据库中的照片路径格式');
    }
    
  } catch (error) {
    console.error('检查过程中出现错误:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkPhotoImportStatus();
