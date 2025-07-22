console.log('🔧 语音通话状态同步修复验证');
console.log('=' .repeat(50));

console.log('✅ 修复内容总结:');
console.log('1. 修复了SocketContext.tsx中rejectCall函数的参数');
console.log('2. 修复了全局来电管理器中rejectCall的调用');
console.log('3. 移除了ChatScreen中冲突的来电界面处理');
console.log('4. VoiceCallScreen正确监听call_cancelled和call_rejected事件');
console.log('5. 全局来电管理器正确监听call_cancelled和call_rejected事件');

console.log('\n🐛 之前的问题:');
console.log('- SocketContext发送的reject_call参数不匹配服务器期望');
console.log('- 全局来电管理器传递错误的参数到rejectCall');
console.log('- ChatScreen试图处理已移至全局的来电界面状态');
console.log('- VoiceCallScreen缺少call_cancelled事件监听');

console.log('\n✅ 现在的修复:');
console.log('- SocketContext.rejectCall现在发送正确参数: {callId, recipientId, conversationId}');
console.log('- 全局来电管理器传递正确参数: callId, callerId, conversationId');
console.log('- ChatScreen只处理拨打者状态，不再处理来电界面');
console.log('- VoiceCallScreen监听call_cancelled事件并正确处理');
console.log('- 全局来电管理器监听两个事件并正确关闭界面');

console.log('\n📋 测试步骤:');
console.log('1. 客服拨打用户电话');
console.log('2. 在用户接听前，客服挂断');
console.log('3. 验证用户的来电界面立即消失');
console.log('4. 用户拨打客服电话');
console.log('5. 客服拒绝通话');
console.log('6. 验证用户的拨打界面立即关闭');

console.log('\n🎯 预期结果:');
console.log('✅ 拨打者挂断 → 接听者来电界面立即消失');
console.log('✅ 接听者拒绝 → 拨打者界面立即关闭');
console.log('✅ 通话状态完全同步，不再有滞后');

console.log('\n🔍 关键修复点:');
console.log('');
console.log('1. SocketContext.tsx:');
console.log('   - rejectCall(callId, recipientId, conversationId)');
console.log('   - emit("reject_call", {callId, recipientId, conversationId})');
console.log('');
console.log('2. AppNavigator.tsx:');
console.log('   - handleCallCancelled: 监听call_cancelled并关闭来电界面');
console.log('   - handleCallRejected: 监听call_rejected并关闭来电界面');
console.log('   - handleRejectCall: 传递正确参数到rejectCall');
console.log('');
console.log('3. VoiceCallScreen.tsx:');
console.log('   - 监听call_cancelled事件，拨打者挂断时自动关闭');
console.log('   - 监听call_rejected事件，接听者拒绝时自动关闭');
console.log('');
console.log('4. ChatScreen.tsx:');
console.log('   - 移除来电界面状态处理，避免与全局冲突');
console.log('   - 只保留拨打者状态管理');

console.log('\n⚠️  重要说明:');
console.log('- 所有来电界面现在由全局来电管理器处理');
console.log('- VoiceCallScreen负责通话中的状态同步');
console.log('- ChatScreen只负责拨打者的状态清理');
console.log('- 服务器端无需修改，参数格式已匹配');

console.log('=' .repeat(50));
console.log('🎉 修复完成！现在语音通话状态应该完全同步了。');

const io = require('socket.io-client');

// 测试服务器URL
const SERVER_URL = 'http://localhost:3000';

// 测试用的token
const USER_TOKEN = 'U_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NWFkZWE4N2FiMGJiNDk5ZTA3YmQ0YSIsImlhdCI6MTc1MDgwNTgzNCwiZXhwIjoxNzUzMzk3ODM0fQ.EwCDFTiA2cXw_CLlXPEicVWB0kdOVER-oazjyHMr7sc';
const CS_TOKEN = 'CS_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NWFkZTVlN2FiMGJiNDk5ZTA3YmQzMyIsInJvbGUiOiJjdXN0b21lcl9zZXJ2aWNlIiwiaWF0IjoxNzUwODA1ODM0LCJleHAiOjE3NTE0MTA2MzR9.5-QAdOLhcRBt9_rLnXOCxZVMdKWNsmwQJqOiCuIm1vI';

const USER_ID = '685adea87ab0bb499e07bd4a';
const CS_ID = '685ade5e7ab0bb499e07bd33';

async function testUserCallsCustomerService() {
  console.log('🧪 测试用户给客服打电话场景...\n');
  
  let userSocket, csSocket;
  
  // 1. 客服先连接
  console.log('📞 步骤1: 客服连接Socket...');
  csSocket = io(SERVER_URL, {
    auth: { token: CS_TOKEN },
    transports: ['websocket', 'polling'],
    timeout: 10000,
  });
  
  csSocket.on('connect', () => {
    console.log('✅ 客服Socket连接成功');
  });
  
  csSocket.on('connect_error', (error) => {
    console.error('❌ 客服Socket连接失败:', error.message);
  });
  
  csSocket.on('incoming_call', (data) => {
    console.log('📞 客服收到来电:', data);
    console.log('   - 来电者ID:', data.callerId);
    console.log('   - 来电者角色:', data.callerRole);
    console.log('   - 通话ID:', data.callId);
  });
  
  // 等待客服连接完成
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 2. 用户连接并打电话
  console.log('\n👤 步骤2: 用户连接Socket...');
  userSocket = io(SERVER_URL, {
    auth: { token: USER_TOKEN },
    transports: ['websocket', 'polling'],
    timeout: 10000,
  });
  
  userSocket.on('connect', () => {
    console.log('✅ 用户Socket连接成功');
    
    // 用户发起通话
    setTimeout(() => {
      console.log('\n📱 步骤3: 用户发起通话...');
      const callId = `test-user-to-cs-${Date.now()}`;
      
      userSocket.emit('initiate_call', {
        callerId: USER_ID,
        recipientId: CS_ID,
        callId: callId,
        conversationId: 'test-conversation'
      });
      
      console.log('📤 用户已发送通话请求，CallID:', callId);
    }, 1000);
  });
  
  userSocket.on('connect_error', (error) => {
    console.error('❌ 用户Socket连接失败:', error.message);
  });
  
  userSocket.on('call_initiated', (data) => {
    console.log('✅ 用户通话已发起:', data);
  });
  
  userSocket.on('call_failed', (data) => {
    console.log('❌ 用户通话失败:', data);
  });
  
  // 监听所有事件
  csSocket.onAny((event, ...args) => {
    console.log(`🎧 [客服] ${event}:`, args);
  });
  
  userSocket.onAny((event, ...args) => {
    console.log(`🎧 [用户] ${event}:`, args);
  });
  
  // 设置超时
  setTimeout(() => {
    console.log('\n⏰ 测试结束，断开连接');
    userSocket?.disconnect();
    csSocket?.disconnect();
    process.exit(0);
  }, 15000);
}

testUserCallsCustomerService().catch(console.error); 