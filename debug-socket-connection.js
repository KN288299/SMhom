const io = require('socket.io-client');
const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

async function debugSocketConnection() {
  console.log('🔍 开始Socket连接调试...\n');
  
  try {
    // 1. 测试HTTP连接
    console.log('1. 测试HTTP连接...');
    const httpResponse = await axios.get(SERVER_URL);
    console.log('✅ HTTP连接成功:', httpResponse.status);
  } catch (httpError) {
    console.error('❌ HTTP连接失败:', httpError.message);
    return;
  }
  
  try {
    // 2. 获取客服token
    console.log('\n2. 获取客服token...');
    const csLoginResponse = await axios.post(`${SERVER_URL}/api/customer-service/login`, {
      phoneNumber: '19999999999',
      password: '1332',
      inviteCode: '1332'
    });
    
    const csToken = csLoginResponse.data.token;
    const csId = csLoginResponse.data._id;
    console.log('✅ 客服登录成功');
    console.log('   ID:', csId);
    console.log('   Token:', csToken.substring(0, 20) + '...');
    
    // 3. 获取用户token
    console.log('\n3. 获取用户token...');
    const userLoginResponse = await axios.post(`${SERVER_URL}/api/users/login`, {
      phoneNumber: '10000000000',
      inviteCode: '6969'
    });
    
    const userToken = userLoginResponse.data.token;
    const userId = userLoginResponse.data._id;
    console.log('✅ 用户登录成功');
    console.log('   ID:', userId);
    console.log('   Token:', userToken.substring(0, 20) + '...');
    
    // 4. 测试客服Socket连接
    console.log('\n4. 测试客服Socket连接...');
    const csSocket = io(SERVER_URL, {
      auth: { token: csToken },
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });
    
    let csConnected = false;
    let userConnected = false;
    
    csSocket.on('connect', () => {
      console.log('✅ 客服Socket连接成功');
      csConnected = true;
      
      // 监听来电
      csSocket.on('incoming_call', (data) => {
        console.log('📞 客服收到来电:', data);
      });
      
      csSocket.onAny((event, ...args) => {
        console.log(`📡 [客服] ${event}:`, args);
      });
      
      // 客服连接成功后，连接用户
      setTimeout(() => {
        console.log('\n5. 测试用户Socket连接...');
        const userSocket = io(SERVER_URL, {
          auth: { token: userToken },
          transports: ['websocket', 'polling'],
          timeout: 10000,
        });
        
        userSocket.on('connect', () => {
          console.log('✅ 用户Socket连接成功');
          userConnected = true;
          
          userSocket.onAny((event, ...args) => {
            console.log(`📡 [用户] ${event}:`, args);
          });
          
          // 用户发起通话
          setTimeout(() => {
            console.log('\n6. 用户发起通话...');
            const callId = `debug-call-${Date.now()}`;
            
            userSocket.emit('initiate_call', {
              callerId: userId,
              recipientId: csId,
              callId: callId,
              conversationId: 'debug-conversation'
            });
            
            console.log('📤 通话请求已发送');
            console.log('   CallID:', callId);
            console.log('   From:', userId, '(用户)');
            console.log('   To:', csId, '(客服)');
            
          }, 2000);
        });
        
        userSocket.on('connect_error', (error) => {
          console.error('❌ 用户Socket连接失败:', error.message);
        });
        
      }, 2000);
    });
    
    csSocket.on('connect_error', (error) => {
      console.error('❌ 客服Socket连接失败:', error.message);
    });
    
    // 设置超时
    setTimeout(() => {
      console.log('\n📊 调试结果:');
      console.log('   客服Socket连接:', csConnected ? '✅ 成功' : '❌ 失败');
      console.log('   用户Socket连接:', userConnected ? '✅ 成功' : '❌ 失败');
      console.log('\n🔍 如果客服没有收到来电，请检查:');
      console.log('   1. 服务器端initiate_call事件处理');
      console.log('   2. connectedCustomerServices.get()是否能找到客服');
      console.log('   3. incoming_call事件是否正确发送');
      
      csSocket.disconnect();
      process.exit(0);
    }, 15000);
    
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data || error.message);
  }
}

debugSocketConnection(); 