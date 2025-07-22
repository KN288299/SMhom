const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// 测试用户数据
const testUsers = {
  customerService: {
    phoneNumber: '13800138001',
    password: '123456',
    token: null
  }
};

// 登录函数
async function login(user) {
  try {
    const response = await axios.post(`${API_URL}/customer-service/login`, {
      phoneNumber: user.phoneNumber,
      password: user.password
    });
    
    if (response.data.token) {
      user.token = response.data.token;
      console.log(`✅ ${user.phoneNumber} 客服登录成功`);
      return true;
    }
  } catch (error) {
    console.error(`❌ ${user.phoneNumber} 客服登录失败:`, error.response?.data || error.message);
    return false;
  }
}

// 获取用户列表
async function getUserList(user) {
  try {
    const response = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${user.token}` }
    });
    
    console.log(`📋 获取用户列表成功:`, response.data.length, '条记录');
    
    // 检查每个用户的头像信息
    response.data.forEach((user, index) => {
      console.log(`\n👤 用户 ${index + 1}:`);
      console.log(`  ID: ${user._id}`);
      console.log(`  手机号: ${user.phoneNumber}`);
      console.log(`  姓名: ${user.name || '未设置'}`);
      console.log(`  头像: ${user.avatar || '未设置'}`);
      console.log(`  注册时间: ${user.createdAt}`);
      
      // 检查头像URL是否完整
      if (user.avatar) {
        const fullAvatarUrl = `${BASE_URL}${user.avatar}`;
        console.log(`  完整头像URL: ${fullAvatarUrl}`);
        
        // 测试头像URL是否可访问
        testImageUrl(fullAvatarUrl);
      } else {
        console.log(`  ⚠️ 用户没有设置头像`);
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`❌ 获取用户列表失败:`, error.response?.data || error.message);
    return [];
  }
}

// 测试图片URL是否可访问
async function testImageUrl(url) {
  try {
    const response = await axios.get(url, { 
      timeout: 5000,
      responseType: 'arraybuffer'
    });
    
    if (response.status === 200) {
      console.log(`  ✅ 头像URL可访问 (${response.data.length} bytes)`);
    } else {
      console.log(`  ❌ 头像URL返回状态码: ${response.status}`);
    }
  } catch (error) {
    console.log(`  ❌ 头像URL无法访问: ${error.message}`);
  }
}

// 测试用户头像显示
async function testUserAvatars() {
  console.log('🚀 开始测试用户头像显示...\n');
  
  // 1. 登录客服
  console.log('1️⃣ 登录客服...');
  const loginResult = await login(testUsers.customerService);
  
  if (!loginResult) {
    console.error('❌ 客服登录失败，测试终止');
    return;
  }
  
  // 2. 获取用户列表
  console.log('\n2️⃣ 获取用户列表...');
  const users = await getUserList(testUsers.customerService);
  
  // 3. 统计头像情况
  console.log('\n3️⃣ 统计头像情况...');
  const usersWithAvatar = users.filter(user => user.avatar);
  const usersWithoutAvatar = users.filter(user => !user.avatar);
  
  console.log(`有头像的用户: ${usersWithAvatar.length} 个`);
  console.log(`无头像的用户: ${usersWithoutAvatar.length} 个`);
  console.log(`总用户数: ${users.length} 个`);
  
  // 4. 检查头像URL格式
  console.log('\n4️⃣ 检查头像URL格式...');
  usersWithAvatar.forEach((user, index) => {
    console.log(`用户 ${index + 1} (${user.phoneNumber}):`);
    console.log(`  头像URL: ${user.avatar}`);
    
    // 检查URL格式
    if (user.avatar.startsWith('/uploads/')) {
      console.log(`  ✅ URL格式正确 (相对路径)`);
    } else if (user.avatar.startsWith('http')) {
      console.log(`  ✅ URL格式正确 (绝对路径)`);
    } else {
      console.log(`  ⚠️ URL格式可能有问题`);
    }
  });
  
  // 5. 生成修复建议
  console.log('\n5️⃣ 修复建议...');
  if (usersWithoutAvatar.length > 0) {
    console.log('📝 建议为没有头像的用户设置默认头像');
  }
  
  if (usersWithAvatar.length > 0) {
    console.log('📝 建议检查头像URL是否正确拼接');
  }
  
  console.log('\n✅ 用户头像测试完成');
}

// 运行测试
if (require.main === module) {
  testUserAvatars().catch(console.error);
}

module.exports = {
  testUserAvatars
}; 