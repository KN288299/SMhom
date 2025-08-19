const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// 连接数据库
mongoose.connect('mongodb://localhost:27017/homeservice', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// 员工模型
const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  job: { type: String, required: true },
  image: { type: String, default: 'https://via.placeholder.com/150' },
  province: { type: String, default: '北京市' },
  height: { type: Number, default: 165 },
  weight: { type: Number, default: 50 },
  description: { type: String, default: '' },
  photos: [{ type: String }],
  tag: { type: String, default: '可预约' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Staff = mongoose.model('Staff', staffSchema);

async function updateImagePathsToImagesDir() {
  try {
    console.log('🔧 开始将员工图片路径从/uploads/employees/更新为/uploads/images/...\n');
    
    // 获取所有使用/uploads/employees/路径的员工
    const staffWithEmployeesPath = await Staff.find({
      $or: [
        { image: { $regex: '^/uploads/employees/' } },
        { photos: { $elemMatch: { $regex: '^/uploads/employees/' } } }
      ]
    });
    
    console.log(`📊 找到 ${staffWithEmployeesPath.length} 名员工使用/uploads/employees/路径`);
    
    if (staffWithEmployeesPath.length === 0) {
      console.log('✅ 没有需要更新的记录');
      return;
    }
    
    let updatedCount = 0;
    let imagePathsUpdated = 0;
    let photosUpdated = 0;
    
    for (const staff of staffWithEmployeesPath) {
      let updated = false;
      
      // 更新主图片路径
      if (staff.image && staff.image.startsWith('/uploads/employees/')) {
        const oldImagePath = staff.image;
        staff.image = staff.image.replace('/uploads/employees/', '/uploads/images/');
        console.log(`📸 更新主图片: ${staff.name}`);
        console.log(`  旧路径: ${oldImagePath}`);
        console.log(`  新路径: ${staff.image}`);
        imagePathsUpdated++;
        updated = true;
      }
      
      // 更新照片集路径
      if (staff.photos && staff.photos.length > 0) {
        const updatedPhotos = [];
        let photosChanged = false;
        
        staff.photos.forEach((photo, index) => {
          if (photo.startsWith('/uploads/employees/')) {
            const newPhotoPath = photo.replace('/uploads/employees/', '/uploads/images/');
            updatedPhotos.push(newPhotoPath);
            console.log(`📷 更新照片 ${index + 1}: ${staff.name}`);
            console.log(`  旧路径: ${photo}`);
            console.log(`  新路径: ${newPhotoPath}`);
            photosUpdated++;
            photosChanged = true;
          } else {
            updatedPhotos.push(photo);
          }
        });
        
        if (photosChanged) {
          staff.photos = updatedPhotos;
          updated = true;
        }
      }
      
      // 保存更新
      if (updated) {
        await staff.save();
        updatedCount++;
        console.log(`✅ 更新完成: ${staff.name}\n`);
      }
    }
    
    console.log('📊 更新统计:');
    console.log(`👥 更新的员工数量: ${updatedCount}`);
    console.log(`📸 更新的主图片数量: ${imagePathsUpdated}`);
    console.log(`📷 更新的照片数量: ${photosUpdated}`);
    
    // 检查是否需要移动实际文件
    console.log('\n📁 检查文件移动需求...');
    const employeesDir = path.join(__dirname, 'uploads/employees');
    const imagesDir = path.join(__dirname, 'uploads/images');
    
    // 确保images目录存在
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
      console.log(`📂 创建目录: ${imagesDir}`);
    }
    
    if (fs.existsSync(employeesDir)) {
      const employeeFiles = fs.readdirSync(employeesDir);
      console.log(`📁 uploads/employees目录中有 ${employeeFiles.length} 个文件`);
      
      if (employeeFiles.length > 0) {
        console.log('\n🔄 建议手动操作:');
        console.log('1. 将uploads/employees/目录中的所有文件移动到uploads/images/目录');
        console.log('2. 或者运行以下命令:');
        console.log('   mv uploads/employees/* uploads/images/');
        console.log('   rmdir uploads/employees');
        
        console.log('\n📋 员工目录中的文件示例:');
        employeeFiles.slice(0, 5).forEach(file => {
          console.log(`  ${file}`);
        });
        if (employeeFiles.length > 5) {
          console.log(`  ... 还有 ${employeeFiles.length - 5} 个文件`);
        }
      }
    } else {
      console.log('📁 uploads/employees目录不存在，无需移动文件');
    }
    
    console.log('\n✅ 图片路径更新完成！');
    console.log('💡 提示: 现在所有新的员工图片都会存储在uploads/images目录中');
    
  } catch (error) {
    console.error('❌ 更新失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

updateImagePathsToImagesDir();
