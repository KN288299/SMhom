const mongoose = require('mongoose');
const Staff = require('./src/models/staffModel');
const fs = require('fs');
const path = require('path');

// 连接数据库
mongoose.connect('mongodb://127.0.0.1:27017/homeservicechat')
.then(() => console.log('🔗 数据库连接成功'))
.catch(err => console.error('❌ 数据库连接失败:', err));

const fixMissingImages = async () => {
  try {
    console.log('🔍 开始检查员工图片...');
    
    // 获取所有员工
    const allStaff = await Staff.find({});
    console.log(`📊 找到 ${allStaff.length} 个员工记录`);
    
    let missingCount = 0;
    let fixedCount = 0;
    
    for (const staff of allStaff) {
      if (staff.image && staff.image.startsWith('/uploads/employees/')) {
        const imagePath = path.join(__dirname, staff.image);
        
        // 检查文件是否存在
        if (!fs.existsSync(imagePath)) {
          missingCount++;
          console.log(`❌ 缺失图片: ${staff.name} - ${staff.image}`);
          
          // 使用默认头像替换
          staff.image = 'https://via.placeholder.com/150';
          await staff.save();
          fixedCount++;
          
          if (fixedCount % 50 === 0) {
            console.log(`⚡ 已修复 ${fixedCount} 个员工的图片路径...`);
          }
        }
      }
    }
    
    console.log(`\n📈 统计结果:`);
    console.log(`   总员工数: ${allStaff.length}`);
    console.log(`   缺失图片: ${missingCount}`);
    console.log(`   已修复: ${fixedCount}`);
    
    if (fixedCount > 0) {
      console.log('✅ 所有缺失的员工图片已替换为默认头像');
    } else {
      console.log('✅ 所有员工图片路径都正常');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 修复过程出错:', error);
    process.exit(1);
  }
};

// 等待数据库连接后执行修复
setTimeout(fixMissingImages, 1000);
