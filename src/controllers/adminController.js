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
const archiver = require('archiver');
const unzipper = require('unzipper');
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
    const allowedTypes = ['application/json', 'application/zip'];
    const allowedExtensions = ['.json', '.zip'];
    
    if (allowedTypes.includes(file.mimetype) || 
        allowedExtensions.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('只支持JSON和ZIP格式的文件'), false);
    }
  }
});

// @desc    导出员工数据
// @route   GET /api/admin/staff/export
// @access  Private/Admin
const exportStaff = asyncHandler(async (req, res) => {
  try {
    // 获取所有活跃员工数据
    const staffList = await Staff.find({ isActive: true }).lean();
    
    console.log(`导出 ${staffList.length} 名员工数据`);
    
    if (staffList.length === 0) {
      return res.status(404).json({ message: '没有员工数据可导出' });
    }

    // 创建临时目录
    const tempDir = path.join(__dirname, '../../uploads/admin-temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 生成JSON文件
    const jsonFilename = `staff-export-${Date.now()}.json`;
    const jsonPath = path.join(tempDir, jsonFilename);
    
    const exportData = {
      exportTime: new Date().toISOString(),
      totalCount: staffList.length,
      data: staffList
    };
    
    fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2));

    // 创建ZIP文件
    const zipFilename = `staff-export-${Date.now()}.zip`;
    const zipPath = path.join(tempDir, zipFilename);
    
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.pipe(output);
    archive.file(jsonPath, { name: jsonFilename });
    
    await archive.finalize();
    
    // 等待ZIP文件创建完成
    await new Promise((resolve) => {
      output.on('close', resolve);
    });

    // 设置响应头
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${zipFilename}`);
    
    // 发送文件
    const fileStream = fs.createReadStream(zipPath);
    fileStream.pipe(res);
    
    // 清理临时文件
    fileStream.on('end', () => {
      setTimeout(() => {
        try {
          fs.unlinkSync(jsonPath);
          fs.unlinkSync(zipPath);
        } catch (err) {
          console.error('清理临时文件失败:', err);
        }
      }, 1000);
    });

  } catch (error) {
    console.error('导出员工数据失败:', error);
    res.status(500).json({ message: '导出失败', error: error.message });
  }
});

// @desc    导入员工数据
// @route   POST /api/admin/staff/import
// @access  Private/Admin
const importStaff = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请提供要导入的文件' });
    }

    const file = req.file;
    const filePath = file.path;
    const fileExtension = path.extname(file.originalname).toLowerCase();

    let staffData = [];

    if (fileExtension === '.json') {
      // 处理JSON文件
      const jsonContent = fs.readFileSync(filePath, 'utf8');
      const importData = JSON.parse(jsonContent);
      
      if (Array.isArray(importData)) {
        staffData = importData;
      } else if (importData.data && Array.isArray(importData.data)) {
        staffData = importData.data;
      } else {
        throw new Error('JSON文件格式错误：应包含员工数据数组');
      }
    } else if (fileExtension === '.zip') {
      // 处理ZIP文件
      const extractDir = path.join(path.dirname(filePath), `extract-${Date.now()}`);
      fs.mkdirSync(extractDir, { recursive: true });

      // 解压ZIP文件
      await fs.createReadStream(filePath)
        .pipe(unzipper.Extract({ path: extractDir }))
        .promise();

      // 查找JSON文件
      const files = fs.readdirSync(extractDir);
      const jsonFile = files.find(f => f.endsWith('.json'));
      
      if (!jsonFile) {
        throw new Error('ZIP文件中没有找到JSON数据文件');
      }

      const jsonPath = path.join(extractDir, jsonFile);
      const jsonContent = fs.readFileSync(jsonPath, 'utf8');
      const importData = JSON.parse(jsonContent);
      
      if (Array.isArray(importData)) {
        staffData = importData;
      } else if (importData.data && Array.isArray(importData.data)) {
        staffData = importData.data;
      } else {
        throw new Error('JSON文件格式错误：应包含员工数据数组');
      }

      // 清理解压目录
      fs.rmSync(extractDir, { recursive: true, force: true });
    } else {
      throw new Error('不支持的文件格式，只支持JSON和ZIP文件');
    }

    // 检查数据量，如果超过20个员工，建议使用分批导入
    if (staffData.length > 20) {
      // 清理上传的文件
      fs.unlinkSync(filePath);

      return res.json({
        message: '检测到大量数据，建议使用分批导入功能',
        totalCount: staffData.length,
        suggestBatchImport: true,
        batchRecommendation: {
          totalStaff: staffData.length,
          recommendedBatchSize: 10,
          estimatedBatches: Math.ceil(staffData.length / 10)
        }
      });
    }

    // 导入员工数据（小批量直接处理）
    const results = await processStaffBatch(staffData);

    // 清理上传的文件
    fs.unlinkSync(filePath);

    console.log(`员工导入完成: 成功 ${results.success} 条，失败 ${results.failed} 条`);

    res.json({
      message: `导入完成: 成功 ${results.success} 条，失败 ${results.failed} 条`,
      results
    });

  } catch (error) {
    console.error('导入员工数据失败:', error);
    
    // 清理上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      message: '导入失败', 
      error: error.message 
    });
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

// @desc    分批导入员工数据 - 解析文件
// @route   POST /api/admin/staff/batch-import/prepare
// @access  Private/Admin
const prepareBatchImport = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要导入的文件' });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    let staffData = [];

    if (fileExtension === '.json') {
      // 处理JSON文件
      const jsonContent = fs.readFileSync(filePath, 'utf8');
      const importData = JSON.parse(jsonContent);
      
      if (Array.isArray(importData)) {
        staffData = importData;
      } else if (importData.data && Array.isArray(importData.data)) {
        staffData = importData.data;
      } else {
        throw new Error('JSON文件格式错误：应包含员工数据数组');
      }
    } else if (fileExtension === '.zip') {
      // 处理ZIP文件
      const extractDir = path.join(path.dirname(filePath), `extract-${Date.now()}`);
      fs.mkdirSync(extractDir, { recursive: true });

      // 解压ZIP文件
      await fs.createReadStream(filePath)
        .pipe(unzipper.Extract({ path: extractDir }))
        .promise();

      // 查找JSON文件
      const files = fs.readdirSync(extractDir);
      const jsonFile = files.find(f => f.endsWith('.json'));
      
      if (!jsonFile) {
        throw new Error('ZIP文件中没有找到JSON数据文件');
      }

      const jsonPath = path.join(extractDir, jsonFile);
      const jsonContent = fs.readFileSync(jsonPath, 'utf8');
      const importData = JSON.parse(jsonContent);
      
      if (Array.isArray(importData)) {
        staffData = importData;
      } else if (importData.data && Array.isArray(importData.data)) {
        staffData = importData.data;
      } else {
        throw new Error('JSON文件格式错误：应包含员工数据数组');
      }

      // 清理解压目录
      fs.rmSync(extractDir, { recursive: true, force: true });
    } else {
      throw new Error('不支持的文件格式，只支持JSON和ZIP文件');
    }

    // 生成批次ID
    const batchId = `batch_${Date.now()}_${Math.round(Math.random() * 1000)}`;
    const batchSize = 10; // 每批10个员工
    const totalBatches = Math.ceil(staffData.length / batchSize);
    
    // 将数据分批并保存到临时存储
    const tempDir = path.join(__dirname, '../../uploads/batch-temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const batchInfo = {
      batchId,
      totalStaff: staffData.length,
      totalBatches,
      batchSize,
      createdAt: new Date(),
      status: 'prepared'
    };

    // 保存批次信息
    fs.writeFileSync(
      path.join(tempDir, `${batchId}_info.json`), 
      JSON.stringify(batchInfo, null, 2)
    );

    // 分批保存数据
    for (let i = 0; i < totalBatches; i++) {
      const startIndex = i * batchSize;
      const endIndex = Math.min(startIndex + batchSize, staffData.length);
      const batchData = staffData.slice(startIndex, endIndex);
      
      fs.writeFileSync(
        path.join(tempDir, `${batchId}_batch_${i + 1}.json`), 
        JSON.stringify(batchData, null, 2)
      );
    }

    // 清理上传的文件
    fs.unlinkSync(filePath);

    res.json({
      message: '文件解析完成，准备分批导入',
      batchInfo: {
        batchId,
        totalStaff: staffData.length,
        totalBatches,
        batchSize
      }
    });

  } catch (error) {
    console.error('准备分批导入失败:', error);
    
    // 清理上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      message: '准备分批导入失败',
      error: error.message 
    });
  }
});

// @desc    执行单个批次导入
// @route   POST /api/admin/staff/batch-import/execute
// @access  Private/Admin
const executeBatchImport = asyncHandler(async (req, res) => {
  try {
    const { batchId, batchNumber } = req.body;

    if (!batchId || !batchNumber) {
      return res.status(400).json({ message: '缺少批次ID或批次号' });
    }

    const tempDir = path.join(__dirname, '../../uploads/batch-temp');
    const batchFilePath = path.join(tempDir, `${batchId}_batch_${batchNumber}.json`);

    if (!fs.existsSync(batchFilePath)) {
      return res.status(404).json({ message: '批次数据不存在' });
    }

    // 读取批次数据
    const batchData = JSON.parse(fs.readFileSync(batchFilePath, 'utf8'));
    
    // 处理这一批员工数据
    const results = await processStaffBatch(batchData);

    res.json({
      message: `批次 ${batchNumber} 导入完成`,
      batchNumber,
      results
    });

  } catch (error) {
    console.error('执行批次导入失败:', error);
    res.status(500).json({ 
      message: '执行批次导入失败',
      error: error.message 
    });
  }
});

// @desc    清理批次临时文件
// @route   DELETE /api/admin/staff/batch-import/cleanup
// @access  Private/Admin
const cleanupBatchImport = asyncHandler(async (req, res) => {
  try {
    const { batchId } = req.body;

    if (!batchId) {
      return res.status(400).json({ message: '缺少批次ID' });
    }

    const tempDir = path.join(__dirname, '../../uploads/batch-temp');
    
    // 清理所有相关文件
    const files = fs.readdirSync(tempDir);
    const batchFiles = files.filter(file => file.startsWith(batchId));
    
    batchFiles.forEach(file => {
      fs.unlinkSync(path.join(tempDir, file));
    });

    res.json({
      message: '批次临时文件清理完成',
      cleanedFiles: batchFiles.length
    });

  } catch (error) {
    console.error('清理批次文件失败:', error);
    res.status(500).json({ 
      message: '清理批次文件失败',
      error: error.message 
    });
  }
});

// 共用的员工批次处理函数
const processStaffBatch = async (staffData) => {
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (const staffInfo of staffData) {
    try {
      // 检查必需字段
      if (!staffInfo.name || !staffInfo.age || !staffInfo.job) {
        results.failed++;
        results.errors.push(`员工 ${staffInfo.name || '未知'}: 缺少必需字段（姓名、年龄、职业）`);
        continue;
      }

      // 检查是否已存在同名员工
      const existingStaff = await Staff.findOne({ 
        name: staffInfo.name,
        isActive: true 
      });

      if (existingStaff) {
        results.failed++;
        results.errors.push(`员工 ${staffInfo.name}: 已存在同名员工`);
        continue;
      }

      // 创建新员工
      const newStaff = new Staff({
        name: staffInfo.name,
        age: parseInt(staffInfo.age),
        job: staffInfo.job,
        province: staffInfo.province || '北京市',
        height: parseFloat(staffInfo.height) || 165,
        weight: parseFloat(staffInfo.weight) || 50,
        description: staffInfo.description || '',
        image: staffInfo.image || 'https://via.placeholder.com/150',
        photos: staffInfo.photos || [],
        tag: staffInfo.tag || '可预约',
        isActive: true
      });

      await newStaff.save();
      results.success++;

    } catch (error) {
      results.failed++;
      results.errors.push(`员工 ${staffInfo.name || '未知'}: ${error.message}`);
    }
  }

  return results;
};

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
  exportStaff,
  importStaff,
  getStaffDeletePreview,
  batchDeleteStaff,
  prepareBatchImport,
  executeBatchImport,
  cleanupBatchImport
}; 