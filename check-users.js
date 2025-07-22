const mongoose = require('mongoose');
const User = require('./src/models/userModel');

const connectDB = require('./src/config/db');

async function checkUsers() {
  try {
    await connectDB();
    console.log('🔍 查看数据库中的用户...\n');
    
    const users = await User.find({}).select('phoneNumber _id name').limit(10);
    
    if (users.length === 0) {
      console.log('❌ 数据库中没有用户');
    } else {
      console.log('📋 找到的用户:');
      users.forEach(user => {
        console.log(`   ID: ${user._id}, 手机号: ${user.phoneNumber}, 姓名: ${user.name || '未设置'}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 查询失败:', error);
    process.exit(1);
  }
}

checkUsers(); 