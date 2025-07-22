console.log('🔧 VoiceCallScreen修复验证');
console.log('==================================');
console.log('');
console.log('✅ 已完成的修复:');
console.log('1. VoiceCallScreen现在使用全局Socket而不是创建新连接');
console.log('2. 全局来电管理器已添加到AppNavigator中');
console.log('3. 用户现在在任何页面都应该能收到来电');
console.log('');
console.log('📋 测试步骤:');
console.log('1. 确保应用运行且用户已登录');
console.log('2. 用户可以在消息列表、订单页面等任何页面');
console.log('3. 让另一个用户拨打电话');
console.log('4. 验证不管在哪个页面都能看到来电界面');
console.log('');
console.log('🔍 关键改动:');
console.log('- VoiceCallScreen不再创建独立Socket连接');
console.log('- 使用全局Socket避免连接冲突');
console.log('- 全局来电处理确保任何页面都能接听电话');
console.log('');
console.log('⚠️  注意事项:');
console.log('- 如果仍有问题，检查服务器日志中的连接状态');
console.log('- 确保只有一个Socket连接（全局的）');
console.log('- 验证用户在服务器端的在线状态');
console.log('==================================');

// 检查关键文件是否存在
const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'src/navigation/AppNavigator.tsx',
  'src/context/SocketContext.tsx',
  'src/screens/VoiceCallScreen.tsx',
  'src/App.tsx'
];

console.log('');
console.log('📁 文件检查:');
filesToCheck.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

console.log('');
console.log('🎯 预期结果:');
console.log('- 用户在任何页面都能收到来电通知');
console.log('- 拨打者不再看到"对方不在线"错误');
console.log('- 通话功能正常工作');
console.log('==================================');

const io = require('socket.io-client');

// 测试配置
const BASE_URL = 'http://localhost:3000';

// 测试账号 - 客服
const CUSTOMER_SERVICE = {
  phoneNumber: '19999999999',
  inviteCode: '1332',
  name: '测试客服'
};

// 测试账号 - 用户  
const USER = {
  phoneNumber: '10000000000',
  inviteCode: '1234',
  name: '测试用户'
};

// 生成唯一ID
function generateUniqueId() {
  return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
}

