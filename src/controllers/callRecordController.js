const asyncHandler = require('express-async-handler');
const CallRecord = require('../models/callRecordModel');
const Conversation = require('../models/conversationModel');

// @desc    创建通话记录
// @route   POST /api/callrecords
// @access  Private
const createCallRecord = asyncHandler(async (req, res) => {
  const { 
    conversationId, 
    callId, 
    callerId, 
    callerRole,
    receiverId, 
    receiverRole,
    duration, 
    status,
    startTime,
    endTime
  } = req.body;

  // 验证会话是否存在
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    res.status(404);
    throw new Error('会话不存在');
  }

  // 创建通话记录
  const callRecord = await CallRecord.create({
    conversationId,
    callId,
    callerId,
    callerRole,
    receiverId,
    receiverRole,
    duration,
    status,
    startTime: startTime || Date.now(),
    endTime: endTime || Date.now()
  });
  
  console.log(`创建通话记录: ${callRecord._id}, 通话ID: ${callId}, 状态: ${status}, 时长: ${duration}秒`);
  res.status(201).json(callRecord);
});

// @desc    获取会话的所有通话记录
// @route   GET /api/callrecords/conversation/:conversationId
// @access  Private
const getConversationCallRecords = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  
  // 验证会话是否存在
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    res.status(404);
    throw new Error('会话不存在');
  }

  // 获取会话的所有通话记录，按时间倒序排列
  const callRecords = await CallRecord.find({ conversationId })
    .sort({ createdAt: -1 });

  res.json(callRecords);
});

// @desc    获取特定用户的所有通话记录
// @route   GET /api/callrecords/user/:userId
// @access  Private
const getUserCallRecords = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // 获取用户作为发起者或接收者的所有通话记录
  const callRecords = await CallRecord.find({
    $or: [{ callerId: userId }, { receiverId: userId }]
  })
    .populate('conversationId', 'userId customerServiceId')
    .sort({ createdAt: -1 });

  res.json(callRecords);
});

module.exports = {
  createCallRecord,
  getConversationCallRecords,
  getUserCallRecords
}; 