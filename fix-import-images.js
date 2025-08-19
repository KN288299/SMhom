const mongoose = require('mongoose');
const Staff = require('./src/models/staffModel');
const fs = require('fs');
const path = require('path');

// 连接数据库
mongoose.connect('mongodb://localhost:27017/homeservice', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function fixImportImages() {
  try {
    console.log('🔧 修复导入员工的图片问题...');
    
    // 获取所有使用占位图的员工
    const placeholderStaff = await Staff.find({ 
      image: { $regex: /placeholder\.com/ },
      isActive: true 
    });
    
    console.log(`📋 找到 ${placeholderStaff.length} 名使用占位图的员工`);
    
    if (placeholderStaff.length === 0) {
      console.log('✅ 没有发现使用占位图的员工');
      return;
    }
    
    // 为每个员工生成随机图片
    for (let i = 0; i < placeholderStaff.length; i++) {
      const staff = placeholderStaff[i];
      
      console.log(`\n🔄 处理员工: ${staff.name}`);
      
      // 生成随机图片URL（使用不同的占位图服务）
      const randomColors = [
        'FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7', 
        'DDA0DD', '98D8C8', 'F7DC6F', 'BB8FCE', '85C1E9'
      ];
      
      const randomColor = randomColors[Math.floor(Math.random() * randomColors.length)];
      const newImageUrl = `https://via.placeholder.com/300x400/${randomColor}/FFFFFF?text=${encodeURIComponent(staff.name)}`;
      
      // 生成随机照片集
      const photoCount = Math.floor(Math.random() * 3) + 1; // 1-3张照片
      const newPhotos = [];
      
      for (let j = 0; j < photoCount; j++) {
        const photoColor = randomColors[Math.floor(Math.random() * randomColors.length)];
        const photoUrl = `https://via.placeholder.com/300x400/${photoColor}/FFFFFF?text=${encodeURIComponent(staff.name)}-照片${j+1}`;
        newPhotos.push(photoUrl);
      }
      
      // 更新员工记录
      await Staff.findByIdAndUpdate(staff._id, {
        image: newImageUrl,
        photos: newPhotos
      });
      
      console.log(`✅ 已更新 ${staff.name} 的图片`);
      console.log(`   新主图: ${newImageUrl}`);
      console.log(`   新照片数: ${newPhotos.length}`);
    }
    
    // 验证修复结果
    console.log('\n🔍 验证修复结果...');
    const updatedStaff = await Staff.find({ 
      _id: { $in: placeholderStaff.map(s => s._id) }
    }).select('name image photos');
    
    let fixedCount = 0;
    updatedStaff.forEach(staff => {
      if (!staff.image.includes('placeholder.com') || staff.photos.length > 0) {
        fixedCount++;
        console.log(`✅ ${staff.name}: 图片已修复`);
      } else {
        console.log(`❌ ${staff.name}: 图片修复失败`);
      }
    });
    
    console.log(`\n📊 修复统计: ${fixedCount}/${updatedStaff.length} 名员工图片已修复`);
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

// 创建示例导入数据
async function createSampleImportData() {
  try {
    console.log('📝 创建示例导入数据...');
    
    const sampleData = {
      staff: [
        {
          name: '示例员工1',
          age: 25,
          job: '模特',
          province: '北京市',
          image: 'https://via.placeholder.com/300x400/FF6B6B/FFFFFF?text=示例员工1',
          photos: [
            'https://via.placeholder.com/300x400/4ECDC4/FFFFFF?text=照片1',
            'https://via.placeholder.com/300x400/45B7D1/FFFFFF?text=照片2'
          ],
          height: 168,
          weight: 50,
          description: '专业模特，形象气质佳',
          tag: '可预约'
        },
        {
          name: '示例员工2',
          age: 23,
          job: '舞蹈老师',
          province: '上海市',
          image: 'https://via.placeholder.com/300x400/96CEB4/FFFFFF?text=示例员工2',
          photos: [
            'https://via.placeholder.com/300x400/FFEAA7/FFFFFF?text=照片1',
            'https://via.placeholder.com/300x400/DDA0DD/FFFFFF?text=照片2',
            'https://via.placeholder.com/300x400/98D8C8/FFFFFF?text=照片3'
          ],
          height: 165,
          weight: 48,
          description: '专业舞蹈老师，身材优美',
          tag: '可预约'
        }
      ]
    };
    
    const sampleFile = 'sample-import-data.json';
    fs.writeFileSync(sampleFile, JSON.stringify(sampleData, null, 2));
    
    console.log(`✅ 示例数据已保存到: ${sampleFile}`);
    console.log('📋 数据格式说明:');
    console.log('   - 每个员工必须包含: name, age, job');
    console.log('   - image: 主图片URL或base64数据');
    console.log('   - photos: 照片集数组');
    console.log('   - 其他字段为可选');
    
  } catch (error) {
    console.error('❌ 创建示例数据失败:', error);
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--fix')) {
    await fixImportImages();
  } else if (args.includes('--sample')) {
    await createSampleImportData();
  } else {
    console.log('使用方法:');
    console.log('  node fix-import-images.js --fix     # 修复现有员工的图片');
    console.log('  node fix-import-images.js --sample  # 创建示例导入数据');
  }
}

main();
