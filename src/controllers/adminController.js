const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');
const User = require('../models/userModel');
const Message = require('../models/messageModel');
const Conversation = require('../models/conversationModel');
const { verifyCaptcha } = require('../middleware/captchaMiddleware');
const { recordLoginFailure, recordLoginSuccess } = require('../middleware/ipBlockMiddleware');

// @desc    管理员登录
// @route   POST /api/admin/login
// @access  Public
const loginAdmin = asyncHandler(async (req, res) => {
  const { username, password, captcha, captchaSessionId } = req.body;

  try {
    // 1. 验证必填字段
    if (!username || !password || !captcha || !captchaSessionId) {
      const result = recordLoginFailure(req);
      return res.status(400).json({
        message: '请填写完整的登录信息',
        remainingAttempts: result.remainingAttempts
      });
    }

    // 2. 验证验证码
    const isCaptchaValid = verifyCaptcha(captchaSessionId, captcha);
    if (!isCaptchaValid) {
      const result = recordLoginFailure(req);
      
      if (result.isBlocked) {
        return res.status(429).json({
          message: result.message,
          isBlocked: true,
          remainingMinutes: result.remainingMinutes
        });
      }
      
      return res.status(400).json({
        message: '验证码错误',
        remainingAttempts: result.remainingAttempts
      });
    }

    // 3. 查找管理员
    const admin = await Admin.findOne({ username });
    if (!admin) {
      const result = recordLoginFailure(req);
      
      if (result.isBlocked) {
        return res.status(429).json({
          message: result.message,
          isBlocked: true,
          remainingMinutes: result.remainingMinutes
        });
      }
      
      return res.status(401).json({
        message: '用户名或密码不正确',
        remainingAttempts: result.remainingAttempts
      });
    }

    // 4. 验证密码和状态
    const isPasswordMatch = await admin.matchPassword(password);
    if (!isPasswordMatch || admin.status !== 'active') {
      const result = recordLoginFailure(req);
      
      if (result.isBlocked) {
        return res.status(429).json({
          message: result.message,
          isBlocked: true,
          remainingMinutes: result.remainingMinutes
        });
      }
      
      return res.status(401).json({
        message: result.message,
        remainingAttempts: result.remainingAttempts
      });
    }

    // 5. 登录成功
    recordLoginSuccess(req);
    
    const token = generateToken(admin._id);
    
    console.log(`管理员 ${admin.username} 登录成功`);
    
    res.json({
      token,
      admin: {
        _id: admin._id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
      }
    });

  } catch (error) {
    console.error('管理员登录错误:', error);
    
    // 发生错误也记录为失败尝试
    const result = recordLoginFailure(req);
    
    if (result.isBlocked) {
      return res.status(429).json({
        message: result.message,
        isBlocked: true,
        remainingMinutes: result.remainingMinutes
      });
    }
    
    res.status(500).json({
      message: '登录过程中发生错误，请稍后重试',
      remainingAttempts: result.remainingAttempts
    });
  }
});

// @desc    获取管理员个人资料
// @route   GET /api/admin/profile
// @access  Private/Admin
const getAdminProfile = asyncHandler(async (req, res) => {
  // req.admin已经是完整的管理员对象（不包含密码）
  if (req.admin) {
    res.json({ admin: req.admin });
  } else {
    res.status(404);
    throw new Error('管理员不存在');
  }
});

// @desc    获取仪表盘统计数据
// @route   GET /api/admin/stats
// @access  Private/Admin
const getStats = asyncHandler(async (req, res) => {
  // 基本统计数据
  const totalUsers = await User.countDocuments();
  
  // 获取最近7天活跃的用户数量
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const activeUsers = await User.countDocuments({
    lastActive: { $gte: sevenDaysAgo },
  });
  
  const totalMessages = await Message.countDocuments();
  const totalConversations = await Conversation.countDocuments();
  
  // 获取最近注册的10个用户
  const recentUsers = await User.find({})
    .select('-password')
    .sort('-createdAt')
    .limit(10);
  
  // 获取最近的活动（登录、消息等）
  const recentMessages = await Message.find({})
    .sort('-createdAt')
    .limit(5)
    .populate('sender', 'username');
  
  // 构建活动数据
  const recentActivity = [
    ...recentMessages.map(msg => ({
      _id: msg._id,
      type: 'message',
      username: msg.sender.username || '未知用户',
      createdAt: msg.createdAt
    })),
    ...recentUsers.slice(0, 5).map(user => ({
      _id: user._id,
      type: 'registration',
      username: user.username || user.phoneNumber,
      createdAt: user.createdAt
    }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);
  
  res.json({
    totalUsers,
    activeUsers,
    totalMessages,
    totalConversations,
    recentUsers,
    recentActivity,
  });
});

// @desc    获取所有用户
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password').sort('-createdAt');
  res.json({ users });
});

// @desc    获取单个用户
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('用户不存在');
  }
});

// @desc    更新用户状态
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    user.status = req.body.status || user.status;
    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      phoneNumber: updatedUser.phoneNumber,
      role: updatedUser.role,
      status: updatedUser.status,
    });
  } else {
    res.status(404);
    throw new Error('用户不存在');
  }
});

// @desc    创建用户
// @route   POST /api/admin/users
// @access  Private/Admin
const createUser = asyncHandler(async (req, res) => {
  const { username, phoneNumber, email, password, role, status } = req.body;

  // 检查用户是否已存在
  const userExists = await User.findOne({ 
    $or: [
      { phoneNumber },
      { username }
    ] 
  });

  if (userExists) {
    res.status(400);
    throw new Error('用户已存在');
  }

  const user = await User.create({
    username,
    phoneNumber,
    email,
    password,
    role,
    status,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      username: user.username,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role,
      status: user.status,
    });
  } else {
    res.status(400);
    throw new Error('无效的用户数据');
  }
});

// @desc    删除用户
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    await User.deleteOne({ _id: req.params.id });
    res.json({ message: '用户已删除' });
  } else {
    res.status(404);
    throw new Error('用户不存在');
  }
});

// 生成JWT
const generateToken = (id) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET || 'abc123', {
    expiresIn: '7d',
  });
  return `A_${token}`;
};

module.exports = {
  loginAdmin,
  getAdminProfile,
  getStats,
  getUsers,
  getUserById,
  updateUserStatus,
  createUser,
  deleteUser,
}; 