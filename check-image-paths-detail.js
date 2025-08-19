const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 员工模型
const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  job: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  photos: [{ type: String }],
  price: { type: Number, required: true },
  province: { type: String, required: true },
  city: { type: String, required: true },
  district: { type: String, required: true },
  rating: { type: Number, default: 5 },
  tag: { type: String, default: '可预约' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Staff = mongoose.model('Staff', staffSchema);

// 连接数据库
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homeservicechat';
    await mongoose.connect(mongoURI);
    console.log('MongoDB 连接成功');
  } catch (error) {
    console.error('MongoDB 连接失败:', error.message);
    process.exit(1);
  }
};

// 检查图片路径详情
const checkImagePathsDetail = async () => {
  try {
    await connectDB();
    
    console.log('\n=== 🔍 详细检查员工头像路径 ===');
    
    // 1. 随机取10个员工检查详细信息
    const sampleStaff = await Staff.find({}).limit(10);
    
    console.log('\n📋 员工头像路径样本:');
    sampleStaff.forEach((staff, index) => {
      console.log(`\n${index + 1}. 员工: ${staff.name} (${staff.job})`);
      console.log(`   头像路径: "${staff.image}"`);
      console.log(`   照片数量: ${staff.photos ? staff.photos.length : 0}`);
      if (staff.photos && staff.photos.length > 0) {
        console.log(`   首张照片: "${staff.photos[0]}"`);
      }
    });
    
    // 2. 分析路径格式
    console.log('\n🔍 路径格式分析:');
    const allStaff = await Staff.find({}, { image: 1, photos: 1 });
    
    const pathPatterns = new Map();
    allStaff.forEach(staff => {
      if (staff.image) {
        const pattern = staff.image.split('/').slice(0, -1).join('/');
        pathPatterns.set(pattern, (pathPatterns.get(pattern) || 0) + 1);
      }
    });
    
    console.log('头像路径格式统计:');
    [...pathPatterns.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([pattern, count]) => {
        console.log(`  ${pattern}/[文件名] : ${count} 个`);
      });
    
    // 3. 检查实际文件是否存在
    console.log('\n📁 检查文件是否存在:');
    const samplePaths = sampleStaff.slice(0, 5).map(s => s.image);
    
    for (const imagePath of samplePaths) {
      if (!imagePath) continue;
      
      // 尝试不同的基础路径
      const possiblePaths = [
        imagePath, // 原始路径
        path.join(process.cwd(), imagePath), // 相对于当前目录
        path.join(process.cwd(), 'public', imagePath), // public目录
        path.join(process.cwd(), 'src/public', imagePath), // src/public目录
        imagePath.replace(/^\//, ''), // 去掉开头的斜杠
        path.join(process.cwd(), imagePath.replace(/^\//, '')), // 去掉斜杠后的相对路径
      ];
      
      console.log(`\n检查路径: ${imagePath}`);
      let found = false;
      
      for (const testPath of possiblePaths) {
        try {
          if (fs.existsSync(testPath)) {
            const stats = fs.statSync(testPath);
            console.log(`  ✅ 找到文件: ${testPath} (${Math.round(stats.size/1024)}KB)`);
            found = true;
            break;
          }
        } catch (error) {
          // 忽略错误，继续检查下一个路径
        }
      }
      
      if (!found) {
        console.log(`  ❌ 文件不存在于任何可能的路径`);
      }
    }
    
    // 4. 检查 uploads 和 public 目录结构
    console.log('\n📂 检查目录结构:');
    const dirsToCheck = [
      'public',
      'src/public', 
      'uploads',
      'public/uploads',
      'src/public/uploads',
      'public/images',
      'src/public/images',
      'public/employees',
      'src/public/employees'
    ];
    
    for (const dir of dirsToCheck) {
      const fullPath = path.join(process.cwd(), dir);
      try {
        if (fs.existsSync(fullPath)) {
          const files = fs.readdirSync(fullPath);
          console.log(`  ✅ ${dir}/ 存在 (${files.length} 个文件)`);
          
          // 显示前几个文件作为示例
          if (files.length > 0) {
            const sampleFiles = files.slice(0, 3);
            sampleFiles.forEach(file => {
              console.log(`     - ${file}`);
            });
            if (files.length > 3) {
              console.log(`     ... 还有 ${files.length - 3} 个文件`);
            }
          }
        } else {
          console.log(`  ❌ ${dir}/ 不存在`);
        }
      } catch (error) {
        console.log(`  ❌ ${dir}/ 无法访问: ${error.message}`);
      }
    }
    
    console.log('\n=== 检查完成 ===');
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    mongoose.connection.close();
  }
};

// 执行检查
checkImagePathsDetail();
