const fs = require('fs');
const path = require('path');

console.log('开始修复@react-native-async-storage/async-storage的iOS构建问题...');

// 检查RNCAsyncStorage.h文件
const asyncStorageHeaderPath = path.join(
  __dirname, 
  'node_modules/@react-native-async-storage/async-storage/ios/RNCAsyncStorage.h'
);

if (fs.existsSync(asyncStorageHeaderPath)) {
  console.log('找到RNCAsyncStorage.h文件，正在修改...');
  
  let headerContent = fs.readFileSync(asyncStorageHeaderPath, 'utf8');
  
  // 创建备份
  fs.writeFileSync(`${asyncStorageHeaderPath}.bak`, headerContent);
  
  // 替换有问题的导入
  if (headerContent.includes('#import <rnasyncstorage/rnasyncstorage.h>')) {
    headerContent = headerContent.replace(
      '#import <rnasyncstorage/rnasyncstorage.h>',
      '// #import <rnasyncstorage/rnasyncstorage.h>'
    );
    
    console.log('已注释掉rnasyncstorage.h导入');
  } else {
    console.log('未找到rnasyncstorage.h导入语句');
  }
  
  // 修复任何其他新架构相关引用
  if (headerContent.includes('NativeRNCAsyncStorageSpec')) {
    headerContent = headerContent.replace(
      /NativeRNCAsyncStorageSpec/g,
      'RCTBridgeModule'
    );
    
    console.log('已替换NativeRNCAsyncStorageSpec为RCTBridgeModule');
  }
  
  // 确保导入必要的头文件
  if (!headerContent.includes('#import <React/RCTBridgeModule.h>')) {
    const insertPosition = headerContent.indexOf('#import');
    if (insertPosition !== -1) {
      headerContent = 
        headerContent.slice(0, insertPosition) + 
        '#import <React/RCTBridgeModule.h>\n' + 
        headerContent.slice(insertPosition);
    } else {
      headerContent = '#import <React/RCTBridgeModule.h>\n' + headerContent;
    }
    
    console.log('已添加RCTBridgeModule.h导入');
  }
  
  // 写回文件
  fs.writeFileSync(asyncStorageHeaderPath, headerContent);
  console.log('RNCAsyncStorage.h修复完成');
} else {
  console.log('未找到RNCAsyncStorage.h文件');
}

// 创建缺失的文件夹结构和头文件
console.log('创建缺失的文件夹结构和头文件...');
const missingDir = path.join(
  __dirname, 
  'node_modules/@react-native-async-storage/async-storage/ios/rnasyncstorage'
);
if (!fs.existsSync(missingDir)) {
  fs.mkdirSync(missingDir, { recursive: true });
}

// 创建缺失的头文件
const missingHeaderPath = path.join(missingDir, 'rnasyncstorage.h');
fs.writeFileSync(missingHeaderPath, `
// Empty placeholder for rnasyncstorage.h
#pragma once

#include <React/RCTBridgeModule.h>

@protocol NativeRNCAsyncStorageSpec <RCTBridgeModule>
@end
`);

console.log(`创建了占位符文件: ${missingHeaderPath}`);

// 修改mm文件
const mmFilePath = path.join(
  __dirname, 
  'node_modules/@react-native-async-storage/async-storage/ios/RNCAsyncStorage.mm'
);
if (fs.existsSync(mmFilePath)) {
  console.log('找到RNCAsyncStorage.mm文件，正在修改...');
  
  let mmContent = fs.readFileSync(mmFilePath, 'utf8');
  const backupPath = `${mmFilePath}.bak`;
  
  // 创建备份
  if (!fs.existsSync(backupPath)) {
    fs.writeFileSync(backupPath, mmContent);
    console.log(`创建了备份文件: ${backupPath}`);
  }
  
  // 检查是否包含新架构代码
  if (mmContent.includes('facebook::react::')) {
    console.log('找到新架构相关代码，开始替换...');
    
    // 注释掉所有新架构相关代码
    mmContent = mmContent.replace(/using namespace facebook::react;/g, '//using namespace facebook::react;');
    
    // 注释掉getTurboModule方法
    let getTurboPattern = /- \(std::shared_ptr<TurboModule>\)getTurboModule:[^}]+}/gs;
    mmContent = mmContent.replace(getTurboPattern, (match) => {
      return '/*' + match + '*/';
    });
    
    console.log('已注释掉新架构相关代码');
  }
  
  // 写回文件
  fs.writeFileSync(mmFilePath, mmContent);
  console.log('已修复RNCAsyncStorage.mm文件');
} else {
  console.log('未找到RNCAsyncStorage.mm文件');
}

// 检查异步存储库的版本
try {
  const packagePath = path.join(__dirname, 'node_modules/@react-native-async-storage/async-storage/package.json');
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    console.log(`当前使用的@react-native-async-storage/async-storage版本: ${packageJson.version}`);
  }
} catch (err) {
  console.error('检查async-storage版本时出错:', err);
}

// 修改podspec文件以禁用新架构
const podspecPath = path.join(
  __dirname,
  'node_modules/@react-native-async-storage/async-storage/RNCAsyncStorage.podspec'
);

if (fs.existsSync(podspecPath)) {
  console.log('找到RNCAsyncStorage.podspec文件，正在修改...');
  
  let podspecContent = fs.readFileSync(podspecPath, 'utf8');
  const podspecBackup = `${podspecPath}.bak`;
  
  // 创建备份
  if (!fs.existsSync(podspecBackup)) {
    fs.writeFileSync(podspecBackup, podspecContent);
  }
  
  // 替换fabric_enabled设置
  if (podspecContent.includes('fabric_enabled')) {
    podspecContent = podspecContent.replace(
      /fabric_enabled\s*=\s*true/g,
      'fabric_enabled = false'
    );
    console.log('已将fabric_enabled设置为false');
  }
  
  // 写回文件
  fs.writeFileSync(podspecPath, podspecContent);
  console.log('已修复RNCAsyncStorage.podspec');
} else {
  console.log('未找到RNCAsyncStorage.podspec文件');
}

console.log('\n修复完成！已修复@react-native-async-storage/async-storage库的iOS构建问题。'); 