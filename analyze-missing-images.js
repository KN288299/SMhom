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

// 分析缺失的图片文件
const analyzeMissingImages = async () => {
  try {
    await connectDB();
    
    console.log('\n=== 🔍 分析图片文件缺失情况 ===');
    
    // 1. 获取所有员工数据
    const allStaff = await Staff.find({}, { name: 1, job: 1, image: 1, photos: 1, createdAt: 1 });
    console.log(`\n📊 数据库中员工总数: ${allStaff.length}`);
    
    // 2. 获取实际存在的文件列表
    const uploadsDir = path.join(process.cwd(), 'uploads/employees');
    let existingFiles = [];
    
    try {
      existingFiles = fs.readdirSync(uploadsDir).filter(file => 
        file.match(/\.(jpg|jpeg|png|gif)$/i)
      );
      console.log(`📁 实际存在的图片文件: ${existingFiles.length} 个`);
    } catch (error) {
      console.log(`❌ 无法读取目录 ${uploadsDir}: ${error.message}`);
      return;
    }
    
    // 3. 分析哪些员工有图片，哪些没有
    let hasImageCount = 0;
    let missingImageCount = 0;
    const staffWithImages = [];
    const staffWithoutImages = [];
    
    for (const staff of allStaff) {
      const imagePath = staff.image;
      if (!imagePath) {
        staffWithoutImages.push(staff);
        missingImageCount++;
        continue;
      }
      
      // 提取文件名
      const fileName = path.basename(imagePath);
      const fileExists = existingFiles.includes(fileName);
      
      if (fileExists) {
        staffWithImages.push({
          ...staff.toObject(),
          fileName: fileName
        });
        hasImageCount++;
      } else {
        staffWithoutImages.push({
          ...staff.toObject(),
          fileName: fileName,
          reason: '文件不存在'
        });
        missingImageCount++;
      }
    }
    
    console.log(`\n📈 统计结果:`);
    console.log(`  ✅ 有图片的员工: ${hasImageCount} 人`);
    console.log(`  ❌ 缺少图片的员工: ${missingImageCount} 人`);
    
    // 4. 显示有图片的员工信息
    if (staffWithImages.length > 0) {
      console.log(`\n✅ 有图片的员工 (${staffWithImages.length} 人):`);
      staffWithImages.forEach((staff, index) => {
        console.log(`  ${index + 1}. ${staff.name} (${staff.job}) - ${staff.fileName}`);
      });
    }
    
    // 5. 显示部分缺少图片的员工
    if (staffWithoutImages.length > 0) {
      console.log(`\n❌ 缺少图片的员工 (显示前10个):`);
      staffWithoutImages.slice(0, 10).forEach((staff, index) => {
        const reason = staff.reason || '路径为空';
        console.log(`  ${index + 1}. ${staff.name} (${staff.job}) - ${reason}`);
        if (staff.fileName) {
          console.log(`     期望文件: ${staff.fileName}`);
        }
      });
      
      if (staffWithoutImages.length > 10) {
        console.log(`     ... 还有 ${staffWithoutImages.length - 10} 个员工缺少图片`);
      }
    }
    
    // 6. 分析文件创建时间模式
    console.log(`\n📅 创建时间分析:`);
    const hasImageDates = staffWithImages.map(s => s.createdAt).sort();
    const missingImageDates = staffWithoutImages.map(s => s.createdAt).sort();
    
    if (hasImageDates.length > 0) {
      console.log(`  有图片员工创建时间范围: ${hasImageDates[0].toISOString().split('T')[0]} ~ ${hasImageDates[hasImageDates.length-1].toISOString().split('T')[0]}`);
    }
    
    if (missingImageDates.length > 0) {
      console.log(`  缺图片员工创建时间范围: ${missingImageDates[0].toISOString().split('T')[0]} ~ ${missingImageDates[missingImageDates.length-1].toISOString().split('T')[0]}`);
    }
    
    // 7. 建议解决方案
    console.log(`\n💡 建议解决方案:`);
    console.log(`  1. 🎯 保留有图片的 ${hasImageCount} 个员工`);
    console.log(`  2. 🗑️  删除缺少图片的 ${missingImageCount} 个员工记录`);
    console.log(`  3. 🔄 重新导入完整的员工数据（包含图片）`);
    console.log(`  4. 🖼️  为缺失图片的员工补充默认头像`);
    
    console.log('\n=== 分析完成 ===');
    
  } catch (error) {
    console.error('分析失败:', error);
  } finally {
    mongoose.connection.close();
  }
};

// 执行分析
analyzeMissingImages();
