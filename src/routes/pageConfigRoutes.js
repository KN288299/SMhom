const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const { protectAdmin } = require('../middleware/adminMiddleware');

// 页面配置文件路径
const CONFIG_FILE_PATH = path.join(__dirname, '../config/pageConfig.json');

// 确保页面图片上传目录存在
const pageImagesUploadDir = path.join(__dirname, '../../uploads/page-images');
require('fs').existsSync(pageImagesUploadDir) || require('fs').mkdirSync(pageImagesUploadDir, { recursive: true });

// 配置页面图片文件存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, pageImagesUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'page-image-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB限制
});

// 默认页面配置
const DEFAULT_CONFIG = {
  centerButtonText: '御足堂',
  centerButtonColor: '#ff6b81',
  bannerImages: [],
  appName: '御足堂交友', // 保持兼容性
  homeTitle: '推荐' // 保持兼容性
};

// 确保配置文件存在
const ensureConfigFile = async () => {
  try {
    await fs.access(CONFIG_FILE_PATH);
  } catch (error) {
    // 文件不存在，创建默认配置
    const configDir = path.dirname(CONFIG_FILE_PATH);
    try {
      await fs.access(configDir);
    } catch {
      await fs.mkdir(configDir, { recursive: true });
    }
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log('📄 创建默认页面配置文件');
  }
};

// 获取页面配置
router.get('/', async (req, res) => {
  try {
    await ensureConfigFile();
    const configData = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
    const config = JSON.parse(configData);
    
    console.log('📄 [PageConfig] 获取页面配置:', config);
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('📄 [PageConfig] 获取页面配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取页面配置失败',
      error: error.message
    });
  }
});

// 更新页面配置
router.put('/', protectAdmin, async (req, res) => {
  try {
    const { centerButtonText, centerButtonColor, bannerImages, appName, homeTitle } = req.body;
    
    // 验证必填字段
    if (!centerButtonText || !centerButtonColor) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段'
      });
    }
    
    // 验证字段长度
    if (centerButtonText.length > 10) {
      return res.status(400).json({
        success: false,
        message: '按键文字不能超过10个字符'
      });
    }
    
    // 如果提供了appName和homeTitle，进行验证
    if (appName && appName.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'APP名称不能超过20个字符'
      });
    }
    
    if (homeTitle && homeTitle.length > 10) {
      return res.status(400).json({
        success: false,
        message: '首页标题不能超过10个字符'
      });
    }
    
    // 验证颜色格式
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!colorRegex.test(centerButtonColor)) {
      return res.status(400).json({
        success: false,
        message: '按键颜色格式不正确，请使用十六进制颜色代码'
      });
    }
    
    const newConfig = {
      centerButtonText,
      centerButtonColor,
      bannerImages: bannerImages || [],
      appName: appName || '御足堂交友', // 使用默认值
      homeTitle: homeTitle || '推荐', // 使用默认值
      updatedAt: new Date().toISOString()
    };
    
    await ensureConfigFile();
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(newConfig, null, 2));
    
    console.log('📄 [PageConfig] 更新页面配置成功:', newConfig);
    res.json({
      success: true,
      message: '页面配置更新成功',
      data: newConfig
    });
  } catch (error) {
    console.error('📄 [PageConfig] 更新页面配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新页面配置失败',
      error: error.message
    });
  }
});

// 上传页面图片
router.post('/upload-image', protectAdmin, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请提供图片文件'
      });
    }

    // 构建访问URL
    const imageUrl = `/uploads/page-images/${req.file.filename}`;

    console.log('📄 [PageConfig] 上传页面图片成功:', imageUrl);
    res.status(201).json({ 
      success: true,
      message: '图片上传成功',
      imageUrl
    });
  } catch (error) {
    console.error('📄 [PageConfig] 上传页面图片失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 删除页面图片
router.delete('/delete-image', protectAdmin, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: '请提供图片URL'
      });
    }

    // 提取文件名
    const fileName = path.basename(imageUrl);
    const filePath = path.join(pageImagesUploadDir, fileName);

    try {
      // 检查文件是否存在
      await fs.access(filePath);
      // 删除文件
      await fs.unlink(filePath);
      console.log('📄 [PageConfig] 删除页面图片成功:', fileName);
    } catch (fileError) {
      console.log('📄 [PageConfig] 文件不存在或已删除:', fileName);
    }

    res.json({
      success: true,
      message: '图片删除成功'
    });
  } catch (error) {
    console.error('📄 [PageConfig] 删除页面图片失败:', error);
    res.status(500).json({
      success: false,
      message: '删除图片失败',
      error: error.message
    });
  }
});

module.exports = router; 