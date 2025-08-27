const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const CustomerService = require('../models/customerServiceModel');

// 保护客服路由中间件
const protectCustomerService = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // 获取令牌
      token = req.headers.authorization.split(' ')[1];

      // 处理带有CS_前缀的令牌
      if (token.startsWith('CS_')) {
        token = token.substring(3); // 移除CS_前缀
      } else {
        // 检查是否是管理员令牌（可以访问客服资源）
        if (token.startsWith('A_')) {
          // 如果是管理员令牌，也允许访问
          token = token.substring(2); // 移除A_前缀
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'abc123');
          if (decoded.role === 'admin') {
            req.admin = true;
            req.adminId = decoded.id;
            next();
            return;
          }
        }
        
        // 不是客服或管理员令牌
        res.status(401);
        throw new Error('未授权，需要客服令牌');
      }

      // 验证令牌
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'abc123');

      // 验证role字段是否为customer_service
      if (!decoded.role || decoded.role !== 'customer_service') {
        res.status(401);
        throw new Error('未授权，需要客服权限');
      }

      // 获取客服信息
      req.customerService = await CustomerService.findById(decoded.id).select('-password');

      if (!req.customerService) {
        res.status(401);
        throw new Error('未授权，客服不存在');
      }

      // 如果客服被禁用
      if (!req.customerService.isActive) {
        res.status(401);
        throw new Error('账号已被禁用');
      }

      // 为了与用户中间件保持一致，也设置req.user
      req.user = req.customerService;

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('未授权，令牌无效');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('未授权，无令牌');
  }
});

module.exports = { protectCustomerService }; 