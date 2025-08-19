const asyncHandler = require('express-async-handler');
const Order = require('../models/orderModel');
const User = require('../models/userModel');
const Staff = require('../models/staffModel');

// @desc    获取所有订单
// @route   GET /api/orders
// @access  Private
const getOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // 过滤条件
  const filters = {};
  
  // 根据用户ID过滤
  if (req.query.userId) {
    filters.user = req.query.userId;
  }
  
  // 根据员工ID过滤
  if (req.query.staffId) {
    filters.staff = req.query.staffId;
  }
  
  // 根据订单状态过滤
  if (req.query.status) {
    filters.status = req.query.status;
  }
  
  // 根据订单号搜索
  if (req.query.orderNumber) {
    filters.orderNumber = { $regex: req.query.orderNumber, $options: 'i' };
  }

  const orders = await Order.find(filters)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'name phoneNumber')
    .populate('staff', 'name job image');

  const total = await Order.countDocuments(filters);

  res.json({
    orders,
    page,
    pages: Math.ceil(total / limit),
    total,
  });
});

// @desc    获取单个订单详情
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name phoneNumber')
    .populate('staff', 'name job image');

  if (order) {
    res.json(order);
  } else {
    res.status(404);
    throw new Error('订单未找到');
  }
});

// @desc    创建新订单
// @route   POST /api/orders
// @access  Private/Admin
const createOrder = asyncHandler(async (req, res) => {
  try {
    console.log('接收到创建订单请求');
    console.log('用户信息:', req.user);
    console.log('请求体:', req.body);
    
    const { userId, staffId, appointmentTime, price, address, notes, serviceType, status, province } = req.body;

    // 验证用户和员工存在
    const user = await User.findById(userId);
    if (!user) {
      console.log(`用户ID ${userId} 不存在`);
      res.status(400);
      throw new Error('用户不存在');
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      console.log(`员工ID ${staffId} 不存在`);
      res.status(400);
      throw new Error('员工不存在');
    }

    // 创建订单，不再需要createdBy字段
    const order = new Order({
      user: userId,
      staff: staffId,
      appointmentTime,
      price,
      address,
      notes: notes || '',
      serviceType,
      status: status || 'pending',
      province: province || '北京市',
    });

    console.log('准备保存订单:', order);
    const createdOrder = await order.save();
    console.log('订单已保存:', createdOrder._id);
    
    // 获取完整的订单信息（含关联数据）
    const populatedOrder = await Order.findById(createdOrder._id)
      .populate('user', 'name phoneNumber')
      .populate('staff', 'name job image');

    console.log('返回订单数据');
    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error('创建订单时发生错误:', error);
    res.status(500).json({
      message: `创建订单失败: ${error.message}`,
      stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack,
    });
  }
});

// @desc    更新订单状态
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  if (!['pending', 'accepted', 'completed', 'cancelled'].includes(status)) {
    res.status(400);
    throw new Error('无效的订单状态');
  }

  const order = await Order.findById(req.params.id);

  if (order) {
    order.status = status;
    const updatedOrder = await order.save();
    
    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate('user', 'name phoneNumber')
      .populate('staff', 'name job image');
    
    res.json(populatedOrder);
  } else {
    res.status(404);
    throw new Error('订单未找到');
  }
});

// @desc    更新订单信息
// @route   PUT /api/orders/:id
// @access  Private/Admin
const updateOrder = asyncHandler(async (req, res) => {
  const { appointmentTime, price, address, notes, serviceType, status, userId, staffId, province } = req.body;

  const order = await Order.findById(req.params.id);

  if (order) {
    // 验证用户和员工存在
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        res.status(400);
        throw new Error('用户不存在');
      }
      order.user = userId;
    }

    if (staffId) {
      const staff = await Staff.findById(staffId);
      if (!staff) {
        res.status(400);
        throw new Error('员工不存在');
      }
      order.staff = staffId;
    }

    // 更新其他字段
    order.appointmentTime = appointmentTime || order.appointmentTime;
    order.price = price || order.price;
    order.address = address || order.address;
    order.notes = notes !== undefined ? notes : order.notes;
    order.serviceType = serviceType || order.serviceType;
    order.status = status || order.status;
    order.province = province || order.province;

    const updatedOrder = await order.save();
    
    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate('user', 'name phoneNumber')
      .populate('staff', 'name job image');
    
    res.json(populatedOrder);
  } else {
    res.status(404);
    throw new Error('订单未找到');
  }
});

// @desc    删除订单
// @route   DELETE /api/orders/:id
// @access  Private/Admin
const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: '订单已删除' });
  } else {
    res.status(404);
    throw new Error('订单未找到');
  }
});

// @desc    获取用户的所有订单
// @route   GET /api/orders/user/:userId
// @access  Private
const getUserOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // 可选状态过滤
  const statusFilter = req.query.status ? { status: req.query.status } : {};
  
  const orders = await Order.find({ 
    user: req.params.userId,
    ...statusFilter
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('staff', 'name job image');
    
  const total = await Order.countDocuments({ 
    user: req.params.userId,
    ...statusFilter
  });

  res.json({
    orders,
    page,
    pages: Math.ceil(total / limit),
    total,
  });
});

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
  getUserOrders,
}; 