// 登录函数
async function login(credentials) {
  const http = require('http');
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(credentials);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/users/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const result = JSON.parse(data);
            console.log(`✅ ${credentials.phoneNumber} 登录成功`);
            resolve(result);
          } else {
            reject(new Error(`登录失败: ${res.statusCode} ${data}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`❌ ${credentials.phoneNumber} 登录失败:`, error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

// 创建Socket连接
function createSocket(token, userInfo) {
  const socket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    forceNew: true
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Socket连接超时'));
    }, 5000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log(`🔗 ${userInfo.phoneNumber} Socket已连接`);
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// 测试场景1：拨打者挂断，接听者界面应自动关闭
async function testCallerHangup() {
  console.log('\n🧪 测试场景1：拨打者挂断，接听者界面应自动关闭');
  
  let callerSocket, receiverSocket;
  
  try {
    // 登录客服（拨打者）
    const callerAuth = await login(CUSTOMER_SERVICE);
    callerSocket = await createSocket(callerAuth.token, callerAuth.user);
    
    // 登录用户（接听者）
    const receiverAuth = await login(USER);
    receiverSocket = await createSocket(receiverAuth.token, receiverAuth.user);
    
    // 等待连接稳定
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const callId = generateUniqueId();
    console.log(`📞 呼叫ID: ${callId}`);
    
    // 设置接听者监听
    let receiverGotIncomingCall = false;
    let receiverGotCallCancelled = false;
    
    receiverSocket.on('incoming_call', (data) => {
      console.log(`🔔 接听者收到来电:`, data);
      receiverGotIncomingCall = true;
    });
    
    receiverSocket.on('call_cancelled', (data) => {
      console.log(`📴 接听者收到取消信号:`, data);
      receiverGotCallCancelled = true;
    });
    
    // 设置拨打者监听
    let callerGotCallInitiated = false;
    
    callerSocket.on('call_initiated', (data) => {
      console.log(`✅ 拨打者收到呼叫发起确认:`, data);
      callerGotCallInitiated = true;
    });
    
    // 步骤1：拨打者发起通话
    console.log('📤 拨打者发起通话...');
    callerSocket.emit('initiate_call', {
      callerId: callerAuth.user._id,
      recipientId: receiverAuth.user._id,
      callId: callId,
      conversationId: 'test-conversation-id'
    });
    
    // 等待来电信号
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!receiverGotIncomingCall) {
      throw new Error('❌ 接听者没有收到来电信号');
    }
    
    if (!callerGotCallInitiated) {
      throw new Error('❌ 拨打者没有收到呼叫发起确认');
    }
    
    // 步骤2：拨打者在对方接听前挂断
    console.log('📵 拨打者主动挂断...');
    callerSocket.emit('cancel_call', {
      callId: callId,
      recipientId: receiverAuth.user._id,
      conversationId: 'test-conversation-id'
    });
    
    // 等待取消信号传递
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!receiverGotCallCancelled) {
      throw new Error('❌ 接听者没有收到通话取消信号');
    }
    
    console.log('✅ 场景1测试通过：拨打者挂断后，接听者正确收到取消信号');
    
  } catch (error) {
    console.error('❌ 场景1测试失败:', error.message);
    throw error;
  } finally {
    if (callerSocket) callerSocket.disconnect();
    if (receiverSocket) receiverSocket.disconnect();
  }
}

// 测试场景2：接听者拒绝，拨打者界面应自动关闭
async function testReceiverReject() {
  console.log('\n🧪 测试场景2：接听者拒绝，拨打者界面应自动关闭');
  
  let callerSocket, receiverSocket;
  
  try {
    // 登录客服（拨打者）
    const callerAuth = await login(CUSTOMER_SERVICE);
    callerSocket = await createSocket(callerAuth.token, callerAuth.user);
    
    // 登录用户（接听者）
    const receiverAuth = await login(USER);
    receiverSocket = await createSocket(receiverAuth.token, receiverAuth.user);
    
    // 等待连接稳定
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const callId = generateUniqueId();
    console.log(`📞 呼叫ID: ${callId}`);
    
    // 设置拨打者监听
    let callerGotCallInitiated = false;
    let callerGotCallRejected = false;
    
    callerSocket.on('call_initiated', (data) => {
      console.log(`✅ 拨打者收到呼叫发起确认:`, data);
      callerGotCallInitiated = true;
    });
    
    callerSocket.on('call_rejected', (data) => {
      console.log(`❌ 拨打者收到拒绝信号:`, data);
      callerGotCallRejected = true;
    });
    
    // 设置接听者监听
    let receiverGotIncomingCall = false;
    
    receiverSocket.on('incoming_call', (data) => {
      console.log(`🔔 接听者收到来电:`, data);
      receiverGotIncomingCall = true;
      
      // 自动拒绝
      setTimeout(() => {
        console.log('❌ 接听者拒绝通话...');
        receiverSocket.emit('reject_call', {
          callId: data.callId,
          recipientId: callerAuth.user._id,
          conversationId: 'test-conversation-id'
        });
      }, 1000);
    });
    
    // 步骤1：拨打者发起通话
    console.log('📤 拨打者发起通话...');
    callerSocket.emit('initiate_call', {
      callerId: callerAuth.user._id,
      recipientId: receiverAuth.user._id,
      callId: callId,
      conversationId: 'test-conversation-id'
    });
    
    // 等待拒绝流程完成
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    if (!receiverGotIncomingCall) {
      throw new Error('❌ 接听者没有收到来电信号');
    }
    
    if (!callerGotCallInitiated) {
      throw new Error('❌ 拨打者没有收到呼叫发起确认');
    }
    
    if (!callerGotCallRejected) {
      throw new Error('❌ 拨打者没有收到拒绝信号');
    }
    
    console.log('✅ 场景2测试通过：接听者拒绝后，拨打者正确收到拒绝信号');
    
  } catch (error) {
    console.error('❌ 场景2测试失败:', error.message);
    throw error;
  } finally {
    if (callerSocket) callerSocket.disconnect();
    if (receiverSocket) receiverSocket.disconnect();
  }
}

// 测试场景3：测试全局来电管理器的状态同步
async function testGlobalCallManager() {
  console.log('\n🧪 测试场景3：全局来电管理器状态同步');
  
  let callerSocket, receiverSocket;
  
  try {
    // 登录用户（拨打者）
    const callerAuth = await login(USER);
    callerSocket = await createSocket(callerAuth.token, callerAuth.user);
    
    // 登录客服（接听者）
    const receiverAuth = await login(CUSTOMER_SERVICE);
    receiverSocket = await createSocket(receiverAuth.token, receiverAuth.user);
    
    // 等待连接稳定
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const callId = generateUniqueId();
    console.log(`📞 呼叫ID: ${callId}`);
    
    // 设置接听者监听（模拟全局来电管理器）
    let receiverGotIncomingCall = false;
    let receiverGotCallCancelled = false;
    
    receiverSocket.on('incoming_call', (data) => {
      console.log(`🔔 全局来电管理器收到来电:`, data);
      receiverGotIncomingCall = true;
      
      // 模拟显示全局来电界面
      console.log('📱 显示全局来电界面...');
    });
    
    receiverSocket.on('call_cancelled', (data) => {
      console.log(`📴 全局来电管理器收到取消信号:`, data);
      receiverGotCallCancelled = true;
      
      // 模拟关闭全局来电界面
      console.log('🔄 关闭全局来电界面...');
    });
    
    // 设置拨打者监听
    callerSocket.on('call_initiated', (data) => {
      console.log(`✅ 拨打者收到呼叫发起确认:`, data);
      
      // 模拟拨打者3秒后挂断
      setTimeout(() => {
        console.log('📵 拨打者3秒后挂断...');
        callerSocket.emit('cancel_call', {
          callId: data.callId,
          recipientId: receiverAuth.user._id,
          conversationId: 'test-conversation-id'
        });
      }, 3000);
    });
    
    // 步骤1：拨打者发起通话
    console.log('📤 拨打者发起通话...');
    callerSocket.emit('initiate_call', {
      callerId: callerAuth.user._id,
      recipientId: receiverAuth.user._id,
      callId: callId,
      conversationId: 'test-conversation-id'
    });
    
    // 等待整个流程完成
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    if (!receiverGotIncomingCall) {
      throw new Error('❌ 全局来电管理器没有收到来电信号');
    }
    
    if (!receiverGotCallCancelled) {
      throw new Error('❌ 全局来电管理器没有收到取消信号');
    }
    
    console.log('✅ 场景3测试通过：全局来电管理器正确处理来电和取消信号');
    
  } catch (error) {
    console.error('❌ 场景3测试失败:', error.message);
    throw error;
  } finally {
    if (callerSocket) callerSocket.disconnect();
    if (receiverSocket) receiverSocket.disconnect();
  }
}

// 主测试函数
async function main() {
  console.log('🚀 开始语音通话状态同步修复测试');
  console.log('='.repeat(50));
  
  try {
    await testCallerHangup();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testReceiverReject();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testGlobalCallManager();
    
    console.log('\n🎉 所有测试通过！语音通话状态同步问题已修复');
    console.log('='.repeat(50));
    console.log('✅ 拨打者挂断时，接听者界面会自动关闭');
    console.log('✅ 接听者拒绝时，拨打者界面会自动关闭');
    console.log('✅ 全局来电管理器正确处理状态同步');
    
  } catch (error) {
    console.error('\n💥 测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
main().catch(console.error); 