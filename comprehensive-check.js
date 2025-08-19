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
    console.log('连接的数据库:', mongoose.connection.db.databaseName);
  } catch (error) {
    console.error('MongoDB 连接失败:', error.message);
    process.exit(1);
  }
};

// 递归获取目录中的所有文件
const getAllFiles = (dirPath, arrayOfFiles = []) => {
  if (!fs.existsSync(dirPath)) {
    return arrayOfFiles;
  }

  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push({
        path: fullPath,
        size: stat.size,
        modified: stat.mtime
      });
    }
  });
  
  return arrayOfFiles;
};

// 检查图片文件内容
const analyzeImageFile = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    const buffer = fs.readFileSync(filePath);
    
    // 检查文件头来判断图片类型
    let imageType = 'unknown';
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      imageType = 'JPEG';
    } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      imageType = 'PNG';
    } else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      imageType = 'GIF';
    } else if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
      imageType = 'BMP';
    }
    
    return {
      type: imageType,
      size: stats.size,
      isValid: imageType !== 'unknown'
    };
  } catch (error) {
    return {
      type: 'error',
      size: 0,
      isValid: false,
      error: error.message
    };
  }
};

// 全面检查系统
const comprehensiveCheck = async () => {
  try {
    await connectDB();
    
    console.log('\n=== 🔍 全面检查员工数据和文件 ===\n');
    
    // 1. 检查数据库中的员工数据
    console.log('1. 📊 检查数据库中的员工数据...');
    const staffCount = await Staff.countDocuments({});
    console.log(`   员工总数: ${staffCount}`);
    
    if (staffCount > 0) {
      const staffSample = await Staff.find({}).limit(5);
      console.log('   前5名员工样本:');
      staffSample.forEach((staff, index) => {
        console.log(`   ${index + 1}. ${staff.name} - ${staff.job} (${staff.isActive ? '活跃' : '停用'})`);
      });
    }
    
    // 2. 检查所有可能的集合
    console.log('\n2. 📋 检查数据库中的所有集合...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('   数据库中的集合:');
    collections.forEach(collection => {
      console.log(`   - ${collection.name}`);
    });
    
    // 3. 检查uploads目录
    console.log('\n3. 📁 检查uploads目录结构...');
    const uploadsPath = path.join('src', 'uploads');
    if (fs.existsSync(uploadsPath)) {
      console.log(`   uploads目录存在: ${uploadsPath}`);
      
      // 获取所有子目录
      const items = fs.readdirSync(uploadsPath);
      console.log('   子目录/文件:');
      items.forEach(item => {
        const itemPath = path.join(uploadsPath, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
          console.log(`   📂 ${item}/`);
        } else {
          console.log(`   📄 ${item} (${stat.size} bytes)`);
        }
      });
    } else {
      console.log('   uploads目录不存在');
    }
    
    // 4. 检查employees目录
    console.log('\n4. 👥 检查employees目录...');
    const employeesPath = path.join('src', 'uploads', 'employees');
    if (fs.existsSync(employeesPath)) {
      console.log(`   employees目录存在: ${employeesPath}`);
      const files = getAllFiles(employeesPath);
      console.log(`   找到 ${files.length} 个文件:`);
      
      files.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.path} (${file.size} bytes, 修改时间: ${file.modified.toLocaleString()})`);
      });
    } else {
      console.log('   employees目录不存在');
    }
    
    // 5. 搜索所有可能的员工图片文件
    console.log('\n5. 🖼️  搜索所有图片文件...');
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const allImageFiles = [];
    
    // 搜索整个src目录
    const srcPath = path.join('src');
    if (fs.existsSync(srcPath)) {
      const allFiles = getAllFiles(srcPath);
      const imageFiles = allFiles.filter(file => {
        const ext = path.extname(file.path).toLowerCase();
        return imageExtensions.includes(ext);
      });
      
      console.log(`   在src目录中找到 ${imageFiles.length} 个图片文件:`);
      imageFiles.forEach((file, index) => {
        const relativePath = path.relative(process.cwd(), file.path);
        const imageInfo = analyzeImageFile(file.path);
        console.log(`   ${index + 1}. ${relativePath}`);
        console.log(`      类型: ${imageInfo.type}, 大小: ${imageInfo.size} bytes, 有效: ${imageInfo.isValid ? '是' : '否'}`);
        if (imageInfo.error) {
          console.log(`      错误: ${imageInfo.error}`);
        }
      });
      
      allImageFiles.push(...imageFiles);
    }
    
    // 6. 检查public目录（如果存在）
    console.log('\n6. 🌐 检查public目录...');
    const publicPath = path.join('public');
    if (fs.existsSync(publicPath)) {
      const publicFiles = getAllFiles(publicPath);
      const publicImages = publicFiles.filter(file => {
        const ext = path.extname(file.path).toLowerCase();
        return imageExtensions.includes(ext);
      });
      
      console.log(`   在public目录中找到 ${publicImages.length} 个图片文件:`);
      publicImages.forEach((file, index) => {
        const relativePath = path.relative(process.cwd(), file.path);
        console.log(`   ${index + 1}. ${relativePath} (${file.size} bytes)`);
      });
      
      allImageFiles.push(...publicImages);
    } else {
      console.log('   public目录不存在');
    }
    
    // 7. 检查是否有employee相关的文件
    console.log('\n7. 🔍 搜索包含"employee"关键词的文件...');
    const employeeFiles = allImageFiles.filter(file => 
      file.path.toLowerCase().includes('employee') || 
      file.path.toLowerCase().includes('staff') ||
      file.path.toLowerCase().includes('worker')
    );
    
    if (employeeFiles.length > 0) {
      console.log(`   找到 ${employeeFiles.length} 个可能的员工相关文件:`);
      employeeFiles.forEach((file, index) => {
        const relativePath = path.relative(process.cwd(), file.path);
        console.log(`   ${index + 1}. ${relativePath} (${file.size} bytes)`);
      });
    } else {
      console.log('   没有找到包含employee/staff/worker关键词的文件');
    }
    
    // 8. 总结
    console.log('\n=== 📊 检查总结 ===');
    console.log(`✅ 数据库员工记录: ${staffCount} 条`);
    console.log(`✅ 总图片文件数量: ${allImageFiles.length} 个`);
    console.log(`✅ 员工相关文件: ${employeeFiles.length} 个`);
    console.log(`✅ employees目录: ${fs.existsSync(employeesPath) ? '存在' : '不存在'}`);
    
    if (staffCount === 0 && employeeFiles.length === 0 && !fs.existsSync(employeesPath)) {
      console.log('\n🎉 系统完全干净！没有发现任何员工数据或相关文件。');
    } else {
      console.log('\n⚠️  发现以下需要注意的项目:');
      if (staffCount > 0) console.log(`   - 数据库中还有 ${staffCount} 条员工记录`);
      if (employeeFiles.length > 0) console.log(`   - 发现 ${employeeFiles.length} 个可能的员工相关文件`);
      if (fs.existsSync(employeesPath)) console.log('   - employees目录仍然存在');
    }
    
  } catch (error) {
    console.error('检查过程中发生错误:', error);
  } finally {
    mongoose.connection.close();
  }
};

// 执行检查
comprehensiveCheck();
