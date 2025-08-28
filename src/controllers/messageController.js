const asyncHandler = require('express-async-handler');
const Message = require('../models/messageModel');
const Conversation = require('../models/conversationModel');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// 配置语音文件存储 - 支持跨平台音频格式
const audioStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/audio');
    // 确保目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const timestamp = Date.now();
    let ext = path.extname(file.originalname) || '.mp3';
    
    // 🎵 跨平台音频格式支持
    // 根据MIME类型确定正确的文件扩展名
    if (file.mimetype === 'audio/m4a' || file.mimetype === 'audio/x-m4a') {
      ext = '.m4a';
    } else if (file.mimetype === 'audio/mp3' || file.mimetype === 'audio/mpeg') {
      ext = '.mp3';
    } else if (file.mimetype === 'audio/wav' || file.mimetype === 'audio/x-wav') {
      ext = '.wav';
    } else if (file.mimetype === 'audio/aac') {
      ext = '.aac';
    }
    
    console.log(`📤 接收语音文件: ${file.originalname}, MIME: ${file.mimetype}, 扩展名: ${ext}`);
    cb(null, `voice_message_${timestamp}${ext}`);
  }
});

// 创建上传中间件 - 扩展音频格式支持
const uploadAudio = multer({ 
  storage: audioStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 限制50MB
  fileFilter: function(req, file, cb) {
    // 支持更多音频格式，特别是iOS的m4a格式
    const supportedMimeTypes = [
      'audio/mp3',
      'audio/mpeg',
      'audio/m4a',
      'audio/x-m4a',
      'audio/wav',
      'audio/x-wav',
      'audio/aac',
      'audio/mp4'  // 某些iOS设备可能发送这个
    ];
    
    if (supportedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      console.log(`✅ 接受音频文件: ${file.mimetype}`);
      cb(null, true);
    } else {
      console.error(`❌ 不支持的音频格式: ${file.mimetype}`);
      cb(new Error(`不支持的音频格式: ${file.mimetype}。支持的格式: MP3, M4A, WAV, AAC`));
    }
  }
}).single('audio');

// @desc    发送消息
// @route   POST /api/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
  const { 
    conversationId, 
    content, 
    contentType = 'text',
    messageType,
    voiceUrl, 
    voiceDuration, 
    imageUrl,
    videoUrl,
    videoDuration,
    videoWidth,
    videoHeight,
    aspectRatio,
    videoThumbnailUrl,
    fileUrl,
    latitude,
    longitude,
    locationName,
    address
  } = req.body;
  
  // 验证会话是否存在
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    res.status(404);
    throw new Error('会话不存在');
  }
  
  // 确定发送者角色
  let senderRole = 'user';
  let receiverId;
  
  // 根据请求中的用户角色确定发送者和接收者
  if (req.user && req.user.role === 'customer_service') {
    senderRole = 'customer_service';
    receiverId = conversation.userId;
    
    // 增加用户的未读消息计数
    conversation.unreadCountUser += 1;
  } else {
    receiverId = conversation.customerServiceId;
    
    // 增加客服的未读消息计数
    conversation.unreadCountCS += 1;
  }
  
  // 创建新消息基础对象
  const messageData = {
    conversationId,
    senderId: req.user._id,
    senderRole,
    content,
    contentType,
    messageType: messageType || contentType, // 优先使用传入的messageType，否则使用contentType
  };
  
  // 根据消息类型添加附加字段
  if (contentType === 'voice' && voiceUrl) {
    messageData.voiceUrl = voiceUrl;
    messageData.voiceDuration = voiceDuration || '00:00';
    // 同时设置通用fileUrl字段
    messageData.fileUrl = fileUrl || voiceUrl;
  }
  
  if (contentType === 'image' && imageUrl) {
    messageData.imageUrl = imageUrl;
    // 同时设置通用fileUrl字段
    messageData.fileUrl = fileUrl || imageUrl;
  }
  
  if (contentType === 'video') {
    // 优先使用fileUrl，如果没有则使用videoUrl
    const videoFileUrl = fileUrl || videoUrl;
    
    if (videoFileUrl) {
      messageData.fileUrl = videoFileUrl;
      messageData.videoUrl = videoFileUrl; // 同时设置videoUrl以保持兼容性
      messageData.videoDuration = videoDuration || '00:00';
      if (videoWidth) messageData.videoWidth = videoWidth;
      if (videoHeight) messageData.videoHeight = videoHeight;
      if (aspectRatio) messageData.aspectRatio = aspectRatio;
      if (videoThumbnailUrl) messageData.videoThumbnailUrl = videoThumbnailUrl;
      
      console.log('保存视频消息:', {
        fileUrl: messageData.fileUrl,
        videoUrl: messageData.videoUrl,
        videoThumbnailUrl: messageData.videoThumbnailUrl
      });
    }
  }
  
  // 如果是位置消息
  if (contentType === 'location' && latitude && longitude) {
    messageData.latitude = latitude;
    messageData.longitude = longitude;
    messageData.locationName = locationName || '';
    messageData.address = address || '';
    
    console.log('保存位置消息:', {
      latitude: messageData.latitude,
      longitude: messageData.longitude,
      locationName: messageData.locationName,
      address: messageData.address
    });
  }
  
  // 创建新消息
  const message = await Message.create(messageData);
  
  // 更新会话的最后一条消息和时间
  conversation.lastMessage = content;
  conversation.lastMessageTime = Date.now();
  await conversation.save();
  
  res.status(201).json(message);
});

