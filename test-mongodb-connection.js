const mongoose = require('mongoose');

async function testMongoDBConnection() {
  console.log('🔌 测试MongoDB连接...');
  
  try {
    // 尝试连接
    await mongoose.connect('mongodb://localhost:27017/homeservice', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5秒超时
      connectTimeoutMS: 10000, // 10秒连接超时
    });
    
    console.log('✅ MongoDB连接成功!');
    console.log('📡 连接状态:', mongoose.connection.readyState);
    console.log('🗄️ 数据库名称:', mongoose.connection.name);
    console.log('🔗 连接URL:', mongoose.connection.host + ':' + mongoose.connection.port);
    
    // 测试数据库操作
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📚 数据库集合数量:', collections.length);
    
    if (collections.length > 0) {
      console.log('📋 集合列表:');
      collections.forEach((collection, index) => {
        console.log(`   ${index + 1}. ${collection.name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error.message);
    console.log('');
    console.log('💡 解决方案:');
    console.log('   1. 确保MongoDB服务正在运行:');
    console.log('      sudo systemctl start mongod');
    console.log('      sudo systemctl status mongod');
    console.log('');
    console.log('   2. 检查MongoDB是否安装:');
    console.log('      mongod --version');
    console.log('');
    console.log('   3. 检查端口27017是否被占用:');
    console.log('      netstat -tlnp | grep 27017');
    console.log('');
    console.log('   4. 尝试手动启动MongoDB:');
    console.log('      sudo mongod --dbpath /var/lib/mongodb');
    
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 连接已关闭');
    }
  }
}

testMongoDBConnection();

