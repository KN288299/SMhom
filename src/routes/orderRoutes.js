const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
  getUserOrders,
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

// 获取特定用户的订单 - 这个路由必须在 /:id 路由之前定义
router.route('/user/:userId')
  .get(protect, getUserOrders);   // 获取用户订单 - 需要登录

// 通用订单路由
router.route('/')
  .get(protect, getOrders)        // 获取所有订单 - 需要登录
  .post(protect, createOrder);    // 创建新订单 - 需要登录

// 更新订单状态
router.route('/:id/status')
  .put(protect, updateOrderStatus);  // 更新订单状态 - 需要登录

// 特定订单路由
router.route('/:id')
  .get(protect, getOrderById)     // 获取单个订单 - 需要登录
  .put(protect, updateOrder)      // 更新订单 - 需要登录
  .delete(protect, deleteOrder);  // 删除订单 - 需要登录（移除admin中间件）

module.exports = router; 