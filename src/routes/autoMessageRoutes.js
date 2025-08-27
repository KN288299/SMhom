const express = require('express');
const router = express.Router();
const { listRules, createRule, updateRule, deleteRule, triggerAutoMessages } = require('../controllers/autoMessageController');
const { protectAdmin } = require('../middleware/adminMiddleware');
const { protect } = require('../middleware/authMiddleware');

// 管理端：规则管理
router.get('/', protectAdmin, listRules);
router.post('/', protectAdmin, createRule);
router.put('/:id', protectAdmin, updateRule);
router.delete('/:id', protectAdmin, deleteRule);

// 用户端：触发器（进入首页后10秒调用）
router.post('/trigger', protect, triggerAutoMessages);

module.exports = router;


