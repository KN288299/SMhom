const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const { notFound, errorHandler } = require('./src/middleware/errorMiddleware');
const userRoutes = require('./src/routes/userRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const conversationRoutes = require('./src/routes/conversationRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const staffRoutes = require('./src/routes/staffRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const customerServiceRoutes = require('./src/routes/customerServiceRoutes');
const pageConfigRoutes = require('./src/routes/pageConfigRoutes');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { protect } = require('./src/middleware/authMiddleware');
const CallRecord = require('./src/models/callRecordModel');
const Message = require('./src/models/messageModel');
const Conversation = require('./src/models/conversationModel');
const mongoose = require('mongoose');
const PushNotificationManager = require('./src/services/PushNotificationManager');

// 存储活跃的通话初始化信息
const activeCallInitiations = new Map();

// 存储离线消息
const offlineMessages = new Map(); // userId -> message[]

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();
// 创建HTTP服务器
const server = http.createServer(app);
// 创建Socket.io实例
const io = socketIO(server, {
  cors: {
    origin: ['http://45.144.136.37:3000', 'http://45.144.136.37:8080', 'http://10.0.2.2:3000', 'http://10.0.2.2:8081'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 连接数据库
connectDB();

// 中间件
app.set('trust proxy', 1);
app.use(cors({
  origin: ['http://45.144.136.37:3000', 'http://45.144.136.37:8080', 'http://10.0.2.2:3000', 'http://10.0.2.2:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 增加请求体大小限制
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// 静态文件服务 - 提供图片访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 健康检查端点 - 用于网络连接检测
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: '服务器运行正常'
  });
});

// 心跳端点 - 用于Socket连接质量检测
app.post('/api/ping', (req, res) => {
  res.status(200).json({ 
    pong: true, 
    timestamp: new Date().toISOString(),
    clientTimestamp: req.body.timestamp
  });
});

// 添加语音文件上传路由
const audioStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads/audio');
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const fileName = `voice-message-${uuidv4()}.mp3`;
    cb(null, fileName);
  }
});

const audioUpload = multer({ 
  storage: audioStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 限制10MB
});

// 添加图片文件上传路由
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads/chat-images');
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // 获取文件扩展名
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const fileName = `chat-image-${uuidv4()}${ext}`;
    cb(null, fileName);
  }
});

const imageUpload = multer({ 
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制5MB
  fileFilter: function (req, file, cb) {
    // 检查文件类型
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件！'), false);
    }
  }
});

// 图片文件上传路由
app.post('/api/upload/image', protect, imageUpload.single('image'), (req, res) => {
  try {
    console.log('收到图片上传请求:', {
      headers: req.headers,
      file: req.file ? {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      } : null,
      userId: req.user ? req.user._id : 'unknown'
    });
    
    if (!req.file) {
      console.error('图片上传失败: 没有提供图片文件');
      return res.status(400).json({ message: '没有提供图片文件' });
    }
    
    // 确保目录存在
    const dir = path.join(__dirname, 'uploads/chat-images');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('创建图片上传目录:', dir);
    }
    
    const imageUrl = `/uploads/chat-images/${req.file.filename}`;
    console.log('图片上传成功:', {
      url: imageUrl,
      fullPath: path.join(__dirname, 'uploads/chat-images', req.file.filename)
    });
    
    res.status(200).json({
      message: '图片上传成功',
      imageUrl,
      fileName: req.file.filename
    });
  } catch (error) {
    console.error('图片上传错误:', error);
    res.status(500).json({ 
      message: '图片上传失败', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 添加视频文件上传路由配置
const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads/chat-videos');
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // 获取文件扩展名
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const fileName = `chat-video-${uuidv4()}${ext}`;
    cb(null, fileName);
  }
});

const videoUpload = multer({ 
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 限制500MB
  fileFilter: function (req, file, cb) {
    // 检查文件类型
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传视频文件！'), false);
    }
  }
});

// 视频文件上传路由
app.post('/api/upload/video', protect, videoUpload.single('video'), (req, res) => {
  try {
    console.log('收到视频上传请求:', {
      headers: req.headers['content-type'],
      file: req.file ? {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        originalname: req.file.originalname
      } : null,
      body: req.body ? '有请求体' : '无请求体',
      userId: req.user ? req.user._id : 'unknown'
    });
    
    if (!req.file) {
      console.error('视频上传失败: 没有提供视频文件');
      return res.status(400).json({ message: '没有提供视频文件' });
    }
    
    // 检查文件大小
    const fileSizeInMB = req.file.size / (1024 * 1024);
    console.log(`视频文件大小: ${fileSizeInMB.toFixed(2)} MB`);
    
    // 确保目录存在
    const dir = path.join(__dirname, 'uploads/chat-videos');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('创建视频上传目录:', dir);
    }
    
    const videoUrl = `/uploads/chat-videos/${req.file.filename}`;
    console.log('视频上传成功:', {
      url: videoUrl,
      fullPath: path.join(__dirname, 'uploads/chat-videos', req.file.filename)
    });
    
    res.status(200).json({
      message: '视频上传成功',
      videoUrl,
      fileName: req.file.filename
    });
  } catch (error) {
    console.error('视频上传错误:', error);
    // 提供更详细的错误信息
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        message: '视频文件太大，最大允许500MB', 
        error: error.message
      });
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        message: '意外的文件字段名称，请确保使用video作为字段名', 
        error: error.message
      });
    }
    
    res.status(500).json({ 
      message: '视频上传失败', 
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 语音文件上传路由
app.post('/api/upload/audio', protect, audioUpload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '没有提供音频文件' });
    }
    
    const audioUrl = `/uploads/audio/${req.file.filename}`;
    res.status(200).json({
      message: '音频上传成功',
      audioUrl,
      fileName: req.file.filename
    });
  } catch (error) {
    console.error('音频上传错误:', error);
    res.status(500).json({ message: '音频上传失败', error: error.message });
  }
});

