const mongoose = require('mongoose');
const Staff = require('./src/models/staffModel');

async function checkImagePaths() {
  try {
    await mongoose.connect('mongodb://localhost:27017/homeservice');
    console.log('🔗 数据库连接成功');
    
    // 首先检查员工总数
    const totalCount = await Staff.countDocuments();
    console.log(`📊 数据库中员工总数: ${totalCount}`);
    
    if (totalCount === 0) {
      console.log('❌ 数据库中没有员工数据！');
      process.exit(0);
    }
    
    // 获取所有员工的图片路径统计
    const staff = await Staff.find({}, 'name image photos').limit(10);
    
    console.log('\n📊 员工图片路径统计:');
    staff.forEach((s, index) => {
      console.log(`${index + 1}. ${s.name}:`);
      console.log(`   主图: ${s.image}`);
      if (s.photos && s.photos.length > 0) {
        console.log(`   相册: ${s.photos.join(', ')}`);
      }
      console.log('');
    });
    
    // 统计不同路径类型的数量
    const allStaff = await Staff.find({});
    const pathStats = {
      placeholder: 0,
      uploads_images: 0,
      uploads_employees: 0,
      http: 0,
      other: 0
    };
    
    allStaff.forEach(s => {
      if (s.image.includes('placeholder')) {
        pathStats.placeholder++;
      } else if (s.image.startsWith('/uploads/images/')) {
        pathStats.uploads_images++;
      } else if (s.image.startsWith('/uploads/employees/')) {
        pathStats.uploads_employees++;
      } else if (s.image.startsWith('http')) {
        pathStats.http++;
      } else {
        pathStats.other++;
      }
    });
    
    console.log('📈 路径类型统计:');
    console.log(`- Placeholder: ${pathStats.placeholder}`);
    console.log(`- /uploads/images/: ${pathStats.uploads_images}`);
    console.log(`- /uploads/employees/: ${pathStats.uploads_employees}`);
    console.log(`- HTTP URL: ${pathStats.http}`);
    console.log(`- 其他: ${pathStats.other}`);
    
    // 检查实际文件存在情况
    const fs = require('fs');
    const path = require('path');
    
    console.log('\n🔍 文件存在性检查:');
    let existCount = 0;
    let notExistCount = 0;
    
    for (let s of staff) {
      if (!s.image.includes('placeholder') && !s.image.startsWith('http')) {
        const filePath = path.join(__dirname, s.image.replace(/^\//, ''));
        const exists = fs.existsSync(filePath);
        console.log(`${s.name}: ${s.image} - ${exists ? '✅ 存在' : '❌ 不存在'}`);
        if (exists) existCount++;
        else notExistCount++;
      }
    }
    
    console.log(`\n📊 文件存在统计: 存在 ${existCount} 个，不存在 ${notExistCount} 个`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ 错误:', err);
    process.exit(1);
  }
}

checkImagePaths();
