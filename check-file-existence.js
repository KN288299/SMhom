const mongoose = require('mongoose');
const Staff = require('./src/models/staffModel');
const fs = require('fs');
const path = require('path');

// 连接数据库
mongoose.connect('mongodb://127.0.0.1:27017/homeservicechat');

async function checkFileExistence() {
  try {
    console.log('🔍 检查员工图片文件是否实际存在...\n');
    
    // 获取所有员工数据
    const staffs = await Staff.find({});
    console.log(`📊 总员工数量: ${staffs.length}\n`);
    
    let existingFiles = 0;
    let missingFiles = 0;
    let placeholderImages = 0;
    const missingFilesList = [];
    
    for (let i = 0; i < staffs.length; i++) {
      const staff = staffs[i];
      const imagePath = staff.image;
      
      // 跳过 placeholder 图片
      if (imagePath && imagePath.includes('placeholder')) {
        placeholderImages++;
        continue;
      }
      
      if (imagePath && imagePath.startsWith('/uploads/')) {
        // 构建实际文件路径
        const actualFilePath = path.join(__dirname, 'public', imagePath);
        
        // 检查文件是否存在
        if (fs.existsSync(actualFilePath)) {
          existingFiles++;
        } else {
          missingFiles++;
          missingFilesList.push({
            name: staff.name,
            imagePath: imagePath,
            actualPath: actualFilePath
          });
          
          // 只显示前10个缺失的文件
          if (missingFilesList.length <= 10) {
            console.log(`❌ 文件不存在: ${staff.name} - ${imagePath}`);
          }
        }
      }
    }
    
    console.log(`\n📈 文件存在性统计:`);
    console.log(`✅ 存在的文件: ${existingFiles}`);
    console.log(`❌ 缺失的文件: ${missingFiles}`);
    console.log(`🖼️  Placeholder图片: ${placeholderImages}`);
    
    if (missingFiles > 10) {
      console.log(`\n⚠️  还有 ${missingFiles - 10} 个文件缺失（未全部显示）`);
    }
    
    // 检查 uploads 目录结构
    console.log(`\n📁 检查上传目录结构:`);
    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    const employeesDir = path.join(uploadsDir, 'employees');
    
    console.log(`uploads目录存在: ${fs.existsSync(uploadsDir)}`);
    console.log(`employees目录存在: ${fs.existsSync(employeesDir)}`);
    
    if (fs.existsSync(employeesDir)) {
      const files = fs.readdirSync(employeesDir);
      console.log(`employees目录中的文件数量: ${files.length}`);
      
      // 显示前5个文件作为示例
      console.log(`前5个文件示例:`);
      files.slice(0, 5).forEach(file => {
        console.log(`  - ${file}`);
      });
    }
    
  } catch (error) {
    console.error('检查过程中出错:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkFileExistence();
