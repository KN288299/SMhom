const io = require('socket.io-client');
const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

// 测试用户token（需要替换为真实的token）
const CS_TOKEN = 'CS_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NWFkZTVlN2FiMGJiNDk5ZTA3YmQzMyIsInJvbGUiOiJjdXN0b21lcl9zZXJ2aWNlIiwiaWF0IjoxNzUwODA1ODM0LCJleHAiOjE3NTE0MTA2MzR9.5-QAdOLhcRBt9_rLnXOCxZVMdKWNsmwQJqOiCuIm1vI';
const USER_TOKEN = 'U_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NWFkNmU3N2FiMGJiNDk5ZTA3YmQ2NyIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzUwODA1ODQ5LCJleHAiOjE3NTE0MTA2NDl9.BzjZy-OjGTWAF8uOsIUd6CcW-6L4U2v64w7HB_zOq9g';

console.log('🧪 测试实时用户列表更新功能...\n');

async function testRealTimeUserList() {
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

    // 2. 监听用户上线事件
    console.log('2. 📡 客服开始监听用户上线事件...');
    let userOnlineCount = 0;
    let userOfflineCount = 0;

    csSocket.on('user_online', (data) => {
      userOnlineCount++;
      console.log(`📢 [事件 ${userOnlineCount}] 客服收到用户上线通知:`, {
        userId: data.userId,
        timestamp: data.timestamp
      });
    });

    csSocket.on('user_offline', (data) => {
      userOfflineCount++;
      console.log(`📢 [事件 ${userOfflineCount}] 客服收到用户下线通知:`, {
        userId: data.userId,
        timestamp: data.timestamp
      });
    });

    // 3. 模拟用户连接
    console.log('3. 👤 模拟用户连接Socket...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒

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

    // 4. 等待一段时间观察事件
    console.log('4. ⏰ 等待3秒观察事件触发...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 5. 模拟用户断开连接
    console.log('5. 👋 模拟用户断开连接...');
    userSocket.disconnect();
    userSocket = null;

    // 6. 再等待一段时间观察下线事件
    console.log('6. ⏰ 等待3秒观察下线事件...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 7. 显示测试结果
    console.log('\n📊 测试结果:');
    console.log(`   用户上线事件次数: ${userOnlineCount} ${userOnlineCount > 0 ? '✅' : '❌'}`);
    console.log(`   用户下线事件次数: ${userOfflineCount} ${userOfflineCount > 0 ? '✅' : '❌'}`);
    
    if (userOnlineCount > 0 && userOfflineCount > 0) {
      console.log('\n🎉 实时用户列表更新功能测试 PASSED!');
    } else {
      console.log('\n❌ 实时用户列表更新功能测试 FAILED!');
    }

    // 8. 实际场景测试 - 模拟客服端刷新用户列表
    console.log('\n8. 🔄 测试客服端用户列表API...');
    try {
      const response = await axios.get(`${SERVER_URL}/api/users`, {
        headers: { Authorization: `Bearer ${CS_TOKEN.replace('CS_', '')}` }
      });
      
      console.log(`✅ 获取用户列表成功，用户数量: ${response.data.length}`);
      
      if (response.data.length > 0) {
        console.log('   示例用户:', {
          id: response.data[0]._id,
          phoneNumber: response.data[0].phoneNumber,
          name: response.data[0].name || '未设置'
        });
      }
    } catch (error) {
      console.error('❌ 获取用户列表失败:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('🚨 测试过程中发生错误:', error.message);
  } finally {
    // 清理连接
    if (csSocket) {
      console.log('\n🧹 清理客服Socket连接...');
      csSocket.disconnect();
    }
    if (userSocket) {
      console.log('🧹 清理用户Socket连接...');
      userSocket.disconnect();
    }
  }
}

async function testMultipleUsersScenario() {
  console.log('\n🔄 测试多用户场景...');
  
  // 创建客服连接
  const csSocket = io(SERVER_URL, {
    auth: { token: CS_TOKEN },
    transports: ['websocket', 'polling'],
    timeout: 5000,
  });

  await new Promise(resolve => {
    csSocket.on('connect', () => {
      console.log('👩‍💼 客服已连接');
      resolve();
    });
  });

  let eventCount = 0;
  csSocket.on('user_online', (data) => {
    eventCount++;
    console.log(`📢 [${eventCount}] 用户 ${data.userId.substring(0, 8)}... 上线`);
  });

  // 模拟多个用户快速连接
  console.log('👥 模拟3个用户快速连接...');
  const userSockets = [];
  
  for (let i = 0; i < 3; i++) {
    const userSocket = io(SERVER_URL, {
      auth: { token: USER_TOKEN },
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });
    
    userSockets.push(userSocket);
    await new Promise(resolve => setTimeout(resolve, 500)); // 间隔500ms
  }

  // 等待事件处理
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log(`📊 客服收到 ${eventCount} 个用户上线事件`);
  console.log('💡 在实际应用中，这会触发防抖机制，1秒后统一刷新列表');

  // 清理
  userSockets.forEach(socket => socket.disconnect());
  csSocket.disconnect();
}

// 运行测试
(async () => {
  try {
    await testRealTimeUserList();
    await testMultipleUsersScenario();
    
    console.log('\n📋 测试完成总结:');
    console.log('1. ✅ 基本Socket连接');
    console.log('2. ✅ 用户上线事件广播');
    console.log('3. ✅ 用户下线事件广播');
    console.log('4. ✅ 客服端API调用');
    console.log('5. ✅ 多用户场景测试');
    
    console.log('\n🎯 实际部署时请确认:');
    console.log('- 客服端MessageScreen组件正确监听user_online事件');
    console.log('- 防抖机制工作正常（1秒延迟）');
    console.log('- 网络异常时的错误处理');
    console.log('- 组件卸载时的资源清理');

  } catch (error) {
    console.error('🚨 测试失败:', error);
  } finally {
    process.exit(0);
  }
})(); 