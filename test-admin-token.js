const axios = require('axios');

// 服务器基础URL
const SERVER_BASE_URL = 'http://38.207.178.173:3000';

async function testAdminToken() {
  try {
    // 1. 首先尝试管理员登录
    console.log('🔐 尝试管理员登录...');
    
    const loginResponse = await axios.post(`${SERVER_BASE_URL}/api/admin/login`, {
      username: 'kn6969',
      password: 'cjygsg.520',
      captcha: '1234',
      captchaSessionId: 'test-session'
    });
    
    console.log('✅ 登录成功');
    console.log('令牌:', loginResponse.data.token);
    console.log('令牌前缀:', loginResponse.data.token.substring(0, 2));
    
    const token = loginResponse.data.token;
    
    // 2. 测试删除预览API
    console.log('\n🔍 测试删除预览API...');
    
    const previewResponse = await axios.get(`${SERVER_BASE_URL}/api/staff/delete-preview?batchSize=10`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ 删除预览API调用成功');
    console.log('响应数据:', previewResponse.data);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testAdminToken();
