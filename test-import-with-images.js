const mongoose = require('mongoose');
const Staff = require('./src/models/staffModel');
const fs = require('fs');
const path = require('path');

// 连接数据库
mongoose.connect('mongodb://localhost:27017/homeservice', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testImportWithImages() {
  try {
    console.log('🧪 测试导入功能中的图片处理...');
    
    // 创建测试数据
    const testStaffData = [
      {
        name: '测试员工1',
        age: 25,
        job: '测试职业',
        province: '北京市',
        image: 'https://via.placeholder.com/300x400/FF6B6B/FFFFFF?text=测试员工1',
        photos: [
          'https://via.placeholder.com/300x400/4ECDC4/FFFFFF?text=照片1',
          'https://via.placeholder.com/300x400/45B7D1/FFFFFF?text=照片2'
        ]
      },
      {
        name: '测试员工2',
        age: 26,
        job: '测试职业2',
        province: '上海市',
        image: 'https://via.placeholder.com/300x400/96CEB4/FFFFFF?text=测试员工2',
        photos: [
          'https://via.placeholder.com/300x400/FFEAA7/FFFFFF?text=照片1',
          'https://via.placeholder.com/300x400/DDA0DD/FFFFFF?text=照片2',
          'https://via.placeholder.com/300x400/98D8C8/FFFFFF?text=照片3'
        ]
      }
    ];
    
    console.log('📝 测试数据:');
    testStaffData.forEach((staff, index) => {
      console.log(`\n${index + 1}. ${staff.name}`);
      console.log(`   主图: ${staff.image}`);
      console.log(`   照片数量: ${staff.photos.length}`);
      staff.photos.forEach((photo, photoIndex) => {
        console.log(`     照片${photoIndex + 1}: ${photo}`);
      });
    });
    
    // 检查uploads目录
    const uploadsDir = path.join(__dirname, 'uploads/employees');
    console.log(`\n📁 检查uploads目录: ${uploadsDir}`);
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ uploads/employees 目录不存在，创建中...');
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ 目录创建成功');
    } else {
      console.log('✅ uploads/employees 目录存在');
      const files = fs.readdirSync(uploadsDir);
      console.log(`   现有文件数: ${files.length}`);
    }
    
    // 模拟导入过程
    console.log('\n🔄 开始模拟导入过程...');
    
    for (let i = 0; i < testStaffData.length; i++) {
      const staffInfo = testStaffData[i];
      
      console.log(`\n📥 导入员工: ${staffInfo.name}`);
      
      // 检查是否已存在
      const existingStaff = await Staff.findOne({ 
        name: staffInfo.name, 
        isActive: true 
      });
      
      if (existingStaff) {
        console.log(`⚠️ 员工"${staffInfo.name}"已存在，跳过`);
        continue;
      }
      
      // 处理图片
      let imageUrl = staffInfo.image;
      let photoUrls = [...staffInfo.photos];
      
      console.log(`   主图URL: ${imageUrl}`);
      console.log(`   照片URLs: ${photoUrls.join(', ')}`);
      
      // 创建员工记录
      const newStaff = new Staff({
        name: staffInfo.name,
        age: parseInt(staffInfo.age),
        job: staffInfo.job,
        image: imageUrl,
        province: staffInfo.province || '北京市',
        height: parseFloat(staffInfo.height) || 165,
        weight: parseFloat(staffInfo.weight) || 50,
        description: staffInfo.description || '',
        photos: photoUrls,
        tag: staffInfo.tag || '可预约'
      });
      
      await newStaff.save();
      console.log(`✅ 成功导入员工: ${staffInfo.name}`);
    }
    
    // 验证导入结果
    console.log('\n🔍 验证导入结果...');
    const importedStaff = await Staff.find({ 
      name: { $in: testStaffData.map(s => s.name) },
      isActive: true 
    }).select('name image photos createdAt');
    
    console.log(`📋 找到 ${importedStaff.length} 名导入的员工`);
    
    importedStaff.forEach((staff, index) => {
      console.log(`\n${index + 1}. ${staff.name} (${staff.createdAt.toLocaleString()})`);
      console.log(`   主图: ${staff.image}`);
      console.log(`   照片数量: ${staff.photos ? staff.photos.length : 0}`);
      
      if (staff.photos && staff.photos.length > 0) {
        staff.photos.forEach((photo, photoIndex) => {
          console.log(`     照片${photoIndex + 1}: ${photo}`);
        });
      }
    });
    
    // 检查占位图问题
    console.log('\n🔍 检查占位图问题...');
    const placeholderStaff = await Staff.find({ 
      image: { $regex: /placeholder\.com/ },
      isActive: true 
    }).select('name image createdAt').limit(5);
    
    if (placeholderStaff.length > 0) {
      console.log(`⚠️ 发现 ${placeholderStaff.length} 名员工使用占位图:`);
      placeholderStaff.forEach(staff => {
        console.log(`   ${staff.name}: ${staff.image}`);
      });
    } else {
      console.log('✅ 没有发现使用占位图的员工');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

testImportWithImages();
