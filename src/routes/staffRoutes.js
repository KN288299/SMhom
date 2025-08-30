const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const sharp = require('sharp');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
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

// 初始化multer - 用于员工图片上传
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

// 数据导入专用multer配置（无文件大小限制）
const importUpload = multer({
  dest: 'uploads/temp/',
  // 移除文件大小限制，支持大型员工数据导入
  fileFilter: (req, file, cb) => {
    // 只允许JSON和ZIP文件
    const allowedTypes = [
      'application/json',
      'application/zip', 
      'application/x-zip-compressed',
      'text/json'
    ];
    const allowedExtensions = ['.json', '.zip'];
    
    const isAllowedType = allowedTypes.includes(file.mimetype);
    const isAllowedExt = allowedExtensions.some(ext => 
      file.originalname.toLowerCase().endsWith(ext)
    );
    
    if (isAllowedType || isAllowedExt) {
      cb(null, true);
    } else {
      cb(new Error('只支持JSON或ZIP格式的文件！'), false);
    }
  }
});

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

// 注意：具体路由必须放在通用路由 /:id 之前

/**
 * @route   POST /api/staff/upload-image
 * @desc    上传员工图片
 * @access  Admin
 */
router.post('/upload-image', protect, admin, upload.single('image'), (req, res) => {
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
router.post('/', protect, admin, multiUpload, async (req, res) => {
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
router.put('/:id', protect, admin, multiUpload, async (req, res) => {
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
router.delete('/:id', protect, admin, async (req, res) => {
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

/**
 * @route   POST /api/staff/batch-delete
 * @desc    批量删除当前页面的员工
 * @access  Public
 */
router.post('/batch-delete', protect, admin, async (req, res) => {
  try {
    const { batchSize = 10, confirmDelete = false, filters = {} } = req.body;
    
    console.log(`🗑️ 开始批量删除当前页面员工，批次大小: ${batchSize}, 筛选条件:`, filters);
    
    if (!confirmDelete) {
      return res.status(400).json({ 
        message: '请确认删除操作',
        requireConfirm: true 
      });
    }
    
    // 构建查询条件
    const query = { isActive: true };
    
    // 应用筛选条件
    if (filters.search && filters.search.trim()) {
      const searchRegex = new RegExp(filters.search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { job: searchRegex },
        { description: searchRegex }
      ];
    }
    
    if (filters.province && filters.province.trim()) {
      query.province = filters.province.trim();
    }
    
    console.log('🔍 查询条件:', query);
    
    // 获取当前筛选条件下的员工（按ID排序，确保顺序一致）
    const staffToDelete = await Staff.find(query)
      .sort({ _id: 1 })  // 按ID排序，确保每次结果一致
      .limit(parseInt(batchSize));
    
    if (staffToDelete.length === 0) {
      return res.status(404).json({ 
        message: '没有找到符合条件的可删除员工',
        deletedCount: 0
      });
    }
    
    console.log(`📋 找到 ${staffToDelete.length} 名符合条件的员工准备删除`);
    
    // 提取员工ID和基本信息
    const staffIds = staffToDelete.map(staff => staff._id);
    const staffNames = staffToDelete.map(staff => staff.name);
    
    // 批量软删除（设置 isActive = false）
    const result = await Staff.updateMany(
      { _id: { $in: staffIds } },
      { 
        $set: { 
          isActive: false,
          deletedAt: new Date(),
          deletedReason: '批量删除操作（当前页面）'
        }
      }
    );
    
    console.log(`✅ 批量删除完成，影响 ${result.modifiedCount} 名员工`);
    
    // 获取剩余员工数量（总数和筛选后数量）
    const totalRemainingCount = await Staff.countDocuments({ isActive: true });
    const filteredRemainingCount = await Staff.countDocuments(query);
    
    res.json({
      message: `成功删除 ${result.modifiedCount} 名员工`,
      deletedCount: result.modifiedCount,
      deletedStaff: staffNames,
      remainingCount: totalRemainingCount,
      filteredRemainingCount: filteredRemainingCount,
      nextBatchAvailable: filteredRemainingCount > 0,
      appliedFilters: filters
    });
    
  } catch (error) {
    console.error('❌ 批量删除员工出错:', error);
    res.status(500).json({ 
      message: '批量删除失败', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/staff/delete-preview
 * @desc    预览当前页面将要删除的员工（不执行删除）
 * @access  Admin only
 */
router.get('/delete-preview', protect, admin, async (req, res) => {
  try {
    const { batchSize = 10, search = '', province = '' } = req.query;
    
    console.log('🔍 获取删除预览，参数:', { batchSize, search, province });
    
    // 构建查询条件
    const query = { isActive: true };
    
    // 应用筛选条件
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { job: searchRegex },
        { description: searchRegex }
      ];
    }
    
    if (province && province.trim()) {
      query.province = province.trim();
    }
    
    console.log('🔍 预览查询条件:', query);
    
    // 获取当前筛选条件下的员工预览
    const staffToDelete = await Staff.find(query)
      .sort({ _id: 1 })  // 按ID排序，确保与删除操作一致
      .limit(parseInt(batchSize))
      .select('name job age province createdAt');
    
    const totalActiveCount = await Staff.countDocuments({ isActive: true });
    const filteredActiveCount = await Staff.countDocuments(query);
    
    res.json({
      previewList: staffToDelete,
      batchSize: parseInt(batchSize),
      totalActive: totalActiveCount,
      filteredActive: filteredActiveCount,
      canDelete: staffToDelete.length > 0,
      appliedFilters: {
        search: search || '',
        province: province || ''
      }
    });
    
  } catch (error) {
    console.error('❌ 获取删除预览出错:', error);
    res.status(500).json({ 
      message: '获取删除预览失败', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/staff/export
 * @desc    导出所有员工数据（包含图片）
 * @access  Admin only
 */
router.get('/export', protect, admin, async (req, res) => {
  try {
    console.log('📦 开始导出员工数据...');
    
    // 检查必要的模块
    if (!archiver) {
      console.error('❌ archiver模块未正确加载');
      return res.status(500).json({ message: 'archiver模块未正确加载' });
    }
    
    // 获取所有活跃员工
    const staffMembers = await Staff.find({ isActive: true }).sort({ createdAt: -1 });
    console.log(`📋 找到 ${staffMembers.length} 名员工`);

    if (staffMembers.length === 0) {
      console.log('⚠️ 没有找到员工数据');
      return res.status(404).json({ message: '没有找到员工数据' });
    }

    console.log('📦 开始创建ZIP归档...');
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    // 添加错误处理
    archive.on('error', (err) => {
      console.error('📦 归档错误:', err);
      throw err;
    });
    
    archive.on('warning', (err) => {
      console.warn('📦 归档警告:', err);
    });
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=staff-export-${Date.now()}.zip`);
    
    // 将archive流连接到响应
    archive.pipe(res);

    // 准备员工数据JSON
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      totalCount: staffMembers.length,
      staff: staffMembers.map(staff => ({
        name: staff.name,
        age: staff.age,
        job: staff.job,
        province: staff.province,
        height: staff.height,
        weight: staff.weight,
        description: staff.description,
        tag: staff.tag,
        image: staff.image,
        photos: staff.photos || [],
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt
      }))
    };

    // 添加JSON数据文件
    archive.append(JSON.stringify(exportData, null, 2), { name: 'staff-data.json' });

    // 创建images目录并添加图片文件
    for (let i = 0; i < staffMembers.length; i++) {
      const staff = staffMembers[i];
      const staffId = staff._id.toString();
      
      // 处理主头像
      if (staff.image && !staff.image.startsWith('http')) {
        const imagePath = path.join(__dirname, '../../uploads/employees', path.basename(staff.image));
        if (fs.existsSync(imagePath)) {
          archive.file(imagePath, { name: `images/${staffId}/avatar${path.extname(staff.image)}` });
        }
      }
      
      // 处理照片集
      if (staff.photos && staff.photos.length > 0) {
        staff.photos.forEach((photo, index) => {
          if (!photo.startsWith('http')) {
            const photoPath = path.join(__dirname, '../../uploads/employees', path.basename(photo));
            if (fs.existsSync(photoPath)) {
              archive.file(photoPath, { name: `images/${staffId}/photo-${index}${path.extname(photo)}` });
            }
          }
        });
      }
    }

    // 完成归档
    await archive.finalize();
    console.log('✅ 员工数据导出完成');
    
  } catch (error) {
    console.error('❌ 导出员工数据失败:', error);
    console.error('❌ 错误详情:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // 确保响应没有被发送过
    if (!res.headersSent) {
      res.status(500).json({ 
        message: '导出失败', 
        error: error.message,
        details: error.name
      });
    }
  }
});

/**
 * @route   POST /api/staff/import
 * @desc    导入员工数据
 * @access  Public
 */
router.post('/import', protect, admin, importUpload.single('file'), async (req, res) => {
  try {
    console.log('📥 开始导入员工数据...');
    
    if (!req.file) {
      return res.status(400).json({ message: '请提供导入文件' });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    let staffData = [];
    let importResults = {
      total: 0,
      success: 0,
      failed: 0,
      errors: []
    };

    if (fileExt === '.json') {
      // 处理JSON文件
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(fileContent);
      staffData = jsonData.staff || [jsonData]; // 支持单个对象或数组
      
    } else if (fileExt === '.zip') {
      // 处理ZIP文件
      const zip = new AdmZip(filePath);
      const zipEntries = zip.getEntries();
      
      // 查找JSON数据文件
      const dataEntry = zipEntries.find(entry => entry.entryName === 'staff-data.json');
      if (!dataEntry) {
        return res.status(400).json({ message: 'ZIP文件中未找到staff-data.json数据文件' });
      }
      
      const jsonContent = dataEntry.getData().toString('utf8');
      const jsonData = JSON.parse(jsonContent);
      staffData = jsonData.staff || [];
      
      // 提取图片文件
      const imageEntries = zipEntries.filter(entry => entry.entryName.startsWith('images/'));
      const tempImageDir = path.join(__dirname, '../../temp-import-images');
      
      if (!fs.existsSync(tempImageDir)) {
        fs.mkdirSync(tempImageDir, { recursive: true });
      }
      
      // 提取所有图片到临时目录
      imageEntries.forEach(entry => {
        const imagePath = path.join(tempImageDir, entry.entryName);
        const imageDir = path.dirname(imagePath);
        
        if (!fs.existsSync(imageDir)) {
          fs.mkdirSync(imageDir, { recursive: true });
        }
        
        fs.writeFileSync(imagePath, entry.getData());
      });
      
    } else {
      return res.status(400).json({ message: '不支持的文件格式，请使用JSON或ZIP文件' });
    }

    importResults.total = staffData.length;
    console.log(`📊 准备导入 ${staffData.length} 名员工`);

    // 批量导入员工数据
    for (let i = 0; i < staffData.length; i++) {
      try {
        const staffInfo = staffData[i];
        
        // 验证必填字段
        if (!staffInfo.name || !staffInfo.age || !staffInfo.job) {
          importResults.failed++;
          importResults.errors.push(`第${i+1}条记录：缺少必填字段（姓名、年龄、职业）`);
          continue;
        }

        // 检查是否已存在同名员工
        const existingStaff = await Staff.findOne({ 
          name: staffInfo.name, 
          isActive: true 
        });
        
        if (existingStaff) {
          importResults.failed++;
          importResults.errors.push(`第${i+1}条记录：员工"${staffInfo.name}"已存在`);
          continue;
        }

        // 处理图片文件
        let imageUrl = 'https://via.placeholder.com/150';
        let photoUrls = [];
        
        // 🔧 修复：对于ZIP文件，优先处理ZIP中的图片；对于JSON文件，使用JSON中的图片
        let hasImageFromJson = false;
        
        // 如果是JSON文件导入，首先尝试从JSON数据中获取图片URL
        if (fileExt === '.json' && staffInfo.image) {
          // 如果JSON中包含图片URL，使用该URL
          if (staffInfo.image.startsWith('http') || staffInfo.image.startsWith('/uploads/')) {
            imageUrl = staffInfo.image;
            hasImageFromJson = true;
            console.log(`✅ 使用JSON中的图片: ${staffInfo.image}`);
          } else if (staffInfo.image.startsWith('data:image/')) {
            // 处理base64图片数据
            try {
              const base64Data = staffInfo.image.replace(/^data:image\/\w+;base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');
              const ext = staffInfo.image.match(/data:image\/(\w+);base64,/)?.[1] || 'jpg';
              const newFileName = `employee-imported-${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;
              const targetPath = path.join(__dirname, '../../uploads/employees', newFileName);
              fs.writeFileSync(targetPath, buffer);
              imageUrl = `/uploads/employees/${newFileName}`;
              hasImageFromJson = true;
              console.log(`✅ 处理JSON中的base64图片: ${newFileName}`);
            } catch (error) {
              console.warn(`⚠️ 处理base64图片失败，员工: ${staffInfo.name}`, error.message);
              // 不设置默认占位图，让后续逻辑处理
            }
          }
        }
        
        // 处理照片集（从JSON数据）
        if (fileExt === '.json' && staffInfo.photos && Array.isArray(staffInfo.photos)) {
          staffInfo.photos.forEach((photo, photoIndex) => {
            if (photo.startsWith('http') || photo.startsWith('/uploads/')) {
              photoUrls.push(photo);
            } else if (photo.startsWith('data:image/')) {
              // 处理base64图片数据
              try {
                const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                const ext = photo.match(/data:image\/(\w+);base64,/)?.[1] || 'jpg';
                const newFileName = `employee-photo-${Date.now()}-${photoIndex}-${Math.round(Math.random() * 1E9)}.${ext}`;
                const targetPath = path.join(__dirname, '../../uploads/employees', newFileName);
                fs.writeFileSync(targetPath, buffer);
                photoUrls.push(`/uploads/employees/${newFileName}`);
              } catch (error) {
                console.warn(`⚠️ 处理照片base64数据失败，员工: ${staffInfo.name}, 照片: ${photoIndex}`, error.message);
              }
            }
          });
        }
        
        // 如果是ZIP文件，还需要处理ZIP中的图片文件
        if (fileExt === '.zip') {
          const tempImageDir = path.join(__dirname, '../../temp-import-images');
          
          // 🔧 智能图片目录匹配策略
          let staffImageDir = null;
          let foundImageDir = false;
          let matchStrategy = '';
          
          // 策略1: 使用原始staffId（如果存在）
          const originalStaffId = staffInfo._id || staffInfo.id;
          if (originalStaffId) {
            const idImageDir = path.join(tempImageDir, 'images', originalStaffId.toString());
            if (fs.existsSync(idImageDir)) {
              staffImageDir = idImageDir;
              foundImageDir = true;
              matchStrategy = `原始ID: ${originalStaffId}`;
              console.log(`✅ 找到图片目录（按原ID）: ${originalStaffId}`);
            }
          }
          
          // 策略2: 如果按ID找不到，遍历所有图片目录尝试匹配
          if (!foundImageDir) {
            const imagesBaseDir = path.join(tempImageDir, 'images');
            if (fs.existsSync(imagesBaseDir)) {
              const allImageDirs = fs.readdirSync(imagesBaseDir).filter(item => {
                const fullPath = path.join(imagesBaseDir, item);
                return fs.statSync(fullPath).isDirectory();
              });
              
              console.log(`🔍 尝试匹配图片目录，共找到 ${allImageDirs.length} 个目录: [${allImageDirs.join(', ')}]`);
              
              // 策略2a: 按索引匹配（假设员工顺序一致）
              if (allImageDirs[i]) {
                staffImageDir = path.join(imagesBaseDir, allImageDirs[i]);
                foundImageDir = true;
                matchStrategy = `索引匹配: ${i} -> ${allImageDirs[i]}`;
                console.log(`✅ 找到图片目录（按索引${i}）: ${allImageDirs[i]}`);
              }
              
              // 策略2b: 如果还没找到，使用第一个可用目录
              if (!foundImageDir && allImageDirs.length > 0) {
                for (const dirName of allImageDirs) {
                  const potentialDir = path.join(imagesBaseDir, dirName);
                  try {
                    const dirFiles = fs.readdirSync(potentialDir);
                    
                    // 检查是否包含头像文件
                    const hasAvatar = dirFiles.some(file => 
                      file === 'avatar.jpg' || file === 'avatar.png' || file === 'avatar.jpeg'
                    );
                    
                    if (hasAvatar) {
                      staffImageDir = potentialDir;
                      foundImageDir = true;
                      matchStrategy = `可用目录: ${dirName}`;
                      console.log(`⚠️ 使用可用图片目录: ${dirName}`);
                      break;
                    }
                  } catch (err) {
                    console.error(`❌ 读取目录失败 ${dirName}:`, err.message);
                  }
                }
              }
            }
          }
          
          // 处理主头像（ZIP文件中的图片优先级最高）
          if (foundImageDir && staffImageDir) {
            const avatarFiles = ['avatar.jpg', 'avatar.png', 'avatar.jpeg'];
            let foundAvatar = false;
            
            for (const avatarFile of avatarFiles) {
              const avatarPath = path.join(staffImageDir, avatarFile);
              if (fs.existsSync(avatarPath)) {
                try {
                  // 复制到正式目录
                  const newFileName = `employee-imported-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(avatarFile)}`;
                  const targetPath = path.join(__dirname, '../../uploads/employees', newFileName);
                  fs.copyFileSync(avatarPath, targetPath);
                  imageUrl = `/uploads/employees/${newFileName}`;
                  foundAvatar = true;
                  console.log(`✅ 成功导入头像 [${matchStrategy}]: ${avatarFile} -> ${newFileName}`);
                  break;
                } catch (copyError) {
                  console.error(`❌ 复制头像失败 ${avatarFile}:`, copyError.message);
                }
              }
            }
            
            if (!foundAvatar) {
              console.log(`⚠️ 员工 ${staffInfo.name} 的图片目录中未找到头像文件 [${matchStrategy}]`);
            }
          } else {
            console.log(`⚠️ 员工 ${staffInfo.name} 未找到对应的图片目录`);
          }
          
          // 处理照片集（使用已匹配的图片目录）
          if (foundImageDir && staffImageDir) {
            try {
              const photoFiles = fs.readdirSync(staffImageDir)
                .filter(file => file.startsWith('photo-') && 
                  (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg')))
                .sort();
              
              // 🔧 修复：ZIP文件中的照片优先级最高
              if (photoFiles.length > 0) {
                let photoCount = 0;
                for (const photoFile of photoFiles) {
                  try {
                    const photoPath = path.join(staffImageDir, photoFile);
                    const newFileName = `employee-imported-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(photoFile)}`;
                    const targetPath = path.join(__dirname, '../../uploads/employees', newFileName);
                    fs.copyFileSync(photoPath, targetPath);
                    photoUrls.push(`/uploads/employees/${newFileName}`);
                    photoCount++;
                    console.log(`✅ 成功导入照片 [${matchStrategy}]: ${photoFile} -> ${newFileName}`);
                    
                    // 稍微延迟，确保文件名时间戳不重复
                    await new Promise(resolve => setTimeout(resolve, 2));
                  } catch (copyError) {
                    console.error(`❌ 复制照片失败 ${photoFile}:`, copyError.message);
                  }
                }
                
                if (photoCount > 0) {
                  console.log(`✅ 员工 ${staffInfo.name} 共导入 ${photoCount} 张照片 [${matchStrategy}]`);
                }
              } else {
                console.log(`ℹ️ 员工 ${staffInfo.name} 的图片目录中未找到照片文件 [${matchStrategy}]`);
              }
            } catch (err) {
              console.error(`❌ 处理照片目录失败:`, err.message);
            }
          }
          

        }

        // 创建新员工记录
        const newStaff = new Staff({
          name: staffInfo.name,
          age: parseInt(staffInfo.age),
          job: staffInfo.job,
          image: imageUrl,
          province: staffInfo.province || '北京市',
          height: parseFloat(staffInfo.height) || 165,
          weight: parseFloat(staffInfo.weight) || 50,
          description: staffInfo.description || '',
          photos: photoUrls,
          tag: staffInfo.tag || '可预约'
        });

        await newStaff.save();
        importResults.success++;
        
        // 详细的导入成功日志
        let importLog = `✅ 成功导入员工: ${staffInfo.name}`;
        if (imageUrl) {
          importLog += ` (头像: ${imageUrl.split('/').pop()})`;
        }
        if (photoUrls.length > 0) {
          importLog += ` (照片: ${photoUrls.length}张)`;
        }
        console.log(importLog);
        
      } catch (error) {
        importResults.failed++;
        importResults.errors.push(`第${i+1}条记录导入失败: ${error.message}`);
        console.error(`❌ 导入员工失败:`, error);
      }
    }

    // 清理临时文件
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🧹 已清理上传文件');
      }
      
      const tempImageDir = path.join(__dirname, '../../temp-import-images');
      if (fs.existsSync(tempImageDir)) {
        fs.rmSync(tempImageDir, { recursive: true, force: true });
        console.log('🧹 已清理临时图片目录');
      }
    } catch (cleanupError) {
      console.warn('⚠️ 清理临时文件时出现警告:', cleanupError.message);
    }

    // 导入结果总结
    console.log('\n📊 ========== 导入完成 ==========');
    console.log(`✅ 成功导入: ${importResults.success} 个员工`);
    console.log(`❌ 导入失败: ${importResults.failed} 个员工`);
    console.log(`📝 处理总数: ${importResults.total} 条记录`);
    
    if (importResults.errors.length > 0) {
      console.log('\n❌ 错误详情:');
      importResults.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    console.log('===============================\n');
    
    res.json({
      message: `员工数据导入完成 - 成功: ${importResults.success}个，失败: ${importResults.failed}个`,
      results: importResults
    });
    
  } catch (error) {
    console.error('❌ 导入员工数据失败:', error);
    res.status(500).json({ message: '导入失败', error: error.message });
  }
});

/**
 * @route   GET /api/staff/:id
 * @desc    获取单个员工详细信息
 * @access  Public
 * 注意：此路由必须放在最后，因为它会匹配所有 /api/staff/{任何字符串} 的请求
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

module.exports = router; 