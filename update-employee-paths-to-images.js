const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// 连接数据库
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/homeservice', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
};

// 定义Staff模型
const StaffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  job: { type: String, required: true },
  image: { type: String, default: 'https://via.placeholder.com/150' },
  province: { type: String, default: '北京市' },
  height: { type: Number, default: 165 },
  weight: { type: Number, default: 50 },
  description: { type: String, default: '' },
  photos: { type: [String], default: [] },
  tag: { type: String, default: '可预约' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

const Staff = mongoose.model('Staff', StaffSchema);

async function updateEmployeePathsToImages() {
  try {
    await connectDB();
    
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
      console.log('✅ 没有需要更新的员工图片路径');
      return;
    }
    
    let updatedCount = 0;
    let imageUpdatedCount = 0;
    let photosUpdatedCount = 0;
    
    for (const staff of staffWithEmployeesPath) {
      let hasUpdates = false;
      
      // 更新主图片路径
      if (staff.image && staff.image.startsWith('/uploads/employees/')) {
        console.log(`🔄 更新员工 ${staff.name} 的头像路径: ${staff.image}`);
        staff.image = staff.image.replace('/uploads/employees/', '/uploads/images/');
        hasUpdates = true;
        imageUpdatedCount++;
      }
      
      // 更新照片集路径
      if (staff.photos && staff.photos.length > 0) {
        const updatedPhotos = staff.photos.map(photo => {
          if (photo.startsWith('/uploads/employees/')) {
            const newPhotoPath = photo.replace('/uploads/employees/', '/uploads/images/');
            console.log(`📸 更新员工 ${staff.name} 的照片路径: ${photo} -> ${newPhotoPath}`);
            photosUpdatedCount++;
            return newPhotoPath;
          }
          return photo;
        });
        
        if (JSON.stringify(staff.photos) !== JSON.stringify(updatedPhotos)) {
          staff.photos = updatedPhotos;
          hasUpdates = true;
        }
      }
      
      // 保存更新
      if (hasUpdates) {
        await staff.save();
        updatedCount++;
        console.log(`✅ 员工 ${staff.name} 的图片路径已更新`);
      }
    }
    
    console.log(`\n📊 更新统计:`);
    console.log(`- 更新的员工数量: ${updatedCount}`);
    console.log(`- 更新的头像数量: ${imageUpdatedCount}`);
    console.log(`- 更新的照片数量: ${photosUpdatedCount}`);
    
    // 验证更新结果
    console.log('\n🔍 验证更新结果...');
    const remainingEmployeesPath = await Staff.find({
      $or: [
        { image: { $regex: '^/uploads/employees/' } },
        { photos: { $elemMatch: { $regex: '^/uploads/employees/' } } }
      ]
    });
    
    if (remainingEmployeesPath.length === 0) {
      console.log('✅ 所有员工图片路径已成功更新为/uploads/images/');
    } else {
      console.log(`⚠️ 仍有 ${remainingEmployeesPath.length} 名员工使用/uploads/employees/路径`);
    }
    
    console.log('\n💡 提示: 现在所有代码都统一使用/uploads/images/目录');
    console.log('💡 如果需要移动实际的图片文件，请运行以下命令:');
    console.log('   mkdir -p uploads/images');
    console.log('   mv uploads/employees/* uploads/images/ 2>/dev/null || true');
    console.log('   rmdir uploads/employees 2>/dev/null || true');
    
  } catch (error) {
    console.error('❌ 更新过程中出现错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已断开');
  }
}

// 运行更新
updateEmployeePathsToImages();
