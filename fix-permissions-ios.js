const fs = require('fs');
const path = require('path');

console.log('开始修复react-native-permissions iOS问题...');

// 检查RNPermissions.h文件
const permissionsHeaderPath = path.join(__dirname, 'node_modules/react-native-permissions/ios/RNPermissions.h');

if (fs.existsSync(permissionsHeaderPath)) {
  console.log('找到RNPermissions.h文件，正在修改...');
  
  let headerContent = fs.readFileSync(permissionsHeaderPath, 'utf8');
  
  // 替换有问题的导入
  if (headerContent.includes('#import <RNPermissionsSpec/RNPermissionsSpec.h>')) {
    headerContent = headerContent.replace(
      '#import <RNPermissionsSpec/RNPermissionsSpec.h>',
      '// #import <RNPermissionsSpec/RNPermissionsSpec.h>'
    );
    
    console.log('已注释掉RNPermissionsSpec导入');
    
    // 写回文件
    fs.writeFileSync(permissionsHeaderPath, headerContent);
  } else {
    console.log('未找到需要修改的导入语句，文件内容可能已更新');
  }
  
  console.log('RNPermissions.h修复完成');
} else {
  console.log('未找到RNPermissions.h文件');
}

// 添加环境变量到项目xcconfig
console.log('正在检查是否需要添加环境变量配置...');

const podfilePath = path.join(__dirname, 'ios/Podfile');
if (fs.existsSync(podfilePath)) {
  let podfileContent = fs.readFileSync(podfilePath, 'utf8');
  
  if (!podfileContent.includes("ENV['RCT_NEW_ARCH_ENABLED'] = '0'")) {
    console.log('添加RCT_NEW_ARCH_ENABLED=0环境变量到Podfile...');
    
    // 在prepare_react_native_project!后添加环境变量
    podfileContent = podfileContent.replace(
      'prepare_react_native_project!',
      'prepare_react_native_project!\n\n# 关闭新架构\nENV[\'RCT_NEW_ARCH_ENABLED\'] = \'0\'\nENV[\'NO_FLIPPER\'] = \'1\''
    );
    
    fs.writeFileSync(podfilePath, podfileContent);
    console.log('已添加环境变量配置');
  } else {
    console.log('环境变量已存在，无需修改');
  }
} else {
  console.log('未找到Podfile');
}

console.log('修复完成，请运行以下命令重新安装pods:');
console.log('cd ios && pod install --repo-update && cd ..'); 