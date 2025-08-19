const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const targetId = '68a46bcdc0c157231d4e53c5';

console.log(`🔍 查找图片文件: ${targetId}\n`);

// 可能的文件夹路径
const possiblePaths = [
  'uploads',
  'uploads/employees', 
  'uploads/staff',
  'uploads/images',
  'uploads/temp',
  'public/uploads',
  'public/uploads/employees',
  'public/uploads/staff',
  'src/uploads',
  'admin/public/uploads',
  'temp-images',
  'employee-images'
];

// 递归搜索文件
const searchInDirectory = (dir, targetName) => {
  if (!fs.existsSync(dir)) return [];
  
  const results = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        // 递归搜索子目录
        results.push(...searchInDirectory(fullPath, targetName));
      } else if (stats.isFile()) {
        // 检查文件名是否包含目标ID
        if (item.includes(targetName)) {
          results.push({
            path: fullPath,
            name: item,
            size: stats.size,
            modified: stats.mtime
          });
        }
      }
    }
  } catch (error) {
    console.log(`❌ 无法访问目录 ${dir}: ${error.message}`);
  }
  
  return results;
};

// 搜索所有可能的路径
const searchAllPaths = () => {
  console.log('📁 搜索所有可能的目录...\n');
  
  let allResults = [];
  
  possiblePaths.forEach(relativePath => {
    const fullPath = path.join(__dirname, relativePath);
    console.log(`🔍 搜索: ${fullPath}`);
    
    if (fs.existsSync(fullPath)) {
      console.log(`  ✅ 目录存在`);
      const results = searchInDirectory(fullPath, targetId);
      
      if (results.length > 0) {
        console.log(`  🎯 找到 ${results.length} 个相关文件:`);
        results.forEach(result => {
          console.log(`    📄 ${result.name}`);
          console.log(`       路径: ${result.path}`);
          console.log(`       大小: ${(result.size / 1024).toFixed(2)} KB`);
          console.log(`       修改时间: ${result.modified.toLocaleString()}`);
        });
        allResults.push(...results);
      } else {
        console.log(`  📝 该目录下未找到相关文件`);
      }
    } else {
      console.log(`  ❌ 目录不存在`);
    }
    console.log('');
  });
  
  return allResults;
};

// 检查数据库中的记录
const checkDatabase = async () => {
  console.log('🗄️ 检查数据库中的记录...\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
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
    
    // 查找包含该ID的记录
    const staffWithImage = await Staff.find({
      $or: [
        { image: { $regex: targetId } },
        { photos: { $regex: targetId } }
      ]
    });
    
    if (staffWithImage.length > 0) {
      console.log(`🎯 找到 ${staffWithImage.length} 个相关员工记录:`);
      staffWithImage.forEach((staff, index) => {
        console.log(`\n👤 员工 ${index + 1}:`);
        console.log(`   姓名: ${staff.name}`);
        console.log(`   ID: ${staff._id}`);
        console.log(`   主图: ${staff.image}`);
        console.log(`   照片: ${staff.photos ? staff.photos.join(', ') : '无'}`);
      });
    } else {
      console.log('❌ 数据库中未找到包含该ID的记录');
    }
    
    // 查找最近的员工记录（可能有相关信息）
    const recentStaff = await Staff.find().sort({ createdAt: -1 }).limit(5);
    console.log(`\n📋 最近的5个员工记录:`);
    recentStaff.forEach((staff, index) => {
      console.log(`${index + 1}. ${staff.name} - 主图: ${staff.image}`);
    });
    
  } catch (error) {
    console.error('❌ 数据库查询失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
};

// 检查常见的图片文件格式
const checkCommonFormats = () => {
  console.log('🖼️ 检查常见图片格式...\n');
  
  const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const results = [];
  
  possiblePaths.forEach(relativePath => {
    const fullPath = path.join(__dirname, relativePath);
    
    if (fs.existsSync(fullPath)) {
      extensions.forEach(ext => {
        const fileName = targetId + ext;
        const filePath = path.join(fullPath, fileName);
        
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          results.push({
            path: filePath,
            name: fileName,
            size: stats.size,
            modified: stats.mtime
          });
          console.log(`✅ 找到: ${filePath}`);
        }
      });
    }
  });
  
  return results;
};

// 生成搜索命令
const generateSearchCommands = () => {
  console.log('\n🔧 手动搜索命令:\n');
  
  console.log('Windows PowerShell:');
  console.log(`Get-ChildItem -Path . -Recurse -Name "*${targetId}*"`);
  
  console.log('\nWindows CMD:');
  console.log(`dir /s "*${targetId}*"`);
  
  console.log('\nLinux/Unix:');
  console.log(`find . -name "*${targetId}*" -type f`);
  
  console.log('\n🔍 在特定目录搜索:');
  possiblePaths.forEach(dir => {
    console.log(`dir /s "${dir}\\*${targetId}*"`);
  });
};

// 主函数
const main = async () => {
  console.log('=' * 60);
  console.log('🎯 图片文件查找工具');
  console.log('=' * 60);
  
  // 1. 搜索文件系统
  const fileResults = searchAllPaths();
  
  // 2. 检查常见格式
  const formatResults = checkCommonFormats();
  
  // 3. 检查数据库
  await checkDatabase();
  
  // 4. 生成搜索命令
  generateSearchCommands();
  
  // 总结
  console.log('\n📊 搜索结果总结:');
  console.log(`文件系统搜索: ${fileResults.length} 个文件`);
  console.log(`格式检查: ${formatResults.length} 个文件`);
  
  if (fileResults.length > 0 || formatResults.length > 0) {
    console.log('\n🎉 找到相关文件！');
  } else {
    console.log('\n😔 未找到相关文件');
    console.log('💡 建议:');
    console.log('1. 检查服务器是否有其他存储位置');
    console.log('2. 确认ID是否正确');
    console.log('3. 检查文件是否已被删除');
    console.log('4. 查看服务器配置的上传目录');
  }
};

// 运行
main().catch(console.error);
