const mongoose = require('mongoose');
const Staff = require('./src/models/staffModel');

// 连接数据库
mongoose.connect('mongodb://127.0.0.1:27017/homeservicechat');

async function checkUploadsRecords() {
  try {
    console.log('🔍 检查仍使用/uploads/路径的员工记录...\n');
    
    // 查找所有使用/uploads/路径的员工
    const uploadsStaffs = await Staff.find({
      image: { $regex: '^/uploads/' }
    }).limit(20);
    
    console.log(`📊 找到 ${uploadsStaffs.length} 个使用/uploads/路径的员工样本:\n`);
    
    uploadsStaffs.forEach((staff, index) => {
      console.log(`${index + 1}. ID: ${staff._id}`);
      console.log(`   姓名: ${staff.name}`);
      console.log(`   图片: ${staff.image}`);
      console.log(`   创建时间: ${staff.createdAt}`);
      console.log(`   更新时间: ${staff.updatedAt}`);
      console.log('   ---');
    });
    
    // 统计总数
    const totalUploads = await Staff.countDocuments({
      image: { $regex: '^/uploads/' }
    });
    
    const totalPlaceholder = await Staff.countDocuments({
      image: { $regex: 'placeholder' }
    });
    
    const totalStaffs = await Staff.countDocuments({});
    
    console.log('\n📈 详细统计:');
    console.log(`总员工数: ${totalStaffs}`);
    console.log(`使用/uploads/路径: ${totalUploads}`);
    console.log(`使用placeholder: ${totalPlaceholder}`);
    console.log(`其他路径: ${totalStaffs - totalUploads - totalPlaceholder}`);
    
    // 检查是否有重复的员工记录
    const duplicates = await Staff.aggregate([
      {
        $group: {
          _id: "$name",
          count: { $sum: 1 },
          ids: { $push: "$_id" }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      },
      {
        $limit: 10
      }
    ]);
    
    if (duplicates.length > 0) {
      console.log('\n🔄 发现重复员工记录:');
      duplicates.forEach(dup => {
        console.log(`员工 "${dup._id}" 有 ${dup.count} 条记录`);
      });
    }
    
  } catch (error) {
    console.error('检查过程中出错:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkUploadsRecords();
