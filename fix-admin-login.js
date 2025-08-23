const mongoose = require('mongoose');
const Admin = require('./src/models/adminModel');
require('dotenv').config();

console.log('🔧 管理员登录问题修复工具');
console.log('================================\n');

// 连接数据库
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homeservicechat';
    console.log('🔗 正在连接数据库...');
    console.log(`   连接地址: ${mongoURI}`);
    
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB 连接成功\n');
    return mongoURI;
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error.message);
    throw error;
  }
};

// 修复管理员登录问题
const fixAdminLogin = async () => {
  try {
    const mongoURI = await connectDB();
    
    console.log('📋 第1步: 检查现有管理员账户...');
    const existingAdmins = await Admin.find({});
    console.log(`   找到 ${existingAdmins.length} 个现有管理员账户`);
    
    if (existingAdmins.length > 0) {
      console.log('   现有管理员列表:');
      existingAdmins.forEach((admin, index) => {
        console.log(`   ${index + 1}. ${admin.username} (${admin.role}) - ${admin.status}`);
      });
    }
    
    console.log('\n🗑️  第2步: 清理现有管理员账户...');
    const deleteResult = await Admin.deleteMany({});
    console.log(`   已删除 ${deleteResult.deletedCount} 个管理员账户`);
    
    console.log('\n👤 第3步: 创建新的超级管理员...');
    const newAdmin = await Admin.create({
      username: 'kn6969',
      password: 'cjygsg.520', // 模型会自动加密
      name: '系统管理员',
      role: 'super',
      status: 'active'
    });
    
    console.log('✅ 超级管理员创建成功!');
    console.log(`   ID: ${newAdmin._id}`);
    console.log(`   用户名: ${newAdmin.username}`);
    console.log(`   角色: ${newAdmin.role}`);
    console.log(`   状态: ${newAdmin.status}`);
    
    console.log('\n🔐 第4步: 验证密码加密...');
    const isPasswordValid = await newAdmin.matchPassword('cjygsg.520');
    console.log(`   密码验证: ${isPasswordValid ? '✅ 成功' : '❌ 失败'}`);
    
    if (!isPasswordValid) {
      throw new Error('密码验证失败，可能是加密问题');
    }
    
    console.log('\n🎉 修复完成！');
    console.log('================================');
    console.log('📝 登录信息:');
    console.log('   用户名: kn6969');
    console.log('   密码: cjygsg.520');
    console.log('   数据库: ' + mongoURI);
    console.log('================================');
    console.log('💡 提示: 现在可以使用上述信息登录管理后台');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 修复失败:', error.message);
    console.error('错误详情:', error);
    
    console.log('\n🔧 故障排除建议:');
    console.log('1. 检查 MongoDB 服务是否正在运行');
    console.log('2. 检查 .env 文件中的 MONGODB_URI 配置');
    console.log('3. 确保数据库连接权限正确');
    console.log('4. 检查防火墙设置');
    
    process.exit(1);
  }
};

// 执行修复
fixAdminLogin();
