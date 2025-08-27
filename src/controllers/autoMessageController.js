const asyncHandler = require('express-async-handler');
const AutoMessageRule = require('../models/autoMessageRuleModel');
const CustomerService = require('../models/customerServiceModel');
const Conversation = require('../models/conversationModel');
const Message = require('../models/messageModel');

// @desc 获取自动消息规则列表
// @route GET /api/auto-messages
// @access Private/Admin
const listRules = asyncHandler(async (req, res) => {
  const rules = await AutoMessageRule.find({}).sort('-createdAt');
  res.json(rules);
});

// @desc 创建自动消息规则
// @route POST /api/auto-messages
// @access Private/Admin
const createRule = asyncHandler(async (req, res) => {
  const { name, enabled = true, trigger = 'user_enter_home', initialDelaySeconds = 10, customerServiceId, messages = [] } = req.body;

  // 校验客服存在
  const cs = await CustomerService.findById(customerServiceId);
  if (!cs) {
    res.status(400);
    throw new Error('指定的客服不存在');
  }

  const rule = await AutoMessageRule.create({ name, enabled, trigger, initialDelaySeconds, customerServiceId, messages });
  res.status(201).json(rule);
});

// @desc 更新自动消息规则
// @route PUT /api/auto-messages/:id
// @access Private/Admin
const updateRule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const rule = await AutoMessageRule.findById(id);
  if (!rule) {
    res.status(404);
    throw new Error('规则不存在');
  }

  const { name, enabled, trigger, initialDelaySeconds, customerServiceId, messages } = req.body;
  if (name !== undefined) rule.name = name;
  if (enabled !== undefined) rule.enabled = enabled;
  if (trigger !== undefined) rule.trigger = trigger;
  if (initialDelaySeconds !== undefined) rule.initialDelaySeconds = initialDelaySeconds;
  if (customerServiceId !== undefined) rule.customerServiceId = customerServiceId;
  if (messages !== undefined) rule.messages = messages;

  await rule.save();
  res.json(rule);
});

// @desc 删除自动消息规则
// @route DELETE /api/auto-messages/:id
// @access Private/Admin
const deleteRule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const rule = await AutoMessageRule.findById(id);
  if (!rule) {
    res.status(404);
    throw new Error('规则不存在');
  }
  await AutoMessageRule.deleteOne({ _id: id });
  res.json({ success: true });
});

// @desc 触发规则（供用户进入首页10秒后调用）
// @route POST /api/auto-messages/trigger
// @access Private (用户)
const triggerAutoMessages = asyncHandler(async (req, res) => {
  const { trigger = 'user_enter_home' } = req.body;
  const userId = req.user._id;

  // 获取启用的规则（可扩展按设备/地域筛选）
  const rules = await AutoMessageRule.find({ enabled: true, trigger }).sort('createdAt');
  if (!rules.length) {
    return res.json({ success: true, triggered: 0 });
  }

  let triggeredCount = 0;
  // 获取全局 io 实例（server.js 挂载）
  const io = req.app && req.app.get ? req.app.get('io') : null;
  for (const rule of rules) {
    try {
      // 预取客服资料用于前端弹窗展示（头像/昵称/手机号）
      let senderAvatar = null;
      let senderName = null;
      let senderPhoneNumber = null;
      try {
        const csInfo = await CustomerService.findById(rule.customerServiceId).select('name phoneNumber avatar');
        if (csInfo) {
          senderName = csInfo.name || null;
          senderPhoneNumber = csInfo.phoneNumber || null;
          if (csInfo.avatar && typeof csInfo.avatar === 'string') {
            senderAvatar = csInfo.avatar.startsWith('http')
              ? csInfo.avatar
              : (csInfo.avatar.startsWith('/') ? csInfo.avatar : `/uploads/${csInfo.avatar}`);
          }
        }
      } catch (e) {
        console.warn('查询自动消息客服资料失败:', e.message || e);
      }

      // 确保有会话（若不存在则创建）
      let conversation = await Conversation.findOne({ userId, customerServiceId: rule.customerServiceId });
      if (!conversation) {
        conversation = await Conversation.create({ userId, customerServiceId: rule.customerServiceId, lastMessageTime: Date.now() });
      }

      // 按顺序创建消息
      for (let i = 0; i < rule.messages.length; i++) {
        const m = rule.messages[i];
        // 发送者为客服
        const messageData = {
          conversationId: conversation._id,
          senderId: rule.customerServiceId,
          senderRole: 'customer_service',
          content: m.contentType === 'text' ? (m.content || '') : (m.content || ''),
          contentType: m.contentType,
          messageType: m.contentType,
        };
        if (m.contentType === 'voice') {
          messageData.voiceUrl = m.voiceUrl || m.fileUrl || '';
          messageData.voiceDuration = m.voiceDuration || '00:00';
          messageData.fileUrl = m.voiceUrl || m.fileUrl || '';
        } else if (m.contentType === 'image') {
          messageData.imageUrl = m.imageUrl || m.fileUrl || '';
          messageData.fileUrl = m.imageUrl || m.fileUrl || '';
        } else if (m.contentType === 'video') {
          const vf = m.videoUrl || m.fileUrl || '';
          messageData.videoUrl = vf;
          messageData.fileUrl = vf;
          if (m.videoDuration) messageData.videoDuration = m.videoDuration;
          if (m.videoWidth) messageData.videoWidth = m.videoWidth;
          if (m.videoHeight) messageData.videoHeight = m.videoHeight;
          if (m.aspectRatio) messageData.aspectRatio = m.aspectRatio;
        }

        const created = await Message.create(messageData);
        conversation.lastMessage = messageData.content || m.contentType;
        conversation.lastMessageTime = Date.now();
        // 未读计数：增加用户未读
        conversation.unreadCountUser += 1;

        // 实时广播给用户（前台显示横幅并震动；底部未读徽标更新）
        if (io) {
          try {
            io.to(String(userId)).emit('receive_message', {
              ...created.toObject(),
              senderId: messageData.senderId,
              senderRole: messageData.senderRole,
              // 补充客服资料，供前端弹窗显示头像与昵称
              senderAvatar,
              senderName,
              senderPhoneNumber,
              content: messageData.content,
              conversationId: String(conversation._id),
              timestamp: new Date(),
              messageType: messageData.messageType || messageData.contentType || 'text',
            });
          } catch (e) {
            console.warn('广播自动消息失败:', e.message);
          }
        }
      }
      await conversation.save();
      triggeredCount += 1;
    } catch (e) {
      console.error('触发自动消息失败:', e);
    }
  }

  res.json({ success: true, triggered: triggeredCount });
});

module.exports = {
  listRules,
  createRule,
  updateRule,
  deleteRule,
  triggerAutoMessages,
};


