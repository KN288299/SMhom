const mongoose = require('mongoose');

console.log('=== 检查服务器实际连接的数据库 ===\n');

async function checkDatabaseConnection() {
  try {
    // 1. 检查环境变量
    console.log('1. 环境变量检查:');
    console.log(`   MONGODB_URI: ${process.env.MONGODB_URI || '未设置'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || '未设置'}`);
    
    // 2. 模拟服务器的数据库连接逻辑
    console.log('\n2. 模拟服务器数据库连接:');
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homeservicechat';
    console.log(`   将要连接的URI: ${mongoURI}`);
    
    // 3. 实际连接数据库
    console.log('\n3. 尝试连接数据库...');
    await mongoose.connect(mongoURI);
    
    // 4. 获取当前连接的数据库名
    const dbName = mongoose.connection.db.databaseName;
    console.log(`✅ 成功连接到数据库: ${dbName}`);
    
    // 5. 检查该数据库中的员工数据
    console.log('\n4. 检查当前数据库中的员工数据:');
    
    // 先检查有哪些集合
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('   数据库中的集合:');
    collections.forEach(col => {
      console.log(`     - ${col.name}`);
    });
    
    // 检查 staffs 集合
    if (collections.find(col => col.name === 'staffs')) {
      const staffCollection = mongoose.connection.db.collection('staffs');
      const staffCount = await staffCollection.countDocuments();
      console.log(`\n   员工总数: ${staffCount}`);
      
      if (staffCount > 0) {
        // 获取几个员工样本
        const sampleStaffs = await staffCollection.find({}).limit(3).toArray();
        console.log('   员工样本:');
        sampleStaffs.forEach((staff, index) => {
          console.log(`     ${index + 1}. ${staff.name || '未知姓名'} - 照片: ${staff.photo || '无照片'}`);
        });
        
        // 检查照片路径格式
        const photoPaths = await staffCollection.find(
          { photo: { $exists: true, $ne: null, $ne: '' } },
          { photo: 1 }
        ).limit(10).toArray();
        
        console.log('\n   照片路径样本:');
        photoPaths.forEach((staff, index) => {
          console.log(`     ${index + 1}. ${staff.photo}`);
        });
      }
    }
    
    // 6. 检查其他可能的员工相关集合
    console.log('\n5. 检查其他可能的员工集合:');
    const possibleStaffCollections = collections.filter(col => 
      col.name.includes('staff') || 
      col.name.includes('employee') || 
      col.name.includes('worker')
    );
    
    for (const col of possibleStaffCollections) {
      const collection = mongoose.connection.db.collection(col.name);
      const count = await collection.countDocuments();
      console.log(`   ${col.name}: ${count} 条记录`);
    }
    
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n=== 检查完成 ===');
  }
}

checkDatabaseConnection();
