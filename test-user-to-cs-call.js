const io = require('socket.io-client');
const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

async function testUserToCustomerServiceCall() {
  console.log('🧪 测试用户给客服打电话场景...\n');
  
  try {
    // 1. 获取token
    console.log('1. 获取登录token...');
    
    const [csResponse, userResponse] = await Promise.all([
      axios.post(`${SERVER_URL}/api/customer-service/login`, {
        phoneNumber: '19999999999',
        password: '1332',
        inviteCode: '1332'
      }),
      axios.post(`${SERVER_URL}/api/users/login`, {
        phoneNumber: '10000000000',
        inviteCode: '6969'
      })
    ]);
    
    const csToken = csResponse.data.token;
    const csId = csResponse.data._id;
    const userToken = userResponse.data.token;
    const userId = userResponse.data._id;
    
    console.log('✅ 登录成功');
    console.log(`   客服ID: ${csId}`);
    console.log(`   用户ID: ${userId}`);
    
    // 2. 客服先连接
    console.log('\n2. 客服连接Socket...');
    const csSocket = io(SERVER_URL, {
      auth: { token: csToken },
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });
    
    let csConnected = false;
    let incomingCallReceived = false;
    
    csSocket.on('connect', () => {
      console.log('✅ 客服Socket连接成功');
      csConnected = true;
    });
    
    csSocket.on('connect_error', (error) => {
      console.error('❌ 客服Socket连接失败:', error.message);
    });
    
    csSocket.on('incoming_call', (data) => {
      console.log('📞 [SUCCESS] 客服收到来电!', data);
      incomingCallReceived = true;
    });
    
    // 等待客服连接
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. 用户连接并打电话
    console.log('\n3. 用户连接Socket...');
    const userSocket = io(SERVER_URL, {
      auth: { token: userToken },
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });
    
    userSocket.on('connect', () => {
      console.log('✅ 用户Socket连接成功');
      
      // 用户发起通话
      setTimeout(() => {
        console.log('\n4. 用户发起通话...');
        const callId = `test-${Date.now()}`;
        
        console.log('📤 发送通话请求:');
        console.log(`   callerId: ${userId} (用户)`);
        console.log(`   recipientId: ${csId} (客服)`);
        console.log(`   callId: ${callId}`);
        
        userSocket.emit('initiate_call', {
          callerId: userId,
          recipientId: csId,
          callId: callId,
          conversationId: 'test-conversation'
        });
        
        console.log('⏳ 等待客服接收来电...');
      }, 1000);
    });
    
    userSocket.on('connect_error', (error) => {
      console.error('❌ 用户Socket连接失败:', error.message);
    });
    
    userSocket.on('call_initiated', (data) => {
      console.log('✅ 用户端收到call_initiated:', data);
    });
    
    userSocket.on('call_failed', (data) => {
      console.log('❌ 用户端收到call_failed:', data);
    });
    
    // 5. 设置测试结果检查
    setTimeout(() => {
      console.log('\n📊 测试结果:');
      console.log(`   客服Socket连接: ${csConnected ? '✅' : '❌'}`);
      console.log(`   客服收到来电: ${incomingCallReceived ? '✅' : '❌'}`);
      
      if (!incomingCallReceived) {
        console.log('\n❌ 问题确认：用户给客服打电话，客服没有收到来电');
        console.log('\n🔍 请检查服务器端控制台输出，查看:');
        console.log('   1. initiate_call事件是否被触发');
        console.log('   2. 在线客服列表是否包含目标客服');
        console.log('   3. incoming_call事件是否发送');
      } else {
        console.log('\n✅ 问题已解决：客服成功收到用户来电');
      }
      
      csSocket.disconnect();
      userSocket.disconnect();
      process.exit(0);
    }, 8000);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

testUserToCustomerServiceCall(); 