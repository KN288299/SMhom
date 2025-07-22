const express = require('express');
const {
  loginCustomerService,
  getAllCustomerServices,
  getCustomerServiceById,
  createCustomerService,
  updateCustomerService,
  deleteCustomerService,
  uploadAvatar,
  updateStatus,
  upload
} = require('../controllers/customerServiceController');
const { protectAdmin } = require('../middleware/adminMiddleware');
const { protectCustomerService } = require('../middleware/customerServiceMiddleware');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// 公共路由
router.post('/login', loginCustomerService);

// 用户可访问的客服列表（只返回在线的客服）
router.get('/active', protect, getAllCustomerServices);

// 管理员路由
router.route('/')
  .get(protectAdmin, getAllCustomerServices)
  .post(protectAdmin, createCustomerService);

// 客服路由 - 特定路径需要在通用路径之前
router.post('/:id/avatar', protectAdmin, upload.single('avatar'), uploadAvatar);
router.put('/:id/status', protectCustomerService, updateStatus);

// 用户可获取单个客服信息（用于获取头像等公开信息）
// 这个路由放在最后，避免与其他特定路径冲突
router.get('/:id', protect, getCustomerServiceById);

// 管理员可更新和删除客服
router.route('/:id')
  .put(protectAdmin, updateCustomerService)
  .delete(protectAdmin, deleteCustomerService);

module.exports = router; 