const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 连接数据库
mongoose.connect('mongodb://localhost:27017/homeservice', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Staff = require('./src/models/staffModel');

async function convertImageStructure() {
  try {
    console.log('🔄 开始转换图片文件结构...\n');
    
    // 1. 你的源图片目录路径（请修改为你的实际路径）
    const sourceImagesDir = './原始图片目录/images';  // 修改这里！
    
    // 2. 目标目录
    const targetDir = './uploads/employees';
    
    // 确保目标目录存在
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    if (!fs.existsSync(sourceImagesDir)) {
      console.log('❌ 源图片目录不存在:', sourceImagesDir);
      console.log('📝 请修改脚本中的 sourceImagesDir 路径');
      return;
    }
    
    // 3. 获取数据库中的所有员工
    const allStaff = await Staff.find();
    console.log(`📊 数据库中共有 ${allStaff.length} 名员工`);
    
    // 4. 获取源目录中的所有员工ID文件夹
    const employeeIdDirs = fs.readdirSync(sourceImagesDir).filter(item => {
      const fullPath = path.join(sourceImagesDir, item);
      return fs.statSync(fullPath).isDirectory();
    });
    
    console.log(`📁 源目录中找到 ${employeeIdDirs.length} 个员工图片文件夹`);
    
    let successCount = 0;
    let updateCount = 0;
    
    // 5. 处理每个员工
    for (const staff of allStaff) {
      const staffId = staff._id.toString();
      console.log(`\n👤 处理员工: ${staff.name} (${staffId})`);
      
      // 查找对应的图片文件夹
      let sourceEmployeeDir = null;
      
      // 尝试直接匹配ID
      if (employeeIdDirs.includes(staffId)) {
        sourceEmployeeDir = path.join(sourceImagesDir, staffId);
      } else {
        // 尝试模糊匹配（取前几位）
        const shortId = staffId.substring(0, 12);
        const matchedDir = employeeIdDirs.find(dir => dir.startsWith(shortId));
        if (matchedDir) {
          sourceEmployeeDir = path.join(sourceImagesDir, matchedDir);
          console.log(`   📍 找到匹配的目录: ${matchedDir}`);
        }
      }
      
      if (!sourceEmployeeDir || !fs.existsSync(sourceEmployeeDir)) {
        console.log(`   ⚠️ 没有找到对应的图片目录`);
        continue;
      }
      
      const files = fs.readdirSync(sourceEmployeeDir);
      console.log(`   📁 图片文件: ${files.join(', ')}`);
      
      let newImagePath = null;
      let newPhotoPaths = [];
      
      // 6. 处理头像文件
      const avatarFile = files.find(f => f === 'avatar.jpg' || f === 'avatar.png' || f === 'avatar.jpeg');
      if (avatarFile) {
        const sourceAvatarPath = path.join(sourceEmployeeDir, avatarFile);
        const ext = path.extname(avatarFile);
        const newFileName = `employee-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        const targetAvatarPath = path.join(targetDir, newFileName);
        
        try {
          fs.copyFileSync(sourceAvatarPath, targetAvatarPath);
          newImagePath = `/uploads/employees/${newFileName}`;
          console.log(`   ✅ 头像已复制: ${newFileName}`);
          successCount++;
        } catch (error) {
          console.log(`   ❌ 复制头像失败: ${error.message}`);
        }
      }
      
      // 7. 处理照片文件
      const photoFiles = files.filter(f => f.startsWith('photo-') && (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg')));
      for (const photoFile of photoFiles) {
        const sourcePhotoPath = path.join(sourceEmployeeDir, photoFile);
        const ext = path.extname(photoFile);
        const newFileName = `employee-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        const targetPhotoPath = path.join(targetDir, newFileName);
        
        try {
          fs.copyFileSync(sourcePhotoPath, targetPhotoPath);
          newPhotoPaths.push(`/uploads/employees/${newFileName}`);
          console.log(`   ✅ 照片已复制: ${newFileName}`);
          successCount++;
        } catch (error) {
          console.log(`   ❌ 复制照片失败: ${error.message}`);
        }
        
        // 稍微延迟，确保文件名时间戳不重复
        await new Promise(resolve => setTimeout(resolve, 2));
      }
      
      // 8. 更新数据库记录
      if (newImagePath || newPhotoPaths.length > 0) {
        const updateData = {};
        if (newImagePath) updateData.image = newImagePath;
        if (newPhotoPaths.length > 0) updateData.photos = newPhotoPaths;
        
        await Staff.findByIdAndUpdate(staff._id, updateData);
        updateCount++;
        console.log(`   ✅ 数据库记录已更新`);
      }
    }
    
    console.log('\n🎉 转换完成！');
    console.log(`📊 统计结果:`);
    console.log(`   📁 成功复制图片文件: ${successCount} 个`);
    console.log(`   📝 更新员工记录: ${updateCount} 个`);
    
    // 9. 验证结果
    console.log('\n🔍 验证转换结果...');
    const staffWithImages = await Staff.find({ 
      $or: [
        { image: { $ne: 'https://via.placeholder.com/150' } },
        { photos: { $exists: true, $ne: [] } }
      ]
    });
    
    console.log(`✅ 现在有 ${staffWithImages.length} 名员工拥有图片文件`);
    
  } catch (error) {
    console.error('❌ 转换过程出错:', error);
  } finally {
    mongoose.disconnect();
  }
}

// 运行转换脚本
console.log('📋 图片结构转换脚本');
console.log('🔧 使用前请确保:');
console.log('   1. 修改脚本中的 sourceImagesDir 路径');
console.log('   2. 确保有足够的磁盘空间');
console.log('   3. 建议先备份数据库\n');

convertImageStructure();
