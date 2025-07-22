const axios = require('axios');

const BASE_URL = 'http://192.168.31.147:5000';

// 测试客服角色判断和未读清除
async function testCustomerServiceRole() {
  try {
    console.log('🧪 测试客服角色判断和未读清除功能');
    console.log('=====================================');
    
    // 1. 客服登录
    console.log('1. 客服登录测试...');
    const loginResponse = await axios.post(`${BASE_URL}/api/customer-service/login`, {
      phoneNumber: '19999999999',
      password: '1332',
      inviteCode: '1332'
    });
    
    if (loginResponse.data && loginResponse.data.token) {
      console.log('✅ 客服登录成功');
      console.log('   用户ID:', loginResponse.data._id);
      console.log('   角色:', loginResponse.data.role);
      console.log('   Token前缀:', loginResponse.data.token.substring(0, 10) + '...');
      
      const token = loginResponse.data.token;
      
      // 2. 跳过token验证测试（接口不存在）
      console.log('\n2. 跳过Token验证测试，直接测试核心功能...');
      
      // 3. 测试清除未读消息（使用示例会话ID）
      console.log('\n3. 清除未读消息测试...');
      const conversationId = '685ae3b32b44709caa0e08f2'; // 从日志中获取的会话ID
      
      try {
        const clearResponse = await axios.put(
          `${BASE_URL}/api/messages/conversation/${conversationId}/read`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('✅ 清除未读消息成功:', clearResponse.data);
        console.log('   更新前:', clearResponse.data.beforeUpdate);
        console.log('   更新后:', clearResponse.data.afterUpdate);
        console.log('   更新的消息数:', clearResponse.data.updatedMessages);
        
      } catch (clearError) {
        console.error('❌ 清除未读消息失败:', clearError.response?.data || clearError.message);
      }
      
      // 4. 验证会话信息
      console.log('\n4. 验证会话信息...');
      try {
        const convResponse = await axios.get(
          `${BASE_URL}/api/conversations/find/685adea87ab0bb499e07bd4a/685ade5e7ab0bb499e07bd33`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        console.log('✅ 会话信息:', {
          id: convResponse.data._id,
          unreadCountUser: convResponse.data.unreadCountUser,
          unreadCountCS: convResponse.data.unreadCountCS,
          lastMessage: convResponse.data.lastMessage
        });
        
      } catch (convError) {
        console.error('❌ 获取会话信息失败:', convError.response?.data || convError.message);
      }
      
    } else {
      console.error('❌ 客服登录失败 - 无token');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testCustomerServiceRole(); 