const mongoose = require('mongoose');
const fs = require('fs');

// MongoDB connection
const mongoUri = 'mongodb://localhost:27017/homeservice';

// Staff schema
const staffSchema = new mongoose.Schema({
  name: String,
  age: Number,
  job: String,
  province: String,
  height: Number,
  weight: Number,
  description: String,
  tag: String,
  image: String,
  photos: [String],
  createdAt: Date,
  updatedAt: Date
});

const Staff = mongoose.model('Staff', staffSchema);

async function checkRealStaffData() {
  try {
    await mongoose.connect(mongoUri);
    console.log('已连接到 MongoDB');
    
    // 1. 检查数据库中的所有集合
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n=== 数据库中的所有集合 ===');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // 2. 检查staff集合的详细信息
    const staffCount = await Staff.countDocuments();
    console.log(`\n=== Staff 集合统计 ===`);
    console.log(`总员工数: ${staffCount}`);
    
    // 3. 获取所有员工并分析
    const allStaff = await Staff.find({}).sort({ createdAt: 1 });
    
    if (allStaff.length > 0) {
      console.log('\n=== 员工数据分析 ===');
      
      // 检查是否有真实的员工名字（不是"测试员工"）
      const realStaff = allStaff.filter(staff => !staff.name.includes('测试员工'));
      const testStaff = allStaff.filter(staff => staff.name.includes('测试员工'));
      
      console.log(`真实员工数量: ${realStaff.length}`);
      console.log(`测试员工数量: ${testStaff.length}`);
      
      // 显示前10个真实员工
      if (realStaff.length > 0) {
        console.log('\n=== 前10个真实员工 ===');
        realStaff.slice(0, 10).forEach((staff, index) => {
          console.log(`${index + 1}. ${staff.name} - ${staff.job} - ${staff.province}`);
          console.log(`   照片: ${staff.image}`);
          console.log(`   创建时间: ${staff.createdAt.toISOString()}`);
        });
      }
      
      // 显示测试员工
      if (testStaff.length > 0) {
        console.log('\n=== 测试员工 ===');
        testStaff.forEach((staff, index) => {
          console.log(`${index + 1}. ${staff.name} - 照片: ${staff.image}`);
        });
      }
      
      // 检查照片路径格式
      console.log('\n=== 照片路径格式分析 ===');
      const pathTypes = {
        placeholder: 0,
        employees: 0,
        uploads: 0,
        other: 0,
        empty: 0
      };
      
      allStaff.forEach(staff => {
        if (!staff.image) {
          pathTypes.empty++;
        } else if (staff.image.includes('placeholder')) {
          pathTypes.placeholder++;
        } else if (staff.image.includes('/uploads/employees/')) {
          pathTypes.employees++;
        } else if (staff.image.includes('/uploads/')) {
          pathTypes.uploads++;
        } else {
          pathTypes.other++;
        }
      });
      
      console.log(`占位符照片: ${pathTypes.placeholder}`);
      console.log(`员工目录照片: ${pathTypes.employees}`);
      console.log(`其他上传照片: ${pathTypes.uploads}`);
      console.log(`其他格式: ${pathTypes.other}`);
      console.log(`空照片: ${pathTypes.empty}`);
    }
    
    // 4. 检查是否有数据导入文件
    console.log('\n=== 检查数据导入文件 ===');
    const currentDir = process.cwd();
    const files = fs.readdirSync(currentDir);
    
    const importFiles = files.filter(file => 
      file.includes('import') || 
      file.includes('staff') || 
      file.includes('employee') ||
      file.includes('data') ||
      file.endsWith('.json')
    );
    
    console.log('可能的导入文件:');
    importFiles.forEach(file => {
      const stats = fs.statSync(file);
      console.log(`  - ${file} (${Math.round(stats.size / 1024)}KB)`);
    });
    
    // 5. 检查图片文件情况
    console.log('\n=== 图片文件情况 ===');
    const imagesDir = '/opt/homeservice/uploads/images';
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir);
      const compressedPhotos = imageFiles.filter(f => f.startsWith('compressed-photo-'));
      console.log(`图片目录: ${imagesDir}`);
      console.log(`总图片文件: ${imageFiles.length}`);
      console.log(`压缩照片文件: ${compressedPhotos.length}`);
    } else {
      console.log('图片目录不存在');
    }
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// 运行检查
checkRealStaffData();
