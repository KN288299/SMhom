const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/admin';

async function testAPI() {
  console.log('开始测试API...');
  
  try {
    // 测试登录API
    console.log('\n1. 测试登录API...');
    const loginResponse = await axios.post(`${API_BASE}/login`, {
      username: 'kn6969',
      password: 'cjygsg.520'
    });
    
    console.log('登录成功:', {
      status: loginResponse.status,
      hasToken: !!loginResponse.data.token,
      hasAdmin: !!loginResponse.data.admin
    });
    
    const token = loginResponse.data.token;
    
    // 测试获取个人资料API
    console.log('\n2. 测试获取个人资料API...');
    const profileResponse = await axios.get(`${API_BASE}/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('获取个人资料成功:', {
      status: profileResponse.status,
      admin: profileResponse.data.admin
    });
    
    // 测试获取统计数据API
    console.log('\n3. 测试获取统计数据API...');
    const statsResponse = await axios.get(`${API_BASE}/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('获取统计数据成功:', {
      status: statsResponse.status,
      stats: statsResponse.data
    });
    
    console.log('\n✅ 所有API测试通过！');
    
  } catch (error) {
    console.error('❌ API测试失败:', error.response?.data || error.message);
  }
}

testAPI(); 