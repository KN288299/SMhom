const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

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

async function restoreEmployeesFromImages() {
  try {
    console.log('🔧 开始从图片目录恢复员工数据...\n');
    
    const imagesDir = 'uploads/admin-temp/extract-1755466997419/images';
    
    if (!fs.existsSync(imagesDir)) {
      console.log('❌ 图片目录不存在:', imagesDir);
      return;
    }
    
    // 获取所有员工ID目录
    const employeeIds = fs.readdirSync(imagesDir).filter(item => {
      const fullPath = path.join(imagesDir, item);
      return fs.statSync(fullPath).isDirectory();
    });
    
    console.log(`📊 找到 ${employeeIds.length} 个员工图片目录`);
    
    if (employeeIds.length === 0) {
      console.log('❌ 没有找到员工图片目录');
      return;
    }
    
    let restoredCount = 0;
    
    for (const employeeId of employeeIds) {
      const employeeDir = path.join(imagesDir, employeeId);
      const files = fs.readdirSync(employeeDir);
      
      console.log(`\n👤 处理员工 ${employeeId}:`);
      console.log(`   图片文件: ${files.join(', ')}`);
      
      // 查找头像和照片
      let avatarPath = '';
      const photosPaths = [];
      
      files.forEach(file => {
        const filePath = `/uploads/admin-temp/extract-1755466997419/images/${employeeId}/${file}`;
        if (file === 'avatar.jpg' || file === 'avatar.png') {
          avatarPath = filePath;
        } else if (file.startsWith('photo-') && (file.endsWith('.jpg') || file.endsWith('.png'))) {
          photosPaths.push(filePath);
        }
      });
      
      // 创建员工记录
      try {
        const newStaff = new Staff({
          name: `员工-${employeeId.substring(0, 8)}`, // 使用ID前8位作为临时名称
          age: 25, // 默认年龄
          job: '服务员', // 默认职业
          image: avatarPath || 'https://via.placeholder.com/150',
          province: '北京市',
          height: 165,
          weight: 50,
          description: `从图片目录恢复的员工数据，原ID: ${employeeId}`,
          photos: photosPaths,
          tag: '可预约'
        });
        
        await newStaff.save();
        restoredCount++;
        
        console.log(`   ✅ 成功创建员工记录`);
        console.log(`      头像: ${avatarPath || '无'}`);
        console.log(`      照片: ${photosPaths.length} 张`);
        
      } catch (error) {
        console.log(`   ❌ 创建员工记录失败: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 恢复完成！成功恢复 ${restoredCount} 名员工的数据`);
    
    // 验证结果
    const totalStaff = await Staff.countDocuments();
    console.log(`📊 数据库中现在共有 ${totalStaff} 名员工`);
    
  } catch (error) {
    console.error('❌ 恢复过程出错:', error);
  } finally {
    mongoose.disconnect();
  }
}

// 运行恢复脚本
restoreEmployeesFromImages();
