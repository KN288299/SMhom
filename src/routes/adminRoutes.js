const express = require('express');
const router = express.Router();
const {
  loginAdmin,
  getAdminProfile,
  getStats,
  getUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  createUser
} = require('../controllers/adminController');
const { protectAdmin, superAdminOnly } = require('../middleware/adminMiddleware');
const { checkIPBlocked, loginRateLimit } = require('../middleware/ipBlockMiddleware');

// 管理员登录（添加IP封锁检查和速率限制）
router.post('/login', checkIPBlocked, loginRateLimit, loginAdmin);

// 需要管理员权限的路由
router.get('/profile', protectAdmin, getAdminProfile);
router.get('/stats', protectAdmin, getStats);

// 用户管理路由
router.get('/users', protectAdmin, getUsers);
router.get('/users/:id', protectAdmin, getUserById);
router.put('/users/:id/status', protectAdmin, updateUserStatus);
router.delete('/users/:id', protectAdmin, superAdminOnly, deleteUser);
router.post('/users', protectAdmin, superAdminOnly, createUser);

module.exports = router; 