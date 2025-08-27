const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const CustomerService = require('../models/customerServiceModel');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// 配置头像上传存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/customer-service');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cs-avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 配置 multer
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB限制
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

// @desc    客服登录
// @route   POST /api/customer-service/login
// @access  Public
const loginCustomerService = asyncHandler(async (req, res) => {
  const { phoneNumber, password, inviteCode } = req.body;

  // 验证邀请码
  if (inviteCode !== '1332') {
    res.status(401);
    throw new Error('邀请码无效');
  }

  // 查询客服
  const customerService = await CustomerService.findOne({ phoneNumber });

  if (!customerService) {
    res.status(401);
    throw new Error('手机号未注册');
  }

  // 验证密码
  if (await customerService.matchPassword(password)) {
    // 更新在线状态
    customerService.status = 'online';
    customerService.lastActiveTime = Date.now();
    await customerService.save();

    // 记录头像路径
    if (customerService.avatar) {
      console.log('客服登录成功，头像路径:', customerService.avatar);
    }

    res.json({
      _id: customerService._id,
      phoneNumber: customerService.phoneNumber,
      name: customerService.name,
      avatar: customerService.avatar,
      status: customerService.status,
      role: 'customerService',
      token: generateCustomerServiceToken(customerService._id),
    });
  } else {
    res.status(401);
    throw new Error('密码错误');
  }
});

// @desc    获取所有客服
// @route   GET /api/customer-service?page=1&limit=20&search=xxx
// @access  Private/Admin
const getAllCustomerServices = asyncHandler(async (req, res) => {
  try {
    // 检查是否是管理员请求（通过路由中间件区分）
    const isAdmin = req.admin;
    
    // 🚀 性能优化：分页参数（管理员可分页，普通用户通常客服数量较少）
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || (isAdmin ? 20 : 50); // 管理员20个，用户50个
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    // 🚀 性能优化：构建查询条件
    let query = {};
    
    // 如果不是管理员（普通用户），则只返回活跃且在线的客服
    if (!isAdmin) {
      query = { isActive: true, status: 'online' };
    } else {
      // 管理员可以看到所有客服，但可以选择过滤
      if (req.query.status) {
        query.status = req.query.status;
      }
      if (req.query.isActive !== undefined) {
        query.isActive = req.query.isActive === 'true';
      }
    }

    // 搜索功能
    if (search.trim()) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // 🚀 性能优化：对于普通用户，直接返回在线客服（通常数量少）
    if (!isAdmin && !search) {
      const customerServices = await CustomerService.find(query)
        .select('-password')
        .sort({ lastActiveTime: -1 }) // 按最后活跃时间排序
        .lean();
        
      console.log(`📱 用户查询在线客服: ${customerServices.length}个`);
      return res.json(customerServices);
    }

    // 🚀 性能优化：管理员或搜索时使用分页
    const [customerServices, totalCount] = await Promise.all([
      CustomerService.find(query)
        .select('-password')
        .sort({ createdAt: -1 }) // 利用索引排序
        .skip(skip)
        .limit(limit)
        .lean(),
      CustomerService.countDocuments(query)
    ]);

    // 🚀 性能优化：计算分页信息
    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    console.log(`📊 客服列表查询: 第${page}页/${totalPages}页, ${customerServices.length}/${totalCount}条记录, 用户类型: ${isAdmin ? '管理员' : '普通用户'}`);

    // 返回分页结果
    res.json({
      customerServices,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNext,
        hasPrev
      }
    });
  } catch (error) {
    console.error('❌ 获取客服列表失败:', error);
    res.status(500);
    throw new Error('获取客服列表失败');
  }
});

// @desc    获取单个客服信息
// @route   GET /api/customer-service/:id
// @access  Private/Admin
const getCustomerServiceById = asyncHandler(async (req, res) => {
  const customerService = await CustomerService.findById(req.params.id).select('-password');
  
  if (customerService) {
    res.json(customerService);
  } else {
    res.status(404);
    throw new Error('客服不存在');
  }
});

// @desc    创建客服账号
// @route   POST /api/customer-service
// @access  Private/Admin
const createCustomerService = asyncHandler(async (req, res) => {
  try {
    const { name, phoneNumber, password } = req.body;

    // 验证必要字段
    if (!name || !phoneNumber) {
      res.status(400);
      throw new Error('姓名和手机号为必填项');
    }

    // 检查是否已存在
    const existingCS = await CustomerService.findOne({ phoneNumber });
    if (existingCS) {
      res.status(400);
      throw new Error('该手机号已注册');
    }

    // 使用固定邀请码作为密码（如果未提供）
    const fixedPassword = '1332';
    
    // 创建客服账号
    const customerService = await CustomerService.create({
      name,
      phoneNumber,
      password: password || fixedPassword,
    });

    if (customerService) {
      console.log(`客服创建成功: ${customerService.name}, ${customerService.phoneNumber}`);
      res.status(201).json({
        _id: customerService._id,
        name: customerService.name,
        phoneNumber: customerService.phoneNumber,
        avatar: customerService.avatar,
        status: customerService.status,
        isActive: customerService.isActive,
        createdAt: customerService.createdAt,
        // 如果未提供密码，则显示使用了默认密码
        message: password ? undefined : '已设置默认密码为: 1332'
      });
    } else {
      res.status(400);
      throw new Error('客服账号创建失败');
    }
  } catch (error) {
    console.error('创建客服失败:', error.message);
    res.status(error.statusCode || 500);
    throw error;
  }
});

