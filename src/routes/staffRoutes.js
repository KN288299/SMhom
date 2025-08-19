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
const uploadDir = path.join(__dirname, '../../uploads/images');
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
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB限制
});

// 多文件上传配置
const multiUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'photos', maxCount: 10 }
]);

// 压缩图片的辅助函数
const compressImage = async (inputPath, outputPath, options = {}) => {
  try {
    const { width = 800, quality = 80 } = options;
    
    await sharp(inputPath)
      .resize(width, null, { 
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality })
      .toFile(outputPath);
    
    // 删除原始文件
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
    
    return outputPath;
  } catch (error) {
    console.error('图片压缩失败:', error);
    // 如果压缩失败，返回原始路径
    return inputPath;
  }
};

/**
 * @route   GET /api/staff
 * @desc    获取所有员工（支持分页和筛选）
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      province = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

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

    // 构建排序条件
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // 获取员工数据
    const staff = await Staff.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    // 获取总数
    const total = await Staff.countDocuments(filter);

    res.json({
      staff,
      pagination: {
        current: pageNum,
        pageSize: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('获取员工列表失败:', error);
    res.status(500).json({ message: '获取员工列表失败', error: error.message });
  }
});

/**
 * @route   GET /api/staff/:id
 * @desc    获取单个员工详情
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: '无效的员工ID格式' });
    }

    const staff = await Staff.findById(req.params.id).select('-__v');
    
    if (!staff || !staff.isActive) {
      return res.status(404).json({ message: '员工不存在' });
    }

    res.json(staff);
  } catch (error) {
    console.error('获取员工详情失败:', error);
    res.status(500).json({ message: '获取员工详情失败', error: error.message });
  }
});

/**
 * @route   POST /api/staff
 * @desc    创建新员工
 * @access  Private (需要认证)
 */
router.post('/', authMiddleware, multiUpload, async (req, res) => {
  try {
    const { name, age, job, province, height, weight, description, tag } = req.body;

    // 验证必填字段
    if (!name || !age || !job) {
      return res.status(400).json({ message: '姓名、年龄和职业为必填项' });
    }

    // 检查员工是否已存在
    const existingStaff = await Staff.findOne({ name, isActive: true });
    if (existingStaff) {
      return res.status(400).json({ message: '该员工已存在' });
    }

    // 处理主头像
    let imageUrl = 'https://via.placeholder.com/150';
    if (req.files && req.files.image && req.files.image[0]) {
      const imageFile = req.files.image[0];
      const compressedImagePath = path.join(uploadDir, `compressed-${imageFile.filename}`);
      
      try {
        await compressImage(imageFile.path, compressedImagePath, { width: 400, quality: 80 });
        imageUrl = `/uploads/images/${path.basename(compressedImagePath)}`;
      } catch (error) {
        console.error('图片压缩失败:', error);
        imageUrl = `/uploads/images/${imageFile.filename}`;
      }
    }

    // 处理照片集
    let photoUrls = [];
    if (req.files && req.files.photos) {
      for (const photo of req.files.photos) {
        const compressedPhotoPath = path.join(uploadDir, `compressed-${photo.filename}`);
        
        try {
          await compressImage(photo.path, compressedPhotoPath, { width: 800, quality: 85 });
          photoUrls.push(`/uploads/images/${path.basename(compressedPhotoPath)}`);
        } catch (error) {
          console.error('照片压缩失败:', error);
          photoUrls.push(`/uploads/images/${photo.filename}`);
        }
      }
    }

    // 创建员工记录
    const staff = new Staff({
      name,
      age: parseInt(age),
      job,
      image: imageUrl,
      province: province || '北京市',
      height: parseFloat(height) || 165,
      weight: parseFloat(weight) || 50,
      description: description || '',
      photos: photoUrls,
      tag: tag || '可预约',
      isActive: true
    });

    const savedStaff = await staff.save();
    console.log(`✅ 成功创建员工: ${savedStaff.name}`);

    res.status(201).json(savedStaff);
  } catch (error) {
    console.error('创建员工失败:', error);
    res.status(500).json({ message: '创建员工失败', error: error.message });
  }
});

