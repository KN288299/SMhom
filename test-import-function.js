const fs = require('fs');
const path = require('path');

console.log('🔧 测试员工导入功能...\n');

// 检查必要的目录是否存在
const uploadsDir = path.join(__dirname, 'uploads');
const employeesDir = path.join(uploadsDir, 'employees');

console.log('📂 检查目录结构...');
console.log(`uploads目录: ${fs.existsSync(uploadsDir) ? '✅ 存在' : '❌ 不存在'}`);
console.log(`employees目录: ${fs.existsSync(employeesDir) ? '✅ 存在' : '❌ 不存在'}`);

// 创建缺失的目录
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('✅ 创建了uploads目录');
}

if (!fs.existsSync(employeesDir)) {
  fs.mkdirSync(employeesDir, { recursive: true });
  console.log('✅ 创建了employees目录');
}

// 创建测试用的JSON数据文件
const testData = [
  {
    name: "张三",
    age: 25,
    job: "按摩师",
    province: "北京市",
    height: 170,
    weight: 65,
    description: "专业按摩师，擅长全身按摩",
    tag: "可预约",
    image: "photo-1.jpg"
  },
  {
    name: "李四", 
    age: 28,
    job: "理疗师",
    province: "上海市",
    height: 175,
    weight: 70,
    description: "资深理疗师，专业技能过硬",
    tag: "可预约",
    image: "photo-2.jpg"
  },
  {
    name: "王五",
    age: 30,
    job: "养生顾问",
    province: "广东省",
    height: 168,
    weight: 60,
    description: "养生专家，提供专业养生建议",
    tag: "可预约"
  }
];

const testJsonFile = path.join(__dirname, 'test-staff-data.json');
fs.writeFileSync(testJsonFile, JSON.stringify(testData, null, 2), 'utf8');
console.log(`✅ 创建测试数据文件: ${testJsonFile}`);

// 创建测试图片文件夹结构
const tempImageDir = path.join(__dirname, 'temp-test-images');
if (!fs.existsSync(tempImageDir)) {
  fs.mkdirSync(tempImageDir);
}

const imagesDir = path.join(tempImageDir, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

// 为每个员工创建对应的图片目录和测试图片
testData.forEach((staff, index) => {
  const staffDir = path.join(imagesDir, staff.name);
  if (!fs.existsSync(staffDir)) {
    fs.mkdirSync(staffDir);
  }
  
  // 创建主头像（如果指定了）
  if (staff.image) {
    const imagePath = path.join(staffDir, staff.image);
    fs.writeFileSync(imagePath, 'fake-image-data-for-testing');
  }
  
  // 创建一些测试照片
  for (let i = 1; i <= 3; i++) {
    const photoPath = path.join(staffDir, `photo-${i}.jpg`);
    fs.writeFileSync(photoPath, `fake-photo-${i}-data-for-testing`);
  }
  
  console.log(`✅ 为员工 ${staff.name} 创建了测试图片目录`);
});

console.log('\n📋 测试环境准备完成！');
console.log('\n使用说明:');
console.log('1. 启动服务器: npm start');
console.log('2. 使用以下curl命令测试导入:');
console.log('\ncurl -X POST \\');
console.log('  -F "file=@test-staff-data.json" \\');
console.log('  -F "imageZip=@temp-test-images.zip" \\');
console.log('  http://localhost:3000/api/staff/import');

console.log('\n3. 或者手动上传文件到 http://localhost:3000 的员工管理界面');

console.log('\n📁 创建的测试文件:');
console.log(`- JSON数据: ${testJsonFile}`);
console.log(`- 图片目录: ${tempImageDir}`);
console.log('\n💡 提示: 如果要测试ZIP导入，请先将temp-test-images目录压缩为ZIP文件');
