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

// 创建超级管理员
const createSuperAdmin = async () => {
  try {
    console.log('🚀 开始创建超级管理员...\n');
    
    await connectDB();
    
    // 检查是否已存在管理员账户
    const existingAdmin = await Admin.findOne({ username: 'kn6969' });
    if (existingAdmin) {
      console.log('⚠️  管理员账户已存在:', existingAdmin.username);
      console.log('正在删除现有账户...');
      await Admin.deleteOne({ username: 'kn6969' });
    }
    
    // 创建新的超级管理员 - 不需要手动加密密码，模型会自动处理
    const admin = await Admin.create({
      username: 'kn6969',
      password: 'cjygsg.520', // 原始密码，模型会自动加密
      name: '系统管理员',
      role: 'super',
      status: 'active'
    });
    
    console.log('✅ 超级管理员创建成功!');
    console.log('📋 管理员信息:');
    console.log(`   - ID: ${admin._id}`);
    console.log(`   - 用户名: ${admin.username}`);
    console.log(`   - 姓名: ${admin.name}`);
    console.log(`   - 角色: ${admin.role}`);
    console.log(`   - 状态: ${admin.status}`);
    console.log(`   - 创建时间: ${admin.createdAt}`);
    
    console.log('\n🎯 登录信息:');
    console.log('   用户名: kn6969');
    console.log('   密码: cjygsg.520');
    
    // 验证密码是否正确加密
    const isPasswordCorrect = await admin.matchPassword('cjygsg.520');
    console.log(`\n🔐 密码验证: ${isPasswordCorrect ? '✅ 成功' : '❌ 失败'}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 创建超级管理员失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
};

// 执行创建
createSuperAdmin();
