const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
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

/**
 * @route   GET /api/staff/export
 * @desc    导出所有员工数据（包含图片）
 * @access  Public
 */
router.get('/export', async (req, res) => {
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
 * @desc    导入员工数据（无限制大小）
 * @access  Public
 */
router.post('/import', importUpload.single('file'), async (req, res) => {
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
        
        // 首先尝试从JSON数据中获取图片URL
        if (staffInfo.image) {
          // 如果JSON中包含图片URL，使用该URL
          if (staffInfo.image.startsWith('http') || staffInfo.image.startsWith('/uploads/')) {
            imageUrl = staffInfo.image;
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
            } catch (error) {
              console.warn(`⚠️ 处理base64图片失败，员工: ${staffInfo.name}`, error.message);
              imageUrl = 'https://via.placeholder.com/150';
            }
          }
        }
        
        // 处理照片集（从JSON数据）
        if (staffInfo.photos && Array.isArray(staffInfo.photos)) {
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
          const staffImageDir = path.join(tempImageDir, 'images', i.toString());
          
          // 处理主头像（ZIP优先级更高，会覆盖JSON中的图片）
          const avatarFiles = ['avatar.jpg', 'avatar.png', 'avatar.jpeg'];
          for (const avatarFile of avatarFiles) {
            const avatarPath = path.join(staffImageDir, avatarFile);
            if (fs.existsSync(avatarPath)) {
              // 复制到正式目录
              const newFileName = `employee-imported-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(avatarFile)}`;
              const targetPath = path.join(__dirname, '../../uploads/employees', newFileName);
              fs.copyFileSync(avatarPath, targetPath);
              imageUrl = `/uploads/employees/${newFileName}`;
              break;
            }
          }
          
          // 处理照片集（ZIP中的照片会追加到JSON照片之后）
          if (fs.existsSync(staffImageDir)) {
            const photoFiles = fs.readdirSync(staffImageDir)
              .filter(file => file.startsWith('photo-'))
              .sort();
            
            photoFiles.forEach(photoFile => {
              const photoPath = path.join(staffImageDir, photoFile);
              const newFileName = `employee-imported-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(photoFile)}`;
              const targetPath = path.join(__dirname, '../../uploads/employees', newFileName);
              fs.copyFileSync(photoPath, targetPath);
              photoUrls.push(`/uploads/employees/${newFileName}`);
            });
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
        console.log(`✅ 成功导入员工: ${staffInfo.name}`);
        
      } catch (error) {
        importResults.failed++;
        importResults.errors.push(`第${i+1}条记录导入失败: ${error.message}`);
        console.error(`❌ 导入员工失败:`, error);
      }
    }

    // 清理临时文件
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    const tempImageDir = path.join(__dirname, '../../temp-import-images');
    if (fs.existsSync(tempImageDir)) {
      fs.rmSync(tempImageDir, { recursive: true, force: true });
    }

    console.log('📊 导入完成:', importResults);
    
    res.json({
      message: '员工数据导入完成',
      results: importResults
    });
    
  } catch (error) {
    console.error('❌ 导入员工数据失败:', error);
    res.status(500).json({ message: '导入失败', error: error.message });
  }
});

module.exports = router; 