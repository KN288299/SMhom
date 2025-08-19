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

// 强制删除所有员工数据
const forceDeleteAllStaff = async () => {
  try {
    await connectDB();
    
    console.log('\n=== 🗑️  强制删除所有员工数据 ===');
    
    // 1. 检查当前数量
    const currentCount = await Staff.countDocuments({});
    console.log(`当前员工数量: ${currentCount}`);
    
    if (currentCount === 0) {
      console.log('✅ 数据库已经是空的');
      return;
    }
    
    // 2. 获取所有员工的图片路径（用于后续文件删除）
    console.log('\n📋 收集所有员工的图片路径...');
    const allStaff = await Staff.find({}, { image: 1, photos: 1, name: 1 });
    
    const imagePaths = new Set();
    allStaff.forEach(staff => {
      if (staff.image) {
        imagePaths.add(staff.image);
      }
      if (staff.photos && staff.photos.length > 0) {
        staff.photos.forEach(photo => {
          if (photo) {
            imagePaths.add(photo);
          }
        });
      }
    });
    
    console.log(`收集到 ${imagePaths.size} 个唯一图片路径`);
    
    // 3. 使用多种方法强制删除
    console.log('\n🔥 开始强制删除...');
    
    // 方法1: 使用deleteMany删除所有记录
    console.log('方法1: 使用 deleteMany...');
    const deleteResult1 = await Staff.deleteMany({});
    console.log(`deleteMany 删除了 ${deleteResult1.deletedCount} 条记录`);
    
    // 检查是否还有残留
    let remainingCount = await Staff.countDocuments({});
    console.log(`剩余记录: ${remainingCount}`);
    
    if (remainingCount > 0) {
      console.log('方法2: 逐个删除残留记录...');
      const remainingStaff = await Staff.find({});
      for (const staff of remainingStaff) {
        try {
          await Staff.findByIdAndDelete(staff._id);
          console.log(`删除: ${staff.name}`);
        } catch (error) {
          console.error(`删除 ${staff.name} 失败:`, error.message);
        }
      }
    }
    
    // 再次检查
    remainingCount = await Staff.countDocuments({});
    console.log(`二次检查剩余记录: ${remainingCount}`);
    
    if (remainingCount > 0) {
      console.log('方法3: 直接操作集合...');
      const collection = mongoose.connection.db.collection('staffs');
      const dropResult = await collection.deleteMany({});
      console.log(`直接删除集合记录: ${dropResult.deletedCount}`);
    }
    
    // 最终检查
    const finalCount = await Staff.countDocuments({});
    console.log(`\n🎯 最终检查: ${finalCount} 条记录`);
    
    if (finalCount === 0) {
      console.log('✅ 所有员工数据已成功删除！');
    } else {
      console.log('❌ 仍有数据残留，需要手动处理');
    }
    
    // 4. 返回图片路径供后续处理
    return Array.from(imagePaths);
    
  } catch (error) {
    console.error('删除操作失败:', error);
    throw error;
  } finally {
    mongoose.connection.close();
  }
};

// 执行删除
forceDeleteAllStaff()
  .then(imagePaths => {
    console.log(`\n📊 删除完成，收集到 ${imagePaths ? imagePaths.length : 0} 个图片路径`);
    if (imagePaths && imagePaths.length > 0) {
      console.log('前10个图片路径示例:');
      imagePaths.slice(0, 10).forEach((path, index) => {
        console.log(`${index + 1}. ${path}`);
      });
    }
  })
  .catch(error => {
    console.error('程序执行失败:', error);
  });
