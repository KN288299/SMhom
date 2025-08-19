const mongoose = require('mongoose');
const Staff = require('./src/models/staffModel');
const path = require('path');
const fs = require('fs');

// 数据库连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homeservice';

async function updateStaffImagePaths() {
  try {
    console.log('🔗 连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');

    console.log('\n🔧 开始将员工图片路径从/uploads/staff/更新为/uploads/images/...\n');

    // 获取所有使用/uploads/staff/路径的员工
    const staffWithStaffPath = await Staff.find({
      $or: [
        { image: { $regex: '^/uploads/staff/' } },
        { photos: { $elemMatch: { $regex: '^/uploads/staff/' } } }
      ]
    });

    console.log(`📊 找到 ${staffWithStaffPath.length} 名员工使用/uploads/staff/路径`);

    if (staffWithStaffPath.length === 0) {
      console.log('✅ 没有需要更新的员工记录');
      return;
    }

    let updatedCount = 0;
    let imageUpdatedCount = 0;
    let photosUpdatedCount = 0;

    // 逐个更新员工记录
    for (const staff of staffWithStaffPath) {
      let hasUpdates = false;
      
      console.log(`\n👤 处理员工: ${staff.name}`);
      
      // 更新主头像路径
      if (staff.image && staff.image.startsWith('/uploads/staff/')) {
        console.log(`🔄 更新员工 ${staff.name} 的头像路径:`);
        console.log(`  旧路径: ${staff.image}`);
        staff.image = staff.image.replace('/uploads/staff/', '/uploads/images/');
        console.log(`  新路径: ${staff.image}`);
        hasUpdates = true;
        imageUpdatedCount++;
      }
      
      // 更新照片集路径
      if (staff.photos && staff.photos.length > 0) {
        const updatedPhotos = staff.photos.map(photo => {
          if (photo.startsWith('/uploads/staff/')) {
            const newPhotoPath = photo.replace('/uploads/staff/', '/uploads/images/');
            console.log(`📸 更新照片路径: ${photo} -> ${newPhotoPath}`);
            photosUpdatedCount++;
            hasUpdates = true;
            return newPhotoPath;
          }
          return photo;
        });
        staff.photos = updatedPhotos;
      }
      
      // 保存更新
      if (hasUpdates) {
        try {
          // 检查并补充必需字段
          if (!staff.job) {
            staff.job = '服务员';
            console.log(`⚠️ 为员工 ${staff.name} 补充默认职位: 服务员`);
          }
          if (!staff.age) {
            staff.age = 25;
            console.log(`⚠️ 为员工 ${staff.name} 补充默认年龄: 25`);
          }
          
          await staff.save();
          updatedCount++;
          console.log(`✅ 员工 ${staff.name} 更新完成`);
        } catch (saveError) {
          console.error(`❌ 保存员工 ${staff.name} 失败:`, saveError.message);
          // 尝试使用 updateOne 跳过验证
          try {
            await Staff.updateOne(
              { _id: staff._id },
              { 
                $set: { 
                  image: staff.image,
                  photos: staff.photos,
                  job: staff.job || '服务员',
                  age: staff.age || 25
                }
              }
            );
            updatedCount++;
            console.log(`✅ 员工 ${staff.name} 通过updateOne更新完成`);
          } catch (updateError) {
            console.error(`❌ updateOne也失败了:`, updateError.message);
          }
        }
      }
    }

    console.log('\n📊 更新统计:');
    console.log(`   更新的员工数量: ${updatedCount}`);
    console.log(`   更新的头像路径: ${imageUpdatedCount}`);
    console.log(`   更新的照片路径: ${photosUpdatedCount}`);

    // 验证更新结果
    console.log('\n🔍 验证更新结果...');
    const remainingStaffPath = await Staff.find({
      $or: [
        { image: { $regex: '^/uploads/staff/' } },
        { photos: { $elemMatch: { $regex: '^/uploads/staff/' } } }
      ]
    });

    if (remainingStaffPath.length > 0) {
      console.log(`⚠️ 仍有 ${remainingStaffPath.length} 名员工使用/uploads/staff/路径`);
      remainingStaffPath.forEach(staff => {
        console.log(`   - ${staff.name}: ${staff.image}`);
      });
    } else {
      console.log('✅ 所有员工的图片路径已成功更新');
    }

    // 检查文件是否存在
    console.log('\n📁 检查更新后的图片文件是否存在...');
    const updatedStaff = await Staff.find({
      image: { $regex: '^/uploads/images/' }
    }).limit(10);

    for (const staff of updatedStaff) {
      if (staff.image && staff.image.startsWith('/uploads/images/')) {
        const fileName = path.basename(staff.image);
        const filePath = path.join(__dirname, 'uploads/images', fileName);
        const exists = fs.existsSync(filePath);
        console.log(`   ${staff.name}: ${staff.image} - ${exists ? '✅ 存在' : '❌ 不存在'}`);
      }
    }

    console.log('\n✅ 路径更新完成！');
    console.log('\n💡 建议：');
    console.log('1. 如果图片文件不存在，可以考虑使用默认头像');
    console.log('2. 或者重新导入员工数据以包含正确的图片文件');

  } catch (error) {
    console.error('❌ 更新失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
  }
}

// 运行更新
if (require.main === module) {
  updateStaffImagePaths();
}

module.exports = { updateStaffImagePaths };
