// 测试导入导出按钮是否存在
console.log('🔍 检查导入导出按钮...');

// 检查必要的图标是否导入
try {
  const { DownloadOutlined, ImportOutlined } = require('./admin/node_modules/@ant-design/icons');
  console.log('✅ 图标导入成功');
  console.log('DownloadOutlined:', typeof DownloadOutlined);
  console.log('ImportOutlined:', typeof ImportOutlined);
} catch (error) {
  console.error('❌ 图标导入失败:', error.message);
}

// 检查API方法是否存在
try {
  const { staffAPI } = require('./admin/src/api/api');
  console.log('✅ staffAPI 导入成功');
  console.log('exportAllStaff:', typeof staffAPI.exportAllStaff);
  console.log('importStaff:', typeof staffAPI.importStaff);
} catch (error) {
  console.error('❌ staffAPI 导入失败:', error.message);
}

// 检查路由是否存在
try {
  const fs = require('fs');
  const path = require('path');
  
  const staffRoutesPath = path.join(__dirname, 'src/routes/staffRoutes.js');
  const staffRoutesContent = fs.readFileSync(staffRoutesPath, 'utf8');
  
  if (staffRoutesContent.includes('/export')) {
    console.log('✅ 导出路由存在');
  } else {
    console.log('❌ 导出路由不存在');
  }
  
  if (staffRoutesContent.includes('/import')) {
    console.log('✅ 导入路由存在');
  } else {
    console.log('❌ 导入路由不存在');
  }
} catch (error) {
  console.error('❌ 检查路由失败:', error.message);
}

// 检查React组件文件是否存在
try {
  const fs = require('fs');
  const path = require('path');
  
  // 尝试多个可能的路径
  const possiblePaths = [
    path.join(__dirname, 'admin/src/pages/StaffManagement.tsx'),
    path.join(__dirname, 'src/pages/StaffManagement.tsx'),
    path.join(__dirname, 'StaffManagement.tsx')
  ];
  
  let staffManagementPath = null;
  let staffManagementContent = null;
  
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      staffManagementPath = testPath;
      staffManagementContent = fs.readFileSync(testPath, 'utf8');
      console.log('✅ 找到StaffManagement.tsx文件:', testPath);
      break;
    }
  }
  
  if (!staffManagementContent) {
    console.log('❌ 未找到StaffManagement.tsx文件');
    console.log('尝试的路径:', possiblePaths);
    return;
  }
  
  // 检查文件内容
  console.log('📄 文件大小:', staffManagementContent.length, '字符');
  console.log('📄 文件前100字符:', staffManagementContent.substring(0, 100));
  
  if (staffManagementContent.includes('DownloadOutlined')) {
    console.log('✅ StaffManagement.tsx 包含 DownloadOutlined 图标');
  } else {
    console.log('❌ StaffManagement.tsx 不包含 DownloadOutlined 图标');
  }
  
  if (staffManagementContent.includes('ImportOutlined')) {
    console.log('✅ StaffManagement.tsx 包含 ImportOutlined 图标');
  } else {
    console.log('❌ StaffManagement.tsx 不包含 ImportOutlined 图标');
  }
  
  if (staffManagementContent.includes('导出数据')) {
    console.log('✅ StaffManagement.tsx 包含导出按钮文本');
  } else {
    console.log('❌ StaffManagement.tsx 不包含导出按钮文本');
  }
  
  if (staffManagementContent.includes('导入数据')) {
    console.log('✅ StaffManagement.tsx 包含导入按钮文本');
  } else {
    console.log('❌ StaffManagement.tsx 不包含导入按钮文本');
  }
  
  // 检查按钮相关的函数
  if (staffManagementContent.includes('handleExportStaff')) {
    console.log('✅ StaffManagement.tsx 包含导出处理函数');
  } else {
    console.log('❌ StaffManagement.tsx 不包含导出处理函数');
  }
  
  if (staffManagementContent.includes('handleImportStaff')) {
    console.log('✅ StaffManagement.tsx 包含导入处理函数');
  } else {
    console.log('❌ StaffManagement.tsx 不包含导入处理函数');
  }
  
  // 检查按钮的JSX代码
  if (staffManagementContent.includes('<Button') && staffManagementContent.includes('导出数据')) {
    console.log('✅ StaffManagement.tsx 包含导出按钮JSX');
  } else {
    console.log('❌ StaffManagement.tsx 不包含导出按钮JSX');
  }
  
  if (staffManagementContent.includes('<Button') && staffManagementContent.includes('导入数据')) {
    console.log('✅ StaffManagement.tsx 包含导入按钮JSX');
  } else {
    console.log('❌ StaffManagement.tsx 不包含导入按钮JSX');
  }
  
} catch (error) {
  console.error('❌ 检查React组件失败:', error.message);
  console.error('错误详情:', error);
}
