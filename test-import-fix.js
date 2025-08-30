const fs = require('fs');
const path = require('path');

console.log('🧪 测试员工导入功能修复效果...\n');

// 创建测试数据
const testStaffData = [
  {
    name: "测试员工1",
    age: 25,
    job: "测试职业",
    province: "北京市",
    // 包含完整的图片数据，不应该生成占位图
    image: "https://via.placeholder.com/300x400/FF6B6B/FFFFFF?text=测试员工1",
    photos: [
      "https://via.placeholder.com/300x400/4ECDC4/FFFFFF?text=照片1",
      "https://via.placeholder.com/300x400/45B7D1/FFFFFF?text=照片2"
    ],
    height: 170,
    weight: 65,
    description: "测试员工1的描述",
    tag: "可预约"
  },
  {
    name: "测试员工2",
    age: 28,
    job: "测试职业2",
    province: "上海市",
    // 只有主图，没有照片集
    image: "https://via.placeholder.com/300x400/96CEB4/FFFFFF?text=测试员工2",
    height: 175,
    weight: 70,
    description: "测试员工2的描述",
    tag: "可预约"
  },
  {
    name: "测试员工3",
    age: 30,
    job: "测试职业3",
    province: "广东省",
    // 没有图片数据，应该使用占位图
    height: 168,
    weight: 60,
    description: "测试员工3的描述",
    tag: "可预约"
  }
];

// 创建测试JSON文件
const testJsonFile = path.join(__dirname, 'test-import-fix.json');
const jsonData = { staff: testStaffData };
fs.writeFileSync(testJsonFile, JSON.stringify(jsonData, null, 2), 'utf8');

console.log('📝 测试数据说明:');
console.log('1. 测试员工1: 包含完整图片数据，不应生成占位图');
console.log('2. 测试员工2: 只有主图，没有照片集');
console.log('3. 测试员工3: 没有图片数据，应该使用占位图');
console.log('\n📁 测试文件已创建:', testJsonFile);

// 创建测试图片目录结构（模拟ZIP文件内容）
const tempImageDir = path.join(__dirname, 'temp-test-images-fix');
if (!fs.existsSync(tempImageDir)) {
  fs.mkdirSync(tempImageDir, { recursive: true });
}

const imagesDir = path.join(tempImageDir, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

// 为测试员工3创建图片目录（模拟ZIP中的图片）
const staff3Dir = path.join(imagesDir, 'test-staff-3');
if (!fs.existsSync(staff3Dir)) {
  fs.mkdirSync(staff3Dir);
}

// 创建测试图片文件
const avatarPath = path.join(staff3Dir, 'avatar.jpg');
const photo1Path = path.join(staff3Dir, 'photo-1.jpg');
const photo2Path = path.join(staff3Dir, 'photo-2.jpg');

fs.writeFileSync(avatarPath, 'fake-avatar-data');
fs.writeFileSync(photo1Path, 'fake-photo-1-data');
fs.writeFileSync(photo2Path, 'fake-photo-2-data');

console.log('📸 测试图片目录已创建:', tempImageDir);
console.log('   - avatar.jpg (头像)');
console.log('   - photo-1.jpg (照片1)');
console.log('   - photo-2.jpg (照片2)');

console.log('\n🔧 修复说明:');
console.log('1. 修复了重复处理图片的问题');
console.log('2. 优先使用JSON中的图片数据');
console.log('3. 避免生成不必要的占位图');
console.log('4. 只有在没有图片数据时才使用占位图');

console.log('\n📋 测试步骤:');
console.log('1. 使用 test-import-fix.json 进行导入测试');
console.log('2. 检查是否还会生成 photo-0.jpg, photo-1.jpg, photo-2.jpg 占位图');
console.log('3. 验证图片处理逻辑是否正确');

console.log('\n✅ 测试环境准备完成！');
console.log('请使用 test-import-fix.json 文件测试导入功能。');
