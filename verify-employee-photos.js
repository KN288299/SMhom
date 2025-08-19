const mongoose = require('mongoose');

async function verifyEmployeePhotos() {
  console.log('=== 验证员工照片情况 ===\n');
  
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/homeservicechat');
    console.log('✅ 已连接到 homeservicechat 数据库');
    
    const staffCollection = mongoose.connection.db.collection('staffs');
    
    // 1. 总体统计
    const totalCount = await staffCollection.countDocuments();
    console.log(`\n1. 员工总数: ${totalCount}`);
    
    // 2. 照片统计
    const withPhotoCount = await staffCollection.countDocuments({
      photo: { $exists: true, $ne: null, $ne: '' }
    });
    
    const withoutPhotoCount = totalCount - withPhotoCount;
    
    console.log(`   有照片: ${withPhotoCount} 个`);
    console.log(`   无照片: ${withoutPhotoCount} 个`);
    
    // 3. 照片路径样本
    console.log('\n2. 照片路径样本:');
    const photoSamples = await staffCollection.find({
      photo: { $exists: true, $ne: null, $ne: '' }
    }).limit(10).toArray();
    
    photoSamples.forEach((staff, index) => {
      console.log(`   ${index + 1}. ${staff.name}: ${staff.photo}`);
    });
    
    // 4. 检查照片路径格式
    console.log('\n3. 照片路径格式分析:');
    const allPhotos = await staffCollection.find({
      photo: { $exists: true, $ne: null, $ne: '' }
    }, { photo: 1, name: 1 }).toArray();
    
    // 统计不同的路径格式
    const pathFormats = {};
    allPhotos.forEach(staff => {
      if (staff.photo.startsWith('/uploads/employees/')) {
        pathFormats['/uploads/employees/'] = (pathFormats['/uploads/employees/'] || 0) + 1;
      } else if (staff.photo.startsWith('uploads/employees/')) {
        pathFormats['uploads/employees/'] = (pathFormats['uploads/employees/'] || 0) + 1;
      } else if (staff.photo.startsWith('/static/uploads/')) {
        pathFormats['/static/uploads/'] = (pathFormats['/static/uploads/'] || 0) + 1;
      } else if (staff.photo.startsWith('http')) {
        pathFormats['http(s)://'] = (pathFormats['http(s)://'] || 0) + 1;
      } else {
        pathFormats['其他格式'] = (pathFormats['其他格式'] || 0) + 1;
      }
    });
    
    console.log('   路径格式统计:');
    Object.entries(pathFormats).forEach(([format, count]) => {
      console.log(`     ${format}: ${count} 个`);
    });
    
    // 5. 检查照片文件是否存在
    console.log('\n4. 检查照片文件是否存在:');
    const fs = require('fs');
    const path = require('path');
    
    let existingFiles = 0;
    let missingFiles = 0;
    
    for (const staff of allPhotos.slice(0, 20)) { // 检查前20个
      const photoPath = staff.photo;
      let fullPath;
      
      if (photoPath.startsWith('/uploads/')) {
        fullPath = path.join('/opt/homeservice', photoPath.substring(1)); // 去掉开头的 /
      } else if (photoPath.startsWith('uploads/')) {
        fullPath = path.join('/opt/homeservice', photoPath);
      } else {
        continue; // 跳过其他格式
      }
      
      try {
        if (fs.existsSync(fullPath)) {
          existingFiles++;
        } else {
          missingFiles++;
          if (missingFiles <= 5) { // 只显示前5个缺失的文件
            console.log(`   ❌ 缺失: ${fullPath}`);
          }
        }
      } catch (err) {
        missingFiles++;
      }
    }
    
    console.log(`   检查结果 (前20个):`);
    console.log(`     存在: ${existingFiles} 个`);
    console.log(`     缺失: ${missingFiles} 个`);
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n=== 验证完成 ===');
  }
}

verifyEmployeePhotos();
