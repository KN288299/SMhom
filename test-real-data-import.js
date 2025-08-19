const fs = require('fs');
const path = require('path');

console.log('🔧 测试真实员工数据导入功能...\n');

// 创建一个适合您数据格式的测试文件
const realDataStructure = {
  "exportDate": "2025-08-15T05:55:13.623Z",
  "version": "1.0", 
  "totalCount": 3, // 测试用小数据
  "staff": [
    {
      "name": "小雨",
      "age": 20,
      "job": "台球助教",
      "province": "澳门特别行政区",
      "height": 160,
      "weight": 108,
      "description": "肤白嫩滑大长腿，翘臀，完美三七比例身材，黄金腰臀比，体贴温柔，热情大方，给哥哥们初恋般的感觉💗",
      "tag": "热门，可预约",
      "image": "/uploads/employees/employee-1754849408705-152238541.jpg",
      "photos": [
        "/uploads/employees/employee-1754849408841-125835044.jpg"
      ],
      "createdAt": "2025-08-10T18:10:09.004Z",
      "updatedAt": "2025-08-10T18:10:09.004Z"
    },
    {
      "name": "小丽",
      "age": 22,
      "job": "按摩师", 
      "province": "广东省",
      "height": 165,
      "weight": 50,
      "description": "专业按摩技师，手法娴熟",
      "tag": "可预约",
      "image": "/uploads/employees/employee-1754849408705-152238542.jpg",
      "photos": [
        "/uploads/employees/employee-1754849408841-125835045.jpg",
        "/uploads/employees/employee-1754849408841-125835046.jpg"
      ],
      "createdAt": "2025-08-10T18:10:09.004Z",
      "updatedAt": "2025-08-10T18:10:09.004Z"
    },
    {
      "name": "小美",
      "age": 24,
      "job": "养生顾问",
      "province": "北京市", 
      "height": 168,
      "weight": 52,
      "description": "专业养生顾问，提供个性化服务",
      "tag": "热门，可预约",
      "image": "/uploads/employees/employee-1754849408705-152238543.jpg",
      "photos": [],
      "createdAt": "2025-08-10T18:10:09.004Z",
      "updatedAt": "2025-08-10T18:10:09.004Z"
    }
  ]
};

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

// 创建测试图片文件（模拟现有图片）
realDataStructure.staff.forEach((staff, index) => {
  // 从图片路径中提取文件名
  if (staff.image) {
    const imageName = path.basename(staff.image);
    const imagePath = path.join(employeesDir, imageName);
    if (!fs.existsSync(imagePath)) {
      fs.writeFileSync(imagePath, `fake-avatar-data-for-${staff.name}`);
      console.log(`✅ 创建测试主图: ${imageName}`);
    }
  }
  
  // 处理相册图片
  if (staff.photos && staff.photos.length > 0) {
    staff.photos.forEach(photoPath => {
      const photoName = path.basename(photoPath);
      const fullPhotoPath = path.join(employeesDir, photoName);
      if (!fs.existsSync(fullPhotoPath)) {
        fs.writeFileSync(fullPhotoPath, `fake-photo-data-for-${staff.name}`);
        console.log(`✅ 创建测试照片: ${photoName}`);
      }
    });
  }
});

// 写入测试JSON文件
const testJsonFile = path.join(__dirname, 'real-format-test-data.json');
fs.writeFileSync(testJsonFile, JSON.stringify(realDataStructure, null, 2), 'utf8');
console.log(`✅ 创建真实格式测试数据文件: ${testJsonFile}`);

console.log('\n📋 测试环境准备完成！');
console.log('\n🚀 测试命令:');
console.log('\ncurl -X POST \\');
console.log('  -F "file=@real-format-test-data.json" \\');
console.log('  http://localhost:3000/api/staff/import');

console.log('\n💡 说明:');
console.log('✅ 支持您的导出数据格式（包含exportDate、version、totalCount、staff）');
console.log('✅ 支持现有的图片路径格式 (/uploads/employees/...)');
console.log('✅ 自动处理缺失的图片文件');
console.log('✅ 保留所有原始字段（createdAt、updatedAt等）');

console.log('\n📊 数据结构检查:');
console.log(`- 导出日期: ${realDataStructure.exportDate}`);
console.log(`- 版本: ${realDataStructure.version}`);
console.log(`- 总数量: ${realDataStructure.totalCount}`);
console.log(`- 员工数据: ${realDataStructure.staff.length} 条`);
