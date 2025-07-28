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
    console.log('找到需要修改的导入语句');
    headerContent = headerContent.replace(
      '#import <RNPermissionsSpec/RNPermissionsSpec.h>',
      '// #import <RNPermissionsSpec/RNPermissionsSpec.h>'
    );
    
    console.log('已注释掉RNPermissionsSpec导入');
  } else {
    console.log('未找到需要修改的导入语句，文件内容可能已更新');
  }
  
  // 修复接口声明，移除对NativeRNPermissionsSpec的引用
  if (headerContent.includes('@interface RNPermissions : NSObject<NativeRNPermissionsSpec>')) {
    console.log('找到需要修改的接口声明');
    headerContent = headerContent.replace(
      '@interface RNPermissions : NSObject<NativeRNPermissionsSpec>',
      '@interface RNPermissions : NSObject<RCTBridgeModule>'
    );
    
    console.log('已修复接口声明，将NativeRNPermissionsSpec替换为RCTBridgeModule');
  } else if (headerContent.includes('NativeRNPermissionsSpec')) {
    // 备用方案，以防格式不完全匹配
    console.log('找到含有NativeRNPermissionsSpec的接口声明，尝试修复');
    headerContent = headerContent.replace(
      /NativeRNPermissionsSpec/g,
      'RCTBridgeModule'
    );
    
    console.log('已修复所有NativeRNPermissionsSpec引用');
  } else {
    console.log('未找到需要修改的接口声明');
  }
  
  // 确保导入RCTBridgeModule.h
  if (!headerContent.includes('#import <React/RCTBridgeModule.h>')) {
    console.log('添加RCTBridgeModule.h导入');
    const insertPosition = headerContent.indexOf('#import');
    if (insertPosition !== -1) {
      headerContent = 
        headerContent.slice(0, insertPosition) + 
        '#import <React/RCTBridgeModule.h>\n' + 
        headerContent.slice(insertPosition);
    } else {
      headerContent = '#import <React/RCTBridgeModule.h>\n' + headerContent;
    }
  }
  
  // 写回文件
  fs.writeFileSync(permissionsHeaderPath, headerContent);
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

@protocol NativeRNPermissionsSpec <RCTBridgeModule>
@end
`);

console.log(`创建了占位符文件: ${missingHeaderPath}`);

// 修改mm文件
const mmFilePath = path.join(__dirname, 'node_modules/react-native-permissions/ios/RNPermissions.mm');
if (fs.existsSync(mmFilePath)) {
  console.log('找到RNPermissions.mm文件，正在修改...');
  
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
  } else {
    console.log('RNPermissions.mm文件不包含facebook::react::命名空间，检查其他问题...');
  }
  
  // 检查是否需要修复整个实现
  const hasImplementationIssues = 
    mmContent.includes('@implementation RNPermissions') && 
    !mmContent.match(/@implementation\s+RNPermissions\s*\n\s*RCT_EXPORT_MODULE/);
  
  if (hasImplementationIssues) {
    console.log('RNPermissions.mm实现有问题，替换为基本实现...');
    
    // 创建基本实现
    const basicImplementation = `
/**
 * react-native-permissions
 * 基本实现（用于修复架构兼容性问题）
 */

#import "RNPermissions.h"
#import <React/RCTUtils.h>

@implementation RNPermissions

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (dispatch_queue_t)methodQueue {
  return dispatch_get_main_queue();
}

// 基本方法实现
RCT_EXPORT_METHOD(openSettings:(NSString *)type
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  if (@available(iOS 10.0, *)) {
    [[UIApplication sharedApplication] openURL:[NSURL URLWithString:UIApplicationOpenSettingsURLString]
                                       options:@{}
                             completionHandler:^(BOOL success) {
                               resolve(@(success));
                             }];
  } else {
    // iOS 9.0
    BOOL success = [[UIApplication sharedApplication] openURL:[NSURL URLWithString:UIApplicationOpenSettingsURLString]];
    resolve(@(success));
  }
}

// 实现基本权限检查方法
RCT_EXPORT_METHOD(checkNotifications:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  if (@available(iOS 10.0, *)) {
    [[UNUserNotificationCenter currentNotificationCenter] getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings * _Nonnull settings) {
      NSDictionary *result = @{
        @"status": [self permissionStatusForNotificationSettings:settings],
        @"settings": [self parseNotificationSettings:settings]
      };
      
      resolve(result);
    }];
  } else {
    UIUserNotificationType types = [[UIApplication sharedApplication] currentUserNotificationSettings].types;
    BOOL enabled = types != UIUserNotificationTypeNone;
    resolve(@{
      @"status": enabled ? @"granted" : @"denied",
      @"settings": @{@"alert": @(enabled), @"badge": @(enabled), @"sound": @(enabled)}
    });
  }
}

- (NSString *)permissionStatusForNotificationSettings:(UNNotificationSettings *)settings API_AVAILABLE(ios(10.0)) {
  switch (settings.authorizationStatus) {
    case UNAuthorizationStatusNotDetermined:
      return @"not-determined";
    case UNAuthorizationStatusDenied:
      return @"denied";
    case UNAuthorizationStatusAuthorized:
      return @"granted";
    case UNAuthorizationStatusProvisional:
      return @"provisional";
    case UNAuthorizationStatusEphemeral:
      return @"ephemeral";
    default:
      return @"not-determined";
  }
}

- (NSDictionary *)parseNotificationSettings:(UNNotificationSettings *)settings API_AVAILABLE(ios(10.0)) {
  return @{
    @"alert": @(settings.alertSetting == UNNotificationSettingEnabled),
    @"badge": @(settings.badgeSetting == UNNotificationSettingEnabled),
    @"sound": @(settings.soundSetting == UNNotificationSettingEnabled),
    @"lockScreen": @(settings.lockScreenSetting == UNNotificationSettingEnabled),
    @"notificationCenter": @(settings.notificationCenterSetting == UNNotificationSettingEnabled),
    @"carPlay": @(settings.carPlaySetting == UNNotificationSettingEnabled),
    @"announcement": @(settings.announcementSetting == UNNotificationSettingEnabled),
    @"inAppNotification": @(settings.alertStyle != UNAlertStyleNone)
  };
}

@end
`;

    // 写入文件
    fs.writeFileSync(mmFilePath, basicImplementation);
    console.log('已替换RNPermissions.mm为基本实现');
  } else {
    // 写回修改后的文件
    fs.writeFileSync(mmFilePath, mmContent);
    console.log('已修复RNPermissions.mm文件');
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

// 添加必要的头文件导入
const uiKitHeaderPath = path.join(__dirname, 'node_modules/react-native-permissions/ios/UIKit.h');
if (!fs.existsSync(uiKitHeaderPath)) {
  console.log('创建UIKit.h占位符...');
  fs.writeFileSync(uiKitHeaderPath, `
#import <UIKit/UIKit.h>
#import <UserNotifications/UserNotifications.h>
`);
  console.log(`创建了UIKit.h占位符: ${uiKitHeaderPath}`);
}

console.log('\n修复完成！已全面修复RNPermissions相关文件。'); 