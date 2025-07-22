const io = require('socket.io-client');
const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

// 测试账号
const CS_TOKEN = 'CS_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NmFjYzljNWNhNDVjZTAxOWE4MjI5YyIsInJvbGUiOiJjdXN0b21lcl9zZXJ2aWNlIiwiaWF0IjoxNzUwODA1ODM0LCJleHAiOjE3NTE0MTA2MzR9.5-QAdOLhcRBt9_rLnXOCxZVMdKWNsmwQJqOiCuIm1vI';
const USER_TOKEN = 'U_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NmI5N2IxYjVkM2Q1MGQ1YzZlYzUzOSIsImlhdCI6MTc1MDgwNTgzNCwiZXhwIjoxNzUzMzk3ODM0fQ.EwCDFTiA2cXw_CLlXPEicVWB0kdOVER-oazjyHMr7sc';

const CS_ID = '686acc9c5ca45ce019a8229c';
const USER_ID = '686b97b1b5d3d50d5c6ec539';

async function testBackgroundCall() {
  console.log('🧪 测试后台来电功能...\n');
  
  let csSocket = null;
  let userSocket = null;

  try {
    // 1. 创建客服Socket连接
    console.log('1. 📞 创建客服Socket连接...');
    csSocket = io(SERVER_URL, {
      auth: { token: CS_TOKEN },
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });

    await new Promise((resolve, reject) => {
      csSocket.on('connect', () => {
        console.log('✅ 客服Socket连接成功，ID:', csSocket.id);
        resolve();
      });

      csSocket.on('connect_error', (error) => {
        console.error('❌ 客服Socket连接失败:', error.message);
        reject(error);
      });

      setTimeout(() => {
        reject(new Error('客服Socket连接超时'));
      }, 10000);
    });

    // 2. 创建用户Socket连接
    console.log('\n2. 👤 创建用户Socket连接...');
    userSocket = io(SERVER_URL, {
      auth: { token: USER_TOKEN },
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });

    await new Promise((resolve, reject) => {
      userSocket.on('connect', () => {
        console.log('✅ 用户Socket连接成功，ID:', userSocket.id);
        resolve();
      });

      userSocket.on('connect_error', (error) => {
        console.error('❌ 用户Socket连接失败:', error.message);
        reject(error);
      });

      setTimeout(() => {
        reject(new Error('用户Socket连接超时'));
      }, 10000);
    });

    // 3. 监听用户来电事件
    console.log('\n3. 📡 用户监听来电事件...');
    userSocket.on('incoming_call', (data) => {
      console.log('📞 用户收到来电:', {
        callId: data.callId,
        callerId: data.callerId,
        callerName: data.callerName,
        conversationId: data.conversationId
      });
      
      console.log('💡 此时应用如果在后台，应该显示系统来电通知');
      console.log('💡 如果在前台，应该显示全屏来电界面');
    });

    // 4. 客服发起通话
    console.log('\n4. 📞 客服发起通话...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒

    const callId = `test-call-${Date.now()}`;
    const conversationId = 'test-conversation';

    csSocket.emit('initiate_call', {
      callerId: CS_ID,
      recipientId: USER_ID,
      callId: callId,
      conversationId: conversationId
    });

    console.log('📤 通话请求已发送');
    console.log('   CallID:', callId);
    console.log('   From:', CS_ID, '(客服)');
    console.log('   To:', USER_ID, '(用户)');

    // 5. 等待来电处理
    console.log('\n5. ⏳ 等待来电处理...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 6. 测试后台场景
    console.log('\n6. 📱 测试后台场景...');
    console.log('💡 请将应用切换到后台，然后再次发起通话');
    console.log('💡 后台时应该显示系统通知而不是全屏界面');

    // 7. 清理连接
    console.log('\n7. 🧹 清理连接...');
    if (csSocket) csSocket.disconnect();
    if (userSocket) userSocket.disconnect();

    console.log('✅ 测试完成');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    if (csSocket) csSocket.disconnect();
    if (userSocket) userSocket.disconnect();
  }
}

// 运行测试
testBackgroundCall().catch(console.error); 