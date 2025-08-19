const mongoose = require('mongoose');
const Staff = require('./src/models/staffModel');

// 连接数据库
mongoose.connect('mongodb://127.0.0.1:27017/homeservicechat', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('🔗 数据库连接成功'))
.catch(err => console.error('❌ 数据库连接失败:', err));

const checkStaffData = async () => {
  try {
    const staffCount = await Staff.countDocuments();
    console.log(`📊 数据库中员工总数: ${staffCount}`);
    
    if (staffCount > 0) {
      const staffList = await Staff.find({}, 'name job image isActive').limit(5);
      console.log('👥 员工列表:');
      staffList.forEach((staff, index) => {
        console.log(`  ${index + 1}. ${staff.name} - ${staff.job} - ${staff.isActive ? '活跃' : '非活跃'}`);
        console.log(`     图片: ${staff.image}`);
      });
    } else {
      console.log('❌ 数据库中没有员工数据！');
      
      // 尝试创建一个测试员工
      console.log('🔧 尝试创建测试员工...');
      const testStaff = new Staff({
        name: '测试员工',
        age: 30,
        job: '测试职业',
        image: 'https://via.placeholder.com/150',
        province: '北京市',
        isActive: true
      });
      
      const saved = await testStaff.save();
      console.log('✅ 测试员工创建成功:', saved.name);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 检查员工数据失败:', error);
    process.exit(1);
  }
};

// 等待数据库连接后执行检查
setTimeout(checkStaffData, 1000);
