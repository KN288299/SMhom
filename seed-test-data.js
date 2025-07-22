const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const Staff = require('./src/models/staffModel');
const User = require('./src/models/userModel');
const Order = require('./src/models/orderModel');
const Admin = require('./src/models/adminModel');

// 加载环境变量
dotenv.config();

// 连接数据库
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/homeservicechat', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB连接成功'))
.catch(err => console.error('MongoDB连接失败:', err));

// 测试数据
const testUsers = [
  {
    name: '测试用户1',
    phoneNumber: '13800000001',
    isActive: true,
  },
  {
    name: '测试用户2',
    phoneNumber: '13800000002',
    isActive: true,
  }
];

const testStaff = [
  {
    name: '张技师',
    phoneNumber: '13900000001',
    job: '按摩师',
    description: '专业按摩师，有5年工作经验',
    province: '广东省',
    city: '深圳市',
    isActive: true,
    image: 'https://via.placeholder.com/150',
    age: 28,
  },
  {
    name: '李阿姨',
    phoneNumber: '13900000002',
    job: '保洁员',
    description: '专业保洁，有10年工作经验',
    province: '广东省',
    city: '深圳市',
    isActive: true,
    image: 'https://via.placeholder.com/150',
    age: 45,
  }
];

// 确保管理员账号存在
const ensureAdminExists = async () => {
  try {
    // 删除所有现有管理员账户
    await Admin.deleteMany({});
    console.log('已删除所有现有管理员账户');
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('cjygsg.520', salt);
    
    await Admin.create({
      username: 'kn6969',
      password: hashedPassword,
      name: '系统管理员',
      role: 'super',
      status: 'active'
    });
    
    console.log('管理员账号创建成功');
  } catch (error) {
    console.error('确保管理员账号存在失败:', error);
  }
};

// 添加测试用户
const addTestUsers = async () => {
  try {
    // 先检查是否已存在测试用户
    const existingUsers = await User.find({ phoneNumber: { $in: testUsers.map(u => u.phoneNumber) } });
    
    if (existingUsers.length === testUsers.length) {
      console.log('测试用户已存在，跳过创建');
      return existingUsers;
    }
    
    // 删除已存在的测试用户
    await User.deleteMany({ phoneNumber: { $in: testUsers.map(u => u.phoneNumber) } });
    
    // 创建新的测试用户
    const createdUsers = await User.insertMany(testUsers);
    console.log(`已创建${createdUsers.length}个测试用户`);
    return createdUsers;
  } catch (error) {
    console.error('添加测试用户失败:', error);
    return [];
  }
};

// 添加测试员工
const addTestStaff = async () => {
  try {
    // 先检查是否已存在测试员工
    const existingStaff = await Staff.find({ phoneNumber: { $in: testStaff.map(s => s.phoneNumber) } });
    
    if (existingStaff.length === testStaff.length) {
      console.log('测试员工已存在，跳过创建');
      return existingStaff;
    }
    
    // 删除已存在的测试员工
    await Staff.deleteMany({ phoneNumber: { $in: testStaff.map(s => s.phoneNumber) } });
    
    // 创建新的测试员工
    const createdStaff = await Staff.insertMany(testStaff);
    console.log(`已创建${createdStaff.length}个测试员工`);
    return createdStaff;
  } catch (error) {
    console.error('添加测试员工失败:', error);
    return [];
  }
};

// 添加测试订单
const addTestOrders = async (users, staff) => {
  try {
    if (!users.length || !staff.length) {
      console.log('没有用户或员工数据，无法创建订单');
      return;
    }
    
    // 删除已有的测试订单
    await Order.deleteMany({});
    
    // 创建测试订单数据
    const orderData = [
      {
        user: users[0]._id,
        staff: staff[0]._id,
        appointmentTime: new Date(),
        price: 150,
        address: '深圳市南山区科技园1号楼',
        notes: '请准时到达',
        serviceType: '上门按摩',
        status: 'pending',
      },
      {
        user: users[0]._id,
        staff: staff[1]._id,
        appointmentTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天
        price: 200,
        address: '深圳市福田区中心区2号楼',
        notes: '需要带清洁工具',
        serviceType: '家政保洁',
        status: 'accepted',
      },
      {
        user: users[1]._id,
        staff: staff[0]._id,
        appointmentTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 前天
        price: 180,
        address: '深圳市罗湖区东门商业区',
        notes: '',
        serviceType: '上门按摩',
        status: 'completed',
      },
      {
        user: users[1]._id,
        staff: staff[1]._id,
        appointmentTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 一周前
        price: 120,
        address: '深圳市宝安区西乡街道',
        notes: '已取消',
        serviceType: '家政保洁',
        status: 'cancelled',
      },
    ];
    
    // 逐个创建订单，而不是批量插入
    const createdOrders = [];
    for (const data of orderData) {
      const order = new Order(data);
      const savedOrder = await order.save();
      createdOrders.push(savedOrder);
    }
    
    console.log(`已创建${createdOrders.length}个测试订单`);
  } catch (error) {
    console.error('添加测试订单失败:', error);
  }
};

// 执行数据填充
const seedData = async () => {
  try {
    await ensureAdminExists();
    const users = await addTestUsers();
    const staff = await addTestStaff();
    await addTestOrders(users, staff);
    
    console.log('测试数据填充完成');
    process.exit(0);
  } catch (error) {
    console.error('数据填充失败:', error);
    process.exit(1);
  }
};

// 运行脚本
seedData(); 