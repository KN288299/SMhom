const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function getTokens() {
  try {
    // 1. 获取客服token
    console.log('🔑 获取客服token...');
    const csResponse = await axios.post(`${BASE_URL}/customer-service/login`, {
      phoneNumber: '19999999999',
      password: '1332',
      inviteCode: '1332'
    });
    
    console.log('✅ 客服登录成功:');
    console.log('   ID:', csResponse.data._id);
    console.log('   Token:', csResponse.data.token);
    
    // 2. 获取用户token (这里需要用一个存在的用户手机号)
    console.log('\n🔑 获取用户token...');
    try {
      const userResponse = await axios.post(`${BASE_URL}/users/login`, {
        phoneNumber: '10000000000', // 使用一个测试用户号码
        inviteCode: '6969'
      });
      
      console.log('✅ 用户登录成功:');
      console.log('   ID:', userResponse.data._id);
      console.log('   Token:', userResponse.data.token);
      
    } catch (userError) {
      console.log('❌ 用户登录失败，使用默认测试token');
      console.log('   原因:', userError.response?.data?.message || userError.message);
    }
    
  } catch (error) {
    console.error('❌ 获取token失败:', error.response?.data || error.message);
  }
}

getTokens(); 