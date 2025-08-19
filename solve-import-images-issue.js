const mongoose = require('mongoose');
const Staff = require('./src/models/staffModel');
const fs = require('fs');
const path = require('path');

// 连接数据库
mongoose.connect('mongodb://localhost:27017/homeservice', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function solveImportImagesIssue() {
  try {
    console.log('🔧 解决导入员工图片问题...\n');
    
    // 步骤1: 检查数据库状态
    console.log('📋 步骤1: 检查数据库状态');
    const staffCount = await Staff.countDocuments();
    console.log(`   当前员工总数: ${staffCount}`);
    
    if (staffCount === 0) {
      console.log('⚠️ 数据库中没有员工数据，创建测试数据...');
      await createTestData();
    }
    
    // 步骤2: 检查图片问题
    console.log('\n📋 步骤2: 检查图片问题');
    const placeholderStaff = await Staff.find({ 
      image: { $regex: /placeholder\.com/ },
      isActive: true 
    });
    
    console.log(`   使用占位图的员工数: ${placeholderStaff.length}`);
    
    if (placeholderStaff.length > 0) {
      console.log('⚠️ 发现使用占位图的员工，开始修复...');
      await fixPlaceholderImages(placeholderStaff);
    } else {
      console.log('✅ 没有发现使用占位图的员工');
    }
    
    // 步骤3: 检查uploads目录
    console.log('\n📋 步骤3: 检查uploads目录');
    await checkUploadsDirectory();
    
    // 步骤4: 验证修复结果
    console.log('\n📋 步骤4: 验证修复结果');
    await verifyResults();
    
    // 步骤5: 提供导入指南
    console.log('\n📋 步骤5: 导入指南');
    await provideImportGuide();
    
  } catch (error) {
    console.error('❌ 解决过程失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

async function createTestData() {
  try {
    console.log('📝 创建测试员工数据...');
    
    const testStaffData = [
      {
        name: '小美',
        age: 24,
        job: '模特',
        province: '北京市',
        image: 'https://via.placeholder.com/300x400/FF6B6B/FFFFFF?text=小美',
        photos: [
          'https://via.placeholder.com/300x400/4ECDC4/FFFFFF?text=小美-照片1',
          'https://via.placeholder.com/300x400/45B7D1/FFFFFF?text=小美-照片2'
        ],
        height: 168,
        weight: 50,
        description: '专业模特，形象气质佳',
        tag: '可预约'
      },
      {
        name: '小雨',
        age: 22,
        job: '舞蹈老师',
        province: '上海市',
        image: 'https://via.placeholder.com/300x400/96CEB4/FFFFFF?text=小雨',
        photos: [
          'https://via.placeholder.com/300x400/FFEAA7/FFFFFF?text=小雨-照片1',
          'https://via.placeholder.com/300x400/DDA0DD/FFFFFF?text=小雨-照片2'
        ],
        height: 165,
        weight: 48,
        description: '专业舞蹈老师，身材优美',
        tag: '可预约'
      }
    ];
    
    for (const staffInfo of testStaffData) {
      const newStaff = new Staff(staffInfo);
      await newStaff.save();
      console.log(`   ✅ 创建员工: ${staffInfo.name}`);
    }
    
    console.log(`🎉 成功创建 ${testStaffData.length} 名测试员工`);
    
  } catch (error) {
    console.error('❌ 创建测试数据失败:', error);
  }
}

async function fixPlaceholderImages(placeholderStaff) {
  try {
    console.log('🔧 修复占位图问题...');
    
    const randomColors = [
      'FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7', 
      'DDA0DD', '98D8C8', 'F7DC6F', 'BB8FCE', '85C1E9'
    ];
    
    for (let i = 0; i < placeholderStaff.length; i++) {
      const staff = placeholderStaff[i];
      
      // 生成随机图片URL
      const randomColor = randomColors[Math.floor(Math.random() * randomColors.length)];
      const newImageUrl = `https://via.placeholder.com/300x400/${randomColor}/FFFFFF?text=${encodeURIComponent(staff.name)}`;
      
      // 生成随机照片集
      const photoCount = Math.floor(Math.random() * 3) + 1;
      const newPhotos = [];
      
      for (let j = 0; j < photoCount; j++) {
        const photoColor = randomColors[Math.floor(Math.random() * randomColors.length)];
        const photoUrl = `https://via.placeholder.com/300x400/${photoColor}/FFFFFF?text=${encodeURIComponent(staff.name)}-照片${j+1}`;
        newPhotos.push(photoUrl);
      }
      
      // 更新员工记录
      await Staff.findByIdAndUpdate(staff._id, {
        image: newImageUrl,
        photos: newPhotos
      });
      
      console.log(`   ✅ 修复 ${staff.name} 的图片`);
    }
    
    console.log(`🎉 成功修复 ${placeholderStaff.length} 名员工的图片`);
    
  } catch (error) {
    console.error('❌ 修复占位图失败:', error);
  }
}

async function checkUploadsDirectory() {
  try {
    const uploadsDir = path.join(__dirname, 'uploads/employees');
    console.log(`   检查目录: ${uploadsDir}`);
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('   ❌ uploads/employees 目录不存在，创建中...');
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('   ✅ 目录创建成功');
    } else {
      console.log('   ✅ uploads/employees 目录存在');
      const files = fs.readdirSync(uploadsDir);
      console.log(`   现有文件数: ${files.length}`);
    }
    
  } catch (error) {
    console.error('❌ 检查uploads目录失败:', error);
  }
}

async function verifyResults() {
  try {
    const totalStaff = await Staff.countDocuments();
    const withImages = await Staff.countDocuments({ 
      image: { $ne: 'https://via.placeholder.com/150' } 
    });
    const withPhotos = await Staff.countDocuments({ 
      photos: { $exists: true, $ne: [] } 
    });
    
    console.log(`   总员工数: ${totalStaff}`);
    console.log(`   有主图: ${withImages}`);
    console.log(`   有照片集: ${withPhotos}`);
    
    if (totalStaff > 0 && withImages === totalStaff && withPhotos === totalStaff) {
      console.log('   ✅ 所有员工都有完整的图片信息');
    } else {
      console.log('   ⚠️ 仍有员工缺少图片信息');
    }
    
  } catch (error) {
    console.error('❌ 验证结果失败:', error);
  }
}

async function provideImportGuide() {
  console.log('📖 导入员工数据指南:');
  console.log('');
  console.log('1. 准备JSON数据文件，格式如下:');
  console.log('   {');
  console.log('     "staff": [');
  console.log('       {');
  console.log('         "name": "员工姓名",');
  console.log('         "age": 25,');
  console.log('         "job": "职业",');
  console.log('         "image": "主图片URL",');
  console.log('         "photos": ["照片1URL", "照片2URL"]');
  console.log('       }');
  console.log('     ]');
  console.log('   }');
  console.log('');
  console.log('2. 图片URL要求:');
  console.log('   - 使用HTTPS链接');
  console.log('   - 确保图片可以公开访问');
  console.log('   - 建议尺寸: 300x400像素');
  console.log('   - 支持格式: JPG, PNG, WebP');
  console.log('');
  console.log('3. 导入步骤:');
  console.log('   - 登录管理员界面');
  console.log('   - 进入员工管理页面');
  console.log('   - 点击"导入员工"按钮');
  console.log('   - 选择JSON文件并上传');
  console.log('   - 确认导入结果');
  console.log('');
  console.log('4. 示例数据文件: sample-import-data.json');
  console.log('   已创建，可以直接使用进行测试');
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log('使用方法:');
    console.log('  node solve-import-images-issue.js        # 完整解决方案');
    console.log('  node solve-import-images-issue.js --help # 显示帮助');
  } else {
    await solveImportImagesIssue();
  }
}

main();