// 测试静态文件访问的路由
app.get('/test-static', (req, res) => {
  const uploadPath = path.join(__dirname, 'uploads');
  const files = {};
  
  // 检查客服头像目录
  const customerServicePath = path.join(uploadPath, 'customer-service');
  if (fs.existsSync(customerServicePath)) {
    files.customerService = fs.readdirSync(customerServicePath);
  }
  
  // 检查聊天图片目录
  const chatImagesPath = path.join(uploadPath, 'chat-images');
  if (fs.existsSync(chatImagesPath)) {
    files.chatImages = fs.readdirSync(chatImagesPath);
  }
  
  // 检查音频目录
  const audioPath = path.join(uploadPath, 'audio');
  if (fs.existsSync(audioPath)) {
    files.audio = fs.readdirSync(audioPath);
  }
  
  // 检查视频目录
  const videosPath = path.join(uploadPath, 'chat-videos');
  if (fs.existsSync(videosPath)) {
    files.videos = fs.readdirSync(videosPath);
  }
  
  res.json({
    message: '静态文件测试',
    uploadPath,
    exists: fs.existsSync(uploadPath),
    files,
    baseUrl: req.protocol + '://' + req.get('host')
  });
});

// 路由
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customer-service', customerServiceRoutes);
app.use('/api/page-config', pageConfigRoutes);
app.use('/api/callrecords', require('./src/routes/callRecordRoutes'));

// 基本路由
app.get('/', (req, res) => {
  res.send('API is running...');
});

// 错误处理中间件
app.use(notFound);
app.use(errorHandler);

// Socket.io连接处理
const connectedUsers = new Map(); // 存储连接的用户
const connectedCustomerServices = new Map(); // 存储连接的客服

// 验证JWT令牌的中间件
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    console.log('Socket连接失败: 未提供认证令牌');
    return next(new Error('未提供认证令牌'));
  }
  
  console.log('正在验证Socket连接token:', token ? `${token.substring(0, 10)}...` : 'null');
  
  try {
    // 检查是否是客服令牌
    if (token.startsWith('CS_')) {
      // 客服令牌
      const csToken = token.substring(3); // 去掉CS_前缀
      const decoded = jwt.verify(csToken, process.env.JWT_SECRET || 'abc123');
      socket.user = {
        id: decoded.id,
        role: 'customer_service'
      };
    } else if (token.startsWith('U_')) {
      // 普通用户令牌（包含U_前缀）
      const userToken = token.substring(2); // 去掉U_前缀
      const decoded = jwt.verify(userToken, process.env.JWT_SECRET || 'abc123');
      socket.user = {
        id: decoded.id,
        role: 'user'
      };
    } else {
      // 无前缀令牌（向后兼容）
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'abc123');
      socket.user = {
        id: decoded.id,
        role: 'user'
      };
    }
    next();
  } catch (error) {
    console.error('Socket认证失败:', error.message);
    console.error('Token类型:', token.startsWith('CS_') ? 'CS令牌' : (token.startsWith('U_') ? 'U令牌' : '无前缀'));
    console.error('Token长度:', token.length);
    next(new Error(`认证失败: ${error.message}`));
  }
});

