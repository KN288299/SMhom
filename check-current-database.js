const mongoose = require('mongoose');
const Staff = require('./src/models/staffModel');

// 连接数据库
mongoose.connect('mongodb://127.0.0.1:27017/homeservicechat');

async function checkCurrentDatabase() {
  try {
    console.log('🔍 检查当前数据库状态...\n');
    
    // 获取前10个员工数据
    const staffs = await Staff.find({}).limit(10);
    console.log(`📊 检查前10个员工的当前状态:\n`);
    
    staffs.forEach((staff, index) => {
      console.log(`${index + 1}. ID: ${staff._id}`);
      console.log(`   姓名: ${staff.name}`);
      console.log(`   图片: ${staff.image}`);
      console.log(`   创建时间: ${staff.createdAt}`);
      console.log(`   更新时间: ${staff.updatedAt}`);
      console.log('   ---');
    });
    
    // 统计不同图片路径类型
    const allStaffs = await Staff.find({});
    const pathTypes = {};
    
    allStaffs.forEach(staff => {
      if (staff.image) {
        if (staff.image.includes('placeholder')) {
          pathTypes['placeholder'] = (pathTypes['placeholder'] || 0) + 1;
        } else if (staff.image.startsWith('/uploads/')) {
          pathTypes['uploads'] = (pathTypes['uploads'] || 0) + 1;
        } else {
          pathTypes['other'] = (pathTypes['other'] || 0) + 1;
        }
      } else {
        pathTypes['null'] = (pathTypes['null'] || 0) + 1;
      }
    });
    
    console.log('\n📈 当前图片路径统计:');
    Object.entries(pathTypes).forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });
    
  } catch (error) {
    console.error('检查过程中出错:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkCurrentDatabase();
