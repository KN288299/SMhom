const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const CustomerService = require('../models/customerServiceModel');

const protect = asyncHandler(async (req, res, next) => {
  let token;
  
  console.log('Auth中间件 - 请求路径:', req.originalUrl);
  console.log('Auth中间件 - Authorization头:', req.headers.authorization ? `${req.headers.authorization.substring(0, 15)}...` : '无');

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // 获取令牌
      token = req.headers.authorization.split(' ')[1];
      console.log('Auth中间件 - 提取的token:', token ? `${token.substring(0, 10)}...` : '无');

      // 检查令牌前缀
      let tokenType = 'user'; // 默认为用户令牌
      let tokenWithoutPrefix = token;
      
      // 处理带有前缀的令牌
      if (token.startsWith('U_')) {
        tokenWithoutPrefix = token.substring(2); // 移除U_前缀
        tokenType = 'user';
        console.log('Auth中间件 - 检测到用户令牌 U_前缀');
      } else if (token.startsWith('CS_')) {
        tokenWithoutPrefix = token.substring(3); // 移除CS_前缀
        tokenType = 'customerService';
        console.log('Auth中间件 - 检测到客服令牌 CS_前缀');
      } else if (token.startsWith('A_')) {
        tokenWithoutPrefix = token.substring(2); // 移除A_前缀
        tokenType = 'admin';
        console.log('Auth中间件 - 检测到管理员令牌 A_前缀');
      } else {
        console.log('Auth中间件 - 未检测到前缀，假定为用户令牌');
      }

      // 验证令牌
      const decoded = jwt.verify(tokenWithoutPrefix, process.env.JWT_SECRET || 'abc123');
      console.log('Auth中间件 - 令牌验证成功，用户ID:', decoded.id);

      // 根据令牌类型获取相应的信息
      if (tokenType === 'user') {
      // 获取用户信息
      req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
          console.log('Auth中间件 - 用户不存在:', decoded.id);
          throw new Error('用户不存在');
        }
        console.log('Auth中间件 - 用户身份验证成功:', req.user._id);
      } else if (tokenType === 'customerService') {
        // 获取客服信息
        req.customerService = await CustomerService.findById(decoded.id).select('-password');
        if (!req.customerService) {
          console.log('Auth中间件 - 客服不存在:', decoded.id);
          throw new Error('客服不存在');
        }
        // 为了兼容性，也设置user，确保包含所有客服信息
        req.user = { 
          _id: req.customerService._id,
          role: 'customer_service',
          userType: 'customerService', // 添加userType字段用于前端判断
          name: req.customerService.name,
          phoneNumber: req.customerService.phoneNumber,
          avatar: req.customerService.avatar, // 重要：添加头像信息
          status: req.customerService.status,
          serviceStats: req.customerService.serviceStats,
          isActive: req.customerService.isActive,
          lastActiveTime: req.customerService.lastActiveTime
        };
        console.log('Auth中间件 - 客服身份验证成功:', req.customerService._id);
      } else if (tokenType === 'admin') {
        // 管理员信息处理
        // 这里可以添加管理员信息的获取
        req.admin = true;
        req.adminId = decoded.id;
        req.user = { 
          _id: decoded.id,
          role: 'admin',
          isAdmin: true
        };
        console.log('Auth中间件 - 管理员身份验证成功:', decoded.id);
      }

      next();
    } catch (error) {
      console.error('Auth中间件 - 令牌验证错误:', error);
      res.status(401);
      throw new Error('未授权，令牌无效');
    }
  }

  if (!token) {
    console.log('Auth中间件 - 未提供令牌');
    res.status(401);
    throw new Error('未授权，无令牌');
  }
});

// 检查是否是管理员
const admin = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(401);
    throw new Error('未授权，需要管理员权限');
  }
});

module.exports = { protect, admin }; 