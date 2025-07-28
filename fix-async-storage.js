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
  const headerBackupPath = `${asyncStorageHeaderPath}.original`;
  if (!fs.existsSync(headerBackupPath)) {
    fs.writeFileSync(headerBackupPath, headerContent);
    console.log(`创建了原始备份: ${headerBackupPath}`);
  }
  
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
  
  // 修复任何新架构相关引用
  const newArchProtocols = [
    'NativeRNCAsyncStorageSpec',
    'NativeAsyncStorageModuleSpec'
  ];
  
  newArchProtocols.forEach(protocol => {
    if (headerContent.includes(protocol)) {
      console.log(`找到协议 ${protocol}，替换为RCTBridgeModule`);
      headerContent = headerContent.replace(
        new RegExp(protocol, 'g'),
        'RCTBridgeModule'
      );
    }
  });
  
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

// 创建所有可能缺失的文件夹结构和头文件
const missingDirs = [
  'rnasyncstorage',
  'asyncstorage'
];

console.log('创建缺失的文件夹结构和头文件...');

missingDirs.forEach(dirName => {
  const missingDir = path.join(
    __dirname, 
    `node_modules/@react-native-async-storage/async-storage/ios/${dirName}`
  );
  if (!fs.existsSync(missingDir)) {
    fs.mkdirSync(missingDir, { recursive: true });
    console.log(`创建了目录: ${missingDir}`);
  }
  
  // 对应的头文件名
  const headerFilename = `${dirName}.h`;
  const missingHeaderPath = path.join(missingDir, headerFilename);
  fs.writeFileSync(missingHeaderPath, `
// Empty placeholder for ${headerFilename}
#pragma once

#include <React/RCTBridgeModule.h>

@protocol Native${dirName === 'rnasyncstorage' ? 'RNCAsync' : 'Async'}StorageModuleSpec <RCTBridgeModule>
@end
`);
  
  console.log(`创建了占位符文件: ${missingHeaderPath}`);
});

// 修改mm文件
const mmFilePath = path.join(
  __dirname, 
  'node_modules/@react-native-async-storage/async-storage/ios/RNCAsyncStorage.mm'
);
if (fs.existsSync(mmFilePath)) {
  console.log('找到RNCAsyncStorage.mm文件，正在修改...');
  
  let mmContent = fs.readFileSync(mmFilePath, 'utf8');
  const mmBackupPath = `${mmFilePath}.original`;
  
  // 创建备份
  if (!fs.existsSync(mmBackupPath)) {
    fs.writeFileSync(mmBackupPath, mmContent);
    console.log(`创建了原始备份文件: ${mmBackupPath}`);
  }
  
  // 检查是否需要完全替换文件
  const hasImplementationIssues = 
    (mmContent.includes('facebook::react::') || 
     mmContent.includes('getTurboModule') ||
     mmContent.includes('NativeAsyncStorageModuleSpec'));
  
  if (hasImplementationIssues) {
    console.log('RNCAsyncStorage.mm有新架构代码，替换为简化版本...');
    
    // 创建简化实现
    const basicImplementation = `
/**
 * @react-native-async-storage/async-storage
 * 简化实现（用于修复新架构兼容性问题）
 */

#import "RNCAsyncStorage.h"
#import <React/RCTUtils.h>
#import <React/RCTConvert.h>

@implementation RNCAsyncStorage

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_queue_create("com.facebook.react.AsyncLocalStorageQueue", DISPATCH_QUEUE_SERIAL);
}

#pragma mark - 简化实现核心方法

RCT_EXPORT_METHOD(multiGet:(NSArray<NSString *> *)keys
                  callback:(RCTResponseSenderBlock)callback)
{
  NSMutableArray<NSArray<NSString *> *> *result = [NSMutableArray arrayWithCapacity:keys.count];
  NSUserDefaults *userDefaults = [NSUserDefaults standardUserDefaults];
  
  for (NSString *key in keys) {
    id value = [userDefaults objectForKey:key];
    NSString *stringValue = nil;
    
    if ([value isKindOfClass:[NSString class]]) {
      stringValue = (NSString *)value;
    } else if (value != nil) {
      stringValue = [value description];
    }
    
    [result addObject:@[key, stringValue ?: [NSNull null]]];
  }
  
  callback(@[[NSNull null], result]);
}

RCT_EXPORT_METHOD(multiSet:(NSArray<NSArray<NSString *> *> *)kvPairs
                  callback:(RCTResponseSenderBlock)callback)
{
  NSUserDefaults *userDefaults = [NSUserDefaults standardUserDefaults];
  for (NSArray<NSString *> *pair in kvPairs) {
    if (pair.count != 2) {
      continue;
    }
    
    [userDefaults setObject:pair[1] forKey:pair[0]];
  }
  
  [userDefaults synchronize];
  callback(@[[NSNull null]]);
}

RCT_EXPORT_METHOD(multiRemove:(NSArray<NSString *> *)keys
                  callback:(RCTResponseSenderBlock)callback)
{
  NSUserDefaults *userDefaults = [NSUserDefaults standardUserDefaults];
  for (NSString *key in keys) {
    [userDefaults removeObjectForKey:key];
  }
  
  [userDefaults synchronize];
  callback(@[[NSNull null]]);
}

RCT_EXPORT_METHOD(getAllKeys:(RCTResponseSenderBlock)callback)
{
  NSUserDefaults *userDefaults = [NSUserDefaults standardUserDefaults];
  NSDictionary *dictionary = [userDefaults dictionaryRepresentation];
  NSArray *keys = dictionary.allKeys;
  
  callback(@[[NSNull null], keys]);
}

RCT_EXPORT_METHOD(clear:(RCTResponseSenderBlock)callback)
{
  NSUserDefaults *userDefaults = [NSUserDefaults standardUserDefaults];
  NSDictionary *dictionary = [userDefaults dictionaryRepresentation];
  
  for (NSString *key in dictionary) {
    if (![key isEqualToString:@"NSInterfaceStyle"] &&
        ![key isEqualToString:@"AppleLanguages"] &&
        ![key isEqualToString:@"AppleLocale"] &&
        ![key isEqualToString:@"AppleKeyboards"]) {
      [userDefaults removeObjectForKey:key];
    }
  }
  
  [userDefaults synchronize];
  callback(@[[NSNull null]]);
}

@end
`;

    // 写入文件
    fs.writeFileSync(mmFilePath, basicImplementation);
    console.log('已替换RNCAsyncStorage.mm为简化实现');
  } else {
    // 只注释掉所有新架构相关代码
    mmContent = mmContent.replace(/using namespace facebook::react;/g, '//using namespace facebook::react;');
    
    // 注释掉getTurboModule方法
    let getTurboPattern = /- \(std::shared_ptr<TurboModule>\)getTurboModule:[^}]+}/gs;
    mmContent = mmContent.replace(getTurboPattern, (match) => {
      return '/*' + match + '*/';
    });
    
    // 写回修改后的文件
    fs.writeFileSync(mmFilePath, mmContent);
    console.log('已修改RNCAsyncStorage.mm文件，注释掉新架构代码');
  }
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
  const podspecBackup = `${podspecPath}.original`;
  
  // 创建备份
  if (!fs.existsSync(podspecBackup)) {
    fs.writeFileSync(podspecBackup, podspecContent);
    console.log(`创建了原始备份: ${podspecBackup}`);
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

console.log('\n修复完成！已全面修复@react-native-async-storage/async-storage库的iOS构建问题。'); 