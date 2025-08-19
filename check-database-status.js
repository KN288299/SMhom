const mongoose = require('mongoose');
const Staff = require('./src/models/staffModel');

// 连接数据库
async function connectDatabase() {
  try {
    console.log('🔌 正在连接数据库...');
    await mongoose.connect('mongodb://localhost:27017/homeservice', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

async function checkDatabaseStatus() {
  try {
    console.log('🔍 检查数据库状态...');
    
    // 连接数据库
    const connected = await connectDatabase();
    if (!connected) {
      console.log('❌ 无法连接到数据库，请检查MongoDB是否运行');
      return;
    }
    
    // 等待连接稳定
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 检查数据库连接
    console.log('📡 数据库连接状态:', mongoose.connection.readyState === 1 ? '已连接' : '未连接');
    
    // 检查数据库名称
    console.log('🗄️ 数据库名称:', mongoose.connection.name);
    
    // 获取所有集合
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📚 数据库集合:', collections.map(c => c.name));
    
    // 检查员工集合
    const staffCollection = collections.find(c => c.name === 'staffs');
    if (staffCollection) {
      console.log('✅ 员工集合存在');
      
      // 获取员工数量
      const staffCount = await Staff.countDocuments();
      console.log(`📊 员工总数: ${staffCount}`);
      
      if (staffCount > 0) {
        // 获取前5名员工
        const sampleStaff = await Staff.find().limit(5).select('name age job image photos createdAt');
        console.log('\n📋 员工样本:');
        sampleStaff.forEach((staff, index) => {
          console.log(`\n${index + 1}. ${staff.name}`);
          console.log(`   年龄: ${staff.age}, 职业: ${staff.job}`);
          console.log(`   主图: ${staff.image}`);
          console.log(`   照片数: ${staff.photos ? staff.photos.length : 0}`);
          console.log(`   创建时间: ${staff.createdAt.toLocaleString()}`);
        });
      } else {
        console.log('⚠️ 员工集合为空，创建测试数据...');
        await createTestData();
      }
    } else {
      console.log('❌ 员工集合不存在，创建测试数据...');
      await createTestData();
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    console.log('💡 可能的解决方案:');
    console.log('   1. 确保MongoDB服务正在运行');
    console.log('   2. 检查数据库连接字符串');
    console.log('   3. 确保数据库端口27017可访问');
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

async function createTestData() {
  try {
    console.log('📝 创建测试员工数据...');
    
    const testStaffData = [
      {
        name: '测试员工1',
        age: 25,
        job: '模特',
        province: '北京市',
        image: 'https://via.placeholder.com/300x400/FF6B6B/FFFFFF?text=测试员工1',
        photos: [
          'https://via.placeholder.com/300x400/4ECDC4/FFFFFF?text=照片1',
          'https://via.placeholder.com/300x400/45B7D1/FFFFFF?text=照片2'
        ],
        height: 168,
        weight: 50,
        description: '专业模特，形象气质佳',
        tag: '可预约'
      },
      {
        name: '测试员工2',
        age: 23,
        job: '舞蹈老师',
        province: '上海市',
        image: 'https://via.placeholder.com/300x400/96CEB4/FFFFFF?text=测试员工2',
        photos: [
          'https://via.placeholder.com/300x400/FFEAA7/FFFFFF?text=照片1',
          'https://via.placeholder.com/300x400/DDA0DD/FFFFFF?text=照片2',
          'https://via.placeholder.com/300x400/98D8C8/FFFFFF?text=照片3'
        ],
        height: 165,
        weight: 48,
        description: '专业舞蹈老师，身材优美',
        tag: '可预约'
      },
      {
        name: '测试员工3',
        age: 26,
        job: '健身教练',
        province: '广州市',
        image: 'https://via.placeholder.com/300x400/F7DC6F/FFFFFF?text=测试员工3',
        photos: [
          'https://via.placeholder.com/300x400/BB8FCE/FFFFFF?text=照片1',
          'https://via.placeholder.com/300x400/85C1E9/FFFFFF?text=照片2'
        ],
        height: 170,
        weight: 55,
        description: '专业健身教练，身材健美',
        tag: '可预约'
      }
    ];
    
    for (const staffInfo of testStaffData) {
      const newStaff = new Staff(staffInfo);
      await newStaff.save();
      console.log(`   ✅ 创建员工: ${staffInfo.name}`);
    }
    
    console.log(`🎉 成功创建 ${testStaffData.length} 名测试员工`);
    
    // 验证创建结果
    const totalStaff = await Staff.countDocuments();
    console.log(`📊 当前员工总数: ${totalStaff}`);
    
  } catch (error) {
    console.error('❌ 创建测试数据失败:', error.message);
  }
}

checkDatabaseStatus();
