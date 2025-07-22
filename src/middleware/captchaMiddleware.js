const svgCaptcha = require('svg-captcha');

// 存储验证码的内存缓存（生产环境建议使用Redis）
const captchaStore = new Map();

// 生成验证码
const generateCaptcha = (req, res) => {
  try {
    // 生成验证码
    const captcha = svgCaptcha.create({
      size: 4, // 验证码长度
      ignoreChars: '0o1il', // 忽略容易混淆的字符
      noise: 2, // 干扰线条数
      color: true, // 彩色
      background: '#f0f0f0', // 背景色
      width: 120,
      height: 40,
      fontSize: 50
    });

    // 生成会话ID
    const sessionId = 'captcha_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // 存储验证码（5分钟过期）
    captchaStore.set(sessionId, {
      text: captcha.text.toLowerCase(),
      expires: Date.now() + 5 * 60 * 1000 // 5分钟
    });

    // 清理过期的验证码
    cleanExpiredCaptchas();

    res.json({
      sessionId,
      captchaSvg: captcha.data
    });
  } catch (error) {
    console.error('生成验证码失败:', error);
    res.status(500).json({ message: '生成验证码失败' });
  }
};

// 验证验证码
const verifyCaptcha = (sessionId, userInput) => {
  if (!sessionId || !userInput) {
    return false;
  }

  const captchaData = captchaStore.get(sessionId);
  if (!captchaData) {
    return false;
  }

  // 检查是否过期
  if (Date.now() > captchaData.expires) {
    captchaStore.delete(sessionId);
    return false;
  }

  // 验证验证码（不区分大小写）
  const isValid = captchaData.text === userInput.toLowerCase();
  
  // 验证后删除验证码（一次性使用）
  captchaStore.delete(sessionId);
  
  return isValid;
};

// 清理过期的验证码
const cleanExpiredCaptchas = () => {
  const now = Date.now();
  for (const [sessionId, data] of captchaStore.entries()) {
    if (now > data.expires) {
      captchaStore.delete(sessionId);
    }
  }
};

// 定期清理过期验证码（每10分钟）
setInterval(cleanExpiredCaptchas, 10 * 60 * 1000);

module.exports = {
  generateCaptcha,
  verifyCaptcha
}; 