/**
 * @route   PUT /api/staff/:id
 * @desc    更新员工信息
 * @access  Private (需要认证)
 */
router.put('/:id', authMiddleware, multiUpload, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: '无效的员工ID格式' });
    }

    const staff = await Staff.findById(req.params.id);
    
    if (!staff || !staff.isActive) {
      return res.status(404).json({ message: '员工不存在' });
    }

    const { name, age, job, province, height, weight, description, tag } = req.body;

    // 更新基本信息
    if (name) staff.name = name;
    if (age) staff.age = parseInt(age);
    if (job) staff.job = job;
    if (province) staff.province = province;
    if (height) staff.height = parseFloat(height);
    if (weight) staff.weight = parseFloat(weight);
    if (description !== undefined) staff.description = description;
    if (tag) staff.tag = tag;

    // 处理新的主头像
    if (req.files && req.files.image && req.files.image[0]) {
      const imageFile = req.files.image[0];
      const compressedImagePath = path.join(uploadDir, `compressed-${imageFile.filename}`);
      
      try {
        await compressImage(imageFile.path, compressedImagePath, { width: 400, quality: 80 });
        staff.image = `/uploads/images/${path.basename(compressedImagePath)}`;
      } catch (error) {
        console.error('图片压缩失败:', error);
        staff.image = `/uploads/images/${imageFile.filename}`;
      }
    }

    // 处理新的照片集
    if (req.files && req.files.photos) {
      let newPhotoUrls = [];
      for (const photo of req.files.photos) {
        const compressedPhotoPath = path.join(uploadDir, `compressed-${photo.filename}`);
        
        try {
          await compressImage(photo.path, compressedPhotoPath, { width: 800, quality: 85 });
          newPhotoUrls.push(`/uploads/images/${path.basename(compressedPhotoPath)}`);
        } catch (error) {
          console.error('照片压缩失败:', error);
          newPhotoUrls.push(`/uploads/images/${photo.filename}`);
        }
      }
      staff.photos = newPhotoUrls;
    }

    const updatedStaff = await staff.save();
    console.log(`✅ 成功更新员工: ${updatedStaff.name}`);

    res.json(updatedStaff);
  } catch (error) {
    console.error('更新员工失败:', error);
    res.status(500).json({ message: '更新员工失败', error: error.message });
  }
});

/**
 * @route   DELETE /api/staff/:id
 * @desc    删除员工（软删除）
 * @access  Private (需要认证)
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: '无效的员工ID格式' });
    }

    const staff = await Staff.findById(req.params.id);
    
    if (!staff || !staff.isActive) {
      return res.status(404).json({ message: '员工不存在' });
    }

    // 软删除：设置isActive为false
    staff.isActive = false;
    staff.deletedAt = new Date();
    
    await staff.save();
    console.log(`✅ 成功删除员工: ${staff.name}`);

    res.json({ message: '员工已删除', staff: staff });
  } catch (error) {
    console.error('删除员工失败:', error);
    res.status(500).json({ message: '删除员工失败', error: error.message });
  }
});

/**
 * @route   POST /api/staff/upload-image
 * @desc    上传员工图片
 * @access  Private (需要认证)
 */
router.post('/upload-image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的图片' });
    }

    const compressedImagePath = path.join(uploadDir, `compressed-${req.file.filename}`);
    
    try {
      await compressImage(req.file.path, compressedImagePath, { width: 400, quality: 80 });
      const imageUrl = `/uploads/images/${path.basename(compressedImagePath)}`;
      
      res.json({ 
        message: '图片上传成功',
        imageUrl: imageUrl
      });
    } catch (error) {
      console.error('图片压缩失败:', error);
      const imageUrl = `/uploads/images/${req.file.filename}`;
      
      res.json({ 
        message: '图片上传成功（未压缩）',
        imageUrl: imageUrl
      });
    }
  } catch (error) {
    console.error('图片上传失败:', error);
    res.status(500).json({ message: '图片上传失败', error: error.message });
  }
});

module.exports = router;