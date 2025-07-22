const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 连接数据库
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homeservicechat';
    await mongoose.connect(mongoURI);
    console.log('MongoDB 连接成功');
  } catch (error) {
    console.error('MongoDB 连接失败:', error.message);
    process.exit(1);
  }
};

// 检查管理员账户
const checkAdmin = async () => {
  try {
    await connectDB();
    
    // 获取管理员模型
    const Admin = mongoose.model('Admin', new mongoose.Schema({
      username: String,
      password: String,
      name: String,
      role: String,
      status: String
    }));
    
    // 删除所有现有管理员账户
    await Admin.deleteMany({});
    console.log('已删除所有现有管理员账户');
    
    // 创建新的管理员
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('cjygsg.520', salt);
    
    const newAdmin = await Admin.create({
      username: 'kn6969',
      password: hashedPassword,
      name: '系统管理员',
      role: 'super',
      status: 'active'
    });
    
    console.log('新管理员创建成功:', newAdmin);
    
    process.exit(0);
  } catch (error) {
    console.error('检查管理员失败:', error.message);
    process.exit(1);
  }
};

checkAdmin(); 