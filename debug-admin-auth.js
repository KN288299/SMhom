const axios = require('axios');

// 服务器基础URL
const SERVER_BASE_URL = 'http://38.207.178.173:3000';

async function debugAdminAuth() {
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
    console.log('令牌前缀:', token.substring(0, 2));
    
    // 2. 测试一个简单的管理员API来验证认证
    console.log('\n🔍 步骤2: 测试管理员认证...');
    
    try {
      const adminTestResponse = await axios.get(`${SERVER_BASE_URL}/api/admin/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ 管理员认证测试成功');
      console.log('响应:', adminTestResponse.data);
      
    } catch (error) {
      console.error('❌ 管理员认证测试失败:', error.response?.data || error.message);
    }
    
    // 3. 测试删除预览API
    console.log('\n🔍 步骤3: 测试删除预览API...');
    
    try {
      const previewResponse = await axios.get(`${SERVER_BASE_URL}/api/staff/delete-preview?batchSize=10`, {
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
    
    // 4. 尝试管理员路由的删除预览
    console.log('\n🔍 步骤4: 测试管理员路由的删除预览...');
    
    try {
      const adminPreviewResponse = await axios.get(`${SERVER_BASE_URL}/api/admin/staff/delete-preview?batchSize=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ 管理员路由删除预览成功');
      console.log('响应数据:', adminPreviewResponse.data);
      
    } catch (error) {
      console.error('❌ 管理员路由删除预览失败:', error.response?.data || error.message);
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

debugAdminAuth();
