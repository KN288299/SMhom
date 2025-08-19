const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

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

async function fixEmployeePhotoMapping() {
  try {
    await mongoose.connect(mongoUri);
    console.log('已连接到 MongoDB');
    
    // 1. 获取所有员工数据，按创建时间排序
    const allStaff = await Staff.find({}).sort({ createdAt: 1 });
    console.log(`找到 ${allStaff.length} 个员工记录`);
    
    // 2. 获取所有压缩照片文件，按修改时间排序
    const imagesDir = '/opt/homeservice/uploads/images';
    const imageFiles = fs.readdirSync(imagesDir)
      .filter(file => file.startsWith('compressed-photo-') && file.endsWith('.jpg'))
      .map(file => {
        const fullPath = path.join(imagesDir, file);
        const stats = fs.statSync(fullPath);
        return {
          filename: file,
          fullPath: fullPath,
          mtime: stats.mtime
        };
      })
      .sort((a, b) => a.mtime - b.mtime);
    
    console.log(`找到 ${imageFiles.length} 个压缩照片文件`);
    
    // 3. 分析当前数据库中的照片路径格式
    console.log('\n=== 当前数据库照片路径分析 ===');
    const pathAnalysis = {
      employeeFormat: 0,
      uploadsFormat: 0,
      imageIdFormat: 0,
      empty: 0,
      other: 0
    };
    
    allStaff.forEach(staff => {
      if (!staff.image) {
        pathAnalysis.empty++;
      } else if (staff.image.includes('/uploads/employees/')) {
        pathAnalysis.employeeFormat++;
      } else if (staff.image.includes('/uploads/')) {
        pathAnalysis.uploadsFormat++;
      } else if (/^[a-f0-9]{24}$/i.test(path.basename(staff.image, '.jpg'))) {
        pathAnalysis.imageIdFormat++;
      } else {
        pathAnalysis.other++;
      }
    });
    
    console.log('路径格式统计：');
    console.log(`  /uploads/employees/ 格式: ${pathAnalysis.employeeFormat}`);
    console.log(`  其他 /uploads/ 格式: ${pathAnalysis.uploadsFormat}`);
    console.log(`  纯ID格式: ${pathAnalysis.imageIdFormat}`);
    console.log(`  空路径: ${pathAnalysis.empty}`);
    console.log(`  其他格式: ${pathAnalysis.other}`);
    
    // 4. 显示前10个员工的当前照片路径
    console.log('\n=== 前10个员工的当前照片路径 ===');
    allStaff.slice(0, 10).forEach((staff, index) => {
      console.log(`${index + 1}. ${staff.name} (${staff.createdAt.toISOString()})`);
      console.log(`   主照片: ${staff.image || '无'}`);
      console.log(`   附加照片: ${staff.photos && staff.photos.length > 0 ? staff.photos.join(', ') : '无'}`);
    });
    
    // 5. 显示前20个图片文件的时间
    console.log('\n=== 前20个图片文件的时间 ===');
    imageFiles.slice(0, 20).forEach((img, index) => {
      console.log(`${index + 1}. ${img.filename} (${img.mtime.toISOString()})`);
    });
    
    // 6. 检查是否可以按时间匹配
    console.log('\n=== 时间匹配分析 ===');
    const staffCreationTimes = allStaff.map(s => s.createdAt);
    const imageModificationTimes = imageFiles.map(i => i.mtime);
    
    console.log(`员工创建时间范围: ${staffCreationTimes[0].toISOString()} 到 ${staffCreationTimes[staffCreationTimes.length-1].toISOString()}`);
    console.log(`图片修改时间范围: ${imageModificationTimes[0].toISOString()} 到 ${imageModificationTimes[imageModificationTimes.length-1].toISOString()}`);
    
    // 7. 尝试建立映射关系（简单的按顺序匹配）
    console.log('\n=== 建议的修复方案 ===');
    
    if (allStaff.length <= imageFiles.length) {
      console.log('✅ 图片数量足够，可以为每个员工分配照片');
      console.log('\n建议的映射关系（前10个）：');
      
      allStaff.slice(0, 10).forEach((staff, index) => {
        if (index < imageFiles.length) {
          const newImagePath = `/uploads/employees/${staff._id}.jpg`;
          console.log(`${staff.name} -> ${imageFiles[index].filename} -> ${newImagePath}`);
        }
      });
      
      // 生成修复命令
      console.log('\n=== 修复步骤 ===');
      console.log('1. 创建员工照片目录：');
      console.log('   mkdir -p /opt/homeservice/uploads/employees');
      
      console.log('\n2. 复制并重命名照片文件：');
      allStaff.slice(0, Math.min(allStaff.length, imageFiles.length)).forEach((staff, index) => {
        console.log(`   cp "${imageFiles[index].fullPath}" "/opt/homeservice/uploads/employees/${staff._id}.jpg"`);
      });
      
      console.log('\n3. 运行数据库更新脚本更新照片路径');
      
    } else {
      console.log('⚠️ 员工数量多于图片数量，部分员工可能没有照片');
      console.log(`员工数量: ${allStaff.length}, 图片数量: ${imageFiles.length}`);
    }
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// 运行修复分析
fixEmployeePhotoMapping();
