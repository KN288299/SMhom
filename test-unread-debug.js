const axios = require('axios');

// 测试配置
const BASE_URL = 'http://192.168.1.21:3000';

// 测试未读消息清除功能
async function testUnreadClear() {
  console.log('🧪 测试未读消息清除功能\n');

  // 你需要从应用中获取这些真实的值
  const CS_TOKEN = 'YOUR_CS_TOKEN_HERE';  // 客服token
  const USER_TOKEN = 'YOUR_USER_TOKEN_HERE';  // 用户token
  const USER_ID = 'YOUR_USER_ID_HERE';  // 用户ID
  const CS_ID = 'YOUR_CS_ID_HERE';  // 客服ID
  const CONVERSATION_ID = 'YOUR_CONVERSATION_ID_HERE';  // 会话ID

  try {
    // 1. 查找会话（作为客服）
    console.log('1. 🔍 客服查找会话...');
    const findResponse = await axios.get(
      `${BASE_URL}/api/conversations/find/${USER_ID}/${CS_ID}`,
      {
        headers: { Authorization: `Bearer ${CS_TOKEN}` }
      }
    );
    
    console.log('✅ 会话查找结果:', {
      id: findResponse.data._id,
      unreadCountCS: findResponse.data.unreadCountCS,
      unreadCountUser: findResponse.data.unreadCountUser,
      lastMessage: findResponse.data.lastMessage
    });

    // 2. 清除未读消息（作为客服）
    console.log('\n2. 🧹 客服清除未读消息...');
    const clearResponse = await axios.put(
      `${BASE_URL}/api/messages/conversation/${findResponse.data._id}/read`,
      {},
      {
        headers: {
          Authorization: `Bearer ${CS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ 清除结果:', clearResponse.data);

    // 3. 再次查找会话确认清除
    console.log('\n3. 🔍 再次查找会话确认清除...');
    const verifyResponse = await axios.get(
      `${BASE_URL}/api/conversations/find/${USER_ID}/${CS_ID}`,
      {
        headers: { Authorization: `Bearer ${CS_TOKEN}` }
      }
    );
    
    console.log('✅ 验证结果:', {
      id: verifyResponse.data._id,
      unreadCountCS: verifyResponse.data.unreadCountCS,
      unreadCountUser: verifyResponse.data.unreadCountUser,
      lastMessage: verifyResponse.data.lastMessage
    });

    console.log('\n🎉 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
  }
}

// 测试发送消息和未读计数增加
async function testSendMessage() {
  console.log('\n🧪 测试发送消息和未读计数...\n');

  const USER_TOKEN = 'YOUR_USER_TOKEN_HERE';
  const CONVERSATION_ID = 'YOUR_CONVERSATION_ID_HERE';

  try {
    // 发送消息（作为用户）
    console.log('📤 用户发送消息...');
    const sendResponse = await axios.post(
      `${BASE_URL}/api/messages`,
      {
        conversationId: CONVERSATION_ID,
        content: '测试消息 - 检查未读计数',
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
    
  } catch (error) {
    console.error('❌ 发送消息失败:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
  }
}

// 主函数
async function main() {
  console.log('🚀 开始未读消息功能调试\n');
  console.log('⚠️  请先在代码中填入真实的token和ID值\n');
  
  await testUnreadClear();
  // await testSendMessage(); // 取消注释来测试发送消息
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

module.exports = {
  testUnreadClear,
  testSendMessage
}; 