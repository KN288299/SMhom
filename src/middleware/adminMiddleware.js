const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const Admin = require('../models/adminModel');

// 保护管理员路由中间件
const protectAdmin = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // 获取token
      token = req.headers.authorization.split(' ')[1];
      
      // 处理带有A_前缀的令牌
      if (token.startsWith('A_')) {
        token = token.substring(2); // 移除A_前缀
      }

      // 验证token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'abc123');

      // 获取管理员信息（不包含密码）
      req.admin = await Admin.findById(decoded.id).select('-password');

      if (!req.admin || req.admin.status === 'disabled') {
        res.status(401);
        throw new Error('未授权，管理员账号不存在或已被禁用');
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('未授权，token无效');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('未授权，没有token');
  }
});

// 仅超级管理员权限中间件
const superAdminOnly = asyncHandler(async (req, res, next) => {
  if (req.admin && req.admin.role === 'super') {
    next();
  } else {
    res.status(403);
    throw new Error('没有权限，需要超级管理员权限');
  }
});

module.exports = { protectAdmin, superAdminOnly }; 