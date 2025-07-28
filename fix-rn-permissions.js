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
    console.log('找到需要修复的导入语句');
    headerContent = headerContent.replace(
      '#import <RNPermissionsSpec/RNPermissionsSpec.h>',
      '// #import <RNPermissionsSpec/RNPermissionsSpec.h>'
    );
    
    console.log('已注释掉RNPermissionsSpec导入');
    
    // 写回文件
    fs.writeFileSync(permissionsHeaderPath, headerContent);
  } else {
    console.log('未找到需要修复的导入语句，文件内容可能已更新');
  }
  
  console.log('RNPermissions.h修复完成');
} else {
  console.log('未找到RNPermissions.h文件');
}

// 创建缺失的文件夹结构
console.log('创建缺失的文件夹结构和空白头文件...');
const missingDir = path.join(__dirname, 'node_modules/react-native-permissions/ios/RNPermissionsSpec');
if (!fs.existsSync(missingDir)) {
  fs.mkdirSync(missingDir, { recursive: true });
}

// 创建缺失的头文件
const missingHeaderPath = path.join(missingDir, 'RNPermissionsSpec.h');
fs.writeFileSync(missingHeaderPath, `
// Empty placeholder for RNPermissionsSpec.h
#pragma once

#include <React/RCTBridgeModule.h>

@protocol NativePermissionsSpec <NSObject>
@end
`);

console.log(`创建了占位符文件: ${missingHeaderPath}`);

// 修改mm文件
const mmFilePath = path.join(__dirname, 'node_modules/react-native-permissions/ios/RNPermissions.mm');
if (fs.existsSync(mmFilePath)) {
  console.log('找到RNPermissions.mm文件，正在修改...');
  
  let mmContent = fs.readFileSync(mmFilePath, 'utf8');
  
  // 检查是否包含新架构代码
  if (mmContent.includes('facebook::react::')) {
    console.log('找到新架构相关代码，开始替换...');
    
    // 备份原始文件
    fs.writeFileSync(`${mmFilePath}.bak`, mmContent);
    
    // 注释掉所有新架构相关代码
    mmContent = mmContent.replace(/using namespace facebook::react;/g, '//using namespace facebook::react;');
    
    // 注释掉getTurboModule方法
    let getTurboPattern = /- \(std::shared_ptr<TurboModule>\)getTurboModule:[^}]+}/gs;
    mmContent = mmContent.replace(getTurboPattern, (match) => {
      return '/*' + match + '*/';
    });
    
    // 写回文件
    fs.writeFileSync(mmFilePath, mmContent);
    console.log('已修复RNPermissions.mm文件');
  } else {
    console.log('RNPermissions.mm文件不包含新架构代码，无需修改');
  }
} else {
  console.log('未找到RNPermissions.mm文件');
}

// 修改Podfile
const podfilePath = path.join(__dirname, 'ios/Podfile');
if (fs.existsSync(podfilePath)) {
  console.log('修改Podfile以添加RNPermissions的特殊配置...');
  let podfileContent = fs.readFileSync(podfilePath, 'utf8');
  
  // 检查是否已经包含RNPermissions配置
  if (!podfileContent.includes('RNPermissions特殊配置')) {
    const permissionsConfig = `
  # RNPermissions特殊配置
  permissions_path = '../node_modules/react-native-permissions/ios'
  pod 'Permission-Camera', :path => "\#{permissions_path}/Camera"
  pod 'Permission-Microphone', :path => "\#{permissions_path}/Microphone"
  pod 'Permission-PhotoLibrary', :path => "\#{permissions_path}/PhotoLibrary"
  pod 'Permission-Notifications', :path => "\#{permissions_path}/Notifications"
  pod 'Permission-LocationWhenInUse', :path => "\#{permissions_path}/LocationWhenInUse"
`;

    // 找到插入点
    const targetLine = "target 'HomeServiceChat' do";
    if (podfileContent.includes(targetLine)) {
      podfileContent = podfileContent.replace(
        targetLine,
        `${targetLine}\n${permissionsConfig}`
      );
      
      fs.writeFileSync(podfilePath, podfileContent);
      console.log('已添加RNPermissions特殊配置到Podfile');
    } else {
      console.log('无法在Podfile中找到插入点');
    }
  } else {
    console.log('Podfile已包含RNPermissions配置，无需修改');
  }
} else {
  console.log('未找到Podfile');
}

console.log('\n修复完成！请更新工作流中添加如下步骤:');
console.log('1. 在构建iOS前运行: node fix-rn-permissions.js');
console.log('2. 执行pod install后重新编译'); 