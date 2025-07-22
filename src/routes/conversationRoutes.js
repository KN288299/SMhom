const express = require('express');
const {
  getConversations,
  getConversationById,
  createConversation,
  getUserConversations,
  getCSConversations,
  updateLastMessage,
  updateUnreadCount,
} = require('../controllers/conversationController');
const { protect } = require('../middleware/authMiddleware');
const { protectCustomerService } = require('../middleware/customerServiceMiddleware');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

// 获取所有会话
router.get('/', getConversations);

// 创建新会话
router.post('/', createConversation);

// 添加通过用户ID和客服ID查找会话的路由 - 放在前面避免与:id路由冲突
router.get('/find/:userId/:customerServiceId', async (req, res) => {
  try {
    const { userId, customerServiceId } = req.params;
    
    console.log('🔍 [findConversation] 查找会话');
    console.log('  用户ID:', userId);
    console.log('  客服ID:', customerServiceId);
    console.log('  请求用户ID:', req.user._id);
    console.log('  请求用户角色:', req.user.role);
    
    const Conversation = require('../models/conversationModel');
    const conversation = await Conversation.findOne({ 
      userId, 
      customerServiceId 
    });
    
    if (conversation) {
      console.log('✅ [findConversation] 找到会话:', {
        id: conversation._id,
        unreadCountUser: conversation.unreadCountUser,
        unreadCountCS: conversation.unreadCountCS,
        lastMessage: conversation.lastMessage,
        lastMessageTime: conversation.lastMessageTime
      });
      return res.status(200).json(conversation);
    } else {
      console.log('❌ [findConversation] 未找到会话');
      return res.status(404).json({ message: '未找到会话' });
    }
  } catch (error) {
    console.error('❌ [findConversation] 查找会话出错:', error);
    res.status(500).json({ 
      message: '查找会话出错',
      error: error.message 
    });
  }
});

// 获取用户的所有会话
router.get('/user/:userId', getUserConversations);

// 获取客服的所有会话
router.get('/cs/:customerServiceId', protectCustomerService, getCSConversations);

// 更新会话最后一条消息
router.put('/:id/lastMessage', updateLastMessage);

// 更新未读消息计数
router.put('/:id/unread', updateUnreadCount);

// 获取单个会话 - 放在最后避免与其他路由冲突
router.get('/:id', getConversationById);

module.exports = router; 