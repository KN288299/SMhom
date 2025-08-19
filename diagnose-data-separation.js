const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 尝试连接不同的数据库
const possibleDatabases = [
  'mongodb://localhost:27017/homeservice',
  'mongodb://localhost:27017/homeservicechat',
  'mongodb://localhost:27017/admin',
  'mongodb://localhost:27017/test'
];

// Staff schema
const staffSchema = new mongoose.Schema({
  name: String,
  age: Number,
  job: String,
  province: String,
  height: Number,
  weight: Number,
  description: String,
  tag: String,
  image: String,
  photos: [String],
  createdAt: Date,
  updatedAt: Date
}, { collection: 'staffs' });

async function diagnoseMongoDatabases() {
  console.log('=== MongoDB 数据库诊断 ===\n');
  
  for (const mongoUri of possibleDatabases) {
    try {
      console.log(`\n检查数据库: ${mongoUri}`);
      await mongoose.connect(mongoUri);
      
      // 列出所有数据库
      const admin = mongoose.connection.db.admin();
      const dbs = await admin.listDatabases();
      
      console.log('发现的数据库:');
      dbs.databases.forEach(db => {
        console.log(`  - ${db.name} (${Math.round(db.sizeOnDisk / 1024 / 1024)}MB)`);
      });
      
      // 检查当前数据库的集合
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`\n当前数据库 ${mongoose.connection.name} 的集合:`);
      for (const col of collections) {
        try {
          const count = await mongoose.connection.db.collection(col.name).countDocuments();
          console.log(`  - ${col.name}: ${count} 条记录`);
        } catch (err) {
          console.log(`  - ${col.name}: 无法获取记录数`);
        }
      }
      
      // 尝试查询staff相关的集合
      const staffCollections = collections.filter(col => 
        col.name.toLowerCase().includes('staff') || 
        col.name.toLowerCase().includes('employee') ||
        col.name.toLowerCase().includes('worker')
      );
      
      if (staffCollections.length > 0) {
        console.log(`\n找到员工相关集合:`);
        for (const col of staffCollections) {
          try {
            const Staff = mongoose.model('Staff_' + col.name, staffSchema, col.name);
            const count = await Staff.countDocuments();
            console.log(`  - ${col.name}: ${count} 个员工`);
            
            if (count > 0) {
              const sample = await Staff.findOne();
              console.log(`    示例员工: ${sample.name || '无名字'}`);
              console.log(`    照片路径: ${sample.image || '无照片'}`);
            }
          } catch (err) {
            console.log(`  - ${col.name}: 查询失败`);
          }
        }
      }
      
      await mongoose.disconnect();
      
    } catch (error) {
      console.log(`连接失败: ${error.message}`);
    }
  }
}

async function checkFileSystem() {
  console.log('\n\n=== 文件系统检查 ===\n');
  
  // 检查可能的图片存储位置
  const possibleImageDirs = [
    '/opt/homeservice/uploads',
    '/opt/homeservice/uploads/images',
    '/opt/homeservice/uploads/employees',
    '/opt/homeservice/public/uploads',
    '/opt/homeservice/public/images',
    './uploads',
    './public/uploads',
    './public/images'
  ];
  
  console.log('检查图片存储目录:');
  for (const dir of possibleImageDirs) {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const imageFiles = files.filter(f => 
          f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')
        );
        console.log(`✅ ${dir}: ${imageFiles.length} 个图片文件`);
        
        if (imageFiles.length > 0) {
          // 显示一些文件名样例
          const samples = imageFiles.slice(0, 3);
          console.log(`   样例: ${samples.join(', ')}`);
        }
      } else {
        console.log(`❌ ${dir}: 目录不存在`);
      }
    } catch (err) {
      console.log(`❌ ${dir}: 访问失败 - ${err.message}`);
    }
  }
  
  // 检查可能的数据文件
  console.log('\n检查可能的数据导入文件:');
  const currentDir = process.cwd();
  try {
    const files = fs.readdirSync(currentDir);
    const dataFiles = files.filter(f => 
      f.includes('staff') || 
      f.includes('employee') || 
      f.includes('import') ||
      f.includes('data') ||
      f.endsWith('.json') ||
      f.endsWith('.csv')
    );
    
    if (dataFiles.length > 0) {
      dataFiles.forEach(file => {
        try {
          const stats = fs.statSync(file);
          const sizeKB = Math.round(stats.size / 1024);
          console.log(`📄 ${file}: ${sizeKB}KB, 修改时间: ${stats.mtime.toISOString()}`);
        } catch (err) {
          console.log(`📄 ${file}: 无法获取文件信息`);
        }
      });
    } else {
      console.log('未找到数据导入文件');
    }
  } catch (err) {
    console.log(`检查当前目录失败: ${err.message}`);
  }
}

async function checkWebServerConfig() {
  console.log('\n\n=== Web服务器配置检查 ===\n');
  
  // 检查可能的配置文件
  const configFiles = [
    'package.json',
    '.env',
    'config.js',
    'src/config.js',
    'config/database.js',
    'app.js',
    'server.js',
    'index.js'
  ];
  
  console.log('检查配置文件:');
  for (const file of configFiles) {
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        console.log(`\n📄 ${file}:`);
        
        // 查找数据库连接配置
        const dbMatches = content.match(/mongodb:\/\/[^\s"']+/g);
        if (dbMatches) {
          console.log('  数据库连接:');
          dbMatches.forEach(match => console.log(`    ${match}`));
        }
        
        // 查找端口配置
        const portMatches = content.match(/port[:\s]*=?\s*[\d]+/gi);
        if (portMatches) {
          console.log('  端口配置:');
          portMatches.forEach(match => console.log(`    ${match}`));
        }
        
        // 查找上传路径配置
        const uploadMatches = content.match(/upload[s]?[^"'\n]*/gi);
        if (uploadMatches) {
          console.log('  上传路径配置:');
          uploadMatches.slice(0, 3).forEach(match => console.log(`    ${match}`));
        }
        
      } catch (err) {
        console.log(`  ❌ 无法读取 ${file}`);
      }
    }
  }
}

async function main() {
  console.log('开始诊断数据和图片分离问题...\n');
  
  try {
    await diagnoseMongoDatabases();
    await checkFileSystem();
    await checkWebServerConfig();
    
    console.log('\n\n=== 诊断总结 ===');
    console.log('1. 检查了所有可能的MongoDB数据库');
    console.log('2. 扫描了图片文件存储位置');
    console.log('3. 分析了服务器配置文件');
    console.log('\n请查看上述输出，找出数据和图片分离的原因。');
    
  } catch (error) {
    console.error('诊断过程中出错:', error);
  }
}

main();