// @desc    更新客服信息
// @route   PUT /api/customer-service/:id
// @access  Private/Admin
const updateCustomerService = asyncHandler(async (req, res) => {
  const customerService = await CustomerService.findById(req.params.id);
  
  if (customerService) {
    customerService.name = req.body.name || customerService.name;
    customerService.phoneNumber = req.body.phoneNumber || customerService.phoneNumber;
    customerService.status = req.body.status || customerService.status;
    customerService.isActive = req.body.isActive !== undefined ? req.body.isActive : customerService.isActive;
    
    // 如果提供了新密码
    if (req.body.password) {
      customerService.password = req.body.password;
    }

    const updatedCustomerService = await customerService.save();
    
    res.json({
      _id: updatedCustomerService._id,
      name: updatedCustomerService.name,
      phoneNumber: updatedCustomerService.phoneNumber,
      avatar: updatedCustomerService.avatar,
      status: updatedCustomerService.status,
      isActive: updatedCustomerService.isActive,
    });
  } else {
    res.status(404);
    throw new Error('客服不存在');
  }
});

// @desc    删除客服账号
// @route   DELETE /api/customer-service/:id
// @access  Private/Admin
const deleteCustomerService = asyncHandler(async (req, res) => {
  const customerService = await CustomerService.findById(req.params.id);
  
  if (customerService) {
    await CustomerService.deleteOne({ _id: req.params.id });
    res.json({ message: '客服账号已删除' });
  } else {
    res.status(404);
    throw new Error('客服不存在');
  }
});

// @desc    上传客服头像
// @route   POST /api/customer-service/:id/avatar
// @access  Private/Admin
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('请提供头像文件');
  }

  const customerService = await CustomerService.findById(req.params.id);
  if (!customerService) {
    res.status(404);
    throw new Error('客服不存在');
  }

  try {
    // 使用 sharp 处理图片
    const compressedImagePath = path.join(path.dirname(req.file.path), 'compressed-' + req.file.filename);
    
    await sharp(req.file.path)
      .resize(300, 300, { 
        fit: 'cover',
        position: 'center' 
      })
      .jpeg({ quality: 80 })
      .toFile(compressedImagePath);
    
    // 删除原文件
    fs.unlinkSync(req.file.path);
    
    // 更新客服头像，确保路径格式正确
    const avatarUrl = `/uploads/customer-service/compressed-${req.file.filename}`;
    console.log('保存的头像URL:', avatarUrl);
    customerService.avatar = avatarUrl;
    await customerService.save();
    
    res.status(200).json({
      message: '头像上传成功',
      avatar: avatarUrl
    });
  } catch (error) {
    console.error('头像处理失败:', error);
    res.status(500);
    throw new Error('头像处理失败');
  }
});

// @desc    获取客服个人资料
// @route   GET /api/customer-service/profile
// @access  Private/CustomerService
const getCustomerServiceProfile = asyncHandler(async (req, res) => {
  const customerService = await CustomerService.findById(req.user.id);

  if (customerService) {
    res.json({
      _id: customerService._id,
      phoneNumber: customerService.phoneNumber,
      name: customerService.name,
      avatar: customerService.avatar,
      status: customerService.status,
      userType: 'customerService', // 添加用户类型标识
      role: 'customerService',
      isActive: customerService.isActive,
      lastActiveTime: customerService.lastActiveTime,
      serviceStats: customerService.serviceStats,
    });
  } else {
    res.status(404);
    throw new Error('客服不存在');
  }
});

// @desc    更新客服状态（在线/离线/忙碌）
// @route   PUT /api/customer-service/:id/status
// @access  Private/CustomerService
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  if (!['online', 'offline', 'busy'].includes(status)) {
    res.status(400);
    throw new Error('无效的状态值');
  }
  
  const customerService = await CustomerService.findById(req.params.id);
  
  if (customerService) {
    customerService.status = status;
    customerService.lastActiveTime = Date.now();
    await customerService.save();
    
    res.json({
      _id: customerService._id,
      status: customerService.status,
      lastActiveTime: customerService.lastActiveTime
    });
  } else {
    res.status(404);
    throw new Error('客服不存在');
  }
});

// 生成客服JWT令牌
const generateCustomerServiceToken = (id) => {
  const token = jwt.sign({ id, role: 'customer_service' }, process.env.JWT_SECRET || 'abc123', {
    expiresIn: '7d',
  });
  return `CS_${token}`; // 添加CS_前缀
};

module.exports = {
  loginCustomerService,
  getAllCustomerServices,
  getCustomerServiceById, 
  createCustomerService,
  updateCustomerService,
  deleteCustomerService,
  uploadAvatar,
  updateStatus,
  getCustomerServiceProfile,
  upload,
  generateCustomerServiceToken
}; 