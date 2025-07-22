const asyncHandler = require('express-async-handler');
const Conversation = require('../models/conversationModel');
const CustomerService = require('../models/customerServiceModel');
const User = require('../models/userModel');
const Message = require('../models/messageModel');

// @desc    获取用户的所有会话
// @route   GET /api/conversations
// @access  Private
const getConversations = asyncHandler(async (req, res) => {
  // 查找用户参与的所有会话
  const conversations = await Conversation.find({
    participants: req.user._id,
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .populate('participants', 'name phoneNumber avatar')
    .populate('lastMessage')
    .populate({
      path: 'serviceRequest',
      select: 'serviceType description status scheduledTime',
    });

  // 处理每个会话，添加未读消息计数和其他参与者信息
  const processedConversations = conversations.map(conversation => {
    // 获取未读消息计数
    const unreadCount = conversation.unreadCount.get(req.user._id.toString()) || 0;

    // 获取其他参与者（对于一对一会话）
    const otherParticipants = conversation.participants.filter(
      p => p._id.toString() !== req.user._id.toString()
    );

    // 会话名称：如果没有设置，则使用其他参与者的名称
    let name = conversation.name;
    if (!name && conversation.type === 'direct' && otherParticipants.length > 0) {
      name = otherParticipants[0].name || `用户 ${otherParticipants[0].phoneNumber}`;
    }

    return {
      _id: conversation._id,
      name,
      type: conversation.type,
      participants: conversation.participants,
      otherParticipants,
      lastMessage: conversation.lastMessage,
      serviceRequest: conversation.serviceRequest,
      unreadCount,
      updatedAt: conversation.updatedAt,
    };
  });

  res.json(processedConversations);
});

// @desc    获取单个会话
// @route   GET /api/conversations/:id
// @access  Private
const getConversationById = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id)
    .populate('userId', 'name phoneNumber')
    .populate('customerServiceId', 'name avatar status');

  if (conversation) {
    res.json(conversation);
  } else {
    res.status(404);
    throw new Error('会话不存在');
  }
});

// @desc    创建新会话
// @route   POST /api/conversations
// @access  Private
const createConversation = asyncHandler(async (req, res) => {
  const { userId, customerServiceId } = req.body;

  // 验证用户和客服是否存在
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('用户不存在');
  }

  const customerService = await CustomerService.findById(customerServiceId);
  if (!customerService) {
    res.status(404);
    throw new Error('客服不存在');
  }

  // 检查会话是否已存在
  let conversation = await Conversation.findOne({
    userId,
    customerServiceId
  });

  if (conversation) {
    // 如果会话已存在，返回现有会话
    console.log(`找到现有会话: ${conversation._id}, 用户: ${userId}, 客服: ${customerServiceId}`);
    return res.status(200).json(conversation);
  }

  // 创建新会话
  conversation = await Conversation.create({
    userId,
    customerServiceId,
    lastMessageTime: Date.now()
  });

  console.log(`创建新会话: ${conversation._id}, 用户: ${userId}, 客服: ${customerServiceId}`);
  res.status(201).json(conversation);
});

// @desc    获取用户的所有会话
// @route   GET /api/conversations/user/:userId
// @access  Private
const getUserConversations = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // 验证用户是否存在
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('用户不存在');
  }

  // 获取用户的所有会话
  const conversations = await Conversation.find({ userId })
    .populate('customerServiceId', 'name avatar status')
    .sort({ lastMessageTime: -1 });

  res.json(conversations);
});

// @desc    获取客服的所有会话
// @route   GET /api/conversations/cs/:customerServiceId
// @access  Private
const getCSConversations = asyncHandler(async (req, res) => {
  const { customerServiceId } = req.params;
  
  // 验证客服是否存在
  const customerService = await CustomerService.findById(customerServiceId);
  if (!customerService) {
    res.status(404);
    throw new Error('客服不存在');
  }

  // 获取客服的所有会话
  const conversations = await Conversation.find({ customerServiceId })
    .populate('userId', 'name phoneNumber')
    .sort({ lastMessageTime: -1 });

  res.json(conversations);
});

// @desc    更新会话的最后消息和时间
// @route   PUT /api/conversations/:id/lastMessage
// @access  Private
const updateLastMessage = asyncHandler(async (req, res) => {
  const { lastMessage } = req.body;
  
  const conversation = await Conversation.findById(req.params.id);
  
  if (!conversation) {
    res.status(404);
    throw new Error('会话不存在');
  }
  
  conversation.lastMessage = lastMessage;
  conversation.lastMessageTime = Date.now();
  
  const updatedConversation = await conversation.save();
  
  res.json(updatedConversation);
});

// @desc    更新未读消息计数
// @route   PUT /api/conversations/:id/unread
// @access  Private
const updateUnreadCount = asyncHandler(async (req, res) => {
  const { role, action } = req.body; // role: 'user' 或 'cs', action: 'increment' 或 'reset'
  
  const conversation = await Conversation.findById(req.params.id);
  
  if (!conversation) {
    res.status(404);
    throw new Error('会话不存在');
  }
  
  // 更新未读计数
  if (role === 'user') {
    if (action === 'increment') {
      conversation.unreadCountUser += 1;
    } else if (action === 'reset') {
      conversation.unreadCountUser = 0;
    }
  } else if (role === 'cs') {
    if (action === 'increment') {
      conversation.unreadCountCS += 1;
    } else if (action === 'reset') {
      conversation.unreadCountCS = 0;
    }
  }
  
  const updatedConversation = await conversation.save();
  
  res.json(updatedConversation);
});

module.exports = {
  getConversations,
  getConversationById,
  createConversation,
  getUserConversations,
  getCSConversations,
  updateLastMessage,
  updateUnreadCount
}; 