// @desc    获取会话的消息列表
// @route   GET /api/messages/:conversationId
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  
  // 验证会话是否存在
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    res.status(404);
    throw new Error('会话不存在');
  }
  
  // 获取消息列表，按时间倒序排列
  const messages = await Message.find({ 
      conversationId,
      // 过滤掉已删除或已撤回的消息
      isDeleted: { $ne: true },
      isRecalled: { $ne: true }
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  
  // 获取消息总数
  const total = await Message.countDocuments({ conversationId });
  
  res.json({
    messages: messages.reverse(), // 返回时按时间正序排列
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    total
  });
});

// @desc    将消息标记为已读
// @route   PUT /api/messages/:id/read
// @access  Private
const markMessageAsRead = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);
  
  if (!message) {
    res.status(404);
    throw new Error('消息不存在');
  }
  
  // 只有接收者可以标记消息为已读
  if (message.senderId.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('发送者不能标记自己的消息为已读');
  }
  
  message.isRead = true;
  message.readAt = Date.now();
  
  const updatedMessage = await message.save();
  
  res.json(updatedMessage);
});

// @desc    软删除单条消息（仅标记，不物理删除）
// @route   DELETE /api/messages/:id
// @access  Private
const softDeleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) {
    res.status(404);
    throw new Error('消息不存在');
  }

  // 仅允许消息发送者或客服（双方之一）删除
  const isOwner = message.senderId.toString() === req.user._id.toString();
  const isCustomerService = req.user.role === 'customer_service';
  if (!isOwner && !isCustomerService) {
    res.status(403);
    throw new Error('无权删除该消息');
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.deletedBy = req.user._id;
  await message.save();

  res.json({ success: true });
});

// @desc    撤回消息（仅发送者可撤回）
// @route   PUT /api/messages/:id/recall
// @access  Private
const recallMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) {
    res.status(404);
    throw new Error('消息不存在');
  }

  // 只有发送者可以撤回
  if (message.senderId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('仅发送者可撤回该消息');
  }

  // 可选：限制撤回时间窗口（例如2分钟内）
  const recallWindowMs = 2 * 60 * 1000;
  if (Date.now() - new Date(message.createdAt).getTime() > recallWindowMs) {
    res.status(400);
    throw new Error('超过可撤回时间');
  }

  message.isRecalled = true;
  message.recalledAt = new Date();
  message.recalledBy = req.user._id;
  // 撤回后清空内容可选，这里保留占位
  await message.save();

  res.json({ success: true });
});

