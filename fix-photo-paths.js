const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 连接数据库
mongoose.connect('mongodb://localhost:27017/homeservice', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Staff = require('./src/models/Staff');

async function fixPhotoPaths() {
  try {
    console.log('正在修复员工照片路径...\n');
    
    const allStaff = await Staff.find({});
    let fixedCount = 0;
    let notFoundCount = 0;
    
    for (const staff of allStaff) {
      if (staff.photo && staff.photo.trim() !== '') {
        const currentPath = path.join(__dirname, 'public', staff.photo);
        
        // 如果当前路径的照片存在，跳过
        if (fs.existsSync(currentPath)) {
          console.log(`✅ ${staff.name}: 照片已存在于正确位置`);
          continue;
        }
        
        console.log(`🔍 处理员工: ${staff.name} (ID: ${staff._id})`);
        console.log(`   当前路径: ${staff.photo}`);
        
        // 尝试找到照片文件
        const fileName = path.basename(staff.photo);
        const possiblePaths = [
          // 使用员工ID作为目录名
          path.join(__dirname, 'public', 'uploads', 'staff', staff._id.toString(), fileName),
          path.join(__dirname, 'public', 'uploads', 'staff', staff._id.toString()),
          // 使用images目录结构
          path.join(__dirname, 'public', 'images', staff._id.toString(), fileName),
          path.join(__dirname, 'public', 'images', staff._id.toString()),
          // 其他可能的位置
          path.join(__dirname, 'public', 'uploads', 'staff', fileName),
          path.join(__dirname, 'public', 'uploads', fileName),
          path.join(__dirname, 'uploads', 'staff', fileName),
          path.join(__dirname, 'uploads', fileName),
          path.join(__dirname, 'public', 'images', fileName),
          path.join(__dirname, 'images', fileName)
        ];
        
        let foundPath = null;
        let foundFile = null;
        
        // 检查每个可能的路径
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            const stats = fs.statSync(possiblePath);
            if (stats.isFile()) {
              foundPath = possiblePath;
              foundFile = possiblePath;
              break;
            } else if (stats.isDirectory()) {
              // 检查目录中的图片文件
              const files = fs.readdirSync(possiblePath);
              const imageFile = files.find(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
              if (imageFile) {
                foundPath = possiblePath;
                foundFile = path.join(possiblePath, imageFile);
                break;
              }
            }
          }
        }
        
        if (foundFile) {
          // 确保目标目录存在
          const targetDir = path.join(__dirname, 'public', 'uploads', 'staff');
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          
          // 生成新的文件名和路径
          const fileExt = path.extname(foundFile);
          const newFileName = `${staff._id}${fileExt}`;
          const newFilePath = path.join(targetDir, newFileName);
          const newPhotoPath = `/uploads/staff/${newFileName}`;
          
          try {
            // 复制文件到正确位置
            fs.copyFileSync(foundFile, newFilePath);
            
            // 更新数据库中的路径
            await Staff.findByIdAndUpdate(staff._id, { photo: newPhotoPath });
            
            console.log(`   ✅ 修复成功:`);
            console.log(`      从: ${foundFile}`);
            console.log(`      到: ${newFilePath}`);
            console.log(`      新路径: ${newPhotoPath}`);
            fixedCount++;
            
            // 删除原文件（如果不在目标位置）
            if (foundFile !== newFilePath && !foundFile.includes('public/uploads/staff')) {
              try {
                fs.unlinkSync(foundFile);
                console.log(`   🗑️  删除原文件: ${foundFile}`);
              } catch (err) {
                console.log(`   ⚠️  无法删除原文件: ${err.message}`);
              }
            }
            
          } catch (error) {
            console.log(`   ❌ 复制文件失败: ${error.message}`);
          }
        } else {
          console.log(`   ❌ 未找到照片文件`);
          notFoundCount++;
          
          // 清除数据库中的无效路径
          await Staff.findByIdAndUpdate(staff._id, { photo: '' });
          console.log(`   🧹 已清除无效的照片路径`);
        }
        
        console.log('');
      }
    }
    
    console.log('\n=== 修复完成 ===');
    console.log(`成功修复: ${fixedCount} 个照片`);
    console.log(`未找到文件: ${notFoundCount} 个照片`);
    
  } catch (error) {
    console.error('修复过程中出现错误:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixPhotoPaths();
