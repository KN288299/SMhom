const axios = require('axios');

async function testUserAPI() {
  console.log('开始测试用户API...');
  
  try {
    // 测试登录API
    console.log('1. 测试用户登录API...');
    const loginResponse = await axios.post('http://localhost:5000/api/users/login', {
      phoneNumber: '13800138000',
      inviteCode: '6969'
    });
    
    console.log('✅ 登录成功:', {
      status: loginResponse.status,
      hasToken: !!loginResponse.data.token,
      user: {
        phoneNumber: loginResponse.data.phoneNumber,
        name: loginResponse.data.name,
        role: loginResponse.data.role
      }
    });
    
    // 如果有token，测试获取用户资料
    if (loginResponse.data.token) {
      console.log('\n2. 测试获取用户资料API...');
      const profileResponse = await axios.get('http://localhost:5000/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`
        }
      });
      
      console.log('✅ 获取用户资料成功:', {
        status: profileResponse.status,
        user: profileResponse.data
      });
    }
    
  } catch (error) {
    console.log('❌ API测试失败:', {
      message: error.response?.data?.message || error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
  }
}

testUserAPI(); 