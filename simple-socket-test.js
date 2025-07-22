const io = require('socket.io-client');

// 测试服务器URL
const SERVER_URL = 'http://localhost:3000';

// 客服token
const CS_TOKEN = 'CS_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NWFkZTVlN2FiMGJiNDk5ZTA3YmQzMyIsInJvbGUiOiJjdXN0b21lcl9zZXJ2aWNlIiwiaWF0IjoxNzUwODA1ODM0LCJleHAiOjE3NTE0MTA2MzR9.5-QAdOLhcRBt9_rLnXOCxZVMdKWNsmwQJqOiCuIm1vI';

console.log('🧪 测试客服Socket连接...');

const socket = io(SERVER_URL, {
  auth: { token: CS_TOKEN },
  transports: ['websocket', 'polling'],
  timeout: 5000,
});

socket.on('connect', () => {
  console.log('✅ 客服Socket连接成功!');
  console.log('Socket ID:', socket.id);
  
  // 监听连接的用户列表
  socket.on('user_connected', (data) => {
    console.log('用户上线:', data);
  });
  
  socket.on('user_disconnected', (data) => {
    console.log('用户下线:', data);
  });
  
  setTimeout(() => {
    console.log('断开连接...');
    socket.disconnect();
    process.exit(0);
  }, 3000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket连接失败:', error.message);
  console.error('错误类型:', error.type);
  console.error('错误描述:', error.description);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('🔴 Socket断开连接:', reason);
});

// 设置超时
setTimeout(() => {
  console.log('⏰ 测试超时');
  process.exit(1);
}, 10000); 