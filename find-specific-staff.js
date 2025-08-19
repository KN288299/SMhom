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
}, { timestamps: true });

const Staff = mongoose.model('Staff', staffSchema);

async function findSpecificStaff() {
  try {
    console.log('🔍 查找员工ID: 68a46bcdc0c157231d4e53c5');
    
    const targetId = '68a46bcdc0c157231d4e53c5';
    
    // 查找特定员工
    const staff = await Staff.findById(targetId);
    
    if (!staff) {
      console.log('❌ 未找到该员工记录');
      
      // 检查是否有类似的ID
      console.log('\n🔍 搜索类似的ID...');
      const allStaff = await Staff.find({}, '_id name createdAt').sort({ createdAt: -1 }).limit(10);
      console.log('最近的10个员工记录:');
      allStaff.forEach((s, index) => {
        console.log(`${index + 1}. ID: ${s._id}, 姓名: ${s.name}, 创建时间: ${s.createdAt}`);
      });
      
      return;
    }
    
    console.log('\n✅ 找到员工记录:');
    console.log('='.repeat(50));
    console.log(`📋 姓名: ${staff.name}`);
    console.log(`🎂 年龄: ${staff.age}`);
    console.log(`💼 职业: ${staff.job}`);
    console.log(`🏠 省份: ${staff.province}`);
    console.log(`📏 身高: ${staff.height}cm`);
    console.log(`⚖️ 体重: ${staff.weight}kg`);
    console.log(`📝 描述: ${staff.description}`);
    console.log(`🏷️ 标签: ${staff.tag}`);
    console.log(`✅ 活跃状态: ${staff.isActive}`);
    console.log(`📅 创建时间: ${staff.createdAt}`);
    console.log(`🔄 更新时间: ${staff.updatedAt}`);
    console.log('='.repeat(50));
    
    console.log('\n🖼️ 图片信息:');
    console.log(`主头像: ${staff.image}`);
    
    if (staff.photos && staff.photos.length > 0) {
      console.log(`照片集 (${staff.photos.length}张):`);
      staff.photos.forEach((photo, index) => {
        console.log(`  ${index + 1}. ${photo}`);
      });
    } else {
      console.log('照片集: 无');
    }
    
    // 检查图片文件是否存在
    console.log('\n📁 检查图片文件存在性:');
    
    // 检查主头像
    if (staff.image && !staff.image.startsWith('http')) {
      const imagePath = path.join(__dirname, staff.image);
      const imageExists = fs.existsSync(imagePath);
      console.log(`主头像文件: ${imageExists ? '✅ 存在' : '❌ 不存在'} - ${imagePath}`);
    }
    
    // 检查照片集
    if (staff.photos && staff.photos.length > 0) {
      staff.photos.forEach((photo, index) => {
        if (!photo.startsWith('http')) {
          const photoPath = path.join(__dirname, photo);
          const photoExists = fs.existsSync(photoPath);
          console.log(`照片${index + 1}: ${photoExists ? '✅ 存在' : '❌ 不存在'} - ${photoPath}`);
        }
      });
    }
    
    // 检查可能的图片目录
    console.log('\n📂 检查可能的图片目录:');
    const possibleDirs = [
      'uploads/employees',
      'uploads/images', 
      'uploads/admin-temp',
      `uploads/employees/${targetId}`,
      `uploads/images/${targetId}`
    ];
    
    possibleDirs.forEach(dir => {
      const dirPath = path.join(__dirname, dir);
      const exists = fs.existsSync(dirPath);
      console.log(`${dir}: ${exists ? '✅ 存在' : '❌ 不存在'}`);
      
      if (exists) {
        try {
          const files = fs.readdirSync(dirPath);
          console.log(`  包含 ${files.length} 个文件`);
          
          // 查找与该员工ID相关的文件
          const relatedFiles = files.filter(file => 
            file.includes(targetId) || 
            file.includes(staff.name) ||
            file.includes('employee')
          );
          
          if (relatedFiles.length > 0) {
            console.log(`  🎯 可能相关的文件:`);
            relatedFiles.forEach(file => {
              console.log(`    - ${file}`);
            });
          }
        } catch (error) {
          console.log(`  ❌ 无法读取目录: ${error.message}`);
        }
      }
    });
    
    // 查看是否与导入数据混合
    console.log('\n🔄 检查数据来源:');
    
    // 检查最近创建的员工
    const recentStaff = await Staff.find({}).sort({ createdAt: -1 }).limit(20);
    
    console.log('\n📊 最近20个员工记录的创建时间分布:');
    recentStaff.forEach((s, index) => {
      const isTarget = s._id.toString() === targetId;
      const marker = isTarget ? '👉' : '  ';
      console.log(`${marker} ${index + 1}. ${s.name} - ${s.createdAt} ${isTarget ? '(目标员工)' : ''}`);
    });
    
    // 分析数据特征
    console.log('\n🔍 数据特征分析:');
    
    // 检查图片路径模式
    const imagePathPattern = staff.image;
    if (imagePathPattern.includes('employee-imported-')) {
      console.log('📥 该员工可能是通过导入功能创建的（图片路径包含"imported"）');
    } else if (imagePathPattern.includes('employee-')) {
      console.log('➕ 该员工可能是通过普通添加功能创建的');
    } else {
      console.log('❓ 无法确定员工创建方式');
    }
    
    // 检查创建时间模式
    const createTime = new Date(staff.createdAt);
    const now = new Date();
    const hoursAgo = (now - createTime) / (1000 * 60 * 60);
    
    console.log(`⏰ 创建于 ${hoursAgo.toFixed(1)} 小时前`);
    
    if (hoursAgo < 24) {
      console.log('🆕 这是最近24小时内创建的员工');
    }
    
  } catch (error) {
    console.error('❌ 查询出错:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}

findSpecificStaff();
