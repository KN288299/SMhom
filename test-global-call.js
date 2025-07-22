const io = require('socket.io-client');

// 测试服务器URL
const SERVER_URL = 'http://localhost:3001';

// 测试账号
const CALLER_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3OGNmODBmNGZhOWY1M2I4ODg4YTFkMyIsInJvbGUiOiJjdXN0b21lcl9zZXJ2aWNlIiwiaWF0IjoxNzM3NDM0MDQ3LCJleHAiOjE3Mzc1MjA0NDd9.rVLYFkM1d4V7YQc8PLAOxdWGZNEMVvKq5TF1HLBG3Mc'; // 客服账号
const RECEIVER_ID = '678c7e6d6e66e1ba6bb5a47f'; // 用户ID

async function testGlobalIncomingCall() {
  console.log('🧪 开始测试全局来电功能...');
  
  // 创建发起通话的Socket连接
  const callerSocket = io(SERVER_URL, {
    auth: {
      token: CALLER_TOKEN.replace('Bearer ', '')
    },
    transports: ['websocket', 'polling'],
    timeout: 10000,
  });

  callerSocket.on('connect', () => {
    console.log('📞 发起者Socket连接成功');
    
    // 等待连接稳定后发起通话
    setTimeout(() => {
      console.log('🔄 发起语音通话...');
      
      const callId = `test-call-${Date.now()}`;
      
      callerSocket.emit('initiate_call', {
        callerId: '678cf80f4fa9f53b8888a1d3', // 客服ID
        recipientId: RECEIVER_ID,
        callId: callId,
        conversationId: 'test-conversation-id'
      });
      
      console.log(`📤 已发送通话请求 - CallID: ${callId}`);
      
    }, 2000);
  });

  callerSocket.on('connect_error', (error) => {
    console.error('❌ 发起者Socket连接失败:', error);
  });

  callerSocket.on('call_initiated', (data) => {
    console.log('✅ 通话已发起:', data);
  });

  callerSocket.on('call_failed', (data) => {
    console.log('❌ 通话失败:', data);
  });

  callerSocket.on('call_accepted', (data) => {
    console.log('✅ 通话被接受:', data);
  });

  callerSocket.on('call_rejected', (data) => {
    console.log('❌ 通话被拒绝:', data);
  });

  callerSocket.on('call_ended', (data) => {
    console.log('📴 通话已结束:', data);
  });

  // 设置超时
  setTimeout(() => {
    console.log('⏰ 测试超时，断开连接');
    callerSocket.disconnect();
    process.exit(0);
  }, 60000); // 60秒超时
}

// 运行测试
testGlobalIncomingCall().catch(console.error);

console.log('📝 测试说明:');
console.log('1. 确保应用已启动并且用户已登录');
console.log('2. 这个脚本会模拟客服拨打用户电话');
console.log('3. 用户应该在任何页面都能看到来电界面');
console.log('4. 测试用户可以接听或拒绝来电');
console.log('====================================='); 