const axios = require('axios');

// 服务器基础URL
const SERVER_BASE_URL = 'http://38.207.176.241:3000';

async function debugMiddleware() {
  try {
    // 1. 管理员登录
    console.log('🔐 步骤1: 管理员登录...');
    
    const loginResponse = await axios.post(`${SERVER_BASE_URL}/api/admin/login`, {
      username: 'kn6969',
      password: 'cjygsg.520',
      captcha: '1234',
      captchaSessionId: 'test-session'
    });
    
    console.log('✅ 登录成功');
    const token = loginResponse.data.token;
    console.log('令牌:', token);
    
    // 2. 测试一个简单的API来查看中间件日志
    console.log('\n🔍 步骤2: 测试带日志的API调用...');
    
    try {
      const testResponse = await axios.get(`${SERVER_BASE_URL}/api/staff?page=1&limit=1`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ 测试API调用成功');
      console.log('响应状态:', testResponse.status);
      
    } catch (error) {
      console.error('❌ 测试API调用失败:', error.response?.data || error.message);
    }
    
    // 3. 再次测试删除预览API
    console.log('\n🔍 步骤3: 再次测试删除预览API...');
    
    try {
      const previewResponse = await axios.get(`${SERVER_BASE_URL}/api/staff/delete-preview?batchSize=5`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ 删除预览API调用成功');
      console.log('响应数据:', previewResponse.data);
      
    } catch (error) {
      console.error('❌ 删除预览API调用失败:', error.response?.data || error.message);
      if (error.response) {
        console.error('状态码:', error.response.status);
        console.error('完整响应:', error.response.data);
      }
    }
    
  } catch (error) {
    console.error('❌ 调试失败:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

debugMiddleware();
