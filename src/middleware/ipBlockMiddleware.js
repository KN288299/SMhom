const rateLimit = require('express-rate-limit');

// 存储IP失败次数的内存缓存（生产环境建议使用Redis）
const failedAttempts = new Map();
const blockedIPs = new Map();

// 获取客户端真实IP
const getClientIP = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         '127.0.0.1';
};

// 检查IP是否被封锁
const checkIPBlocked = (req, res, next) => {
  const clientIP = getClientIP(req);
  const blockInfo = blockedIPs.get(clientIP);
  
  if (blockInfo) {
    const now = Date.now();
    if (now < blockInfo.unblockTime) {
      const remainingTime = Math.ceil((blockInfo.unblockTime - now) / 1000 / 60); // 分钟
      console.log(`IP ${clientIP} 被封锁，剩余时间: ${remainingTime}分钟`);
      return res.status(429).json({
        message: `IP地址已被封锁，请在${remainingTime}分钟后再试`,
        blockedUntil: new Date(blockInfo.unblockTime).toISOString(),
        remainingMinutes: remainingTime
      });
    } else {
      // 解除封锁
      blockedIPs.delete(clientIP);
      failedAttempts.delete(clientIP);
      console.log(`IP ${clientIP} 封锁时间已到，自动解除封锁`);
    }
  }
  
  next();
};

// 记录登录失败
const recordLoginFailure = (req) => {
  const clientIP = getClientIP(req);
  const now = Date.now();
  
  // 获取当前失败记录
  let attempts = failedAttempts.get(clientIP) || { count: 0, firstAttempt: now };
  
  // 如果距离第一次失败超过1小时，重置计数
  if (now - attempts.firstAttempt > 60 * 60 * 1000) {
    attempts = { count: 0, firstAttempt: now };
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  failedAttempts.set(clientIP, attempts);
  
  console.log(`IP ${clientIP} 登录失败，当前失败次数: ${attempts.count}`);
  
  // 如果失败次数达到3次，封锁IP 30分钟
  if (attempts.count >= 3) {
    const unblockTime = now + 30 * 60 * 1000; // 30分钟后解除封锁
    blockedIPs.set(clientIP, {
      blockedAt: now,
      unblockTime: unblockTime,
      attempts: attempts.count
    });
    
    console.log(`IP ${clientIP} 已被封锁30分钟，解封时间: ${new Date(unblockTime).toLocaleString()}`);
    
    return {
      isBlocked: true,
      remainingMinutes: 30,
      message: 'IP地址已被封锁30分钟，请稍后再试'
    };
  }
  
  return {
    isBlocked: false,
    remainingAttempts: 3 - attempts.count,
    message: `密码错误，还有${3 - attempts.count}次尝试机会`
  };
};

// 记录登录成功（清除失败记录）
const recordLoginSuccess = (req) => {
  const clientIP = getClientIP(req);
  failedAttempts.delete(clientIP);
  console.log(`IP ${clientIP} 登录成功，清除失败记录`);
};

// 通用的速率限制（防止暴力攻击）
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟窗口
  max: 100, // 每个IP最多100次请求
  message: {
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 登录接口的特殊速率限制
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟窗口
  max: 10, // 每个IP最多10次登录尝试
  message: {
    message: '登录尝试过于频繁，请15分钟后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 清理过期的封锁记录
const cleanExpiredBlocks = () => {
  const now = Date.now();
  
  // 清理过期的封锁IP
  for (const [ip, blockInfo] of blockedIPs.entries()) {
    if (now > blockInfo.unblockTime) {
      blockedIPs.delete(ip);
      failedAttempts.delete(ip);
      console.log(`自动清理过期封锁IP: ${ip}`);
    }
  }
  
  // 清理过期的失败记录（超过1小时的）
  for (const [ip, attempts] of failedAttempts.entries()) {
    if (now - attempts.firstAttempt > 60 * 60 * 1000) {
      failedAttempts.delete(ip);
      console.log(`自动清理过期失败记录: ${ip}`);
    }
  }
};

// 定期清理过期记录（每10分钟）
setInterval(cleanExpiredBlocks, 10 * 60 * 1000);

// 获取IP状态信息（用于调试）
const getIPStatus = (req) => {
  const clientIP = getClientIP(req);
  const attempts = failedAttempts.get(clientIP);
  const blockInfo = blockedIPs.get(clientIP);
  
  return {
    ip: clientIP,
    failedAttempts: attempts?.count || 0,
    isBlocked: !!blockInfo,
    blockInfo: blockInfo ? {
      blockedAt: new Date(blockInfo.blockedAt).toLocaleString(),
      unblockTime: new Date(blockInfo.unblockTime).toLocaleString(),
      remainingMinutes: Math.ceil((blockInfo.unblockTime - Date.now()) / 1000 / 60)
    } : null
  };
};

module.exports = {
  checkIPBlocked,
  recordLoginFailure,
  recordLoginSuccess,
  generalRateLimit,
  loginRateLimit,
  getIPStatus,
  getClientIP
}; 