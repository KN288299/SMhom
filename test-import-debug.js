const fs = require('fs');
const path = require('path');

console.log('🔍 员工数据导入调试测试\n');

// 1. 检查现有的导出数据文件
const checkExistingData = () => {
  console.log('📋 检查现有数据文件...');
  
  const possibleFiles = [
    'employees-export.json',
    'staff-export.json', 
    'employee-data.json',
    'staff-data.json'
  ];
  
  possibleFiles.forEach(fileName => {
    const filePath = path.join(__dirname, fileName);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        console.log(`✅ 找到数据文件: ${fileName}`);
        console.log(`   文件大小: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
        console.log(`   数据结构:`);
        
        if (data.staff && Array.isArray(data.staff)) {
          console.log(`   - 格式: 导出格式 (包含staff数组)`);
          console.log(`   - 员工数量: ${data.staff.length}`);
          console.log(`   - 导出日期: ${data.exportDate || '未知'}`);
          console.log(`   - 版本: ${data.version || '未知'}`);
          
          // 检查第一个员工的数据结构
          if (data.staff.length > 0) {
            const firstStaff = data.staff[0];
            console.log(`   - 示例员工:`);
            console.log(`     姓名: ${firstStaff.name}`);
            console.log(`     年龄: ${firstStaff.age}`);
            console.log(`     职业: ${firstStaff.job}`);
            console.log(`     主图: ${firstStaff.image || '无'}`);
            console.log(`     照片数: ${firstStaff.photos ? firstStaff.photos.length : 0}`);
          }
          
        } else if (Array.isArray(data)) {
          console.log(`   - 格式: 直接数组格式`);
          console.log(`   - 员工数量: ${data.length}`);
        } else {
          console.log(`   - 格式: 单个对象`);
        }
        
        console.log('');
        
      } catch (error) {
        console.log(`❌ ${fileName}: JSON解析失败 - ${error.message}`);
      }
    }
  });
};

// 2. 创建标准测试数据
const createTestData = () => {
  console.log('📝 创建标准测试数据...');
  
  // 创建符合您系统格式的测试数据
  const testData = {
    "exportDate": new Date().toISOString(),
    "version": "1.0",
    "totalCount": 2,
    "staff": [
      {
        "name": "测试员工1",
        "age": 25,
        "job": "按摩师",
        "province": "北京市",
        "height": 165,
        "weight": 50,
        "description": "这是一个测试员工，用于验证导入功能",
        "tag": "可预约",
        "image": "/uploads/employees/test-avatar-1.jpg",
        "photos": [
          "/uploads/employees/test-photo-1-1.jpg",
          "/uploads/employees/test-photo-1-2.jpg"
        ]
      },
      {
        "name": "测试员工2", 
        "age": 28,
        "job": "理疗师",
        "province": "上海市",
        "height": 170,
        "weight": 55,
        "description": "另一个测试员工，验证批量导入",
        "tag": "热门，可预约",
        "image": "/uploads/employees/test-avatar-2.jpg",
        "photos": []
      }
    ]
  };
  
  // 写入测试文件
  const testFile = path.join(__dirname, 'import-test-data.json');
  fs.writeFileSync(testFile, JSON.stringify(testData, null, 2), 'utf8');
  console.log(`✅ 创建测试数据: ${testFile}`);
  
  return testFile;
};

// 3. 创建测试图片文件
const createTestImages = (testDataFile) => {
  console.log('🖼️ 创建测试图片文件...');
  
  // 确保目录存在
  const uploadsDir = path.join(__dirname, 'uploads', 'employees');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ 创建uploads/employees目录');
  }
  
  // 读取测试数据并创建对应的图片文件
  const testData = JSON.parse(fs.readFileSync(testDataFile, 'utf8'));
  
  testData.staff.forEach((staff, index) => {
    // 创建主头像
    if (staff.image) {
      const imageName = path.basename(staff.image);
      const imagePath = path.join(uploadsDir, imageName);
      fs.writeFileSync(imagePath, `test-avatar-data-for-${staff.name}-${Date.now()}`);
      console.log(`✅ 创建头像: ${imageName}`);
    }
    
    // 创建照片
    if (staff.photos && staff.photos.length > 0) {
      staff.photos.forEach(photoPath => {
        const photoName = path.basename(photoPath);
        const fullPhotoPath = path.join(uploadsDir, photoName);
        fs.writeFileSync(fullPhotoPath, `test-photo-data-for-${staff.name}-${Date.now()}`);
        console.log(`✅ 创建照片: ${photoName}`);
      });
    }
  });
};

// 4. 生成测试命令
const generateTestCommands = () => {
  console.log('\n🚀 测试命令:');
  console.log('\n1. 先清理现有数据:');
  console.log('   node clean-all-staff-data.js');
  
  console.log('\n2. 启动服务器 (新终端):');
  console.log('   npm start');
  
  console.log('\n3. 测试导入 (另一个新终端):');
  console.log('   curl -X POST \\');
  console.log('     -H "Content-Type: multipart/form-data" \\');
  console.log('     -F "file=@import-test-data.json" \\');
  console.log('     http://localhost:3000/api/staff/import');
  
  console.log('\n4. 验证导入结果:');
  console.log('   curl http://localhost:3000/api/staff');
  
  console.log('\n💡 调试技巧:');
  console.log('- 检查服务器控制台输出');
  console.log('- 查看网络请求响应');
  console.log('- 验证数据库中的数据');
  console.log('- 检查图片文件是否正确');
};

// 5. 检查服务器状态
const checkServerStatus = async () => {
  console.log('\n🔍 检查服务器状态...');
  
  try {
    const http = require('http');
    
    const checkUrl = (url, callback) => {
      const req = http.get(url, (res) => {
        console.log(`✅ ${url} - 状态: ${res.statusCode}`);
        callback(null, res.statusCode);
      });
      
      req.on('error', (err) => {
        console.log(`❌ ${url} - 错误: ${err.message}`);
        callback(err);
      });
      
      req.setTimeout(3000, () => {
        console.log(`⏰ ${url} - 超时`);
        req.destroy();
        callback(new Error('Timeout'));
      });
    };
    
    // 检查主页
    checkUrl('http://localhost:3000', () => {
      // 检查API
      checkUrl('http://localhost:3000/api/staff', () => {
        console.log('服务器状态检查完成');
      });
    });
    
  } catch (error) {
    console.log('❌ 服务器状态检查失败:', error.message);
    console.log('💡 请先启动服务器: npm start');
  }
};

// 主函数
const main = () => {
  console.log('=' * 50);
  console.log('🔧 员工数据导入问题诊断工具');
  console.log('=' * 50);
  
  // 1. 检查现有数据
  checkExistingData();
  
  // 2. 创建测试数据
  const testDataFile = createTestData();
  
  // 3. 创建测试图片
  createTestImages(testDataFile);
  
  // 4. 生成测试命令
  generateTestCommands();
  
  // 5. 检查服务器状态
  setTimeout(() => {
    checkServerStatus();
  }, 1000);
  
  console.log('\n✅ 调试环境准备完成！');
  console.log('\n📋 下一步:');
  console.log('1. 运行清理命令清空现有数据');
  console.log('2. 启动服务器');
  console.log('3. 执行导入测试');
  console.log('4. 分析结果找出问题');
};

// 运行主函数
main();
