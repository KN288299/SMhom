const express = require('express');

// 测试加载 staffRoutes
try {
  console.log('🔍 测试加载 staffRoutes...');
  
  const staffRoutes = require('./src/routes/staffRoutes');
  
  if (staffRoutes) {
    console.log('✅ staffRoutes 加载成功');
    console.log('类型:', typeof staffRoutes);
    console.log('是否是Express Router:', staffRoutes.constructor && staffRoutes.constructor.name);
  } else {
    console.log('❌ staffRoutes 加载失败 - 返回值为空');
  }
  
} catch (error) {
  console.error('❌ staffRoutes 加载失败:');
  console.error('错误类型:', error.constructor.name);
  console.error('错误消息:', error.message);
  console.error('错误堆栈:', error.stack);
}

console.log('\n🔍 测试中间件导入...');
try {
  const { protect, admin } = require('./src/middleware/authMiddleware');
  
  if (protect && admin) {
    console.log('✅ authMiddleware 导入成功');
    console.log('protect 类型:', typeof protect);
    console.log('admin 类型:', typeof admin);
  } else {
    console.log('❌ authMiddleware 导入失败');
  }
} catch (error) {
  console.error('❌ authMiddleware 导入失败:', error.message);
}
