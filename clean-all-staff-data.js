const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 连接数据库
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
};

// 员工模型
const staffSchema = new mongoose.Schema({
  name: String,
  age: Number,
  job: String,
  image: String,
  province: String,
  height: Number,
  weight: Number,
  description: String,
  photos: [String],
  tag: String
}, { timestamps: true });

const Staff = mongoose.model('Staff', staffSchema);

// 清理员工图片文件
const cleanStaffImages = () => {
  console.log('\n🗑️ 清理员工图片文件...');
  
  const uploadsDir = path.join(__dirname, 'uploads', 'employees');
  
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    let deletedCount = 0;
    
    files.forEach(file => {
      try {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`🗑️ 删除图片: ${file}`);
        }
      } catch (error) {
        console.error(`❌ 删除文件失败 ${file}:`, error.message);
      }
    });
    
    console.log(`✅ 共删除 ${deletedCount} 个图片文件`);
  } else {
    console.log('📁 uploads/employees 目录不存在');
  }
};

// 清理临时文件
const cleanTempFiles = () => {
  console.log('\n🗑️ 清理临时文件...');
  
  const tempDirs = [
    path.join(__dirname, 'uploads', 'temp'),
    path.join(__dirname, 'temp-import-images'),
    path.join(__dirname, 'temp-test-images')
  ];
  
  tempDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`🗑️ 删除临时目录: ${dir}`);
      } catch (error) {
        console.error(`❌ 删除临时目录失败 ${dir}:`, error.message);
      }
    }
  });
};

// 主清理函数
const cleanAllStaffData = async () => {
  console.log('🧹 开始清理所有员工数据...\n');
  
  try {
    // 连接数据库
    await connectDB();
    
    // 1. 清理数据库中的员工数据
    console.log('🗑️ 清理数据库中的员工数据...');
    const deleteResult = await Staff.deleteMany({});
    console.log(`✅ 删除了 ${deleteResult.deletedCount} 条员工记录`);
    
    // 2. 清理员工图片文件
    cleanStaffImages();
    
    // 3. 清理临时文件
    cleanTempFiles();
    
    console.log('\n✅ 所有员工数据清理完成！');
    console.log('\n📊 清理统计:');
    console.log(`- 数据库记录: ${deleteResult.deletedCount} 条已删除`);
    console.log('- 图片文件: 已全部清理');
    console.log('- 临时文件: 已全部清理');
    
    console.log('\n🚀 现在可以重新导入数据了！');
    
    // 验证清理结果
    const remainingCount = await Staff.countDocuments();
    console.log(`\n🔍 验证: 数据库中剩余员工记录 ${remainingCount} 条`);
    
    if (remainingCount === 0) {
      console.log('✅ 数据库清理验证通过');
    } else {
      console.log('⚠️ 数据库中仍有残留数据');
    }
    
  } catch (error) {
    console.error('❌ 清理过程中出错:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
};

// 提供选择性清理选项
const args = process.argv.slice(2);
const showHelp = () => {
  console.log('\n使用方法:');
  console.log('node clean-all-staff-data.js [选项]');
  console.log('\n选项:');
  console.log('  --database-only    只清理数据库，保留图片文件');
  console.log('  --files-only      只清理图片文件，保留数据库');
  console.log('  --help           显示此帮助信息');
  console.log('\n无参数: 清理所有数据（数据库+文件）');
};

if (args.includes('--help')) {
  showHelp();
  process.exit(0);
}

if (args.includes('--database-only')) {
  // 只清理数据库
  connectDB().then(async () => {
    try {
      console.log('🗑️ 只清理数据库中的员工数据...');
      const deleteResult = await Staff.deleteMany({});
      console.log(`✅ 删除了 ${deleteResult.deletedCount} 条员工记录`);
    } catch (error) {
      console.error('❌ 清理数据库出错:', error);
    } finally {
      await mongoose.connection.close();
    }
  });
} else if (args.includes('--files-only')) {
  // 只清理文件
  console.log('🗑️ 只清理图片文件...');
  cleanStaffImages();
  cleanTempFiles();
  console.log('✅ 文件清理完成');
} else {
  // 清理所有数据
  cleanAllStaffData();
}
