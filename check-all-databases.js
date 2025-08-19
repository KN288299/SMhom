const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function checkAllDatabases() {
  try {
    console.log('🔍 检查所有可能的数据库和集合...');
    
    const targetId = '68a46bcdc0c157231d4e53c5';
    
    // 定义员工模型
    const staffSchema = new mongoose.Schema({}, { strict: false, collection: 'staff' });
    
    // 检查不同的数据库连接
    const databases = [
      'mongodb://localhost:27017/homeservice',
      'mongodb://localhost:27017/homeservicechat', 
      'mongodb://localhost:27017/test',
      'mongodb://localhost:27017/admin'
    ];
    
    for (const dbUrl of databases) {
      console.log(`\n📊 检查数据库: ${dbUrl}`);
      
      try {
        // 连接数据库
        await mongoose.disconnect();
        await mongoose.connect(dbUrl);
        
        const db = mongoose.connection.db;
        
        // 列出所有集合
        const collections = await db.listCollections().toArray();
        console.log(`  集合数量: ${collections.length}`);
        
        for (const collection of collections) {
          const collectionName = collection.name;
          console.log(`\n  📁 检查集合: ${collectionName}`);
          
          try {
            // 检查是否包含目标ID
            const coll = db.collection(collectionName);
            
            // 尝试按ObjectId查找
            try {
              const doc1 = await coll.findOne({ _id: new mongoose.Types.ObjectId(targetId) });
              if (doc1) {
                console.log(`    ✅ 在 ${collectionName} 中找到目标ID!`);
                console.log(`    📋 文档内容:`, JSON.stringify(doc1, null, 2));
                return { database: dbUrl, collection: collectionName, document: doc1 };
              }
            } catch (e) {
              // ObjectId转换失败，尝试字符串查找
            }
            
            // 尝试按字符串查找
            const doc2 = await coll.findOne({ _id: targetId });
            if (doc2) {
              console.log(`    ✅ 在 ${collectionName} 中找到目标ID (字符串格式)!`);
              console.log(`    📋 文档内容:`, JSON.stringify(doc2, null, 2));
              return { database: dbUrl, collection: collectionName, document: doc2 };
            }
            
            // 检查集合是否包含员工数据
            const sampleDoc = await coll.findOne({});
            if (sampleDoc && (sampleDoc.name || sampleDoc.job || sampleDoc.image)) {
              console.log(`    📝 ${collectionName} 看起来像员工集合`);
              const count = await coll.countDocuments();
              console.log(`    📊 文档数量: ${count}`);
              
              // 显示最近的几个文档
              const recent = await coll.find({}).sort({ _id: -1 }).limit(3).toArray();
              console.log(`    🕒 最近的文档:`);
              recent.forEach((doc, i) => {
                console.log(`      ${i+1}. ID: ${doc._id}, 名称: ${doc.name || 'N/A'}`);
              });
            }
            
          } catch (error) {
            console.log(`    ❌ 检查集合 ${collectionName} 时出错: ${error.message}`);
          }
        }
        
      } catch (error) {
        console.log(`  ❌ 连接数据库失败: ${error.message}`);
      }
    }
    
    console.log('\n❌ 在所有数据库中都未找到目标ID');
    
    // 检查文件系统中是否有相关文件
    console.log('\n📁 检查文件系统中的图片目录...');
    
    const imageDirs = [
      'uploads',
      'uploads/employees', 
      'uploads/images',
      'uploads/admin-temp',
      'public/uploads',
      'public/uploads/employees'
    ];
    
    for (const dir of imageDirs) {
      const dirPath = path.join(__dirname, dir);
      
      if (fs.existsSync(dirPath)) {
        console.log(`\n📂 检查目录: ${dirPath}`);
        
        try {
          const files = fs.readdirSync(dirPath, { withFileTypes: true });
          
          // 查找包含目标ID的文件或文件夹
          const matchingItems = files.filter(item => 
            item.name.includes(targetId) || 
            item.name.includes(targetId.substring(0, 10))
          );
          
          if (matchingItems.length > 0) {
            console.log(`  🎯 找到相关文件/文件夹:`);
            matchingItems.forEach(item => {
              const type = item.isDirectory() ? '📁' : '📄';
              console.log(`    ${type} ${item.name}`);
            });
          }
          
          // 检查是否有以 employee- 开头的文件
          const employeeFiles = files.filter(item => 
            item.name.startsWith('employee-') && 
            (item.name.includes('.jpg') || item.name.includes('.png') || item.name.includes('.jpeg'))
          );
          
          if (employeeFiles.length > 0) {
            console.log(`  👥 员工图片文件 (${employeeFiles.length}个):`);
            employeeFiles.slice(0, 5).forEach(file => {
              console.log(`    📸 ${file.name}`);
            });
            if (employeeFiles.length > 5) {
              console.log(`    ... 还有 ${employeeFiles.length - 5} 个文件`);
            }
          }
          
        } catch (error) {
          console.log(`  ❌ 读取目录失败: ${error.message}`);
        }
      } else {
        console.log(`📂 目录不存在: ${dirPath}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 总体检查出错:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkAllDatabases();