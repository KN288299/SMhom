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
    console.log('未找到需要修改的导入语句，文件内容可能已更新');
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

// 修改Podfile - 移除这部分，避免添加不存在的子模块
// 我们在之前已经手动修改了Podfile，这里不再自动修改

// 检查react-native-permissions的版本和目录结构
try {
  const packagePath = path.join(__dirname, 'node_modules/react-native-permissions/package.json');
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    console.log(`当前使用的react-native-permissions版本: ${packageJson.version}`);
    
    // 检查是否有权限子模块
    const iosPath = path.join(__dirname, 'node_modules/react-native-permissions/ios');
    if (fs.existsSync(iosPath)) {
      const entries = fs.readdirSync(iosPath, { withFileTypes: true });
      const directories = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
      
      console.log('发现的目录:');
      directories.forEach(dir => console.log(`- ${dir}`));
      
      // 检查是否有权限子模块的podspec文件
      const podspecs = [];
      directories.forEach(dir => {
        const podspecPath = path.join(iosPath, dir, `${dir}.podspec`);
        if (fs.existsSync(podspecPath)) {
          podspecs.push(dir);
        }
      });
      
      if (podspecs.length > 0) {
        console.log('发现的权限podspec:');
        podspecs.forEach(pod => console.log(`- ${pod}`));
      } else {
        console.log('未发现任何权限podspec文件');
      }
    }
  }
} catch (err) {
  console.error('检查react-native-permissions版本时出错:', err);
}

console.log('\n修复完成！请确认iOS构建中不再引用特定的权限子模块。'); 