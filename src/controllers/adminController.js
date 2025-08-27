const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');
const User = require('../models/userModel');
const Message = require('../models/messageModel');
const Conversation = require('../models/conversationModel');
const Staff = require('../models/staffModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// 已移除验证码验证
const { recordLoginFailure, recordLoginSuccess } = require('../middleware/ipBlockMiddleware');

// @desc    管理员登录
// @route   POST /api/admin/login
// @access  Public
const loginAdmin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. 验证必填字段
    if (!username || !password) {
      const result = recordLoginFailure(req);
      return res.status(400).json({
        message: '请填写完整的登录信息',
        remainingAttempts: result.remainingAttempts
      });
    }

    // 2. 查找管理员
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

    // 3. 验证密码和状态
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

    // 4. 登录成功
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
  const { username, phoneNumber, email, password, role, status, devicePlatform } = req.body;

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

  // 规范化平台字段
  let normalizedPlatform = 'unknown';
  if (devicePlatform === 'android' || devicePlatform === 'ios') {
    normalizedPlatform = devicePlatform;
  }

  const user = await User.create({
    username,
    phoneNumber,
    email,
    password,
    role,
    status,
    devicePlatform: normalizedPlatform,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      username: user.username,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role,
      status: user.status,
      devicePlatform: user.devicePlatform || 'unknown',
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

// 解除IP封锁（紧急情况使用）
const unblockIP = async (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({ message: '请提供要解除封锁的IP地址' });
    }

    // 导入IP封锁中间件
    const { clearIPBlock } = require('../middleware/ipBlockMiddleware');
    
    // 解除指定IP的封锁
    const result = clearIPBlock(ip);
    
    console.log(`管理员手动解除IP封锁: ${ip}`);
    
    res.json({
      message: `IP地址 ${ip} 的封锁已解除`,
      success: true,
      result
    });
  } catch (error) {
    console.error('解除IP封锁失败:', error);
    res.status(500).json({ 
      message: '解除IP封锁失败', 
      error: error.message 
    });
  }
};

// 配置multer用于文件上传（员工导入）
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/admin-temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `import-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB限制
  fileFilter: (req, file, cb) => {
    // 放宽MIME以匹配常见浏览器/系统对ZIP/JSON的标识
    const allowedTypes = [
      'application/json',
      'text/json',
      'application/zip',
      'application/x-zip-compressed',
      'application/octet-stream' // 某些环境上传ZIP/JSON会识别为octet-stream
    ];
    const allowedExtensions = ['.json', '.zip'];

    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('只支持JSON和ZIP格式的文件'), false);
    }
  }
});

// @desc    获取员工批量删除预览
// @route   GET /api/admin/staff/delete-preview
// @access  Private/Admin
const getStaffDeletePreview = asyncHandler(async (req, res) => {
  try {
    const { batchSize = 10, search = '', province = '' } = req.query;
    const limit = parseInt(batchSize);
    
    // 构建查询条件
    const filter = { isActive: true };
    
    if (province) {
      filter.province = province;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: new RegExp(search, 'i') } },
        { job: { $regex: new RegExp(search, 'i') } }
      ];
    }
    
    // 获取要删除的员工预览
    const staffToDelete = await Staff.find(filter)
      .sort({ createdAt: 1 }) // 优先删除较早创建的
      .limit(limit)
      .select('_id name age job province createdAt');
    
    const totalMatching = await Staff.countDocuments(filter);
    
    res.json({
      preview: staffToDelete,
      totalMatching,
      willDelete: Math.min(limit, totalMatching)
    });
    
  } catch (error) {
    console.error('获取删除预览失败:', error);
    res.status(500).json({ message: '获取预览失败', error: error.message });
  }
});

// @desc    批量删除员工
// @route   DELETE /api/admin/staff/batch-delete
// @access  Private/Admin
const batchDeleteStaff = asyncHandler(async (req, res) => {
  try {
    const { batchSize = 10, search = '', province = '' } = req.query;
    const limit = parseInt(batchSize);
    
    // 构建查询条件
    const filter = { isActive: true };
    
    if (province) {
      filter.province = province;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: new RegExp(search, 'i') } },
        { job: { $regex: new RegExp(search, 'i') } }
      ];
    }
    
    // 获取要删除的员工ID
    const staffToDelete = await Staff.find(filter)
      .sort({ createdAt: 1 }) // 优先删除较早创建的
      .limit(limit)
      .select('_id');
    
    const staffIds = staffToDelete.map(staff => staff._id);
    
    // 软删除（设置isActive为false）
    const result = await Staff.updateMany(
      { _id: { $in: staffIds } },
      { $set: { isActive: false, deletedAt: new Date() } }
    );
    
    console.log(`批量删除员工: ${result.modifiedCount} 名员工已标记为删除`);
    
    res.json({
      message: `成功删除 ${result.modifiedCount} 名员工`,
      deletedCount: result.modifiedCount
    });
    
  } catch (error) {
    console.error('批量删除员工失败:', error);
    res.status(500).json({ message: '删除失败', error: error.message });
  }
});

module.exports = {
  loginAdmin,
  getAdminProfile,
  unblockIP,
  getStats,
  getUsers,
  getUserById,
  updateUserStatus,
  createUser,
  deleteUser,
  upload, // multer实例
  getStaffDeletePreview,
  batchDeleteStaff
};