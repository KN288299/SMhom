const mongoose = require('mongoose');
const Admin = require('./src/models/adminModel');
require('dotenv').config();

// 连接数据库
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homeservicechat';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB 连接成功');
    console.log('🔗 连接地址:', mongoURI);
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error.message);
    throw error;
  }
};

// 验证管理员账户
const verifyAdmin = async () => {
  try {
    console.log('🔍 开始验证管理员账户...\n');
    
    await connectDB();
    
    // 获取所有管理员账户
    const admins = await Admin.find({});
    console.log(`📊 数据库中共有 ${admins.length} 个管理员账户\n`);
    
    if (admins.length === 0) {
      console.log('❌ 没有找到任何管理员账户！');
      console.log('请运行以下命令创建管理员账户:');
      console.log('node create-admin-fixed.js');
      process.exit(1);
    }
    
    // 显示所有管理员
    admins.forEach((admin, index) => {
      console.log(`👤 管理员 ${index + 1}:`);
      console.log(`   - ID: ${admin._id}`);
      console.log(`   - 用户名: ${admin.username}`);
      console.log(`   - 姓名: ${admin.name}`);
      console.log(`   - 角色: ${admin.role}`);
      console.log(`   - 状态: ${admin.status}`);
      console.log(`   - 创建时间: ${admin.createdAt}`);
      console.log(`   - 更新时间: ${admin.updatedAt}\n`);
    });
    
    // 特别验证默认管理员
    const defaultAdmin = await Admin.findOne({ username: 'kn6969' });
    if (defaultAdmin) {
      console.log('🎯 验证默认管理员账户 (kn6969):');
      console.log(`   - 状态: ${defaultAdmin.status}`);
      console.log(`   - 角色: ${defaultAdmin.role}`);
      
      // 验证密码
      try {
        const isPasswordCorrect = await defaultAdmin.matchPassword('cjygsg.520');
        console.log(`   - 密码验证: ${isPasswordCorrect ? '✅ 正确' : '❌ 错误'}`);
        
        if (isPasswordCorrect && defaultAdmin.status === 'active') {
          console.log('\n🎉 管理员账户验证成功！可以使用以下信息登录:');
          console.log('   用户名: kn6969');
          console.log('   密码: cjygsg.520');
        } else {
          console.log('\n⚠️  管理员账户存在问题，请检查状态或密码');
        }
      } catch (error) {
        console.log(`   - 密码验证: ❌ 验证失败 (${error.message})`);
      }
    } else {
      console.log('❌ 默认管理员账户 (kn6969) 不存在！');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 验证管理员账户失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
};

// 执行验证
verifyAdmin();
