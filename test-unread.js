const axios = require('axios');

// 测试配置
const BASE_URL = 'http://192.168.1.21:3000';

// 测试用户的token（需要先登录获取）
const USER_TOKEN = 'your_user_token_here';
const CS_TOKEN = 'your_cs_token_here';

// 测试会话ID
const CONVERSATION_ID = 'your_conversation_id_here';

// 测试未读消息API
async function testUnreadMessages() {
  console.log('🧪 开始测试未读消息功能...\n');

  try {
    // 1. 测试发送消息（作为用户）
    console.log('1. 📤 用户发送消息...');
    const sendResponse = await axios.post(
      `${BASE_URL}/api/messages`,
      {
        conversationId: CONVERSATION_ID,
        content: '测试消息 - 用户发送',
        contentType: 'text'
      },
      {
        headers: {
          Authorization: `Bearer ${USER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ 消息发送成功:', sendResponse.data);

    // 2. 查询会话信息（作为客服）
    console.log('\n2. 🔍 客服查询会话信息...');
    const conversationResponse = await axios.get(
      `${BASE_URL}/api/conversations/find/user_id/cs_id`,
      {
        headers: {
          Authorization: `Bearer ${CS_TOKEN}`
        }
      }
    );
    console.log('✅ 会话信息:', {
      id: conversationResponse.data._id,
      unreadCountCS: conversationResponse.data.unreadCountCS,
      unreadCountUser: conversationResponse.data.unreadCountUser,
      lastMessage: conversationResponse.data.lastMessage
    });

    // 3. 测试标记消息为已读（作为客服）
    console.log('\n3. 📖 客服标记消息为已读...');
    const markReadResponse = await axios.put(
      `${BASE_URL}/api/messages/conversation/${CONVERSATION_ID}/read`,
      {},
      {
        headers: {
          Authorization: `Bearer ${CS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ 标记已读成功:', markReadResponse.data);

    // 4. 再次查询会话信息确认未读计数已清零
    console.log('\n4. 🔍 确认未读计数已清除...');
    const finalResponse = await axios.get(
      `${BASE_URL}/api/conversations/find/user_id/cs_id`,
      {
        headers: {
          Authorization: `Bearer ${CS_TOKEN}`
        }
      }
    );
    console.log('✅ 最终会话信息:', {
      id: finalResponse.data._id,
      unreadCountCS: finalResponse.data.unreadCountCS,
      unreadCountUser: finalResponse.data.unreadCountUser,
      lastMessage: finalResponse.data.lastMessage
    });

    console.log('\n🎉 未读消息功能测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 测试联系人列表
async function testContactsList() {
  console.log('\n🧪 测试联系人列表未读计数...\n');

  try {
    // 1. 客服获取用户列表
    console.log('1. 📋 客服获取用户列表...');
    const csListResponse = await axios.get(
      `${BASE_URL}/api/users`,
      {
        headers: {
          Authorization: `Bearer ${CS_TOKEN}`
        }
      }
    );
    console.log('✅ 客服看到的用户列表数量:', csListResponse.data.length);

    // 2. 用户获取客服列表
    console.log('\n2. 📋 用户获取客服列表...');
    const userListResponse = await axios.get(
      `${BASE_URL}/api/customer-service/active`,
      {
        headers: {
          Authorization: `Bearer ${USER_TOKEN}`
        }
      }
    );
    console.log('✅ 用户看到的客服列表数量:', userListResponse.data.length);

    console.log('\n🎉 联系人列表测试完成！');
    
  } catch (error) {
    console.error('❌ 联系人列表测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
async function runTests() {
  console.log('🚀 开始未读消息功能测试\n');
  console.log('⚠️  请先更新测试配置中的token和会话ID\n');
  
  await testUnreadMessages();
  await testContactsList();
  
  console.log('\n✨ 所有测试完成！');
}

// 如果直接运行此文件
if (require.main === module) {
  runTests();
}

module.exports = {
  testUnreadMessages,
  testContactsList,
  runTests
}; 