io.on('connection', (socket) => {
  console.log('新连接建立, 用户ID:', socket.user.id, '角色:', socket.user.role);
  
  // 根据角色存储连接
  if (socket.user.role === 'customer_service') {
    connectedCustomerServices.set(socket.user.id, socket);
    console.log('客服上线, ID:', socket.user.id);
    
    // 通知用户有新客服上线（可选功能）
    broadcastToUsers('customer_service_online', {
      customerServiceId: socket.user.id,
      timestamp: new Date()
    });
  } else {
    connectedUsers.set(socket.user.id, socket);
    console.log('用户上线, ID:', socket.user.id);
    
    // 通知所有在线客服有新用户上线
    broadcastToCustomerServices('user_online', {
      userId: socket.user.id,
      timestamp: new Date()
    });
  }
  
  // 加入私人房间
  socket.join(socket.user.id);
  
  // 处理加入聊天室
  socket.on('join_conversation', (conversationId) => {
    console.log(`${socket.user.role === 'customer_service' ? '客服' : '用户'} ${socket.user.id} 加入对话: ${conversationId}`);
    socket.join(conversationId);
  });
  
  // 处理发送消息
  socket.on('send_message', async (data) => {
    try {
      const { 
        conversationId, 
        receiverId, 
        content, 
        messageType, 
        voiceDuration, 
        voiceUrl, 
        imageUrl, 
        videoUrl, 
        videoDuration,
        // 位置消息字段
        latitude,
        longitude,
        locationName,
        address,
        // 通话记录字段
        isCallRecord,
        callerId,
        callDuration,
        missed,
        rejected
      } = data;
      
      console.log('收到消息:', {
        from: socket.user.id,
        role: socket.user.role,
        to: receiverId,
        content,
        conversationId,
        messageType: messageType || 'text',
        voiceDuration,
        voiceUrl,
        imageUrl,
        videoUrl,
        videoDuration,
        // 位置消息字段
        latitude,
        longitude,
        locationName,
        address,
        // 通话记录字段
        isCallRecord,
        callerId,
        callDuration,
        missed,
        rejected
      });
      
      // 创建消息记录（这里可以调用现有的消息控制器）
      // 省略数据库操作，后续可以添加
      
      // 发送给接收者
      if (socket.user.role === 'customer_service') {
        // 客服发送给用户
        const userSocket = connectedUsers.get(receiverId);
        if (userSocket) {
          userSocket.emit('receive_message', {
            senderId: socket.user.id,
            senderRole: 'customer_service',
            content,
            conversationId,
            timestamp: new Date(),
            messageType: messageType || 'text',
            voiceDuration,
            voiceUrl,
            imageUrl,
            videoUrl,
            videoDuration,
            // 位置消息字段
            latitude,
            longitude,
            locationName,
            address,
            // 通话记录字段
            isCallRecord,
            callerId,
            callDuration,
            missed,
            rejected
          });
        } else {
          // 用户不在线，存储离线消息并发送推送通知
          const offlineMessage = {
            id: Date.now().toString(),
            senderId: socket.user.id,
            senderRole: 'customer_service',
            senderName: '客服',
            content,
            conversationId,
            timestamp: new Date(),
            messageType: messageType || 'text',
            voiceDuration,
            voiceUrl,
            imageUrl,
            videoUrl,
            videoDuration,
            latitude,
            longitude,
            locationName,
            address,
            isCallRecord,
            callerId,
            callDuration,
            missed,
            rejected
          };
          
          // 存储离线消息
          if (!offlineMessages.has(receiverId)) {
            offlineMessages.set(receiverId, []);
          }
          offlineMessages.get(receiverId).push(offlineMessage);
          
          console.log(`📨 用户 ${receiverId} 离线，存储消息: ${offlineMessage.id}`);
          
          // 发送推送通知
          try {
            await PushNotificationManager.sendMessageNotification(
              receiverId,
              '客服',
              content,
              messageType || 'text',
              conversationId
            );
          } catch (pushError) {
            console.error('发送推送通知失败:', pushError);
          }
        }
      } else {
        // 用户发送给客服
        const csSocket = connectedCustomerServices.get(receiverId);
        if (csSocket) {
          csSocket.emit('receive_message', {
            senderId: socket.user.id,
            senderRole: 'user',
            content,
            conversationId,
            timestamp: new Date(),
            messageType: messageType || 'text',
            voiceDuration,
            voiceUrl,
            imageUrl,
            videoUrl,
            videoDuration,
            // 位置消息字段
            latitude,
            longitude,
            locationName,
            address,
            // 通话记录字段
            isCallRecord,
            callerId,
            callDuration,
            missed,
            rejected
          });
        } else {
          // 客服不在线，存储离线消息并发送推送通知
          const offlineMessage = {
            id: Date.now().toString(),
            senderId: socket.user.id,
            senderRole: 'user',
            senderName: '用户',
            content,
            conversationId,
            timestamp: new Date(),
            messageType: messageType || 'text',
            voiceDuration,
            voiceUrl,
            imageUrl,
            videoUrl,
            videoDuration,
            latitude,
            longitude,
            locationName,
            address,
            isCallRecord,
            callerId,
            callDuration,
            missed,
            rejected
          };
          
          // 存储离线消息
          if (!offlineMessages.has(receiverId)) {
            offlineMessages.set(receiverId, []);
          }
          offlineMessages.get(receiverId).push(offlineMessage);
          
          console.log(`📨 客服 ${receiverId} 离线，存储消息: ${offlineMessage.id}`);
          
          // 发送推送通知
          try {
            await PushNotificationManager.sendMessageNotification(
              receiverId,
              '用户',
              content,
              messageType || 'text',
              conversationId
            );
          } catch (pushError) {
            console.error('发送推送通知失败:', pushError);
          }
        }
      }
      
      // 发送给发送者确认
      socket.emit('message_sent', {
        messageId: Date.now().toString(), // 临时ID，实际应使用数据库生成的ID
        conversationId,
        content,
        timestamp: new Date(),
        messageType: messageType || 'text',
        voiceDuration,
        voiceUrl,
        imageUrl,
        videoUrl,
        videoDuration,
        // 位置消息字段
        latitude,
        longitude,
        locationName,
        address,
        // 通话记录字段
        isCallRecord,
        callerId,
        callDuration,
        missed,
        rejected
      });
    } catch (error) {
      console.error('处理消息发送错误:', error);
      socket.emit('error', { message: '消息发送失败' });
    }
  });
  
  // 处理获取离线消息
  socket.on('get_offline_messages', async () => {
    try {
      const userId = socket.user.id;
      const userOfflineMessages = offlineMessages.get(userId) || [];
      
      if (userOfflineMessages.length > 0) {
        console.log(`📨 发送 ${userOfflineMessages.length} 条离线消息给用户 ${userId}`);
        
        // 发送离线消息
        userOfflineMessages.forEach(message => {
          socket.emit('receive_message', message);
        });
        
        // 清空离线消息
        offlineMessages.delete(userId);
        
        socket.emit('offline_messages_delivered', {
          count: userOfflineMessages.length,
          timestamp: new Date()
        });
      } else {
        console.log(`📨 用户 ${userId} 没有离线消息`);
      }
    } catch (error) {
      console.error('获取离线消息错误:', error);
      socket.emit('error', { message: '获取离线消息失败' });
    }
  });
  
  // 处理语音消息上传
  socket.on('upload_voice', async (data) => {
    try {
      const { conversationId, receiverId, audioBase64, duration } = data;
      
      console.log('收到语音上传:', {
        from: socket.user.id,
        role: socket.user.role,
        to: receiverId,
        conversationId,
        duration
      });
      
      // 这里应该处理语音文件的存储
      // 实际应用中，应该将base64数据保存为文件，并返回URL
      // 简化处理，直接返回成功
      
      socket.emit('voice_uploaded', {
        success: true,
        voiceUrl: `voice_message_${Date.now()}.mp3`, // 模拟返回URL
        duration
      });
      
    } catch (error) {
      console.error('语音上传错误:', error);
      socket.emit('error', { message: '语音上传失败' });
    }
  });
  
  // ===== WebRTC语音通话信令 =====
  
  // 处理发起通话请求
  socket.on('initiate_call', async (data) => {
    try {
      const { callerId, recipientId, callId, conversationId } = data;
      
      console.log('发起通话请求:', {
        from: socket.user.id,
        role: socket.user.role,
        to: recipientId,
        callId,
        conversationId
      });
      
      // 记录通话初始化信息，以便后续确定谁是发起者
      activeCallInitiations.set(callId, {
        callerId: socket.user.id,
        callerRole: socket.user.role,
        receiverId: recipientId,
        receiverRole: socket.user.role === 'user' ? 'customer_service' : 'user',
        conversationId,
        timestamp: Date.now()
      });
      
      console.log(`已记录通话 ${callId} 的初始化信息，发起者: ${socket.user.id}`);
      
      // 设置一个定时器，在30分钟后清除此记录，避免内存泄漏
      setTimeout(() => {
        if (activeCallInitiations.has(callId)) {
          activeCallInitiations.delete(callId);
          console.log(`通话 ${callId} 的初始化信息已过期，已清除`);
        }
      }, 30 * 60 * 1000); // 30分钟
      
      // 查找目标用户的socket
      let targetSocket;
      if (socket.user.role === 'customer_service') {
        console.log('客服发起通话，查找用户:', recipientId);
        console.log('当前在线用户:', Array.from(connectedUsers.keys()));
        targetSocket = connectedUsers.get(recipientId);
      } else {
        console.log('用户发起通话，查找客服:', recipientId);
        console.log('当前在线客服:', Array.from(connectedCustomerServices.keys()));
        targetSocket = connectedCustomerServices.get(recipientId);
      }
      
      console.log('找到目标Socket:', !!targetSocket);
      
      // 如果目标用户在线，发送通话请求
      if (targetSocket) {
        // 获取用户信息以添加头像URL
        try {
          let callerInfo;
          if (socket.user.role === 'customer_service') {
            const CustomerService = require('./src/models/customerServiceModel');
            callerInfo = await CustomerService.findById(socket.user.id);
          } else {
            const User = require('./src/models/userModel');
            callerInfo = await User.findById(socket.user.id);
          }

          // 构建完整的头像URL
          let avatarUrl = null;
          if (callerInfo && callerInfo.avatar) {
            // 获取服务器基础URL
            const serverBaseUrl = `http://45.144.136.37:3000`;
            
            // 如果头像路径以/开头，说明是服务器上的相对路径，需要转换为完整URL
            if (callerInfo.avatar.startsWith('/')) {
              avatarUrl = `${serverBaseUrl}${callerInfo.avatar}`;
            } else if (callerInfo.avatar.startsWith('http')) {
              // 如果已经是完整URL，直接使用
              avatarUrl = callerInfo.avatar;
            } else {
              // 其他情况，加上服务器前缀
              avatarUrl = `${serverBaseUrl}/uploads/${callerInfo.avatar}`;
            }
          }

          // 构建来电数据，包含头像
          const callData = {
            callId,
            callerId: socket.user.id,
            callerRole: socket.user.role,
            conversationId,
            callerName: callerInfo ? callerInfo.name || callerInfo.username : '未知用户',
            callerAvatar: avatarUrl
          };
          
          console.log('发送来电通知:', callData);
          console.log('调用者信息:', {
            id: callerInfo ? callerInfo._id : 'null',
            name: callerInfo ? callerInfo.name || callerInfo.username : 'null',
            avatar: callerInfo ? callerInfo.avatar : 'null',
            avatarUrl: avatarUrl,
            role: socket.user.role
          });
          console.log('目标Socket ID:', targetSocket.id);
          console.log('目标Socket用户:', targetSocket.user);
          targetSocket.emit('incoming_call', callData);
          console.log('已向Socket发送incoming_call事件');
        } catch (error) {
          console.error('获取来电者信息失败:', error);
          // 即使获取用户信息失败，仍然发送基本来电信息
          targetSocket.emit('incoming_call', {
            callId,
            callerId: socket.user.id,
            callerRole: socket.user.role,
            conversationId
          });
        }
        
        socket.emit('call_initiated', { callId });
      } else {
        // 目标用户不在线，发送推送通知
        try {
          // 获取发起者信息
          let callerInfo;
          if (socket.user.role === 'customer_service') {
            const CustomerService = require('./src/models/customerServiceModel');
            callerInfo = await CustomerService.findById(socket.user.id);
          } else {
            const User = require('./src/models/userModel');
            callerInfo = await User.findById(socket.user.id);
          }
          
          const callerName = callerInfo ? callerInfo.name || callerInfo.username : '未知用户';
          
          // 发送来电推送通知
          await PushNotificationManager.sendCallNotification(
            recipientId,
            callerName,
            callId,
            conversationId
          );
          
          console.log('已发送来电推送通知给用户:', recipientId);
        } catch (pushError) {
          console.error('发送来电推送通知失败:', pushError);
        }
        
        socket.emit('call_failed', {
          reason: 'user_offline',
          message: '对方不在线'
        });
      }
    } catch (error) {
      console.error('发起通话请求错误:', error);
      socket.emit('error', { message: '发起通话失败' });
    }
  });
  
  // 处理接受通话请求
  socket.on('accept_call', (data) => {
    try {
      const { callId, recipientId } = data;
      
      console.log('接受通话请求:', {
        from: socket.user.id,
        role: socket.user.role,
        to: recipientId,
        callId
      });
      
      // 查找发起通话的用户socket
      let callerSocket;
      if (socket.user.role === 'customer_service') {
        callerSocket = connectedUsers.get(recipientId);
      } else {
        callerSocket = connectedCustomerServices.get(recipientId);
      }
      
      // 如果发起者在线，通知其通话已被接受
      if (callerSocket) {
        callerSocket.emit('call_accepted', {
          callId,
          accepterId: socket.user.id,
          accepterRole: socket.user.role
        });
      }
    } catch (error) {
      console.error('接受通话请求错误:', error);
      socket.emit('error', { message: '接受通话失败' });
    }
  });
  
  // 处理拒绝通话请求
  socket.on('reject_call', async (data) => {
    try {
      const { callId, recipientId, conversationId } = data;
      
      console.log('拒绝通话:', {
        from: socket.user.id,
        role: socket.user.role,
        to: recipientId,
        callId
      });
      
      // 查找对方的socket
      let callerSocket;
      if (socket.user.role === 'customer_service') {
        callerSocket = connectedUsers.get(recipientId);
      } else {
        callerSocket = connectedCustomerServices.get(recipientId);
      }
      
      // 如果发起者在线，通知其通话已被拒绝
      if (callerSocket) {
        callerSocket.emit('call_rejected', {
          callId,
          rejecterId: socket.user.id
        });
      }
      
      // 创建拒绝的通话记录
      if (callId && recipientId && conversationId) {
        try {
          // 首先检查是否已经存在该通话的记录
          const existingRecord = await CallRecord.findOne({ callId });
          
          if (existingRecord) {
            console.log(`通话 ${callId} 已有记录，更新为拒绝状态`);
            
            // 如果已存在记录，只更新状态
            existingRecord.status = 'rejected';
            existingRecord.endTime = new Date();
            await existingRecord.save();
            
            // 创建一条系统消息，显示拒绝的通话记录
            // 获取通话发起者信息
            const callerId = existingRecord.callerId;
            const callerRole = existingRecord.callerRole;
            
            // 创建消息，但将发送者设置为通话的发起者
            const message = await Message.create({
              conversationId,
              senderId: callerId,
              senderRole: callerRole,
              content: '已拒绝语音通话',
              contentType: 'text',
              isRead: false
            });
            
            console.log('拒绝通话记录消息已创建:', message._id);
            
            // 更新会话的最后消息
            await Conversation.findByIdAndUpdate(conversationId, {
              lastMessage: '已拒绝语音通话',
              lastMessageTime: new Date()
            });
            
            // 广播消息给双方（通过receive_message事件）
            const messageData = {
              ...message.toObject(),
              isCallRecord: true,
              rejected: true,
              callerId: callerId
            };
            
            // 发送给拒绝方（当前用户）
            socket.emit('receive_message', messageData);
            
            // 发送给拨打方
            if (socket.user.role === 'customer_service') {
              const userSocket = connectedUsers.get(recipientId);
              if (userSocket) {
                userSocket.emit('receive_message', messageData);
              }
            } else {
              const csSocket = connectedCustomerServices.get(recipientId);
              if (csSocket) {
                csSocket.emit('receive_message', messageData);
              }
            }
            
            return;
          }
          
          // 在这种情况下，接收方拒绝了通话，所以接收方是当前socket的用户
          const receiverId = socket.user.id;
          const receiverRole = socket.user.role;
          const callerRole = receiverRole === 'user' ? 'customer_service' : 'user';
          
          // 创建通话记录
          const callRecord = await CallRecord.create({
            conversationId,
            callId,
            callerId: recipientId, // 这里的recipientId实际上是发起呼叫方的ID
            callerRole,
            receiverId,
            receiverRole,
            duration: 0,
            status: 'rejected',
            startTime: new Date(),
            endTime: new Date()
          });
          
          console.log('拒绝通话记录已创建:', callRecord._id);
          
          // 创建一条系统消息，显示拒绝的通话记录
          // 拨打方ID和角色
          const callerId = recipientId; // 这里的recipientId实际上是发起呼叫方的ID
          
          const message = await Message.create({
            conversationId,
            senderId: callerId,
            senderRole: callerRole,
            content: '已拒绝语音通话',
            contentType: 'text',
            isRead: false
          });
          
          console.log('拒绝通话记录消息已创建:', message._id);
          
          // 更新会话的最后消息
          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: '已拒绝语音通话',
            lastMessageTime: new Date()
          });
          
          // 广播消息给双方（通过receive_message事件）
          const messageData = {
            ...message.toObject(),
            isCallRecord: true,
            rejected: true,
            callerId: callerId
          };
          
          // 发送给拒绝方（当前用户）
          socket.emit('receive_message', messageData);
          
          // 发送给拨打方
          if (socket.user.role === 'customer_service') {
            const userSocket = connectedUsers.get(recipientId);
            if (userSocket) {
              userSocket.emit('receive_message', messageData);
            }
          } else {
            const csSocket = connectedCustomerServices.get(recipientId);
            if (csSocket) {
              csSocket.emit('receive_message', messageData);
            }
          }
          
        } catch (error) {
          console.error('创建拒绝通话记录失败:', error);
        }
      }
    } catch (error) {
      console.error('拒绝通话请求错误:', error);
      socket.emit('error', { message: '拒绝通话失败' });
    }
  });
  
  // 处理结束通话
  socket.on('end_call', async (data) => {
    try {
      const { callId, recipientId, duration, conversationId } = data;
      
      console.log('结束通话:', {
        from: socket.user.id,
        role: socket.user.role,
        to: recipientId,
        callId,
        duration
      });
      
      // 查找对方的socket
      let targetSocket;
      if (socket.user.role === 'customer_service') {
        targetSocket = connectedUsers.get(recipientId);
      } else {
        targetSocket = connectedCustomerServices.get(recipientId);
      }
      
      // 如果对方在线，通知其通话已结束
      if (targetSocket) {
        targetSocket.emit('call_ended', {
          callId,
          enderId: socket.user.id,
          duration
        });
      }
      
      // 创建通话记录
      if (callId && recipientId && conversationId) {
        try {
          // 首先检查是否已经存在该通话的记录
          const existingRecord = await CallRecord.findOne({ callId });
          
          if (existingRecord) {
            console.log(`通话 ${callId} 已有记录，更新通话时长`);
            
            // 如果已存在记录，只更新通话时长和状态
            existingRecord.duration = duration || 0;
            existingRecord.status = 'completed';
            existingRecord.endTime = new Date();
            await existingRecord.save();
            
                      // 创建一条系统消息，显示通话记录
          const formattedDuration = formatDuration(duration || 0);
          
          // 获取通话发起者信息
          const callerId = existingRecord ? existingRecord.callerId : socket.user.id;
          const callerRole = existingRecord ? existingRecord.callerRole : socket.user.role;
          
          // 创建消息，但将发送者设置为通话的发起者
          const message = await Message.create({
            conversationId,
            senderId: callerId,
            senderRole: callerRole,
            content: `语音通话: ${formattedDuration}`,
            contentType: 'text',
            isRead: false
          });
          
          console.log('通话记录消息已创建:', message._id);
          
          // 更新会话的最后消息
          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: `语音通话: ${formattedDuration}`,
            lastMessageTime: new Date()
          });
          
          // 广播消息给双方（通过receive_message事件）
          const messageData = {
            ...message.toObject(),
            isCallRecord: true,
            callDuration: formattedDuration,
            callerId: callerId
          };
          
          // 发送给挂断方（当前用户）
          socket.emit('receive_message', messageData);
          
          // 发送给对方
          if (socket.user.role === 'customer_service') {
            const userSocket = connectedUsers.get(recipientId);
            if (userSocket) {
              userSocket.emit('receive_message', messageData);
            }
          } else {
            const csSocket = connectedCustomerServices.get(recipientId);
            if (csSocket) {
              csSocket.emit('receive_message', messageData);
            }
          }
            
            return;
          }
          
          // 确定通话各方的角色 - 使用通话初始化信息
          // 查找该通话ID的初始化记录，确定真正的发起者
          let callerId, callerRole, receiverId, receiverRole;
          
          // 查找该通话ID的初始化记录
          const callInitiation = activeCallInitiations.get(callId);
          
          if (callInitiation) {
            // 如果找到初始化记录，使用记录中的发起者信息
            callerId = callInitiation.callerId;
            callerRole = callInitiation.callerRole;
            receiverId = callInitiation.receiverId;
            receiverRole = callInitiation.receiverRole;
            console.log('使用通话初始化记录中的发起者信息:', { callerId, callerRole });
          } else {
            // 如果没有找到初始化记录，我们将接收方设为发起者
            // 这样确保通话记录显示在发起方
            console.log('未找到通话初始化记录，将接收方视为发起者');
            callerId = recipientId;
            callerRole = socket.user.role === 'user' ? 'customer_service' : 'user';
            receiverId = socket.user.id;
            receiverRole = socket.user.role;
          }
          
          // 创建通话记录
          const callRecord = await CallRecord.create({
            conversationId,
            callId,
            callerId,
            callerRole,
            receiverId: receiverId,
            receiverRole,
            duration: duration || 0,
            status: 'completed',
            startTime: new Date(Date.now() - (duration * 1000)),
            endTime: new Date()
          });
          
          console.log('通话记录已创建:', callRecord._id);
          
          // 创建一条系统消息，显示通话记录
          const formattedDuration = formatDuration(duration || 0);
          
          const message = await Message.create({
            conversationId,
            senderId: callerId,
            senderRole: callerRole,
            content: `语音通话: ${formattedDuration}`,
            contentType: 'text',
            isRead: false
          });
          
          console.log('通话记录消息已创建:', message._id);
          
          // 更新会话的最后消息
          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: `语音通话: ${formattedDuration}`,
            lastMessageTime: new Date()
          });
          
          // 广播消息给双方（通过receive_message事件）
          const messageData = {
            ...message.toObject(),
            isCallRecord: true,
            callDuration: formattedDuration,
            callerId: callerId
          };
          
          // 发送给挂断方（当前用户）
          socket.emit('receive_message', messageData);
          
          // 发送给对方
          if (socket.user.role === 'customer_service') {
            const userSocket = connectedUsers.get(recipientId);
            if (userSocket) {
              userSocket.emit('receive_message', messageData);
            }
          } else {
            const csSocket = connectedCustomerServices.get(recipientId);
            if (csSocket) {
              csSocket.emit('receive_message', messageData);
            }
          }
          
        } catch (error) {
          console.error('创建通话记录失败:', error);
        }
      } else {
        console.warn('缺少创建通话记录所需的参数:', { callId, recipientId, conversationId });
      }
    } catch (error) {
      console.error('结束通话错误:', error);
      socket.emit('error', { message: '结束通话失败' });
    }
  });
  
  // 处理拨打者在对方未接听前取消通话
  socket.on('cancel_call', async (data) => {
    try {
      const { callId, recipientId, conversationId } = data;
      
      console.log('取消未接听的通话:', {
        from: socket.user.id,
        role: socket.user.role,
        to: recipientId,
        callId,
        conversationId
      });
      
      // 查找对方的socket
      let targetSocket;
      if (socket.user.role === 'customer_service') {
        targetSocket = connectedUsers.get(recipientId);
      } else {
        targetSocket = connectedCustomerServices.get(recipientId);
      }
      
      // 如果对方在线，通知其来电已取消
      if (targetSocket) {
        console.log(`发送call_cancelled事件到用户 ${recipientId}, callId: ${callId}`);
        targetSocket.emit('call_cancelled', {
          callId,
          cancellerId: socket.user.id
        });
        console.log('call_cancelled事件已发送');
      } else {
        console.log(`目标用户 ${recipientId} 不在线，无法发送call_cancelled事件`);
      }
      
      // 检查该通话是否已经有记录（避免重复创建记录）
      if (callId && recipientId && conversationId) {
        try {
          // 首先检查是否已经存在该通话的记录
          const existingRecord = await CallRecord.findOne({ callId });
          
          if (existingRecord) {
            console.log(`通话 ${callId} 已有记录，不再创建新记录`);
            return;
          }
          
          // 确定通话各方的角色 - 使用通话初始化信息
          // 这里我们使用当前用户作为发起者，因为cancel_call只会由发起通话的一方调用
          // 但我们仍然检查通话初始化记录以保持一致性
          let callerId, callerRole, receiverId, receiverRole;
          
          // 查找该通话ID的初始化记录
          const callInitiation = activeCallInitiations.get(callId);
          
          if (callInitiation) {
            // 如果找到初始化记录，使用记录中的发起者信息
            callerId = callInitiation.callerId;
            callerRole = callInitiation.callerRole;
            receiverId = callInitiation.receiverId;
            receiverRole = callInitiation.receiverRole;
            console.log('使用通话初始化记录中的发起者信息:', { callerId, callerRole });
          } else {
            // 如果没有找到初始化记录，使用当前用户作为发起者
            // 因为cancel_call只会由发起通话的一方调用
            callerId = socket.user.id;
            callerRole = socket.user.role;
            receiverId = recipientId;
            receiverRole = callerRole === 'user' ? 'customer_service' : 'user';
          }
          
          // 创建通话记录
          const callRecord = await CallRecord.create({
            conversationId,
            callId,
            callerId,
            callerRole,
            receiverId: receiverId,
            receiverRole,
            duration: 0,
            status: 'missed',
            startTime: new Date(),
            endTime: new Date()
          });
          
          console.log('未接通的通话记录已创建:', callRecord._id);
          
          // 创建一条系统消息，显示未接通的通话记录
          const message = await Message.create({
            conversationId,
            senderId: callerId,
            senderRole: callerRole,
            content: '未接通语音通话',
            contentType: 'text',
            isRead: false
          });
          
          console.log('未接通通话记录消息已创建:', message._id);
          
          // 更新会话的最后消息
          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: '未接通语音通话',
            lastMessageTime: new Date()
          });
          
          // 广播消息给聊天室
          io.to(conversationId).emit('message', {
            ...message.toObject(),
            isCallRecord: true,
            missed: true,
            callerId: callerId
          });
          
        } catch (error) {
          console.error('创建未接通通话记录失败:', error);
        }
      }
    } catch (error) {
      console.error('取消通话错误:', error);
      socket.emit('error', { message: '取消通话失败' });
    }
  });
  
  // WebRTC信令
  socket.on('webrtc_offer', (data) => {
    try {
      const { callId, recipientId, sdp } = data;
      
      console.log('收到WebRTC offer:', {
        from: socket.user.id,
        to: recipientId,
        callId
      });
      
      // 查找目标用户的socket
      let targetSocket;
      if (socket.user.role === 'customer_service') {
        targetSocket = connectedUsers.get(recipientId);
      } else {
        targetSocket = connectedCustomerServices.get(recipientId);
      }
      
      // 如果目标用户在线，转发offer
      if (targetSocket) {
        targetSocket.emit('webrtc_offer', {
          callId,
          sdp,
          offerId: socket.user.id
        });
      }
    } catch (error) {
      console.error('WebRTC offer错误:', error);
      socket.emit('error', { message: 'WebRTC offer处理失败' });
    }
  });
  
  socket.on('webrtc_answer', (data) => {
    try {
      const { callId, recipientId, sdp } = data;
      
      console.log('收到WebRTC answer:', {
        from: socket.user.id,
        to: recipientId,
        callId
      });
      
      // 查找目标用户的socket
      let targetSocket;
      if (socket.user.role === 'customer_service') {
        targetSocket = connectedUsers.get(recipientId);
      } else {
        targetSocket = connectedCustomerServices.get(recipientId);
      }
      
      // 如果目标用户在线，转发answer
      if (targetSocket) {
        targetSocket.emit('webrtc_answer', {
          callId,
          sdp,
          answerId: socket.user.id
        });
      }
    } catch (error) {
      console.error('WebRTC answer错误:', error);
      socket.emit('error', { message: 'WebRTC answer处理失败' });
    }
  });
  
  socket.on('webrtc_ice_candidate', (data) => {
    try {
      const { callId, recipientId, candidate } = data;
      
      console.log('收到ICE候选:', {
        from: socket.user.id,
        to: recipientId,
        callId
      });
      
      // 查找目标用户的socket
      let targetSocket;
      if (socket.user.role === 'customer_service') {
        targetSocket = connectedUsers.get(recipientId);
      } else {
        targetSocket = connectedCustomerServices.get(recipientId);
      }
      
      // 如果目标用户在线，转发ICE候选
      if (targetSocket) {
        targetSocket.emit('webrtc_ice_candidate', {
          callId,
          candidate,
          candidateId: socket.user.id
        });
      }
    } catch (error) {
      console.error('ICE候选错误:', error);
      socket.emit('error', { message: 'ICE候选处理失败' });
    }
  });
  
  // 处理心跳检测
  socket.on('ping', (data) => {
    // 立即回复pong，包含客户端发送的时间戳
    socket.emit('pong', {
      timestamp: data.timestamp,
      serverTimestamp: Date.now()
    });
  });

  // 处理断开连接
  socket.on('disconnect', () => {
    console.log(`${socket.user.role === 'customer_service' ? '客服' : '用户'} ${socket.user.id} 断开连接`);
    
    if (socket.user.role === 'customer_service') {
      connectedCustomerServices.delete(socket.user.id);
      
      // 通知用户客服下线
      broadcastToUsers('customer_service_offline', {
        customerServiceId: socket.user.id,
        timestamp: new Date()
      });
    } else {
      connectedUsers.delete(socket.user.id);
      
      // 通知客服用户下线
      broadcastToCustomerServices('user_offline', {
        userId: socket.user.id,
        timestamp: new Date()
      });
    }
  });
});

// 广播消息给所有在线客服的辅助函数
function broadcastToCustomerServices(event, data) {
  console.log(`📢 广播给客服: ${event}`, data);
  connectedCustomerServices.forEach((csSocket, csId) => {
    try {
      csSocket.emit(event, data);
    } catch (error) {
      console.error(`广播给客服 ${csId} 失败:`, error);
    }
  });
}

// 广播消息给所有在线用户的辅助函数
function broadcastToUsers(event, data) {
  console.log(`📢 广播给用户: ${event}`, data);
  connectedUsers.forEach((userSocket, userId) => {
    try {
      userSocket.emit(event, data);
    } catch (error) {
      console.error(`广播给用户 ${userId} 失败:`, error);
    }
  });
}

// 设置端口并启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`Socket.IO server running`);
  console.log(`Static files available at: http://localhost:${PORT}/uploads`);
}); 

// 格式化时长函数
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
} 