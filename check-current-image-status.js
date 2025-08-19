const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// 连接数据库
mongoose.connect('mongodb://localhost:27017/homeservice', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// 员工模型
const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  job: { type: String, required: true },
  image: { type: String, default: 'https://via.placeholder.com/150' },
  province: { type: String, default: '北京市' },
  height: { type: Number, default: 165 },
  weight: { type: Number, default: 50 },
  description: { type: String, default: '' },
  photos: [{ type: String }],
  tag: { type: String, default: '可预约' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Staff = mongoose.model('Staff', staffSchema);

async function checkCurrentImageStatus() {
  try {
    console.log('🔍 检查当前员工图片路径状态...\n');
    
    // 获取所有活跃员工
    const allStaff = await Staff.find({ isActive: true });
    console.log(`📊 总员工数量: ${allStaff.length}`);
    
    // 统计不同类型的图片路径
    const pathStats = {
      placeholder: 0,
      uploadsEmployees: 0,
      uploadsImages: 0,
      http: 0,
      https: 0,
      other: 0
    };
    
    const pathExamples = {
      placeholder: [],
      uploadsEmployees: [],
      uploadsImages: [],
      http: [],
      https: [],
      other: []
    };
    
    // 存储需要检查文件存在性的路径
    const localPaths = [];
    
    allStaff.forEach((staff, index) => {
      const imagePath = staff.image;
      
      if (imagePath === 'https://via.placeholder.com/150') {
        pathStats.placeholder++;
        if (pathExamples.placeholder.length < 3) {
          pathExamples.placeholder.push(`${staff.name} -> ${imagePath}`);
        }
      } else if (imagePath.startsWith('/uploads/employees/')) {
        pathStats.uploadsEmployees++;
        if (pathExamples.uploadsEmployees.length < 3) {
          pathExamples.uploadsEmployees.push(`${staff.name} -> ${imagePath}`);
        }
        localPaths.push({
          staff: staff.name,
          path: imagePath,
          fullPath: path.join(__dirname, imagePath)
        });
      } else if (imagePath.startsWith('/uploads/images/')) {
        pathStats.uploadsImages++;
        if (pathExamples.uploadsImages.length < 3) {
          pathExamples.uploadsImages.push(`${staff.name} -> ${imagePath}`);
        }
        localPaths.push({
          staff: staff.name,
          path: imagePath,
          fullPath: path.join(__dirname, imagePath)
        });
      } else if (imagePath.startsWith('http://')) {
        pathStats.http++;
        if (pathExamples.http.length < 3) {
          pathExamples.http.push(`${staff.name} -> ${imagePath}`);
        }
      } else if (imagePath.startsWith('https://') && !imagePath.includes('placeholder')) {
        pathStats.https++;
        if (pathExamples.https.length < 3) {
          pathExamples.https.push(`${staff.name} -> ${imagePath}`);
        }
      } else {
        pathStats.other++;
        if (pathExamples.other.length < 3) {
          pathExamples.other.push(`${staff.name} -> ${imagePath}`);
        }
      }
    });
    
    // 显示统计结果
    console.log('\n📈 图片路径类型统计:');
    console.log(`🖼️  Placeholder图片: ${pathStats.placeholder}`);
    console.log(`📁 /uploads/employees/: ${pathStats.uploadsEmployees}`);
    console.log(`📁 /uploads/images/: ${pathStats.uploadsImages}`);
    console.log(`🌐 HTTP链接: ${pathStats.http}`);
    console.log(`🔒 HTTPS链接: ${pathStats.https}`);
    console.log(`❓ 其他类型: ${pathStats.other}`);
    
    // 显示示例
    console.log('\n📝 路径示例:');
    Object.keys(pathExamples).forEach(type => {
      if (pathExamples[type].length > 0) {
        console.log(`\n${type}:`);
        pathExamples[type].forEach(example => {
          console.log(`  ${example}`);
        });
      }
    });
    
    // 检查本地文件是否存在
    if (localPaths.length > 0) {
      console.log(`\n🔍 检查 ${localPaths.length} 个本地文件路径...`);
      
      let existingFiles = 0;
      let missingFiles = 0;
      const missingExamples = [];
      
      localPaths.forEach(item => {
        if (fs.existsSync(item.fullPath)) {
          existingFiles++;
        } else {
          missingFiles++;
          if (missingExamples.length < 5) {
            missingExamples.push(`${item.staff} -> ${item.path}`);
          }
        }
      });
      
      console.log(`✅ 存在的文件: ${existingFiles}`);
      console.log(`❌ 不存在的文件: ${missingFiles}`);
      
      if (missingExamples.length > 0) {
        console.log('\n❌ 不存在文件示例:');
        missingExamples.forEach(example => {
          console.log(`  ${example}`);
        });
      }
    }
    
    // 检查uploads/images目录中的文件
    console.log('\n📁 检查uploads/images目录:');
    const imagesDir = path.join(__dirname, 'uploads/images');
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir);
      console.log(`📸 images目录中的文件数量: ${imageFiles.length}`);
      
      if (imageFiles.length > 0) {
        console.log('📸 前5个文件示例:');
        imageFiles.slice(0, 5).forEach(file => {
          console.log(`  ${file}`);
        });
      }
    } else {
      console.log('❌ uploads/images目录不存在');
    }
    
    // 检查uploads/employees目录
    console.log('\n📁 检查uploads/employees目录:');
    const employeesDir = path.join(__dirname, 'uploads/employees');
    if (fs.existsSync(employeesDir)) {
      const employeeFiles = fs.readdirSync(employeesDir);
      console.log(`👥 employees目录中的文件数量: ${employeeFiles.length}`);
      
      if (employeeFiles.length > 0) {
        console.log('👥 employees目录文件示例:');
        employeeFiles.slice(0, 5).forEach(file => {
          console.log(`  ${file}`);
        });
      }
    } else {
      console.log('❌ uploads/employees目录不存在');
    }
    
    // 总结和建议
    console.log('\n📊 状态总结:');
    if (pathStats.placeholder === allStaff.length) {
      console.log('✅ 所有员工都使用placeholder图片，图片路径已统一修复');
    } else if (pathStats.uploadsEmployees > 0 || pathStats.uploadsImages > 0) {
      console.log('⚠️ 仍有员工使用本地路径，需要进一步检查');
    } else {
      console.log('ℹ️ 员工使用混合图片源');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkCurrentImageStatus();
