const express = require('express');
const {
  sendMessage,
  getMessages,
  markMessageAsRead,
  markAllAsRead,
  uploadVoiceMessage,
  // 新增
  softDeleteMessage,
  recallMessage
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

// 发送消息
router.post('/', sendMessage);

// 上传语音消息
router.post('/voice', uploadVoiceMessage);

// 获取会话的消息
router.get('/:conversationId', getMessages);

// 标记单条消息为已读
router.put('/:id/read', markMessageAsRead);

// 软删除消息
router.delete('/:id', softDeleteMessage);

// 撤回消息
router.put('/:id/recall', recallMessage);

// 标记会话中的所有消息为已读
router.put('/conversation/:conversationId/read', markAllAsRead);

module.exports = router; 