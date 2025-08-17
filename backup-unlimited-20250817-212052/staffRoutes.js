const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const sharp = require('sharp');
const Staff = require('../models/staffModel');
const mongoose = require('mongoose');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads/employees');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'employee-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 只接受图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只能上传图片文件!'), false);
  }
};

// 初始化multer
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB限制
});

// 多文件上传配置
const multiUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'photos', maxCount: 10 }
]);

/**
 * @route   GET /api/staff
 * @desc    获取所有员工数据，支持分页、搜索和过滤
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', isActive, province, job, age } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    // 构建查询条件
    const filter = {};
    
    // 如果提供了isActive参数，添加到查询条件
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    } else {
      filter.isActive = true; // 默认只返回活跃员工
    }
    
    // 如果提供了省份参数，添加到查询条件
    if (province) {
      filter.province = province;
    }
    
    // 如果提供了职业参数，添加精确职业搜索
    if (job) {
      filter.job = { $regex: new RegExp(job, 'i') };
    }
    
    // 如果提供了年龄参数，精确匹配年龄
    if (age) {
      const ageNum = parseInt(age);
      if (!isNaN(ageNum)) {
        filter.age = ageNum;
      }
    }
    
    // 如果有搜索关键字，添加到查询条件（优先级低于具体字段搜索）
    if (search && !job && !age) {
      filter.$or = [
        { name: { $regex: new RegExp(search, 'i') } },
        { job: { $regex: new RegExp(search, 'i') } },
        { description: { $regex: new RegExp(search, 'i') } }
      ];
    } else if (search) {
      // 如果有搜索关键词但同时也有具体字段搜索，则仅搜索姓名
      filter.name = { $regex: new RegExp(search, 'i') };
    }
    
    console.log('查询筛选条件:', filter);
    
    // 计算总数量和分页
    const total = await Staff.countDocuments(filter);
    const staffMembers = await Staff.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
    
    console.log(`找到 ${staffMembers.length} 名符合条件的员工`);
    
    res.json({
      data: staffMembers,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('获取员工数据出错:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

/**
 * @route   GET /api/staff/:id
 * @desc    获取单个员工详细信息
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`请求获取员工ID: ${id}`);
    
    // 验证ID是否为合法的MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`无效的员工ID格式: ${id}`);
      return res.status(400).json({ message: '无效的员工ID格式' });
    }
    
    const staff = await Staff.findById(id);
    if (!staff) {
      console.log(`未找到员工，ID: ${id}`);
      return res.status(404).json({ message: '员工不存在' });
    }
    
    console.log(`成功获取员工: ${staff.name}`);
    res.json(staff);
  } catch (error) {
    console.error('获取员工详情出错:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

/**
 * @route   POST /api/staff/upload-image
 * @desc    上传员工图片
 * @access  Admin
 */
router.post('/upload-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请提供图片文件' });
    }

    // 构建访问URL
    const imageUrl = `/uploads/employees/${req.file.filename}`;

    res.status(201).json({ 
      message: '图片上传成功',
      imageUrl
    });
  } catch (error) {
    console.error('上传图片出错:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

/**
 * @route   POST /api/staff
 * @desc    添加新员工
 * @access  Admin
 */
router.post('/', multiUpload, async (req, res) => {
  try {
    const { 
      name, age, job, province = '北京市',
      height = 165, weight = 50, 
      description = '', tag = '可预约' 
    } = req.body;

    // 验证必填字段
    if (!name || !age || !job) {
      return res.status(400).json({ message: '请提供员工基本信息（姓名、年龄、职业）' });
    }

    let imageUrl = 'https://via.placeholder.com/150'; // 默认图片

    // 如果有上传主图
    if (req.files && req.files.image && req.files.image.length > 0) {
      // 构建访问URL
      imageUrl = `/uploads/employees/${req.files.image[0].filename}`;
    }

    // 处理多张照片
    const photoUrls = [];
    if (req.files && req.files.photos && req.files.photos.length > 0) {
      req.files.photos.forEach(photo => {
        photoUrls.push(`/uploads/employees/${photo.filename}`);
      });
    }

    // 创建新员工
    const newStaff = new Staff({
      name,
      age: parseInt(age),
      job,
      image: imageUrl,
      province,
      height: parseFloat(height),
      weight: parseFloat(weight),
      description,
      photos: photoUrls,
      tag
    });

    // 保存到数据库
    const savedStaff = await newStaff.save();

    res.status(201).json(savedStaff);
  } catch (error) {
    console.error('添加员工出错:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

/**
 * @route   PUT /api/staff/:id
 * @desc    更新员工信息
 * @access  Admin
 */
router.put('/:id', multiUpload, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, age, job, province,
      height, weight, description, tag 
    } = req.body;

    // 找到员工
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ message: '员工不存在' });
    }

    let imageUrl = staff.image; // 保持原有图片

    // 如果有上传新主图
    if (req.files && req.files.image && req.files.image.length > 0) {
      // 构建访问URL
      imageUrl = `/uploads/employees/${req.files.image[0].filename}`;
    }

    // 处理多张照片
    let photoUrls = [...staff.photos]; // 保留原有照片
    if (req.files && req.files.photos && req.files.photos.length > 0) {
      // 如果客户端传了新的照片集，则替换原有照片
      photoUrls = req.files.photos.map(photo => `/uploads/employees/${photo.filename}`);
    }

    // 更新员工信息
    staff.name = name || staff.name;
    staff.age = age ? parseInt(age) : staff.age;
    staff.job = job || staff.job;
    staff.image = imageUrl;
    staff.province = province !== undefined ? province : staff.province;
    staff.height = height ? parseFloat(height) : staff.height;
    staff.weight = weight ? parseFloat(weight) : staff.weight;
    staff.description = description !== undefined ? description : staff.description;
    staff.photos = photoUrls;
    staff.tag = tag || staff.tag;

    // 保存更新
    const updatedStaff = await staff.save();

    res.json(updatedStaff);
  } catch (error) {
    console.error('更新员工信息出错:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

/**
 * @route   DELETE /api/staff/:id
 * @desc    删除员工
 * @access  Admin
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 找到员工
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ message: '员工不存在' });
    }

    // 删除员工（软删除）
    staff.isActive = false;
    await staff.save();

    // 或者完全删除
    // await Staff.findByIdAndDelete(id);

    res.json({ message: '员工已删除' });
  } catch (error) {
    console.error('删除员工出错:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router; 