// @desc    将会话中的所有消息标记为已读
// @route   PUT /api/messages/conversation/:conversationId/read
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  
  console.log('🧹 [markAllAsRead] 开始清除未读消息');
  console.log('  会话ID:', conversationId);
  console.log('  用户ID:', req.user._id);
  console.log('  用户角色:', req.user.role);
  
  // 验证会话是否存在
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    console.error('❌ [markAllAsRead] 会话不存在:', conversationId);
    res.status(404);
    throw new Error('会话不存在');
  }
  
  console.log('  会话信息:', {
    userId: conversation.userId,
    customerServiceId: conversation.customerServiceId,
    unreadCountUser: conversation.unreadCountUser,
    unreadCountCS: conversation.unreadCountCS
  });
  
  // 确定用户角色
  const isCustomerService = req.user && req.user.role === 'customer_service';
  console.log('  判断为客服:', isCustomerService);
  
  // 构建查询条件
  const query = {
    conversationId,
    isRead: false,
    // 只标记接收到的消息为已读
    senderId: { $ne: req.user._id }
  };
  
  console.log('  查询条件:', query);
  
  // 查找未读消息数量
  const unreadCount = await Message.countDocuments(query);
  console.log('  找到未读消息数量:', unreadCount);
  
  // 更新所有未读消息
  const updateResult = await Message.updateMany(query, {
    isRead: true,
    readAt: Date.now()
  });
  
  console.log('  更新消息结果:', updateResult);
  
  // 重置会话的未读消息计数
  const beforeUpdate = {
    unreadCountUser: conversation.unreadCountUser,
    unreadCountCS: conversation.unreadCountCS
  };
  
  if (isCustomerService) {
    conversation.unreadCountCS = 0;
    console.log('  清除客服未读计数: unreadCountCS -> 0');
  } else {
    conversation.unreadCountUser = 0;
    console.log('  清除用户未读计数: unreadCountUser -> 0');
  }
  
  await conversation.save();
  
  const afterUpdate = {
    unreadCountUser: conversation.unreadCountUser,
    unreadCountCS: conversation.unreadCountCS
  };
  
  console.log('✅ [markAllAsRead] 未读计数更新完成');
  console.log('  更新前:', beforeUpdate);
  console.log('  更新后:', afterUpdate);
  
  // 🆕 通过Socket广播已读状态更新
  if (updateResult.modifiedCount > 0) {
    const io = req.app.get('io');
    if (io) {
      // 获取需要通知的用户ID（发送者）
      const notifyUserId = isCustomerService ? conversation.userId : conversation.customerServiceId;
      
      // 广播已读状态更新给发送者
      io.to(`user_${notifyUserId}`).emit('messages_read', {
        conversationId,
        readerId: req.user._id,
        readerRole: isCustomerService ? 'customer_service' : 'user',
        readCount: updateResult.modifiedCount,
        timestamp: new Date()
      });
      
      console.log('📡 [markAllAsRead] 已广播已读状态更新给用户:', notifyUserId);
    }
  }
  
  res.json({ 
    success: true, 
    message: '所有消息已标记为已读',
    updatedMessages: updateResult.modifiedCount,
    beforeUpdate,
    afterUpdate
  });
});

// @desc    上传语音消息
// @route   POST /api/messages/voice
// @access  Private
const uploadVoiceMessage = asyncHandler(async (req, res) => {
  // 使用multer处理上传
  uploadAudio(req, res, async function(err) {
    if (err) {
      return res.status(400).json({ message: `上传失败: ${err.message}` });
    }
    
    // 如果没有文件被上传
    if (!req.file) {
      return res.status(400).json({ message: '未提供语音文件' });
    }
    
    try {
      const { conversationId, receiverId, duration } = req.body;
      
      // 验证会话是否存在
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: '会话不存在' });
      }
      
      // 确定发送者角色
      let senderRole = 'user';
      
      // 根据请求中的用户角色确定发送者
      if (req.user && req.user.role === 'customer_service') {
        senderRole = 'customer_service';
        // 增加用户的未读消息计数
        conversation.unreadCountUser += 1;
      } else {
        // 增加客服的未读消息计数
        conversation.unreadCountCS += 1;
      }
      
      // 构建语音文件URL
      const voiceUrl = `/uploads/audio/${req.file.filename}`;
      
      // 创建新消息
      const message = await Message.create({
        conversationId,
        senderId: req.user._id,
        senderRole,
        content: '语音消息',
        contentType: 'voice',
        voiceUrl,
        voiceDuration: duration || '00:00'
      });
      
      // 更新会话的最后一条消息和时间
      conversation.lastMessage = '语音消息';
      conversation.lastMessageTime = Date.now();
      await conversation.save();
      
      res.status(201).json({
        message,
        voiceUrl
      });
    } catch (error) {
      // 如果出错，删除已上传的文件
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('删除语音文件失败:', err);
        });
      }
      res.status(500).json({ message: `服务器错误: ${error.message}` });
    }
  });
});

module.exports = {
  sendMessage,
  getMessages,
  markMessageAsRead,
  markAllAsRead,
  uploadVoiceMessage,
  softDeleteMessage,
  recallMessage
}; 