const express = require('express');
const router = express.Router();
const {
  createCallRecord,
  getConversationCallRecords,
  getUserCallRecords
} = require('../controllers/callRecordController');
const { protect } = require('../middleware/authMiddleware');

// 所有路由都需要认证
router.use(protect);

// 创建通话记录
router.route('/').post(createCallRecord);

// 获取会话的所有通话记录
router.route('/conversation/:conversationId').get(getConversationCallRecords);

// 获取用户的所有通话记录
router.route('/user/:userId').get(getUserCallRecords);

module.exports = router; 