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
  },
  user1: {
    phoneNumber: '13800138002',
    password: '123456',
    token: null
  },
  user2: {
    phoneNumber: '13800138003',
    password: '123456',
    token: null
  }
};

// 登录函数
async function login(user) {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      phoneNumber: user.phoneNumber,
      password: user.password
    });
    
    if (response.data.token) {
      user.token = response.data.token;
      console.log(`✅ ${user.phoneNumber} 登录成功`);
      return true;
    }
  } catch (error) {
    console.error(`❌ ${user.phoneNumber} 登录失败:`, error.response?.data || error.message);
    return false;
  }
}

// 获取联系人列表
async function getContacts(user, userType) {
  try {
    const endpoint = userType === 'customerService' 
      ? '/users/list' 
      : '/customer-service/active';
    
    const response = await axios.get(`${API_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${user.token}` }
    });
    
    console.log(`📋 ${user.phoneNumber} 获取联系人列表成功:`, response.data.length, '条记录');
    return response.data;
  } catch (error) {
    console.error(`❌ ${user.phoneNumber} 获取联系人列表失败:`, error.response?.data || error.message);
    return [];
  }
}

// 发送消息
async function sendMessage(sender, receiverId, content) {
  try {
    const response = await axios.post(`${API_URL}/messages/send`, {
      receiverId,
      content,
      messageType: 'text'
    }, {
      headers: { Authorization: `Bearer ${sender.token}` }
    });
    
    console.log(`📤 ${sender.phoneNumber} 发送消息成功:`, content);
    return response.data;
  } catch (error) {
    console.error(`❌ ${sender.phoneNumber} 发送消息失败:`, error.response?.data || error.message);
    return null;
  }
}

// 测试聊天列表刷新逻辑
async function testChatListRefresh() {
  console.log('🚀 开始测试聊天列表刷新逻辑...\n');
  
  // 1. 登录所有用户
  console.log('1️⃣ 登录用户...');
  const loginResults = await Promise.all([
    login(testUsers.customerService),
    login(testUsers.user1),
    login(testUsers.user2)
  ]);
  
  if (!loginResults.every(result => result)) {
    console.error('❌ 部分用户登录失败，测试终止');
    return;
  }
  
  // 2. 获取初始联系人列表
  console.log('\n2️⃣ 获取初始联系人列表...');
  const initialContacts = await getContacts(testUsers.customerService, 'customerService');
  console.log('初始联系人数量:', initialContacts.length);
  
  // 3. 发送消息测试
  console.log('\n3️⃣ 测试发送消息...');
  const message1 = await sendMessage(testUsers.user1, testUsers.customerService._id, '测试消息1');
  const message2 = await sendMessage(testUsers.user2, testUsers.customerService._id, '测试消息2');
  
  if (message1 && message2) {
    console.log('✅ 消息发送成功');
  }
  
  // 4. 再次获取联系人列表，检查是否有变化
  console.log('\n4️⃣ 检查联系人列表变化...');
  const updatedContacts = await getContacts(testUsers.customerService, 'customerService');
  console.log('更新后联系人数量:', updatedContacts.length);
  
  // 5. 检查未读消息计数
  console.log('\n5️⃣ 检查未读消息计数...');
  const contactsWithUnread = updatedContacts.filter(contact => contact.unreadCount > 0);
  console.log('有未读消息的联系人数量:', contactsWithUnread.length);
  
  contactsWithUnread.forEach(contact => {
    console.log(`  - ${contact.name || contact.phoneNumber}: ${contact.unreadCount} 条未读`);
  });
  
  // 6. 测试清除未读计数
  console.log('\n6️⃣ 测试清除未读计数...');
  if (contactsWithUnread.length > 0) {
    const contact = contactsWithUnread[0];
    try {
      const response = await axios.put(
        `${API_URL}/messages/conversation/${contact.conversationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${testUsers.customerService.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ 清除未读计数成功');
    } catch (error) {
      console.error('❌ 清除未读计数失败:', error.response?.data || error.message);
    }
  }
  
  console.log('\n✅ 聊天列表刷新逻辑测试完成');
}

// 运行测试
if (require.main === module) {
  testChatListRefresh().catch(console.error);
}

module.exports = {
  testChatListRefresh
}; 