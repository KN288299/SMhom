// 测试通话记录立即显示功能
const io = require('socket.io-client');

// 配置
const SERVER_URL = 'http://localhost:3000';
const USER_TOKEN = 'U_676a0f2bc92b72c29faf7cd2'; // 测试用户令牌
const CS_TOKEN = 'CS_676a22b3c92b72c29faf7dd8'; // 测试客服令牌

// 测试用户ID
const USER_ID = '676a0f2bc92b72c29faf7cd2';
const CS_ID = '676a22b3c92b72c29faf7dd8';
const CONVERSATION_ID = '676a5b43c92b72c29faf7f74'; // 测试会话ID

function generateUniqueId() {
  return `test_call_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

// 创建用户Socket连接
function createUserSocket() {
  console.log('🔌 创建用户Socket连接...');
  const userSocket = io(SERVER_URL, {
    auth: { token: USER_TOKEN },
    transports: ['websocket', 'polling'],
    timeout: 5000,
  });

  userSocket.on('connect', () => {
    console.log('✅ 用户Socket连接成功，ID:', userSocket.id);
  });

  userSocket.on('connect_error', (error) => {
    console.error('❌ 用户Socket连接失败:', error.message);
  });

  userSocket.on('receive_message', (message) => {
    console.log('📨 用户收到消息:', {
      content: message.content,
      senderId: message.senderId,
      senderRole: message.senderRole,
      isCallRecord: message.isCallRecord,
      callerId: message.callerId,
      callDuration: message.callDuration,
      missed: message.missed,
      rejected: message.rejected,
      timestamp: message.timestamp
    });
  });

  return userSocket;
}

// 创建客服Socket连接
function createCSSocket() {
  console.log('🔌 创建客服Socket连接...');
  const csSocket = io(SERVER_URL, {
    auth: { token: CS_TOKEN },
    transports: ['websocket', 'polling'],
    timeout: 5000,
  });

  csSocket.on('connect', () => {
    console.log('✅ 客服Socket连接成功，ID:', csSocket.id);
  });

  csSocket.on('connect_error', (error) => {
    console.error('❌ 客服Socket连接失败:', error.message);
  });

  csSocket.on('receive_message', (message) => {
    console.log('📨 客服收到消息:', {
      content: message.content,
      senderId: message.senderId,
      senderRole: message.senderRole,
      isCallRecord: message.isCallRecord,
      callerId: message.callerId,
      callDuration: message.callDuration,
      missed: message.missed,
      rejected: message.rejected,
      timestamp: message.timestamp
    });
  });

  return csSocket;
}

// 测试1：拒绝通话记录立即显示
async function testRejectCallRecord() {
  console.log('\n🧪 测试1：拒绝通话记录立即显示');
  
  const userSocket = createUserSocket();
  const csSocket = createCSSocket();

  await new Promise(resolve => setTimeout(resolve, 2000)); // 等待连接稳定

  console.log('📞 模拟拒绝通话记录消息...');
  
  // 用户拒绝客服的来电
  userSocket.emit('send_message', {
    conversationId: CONVERSATION_ID,
    receiverId: CS_ID, // 发送给客服
    content: '已拒绝语音通话',
    messageType: 'text',
    // 通话记录相关字段
    isCallRecord: true,
    callerId: CS_ID, // 客服是通话发起者
    rejected: true,
  });

  // 等待消息传递
  await new Promise(resolve => setTimeout(resolve, 1000));

  userSocket.disconnect();
  csSocket.disconnect();
  console.log('✅ 拒绝通话记录测试完成\n');
}

// 测试2：通话结束记录立即显示
async function testEndCallRecord() {
  console.log('🧪 测试2：通话结束记录立即显示');
  
  const userSocket = createUserSocket();
  const csSocket = createCSSocket();

  await new Promise(resolve => setTimeout(resolve, 2000)); // 等待连接稳定

  console.log('📞 模拟通话结束记录消息...');
  
  // 客服结束与用户的通话
  csSocket.emit('send_message', {
    conversationId: CONVERSATION_ID,
    receiverId: USER_ID, // 发送给用户
    content: '语音通话: 02:35',
    messageType: 'text',
    // 通话记录相关字段
    isCallRecord: true,
    callerId: CS_ID, // 客服是通话发起者
    callDuration: '02:35',
  });

  // 等待消息传递
  await new Promise(resolve => setTimeout(resolve, 1000));

  userSocket.disconnect();
  csSocket.disconnect();
  console.log('✅ 通话结束记录测试完成\n');
}

// 测试3：未接通话记录立即显示
async function testMissedCallRecord() {
  console.log('🧪 测试3：未接通话记录立即显示');
  
  const userSocket = createUserSocket();
  const csSocket = createCSSocket();

  await new Promise(resolve => setTimeout(resolve, 2000)); // 等待连接稳定

  console.log('📞 模拟未接通话记录消息...');
  
  // 用户没有接客服的电话
  userSocket.emit('send_message', {
    conversationId: CONVERSATION_ID,
    receiverId: CS_ID, // 发送给客服
    content: '未接通语音通话',
    messageType: 'text',
    // 通话记录相关字段
    isCallRecord: true,
    callerId: CS_ID, // 客服是通话发起者
    missed: true,
  });

  // 等待消息传递
  await new Promise(resolve => setTimeout(resolve, 1000));

  userSocket.disconnect();
  csSocket.disconnect();
  console.log('✅ 未接通话记录测试完成\n');
}

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始通话记录立即显示功能测试\n');
  
  try {
    await testRejectCallRecord();
    await testEndCallRecord();
    await testMissedCallRecord();
    
    console.log('🎉 所有测试完成！通话记录应该立即显示在聊天界面中。');
    console.log('💡 提示：通话记录消息会根据callerId字段显示在正确的发起者一侧。');
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
  
  process.exit(0);
}

// 启动测试
runAllTests(); 