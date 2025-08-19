const mongoose = require('mongoose');

// 员工模型
const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  job: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  photos: [{ type: String }],
  price: { type: Number, required: true },
  province: { type: String, required: true },
  city: { type: String, required: true },
  district: { type: String, required: true },
  rating: { type: Number, default: 5 },
  tag: { type: String, default: '可预约' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Staff = mongoose.model('Staff', staffSchema);

// 连接数据库
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homeservicechat';
    await mongoose.connect(mongoURI);
    console.log('MongoDB 连接成功');
    console.log('数据库名称:', mongoose.connection.db.databaseName);
  } catch (error) {
    console.error('MongoDB 连接失败:', error.message);
    process.exit(1);
  }
};

// 检查员工数据
const checkStaffData = async () => {
  try {
    await connectDB();
    
    console.log('\n=== 📊 员工数据统计 ===');
    
    // 1. 总数统计
    const totalStaff = await Staff.countDocuments({});
    console.log(`员工总数: ${totalStaff}`);
    
    if (totalStaff === 0) {
      console.log('✅ 数据库中没有员工数据');
      return;
    }
    
    // 2. 活跃状态统计
    const activeStaff = await Staff.countDocuments({ isActive: true });
    const inactiveStaff = await Staff.countDocuments({ isActive: false });
    console.log(`活跃员工: ${activeStaff}`);
    console.log(`停用员工: ${inactiveStaff}`);
    
    // 3. 按职位统计
    const jobStats = await Staff.aggregate([
      { $group: { _id: '$job', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n按职位分布:');
    jobStats.forEach(job => {
      console.log(`  ${job._id}: ${job.count} 人`);
    });
    
    // 4. 按地区统计
    const locationStats = await Staff.aggregate([
      { $group: { _id: { province: '$province', city: '$city' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    console.log('\n按地区分布 (前10):');
    locationStats.forEach(location => {
      console.log(`  ${location._id.province}-${location._id.city}: ${location.count} 人`);
    });
    
    // 5. 最新添加的员工
    const latestStaff = await Staff.find({}).sort({ createdAt: -1 }).limit(5);
    console.log('\n最新添加的员工:');
    latestStaff.forEach((staff, index) => {
      console.log(`  ${index + 1}. ${staff.name} - ${staff.job} (${staff.city}) - ${staff.createdAt.toLocaleDateString()}`);
    });
    
    // 6. 检查数据完整性
    const staffWithoutImage = await Staff.countDocuments({ 
      $or: [
        { image: { $exists: false } },
        { image: null },
        { image: '' }
      ]
    });
    
    const staffWithoutPhotos = await Staff.countDocuments({ 
      $or: [
        { photos: { $exists: false } },
        { photos: { $size: 0 } }
      ]
    });
    
    console.log('\n数据完整性检查:');
    console.log(`缺少主头像的员工: ${staffWithoutImage}`);
    console.log(`没有照片集的员工: ${staffWithoutPhotos}`);
    
    console.log('\n=== 检查完成 ===');
    
  } catch (error) {
    console.error('检查员工数据失败:', error);
  } finally {
    mongoose.connection.close();
  }
};

// 执行检查
checkStaffData();
