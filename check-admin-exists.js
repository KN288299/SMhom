const mongoose = require('mongoose');
const Admin = require('./src/models/adminModel');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB连接成功');
  } catch (error) {
    console.error('MongoDB连接失败:', error.message);
    process.exit(1);
  }
};

// 检查管理员账户
const checkAdminAccounts = async () => {
  try {
    await connectDB();
    
    console.log('🔍 查询所有管理员账户...\n');
    
    // 获取所有管理员账户
    const admins = await Admin.find({});
    
    if (admins.length === 0) {
      console.log('❌ 数据库中没有找到任何管理员账户！');
      console.log('\n建议运行以下命令创建默认管理员账户:');
      console.log('node src/models/seedAdmin.js');
    } else {
      console.log(`✅ 找到 ${admins.length} 个管理员账户:\n`);
      
      admins.forEach((admin, index) => {
        console.log(`管理员 ${index + 1}:`);
        console.log(`  - ID: ${admin._id}`);
        console.log(`  - 用户名: ${admin.username}`);
        console.log(`  - 姓名: ${admin.name}`);
        console.log(`  - 角色: ${admin.role}`);
        console.log(`  - 状态: ${admin.status}`);
        console.log(`  - 创建时间: ${admin.createdAt}`);
        console.log(`  - 更新时间: ${admin.updatedAt}\n`);
      });
    }
    
    // 特别检查默认管理员账户
    const defaultAdmin = await Admin.findOne({ username: 'kn6969' });
    if (defaultAdmin) {
      console.log('🎯 默认管理员账户 (kn6969) 存在且状态为:', defaultAdmin.status);
    } else {
      console.log('⚠️  默认管理员账户 (kn6969) 不存在！');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('检查管理员账户失败:', error.message);
    process.exit(1);
  }
};

// 执行检查
checkAdminAccounts();
