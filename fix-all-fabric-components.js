/**
 * 全面修复Fabric组件文件
 * 这个脚本会处理React Native所有Fabric组件，添加条件编译并提供简化实现
 */

const fs = require('fs');
const path = require('path');

// Node modules根目录
const nodeModulesPath = path.resolve(process.cwd(), 'node_modules');
const reactNativePath = path.join(nodeModulesPath, 'react-native');

console.log('开始修复所有React Native Fabric组件...');

// 创建RCTViewComponentView.h（如果不存在）
const viewCompHeaderPath = path.join(reactNativePath, 'React/RCTViewComponentView.h');
if (!fs.existsSync(viewCompHeaderPath)) {
  const viewCompHeaderContent = `/*
 * 此文件由fix-all-fabric-components.js创建
 * 用于在禁用Fabric架构时提供兼容性
 */
#import <React/RCTDefines.h>
#import <UIKit/UIKit.h>

#ifndef RCT_NEW_ARCH_ENABLED
#define RCT_NEW_ARCH_ENABLED 0
#endif

#if !RCT_NEW_ARCH_ENABLED
@interface RCTViewComponentView : UIView

@property (nonatomic, copy, nullable) NSString *nativeId;
@property (nonatomic, strong) UIView *contentView;

- (void)updateProps:(id _Nonnull)props oldProps:(id _Nonnull)oldProps;
- (void)prepareForRecycle;

@end
#endif // !RCT_NEW_ARCH_ENABLED
`;

  // 创建目录
  const dir = path.dirname(viewCompHeaderPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(viewCompHeaderPath, viewCompHeaderContent);
  console.log(`创建了RCTViewComponentView.h文件: ${viewCompHeaderPath}`);
}

// 创建RCTViewComponentView.mm（如果不存在）
const viewCompImplPath = path.join(reactNativePath, 'React/RCTViewComponentView.mm');
if (!fs.existsSync(viewCompImplPath)) {
  const viewCompImplContent = `/*
 * 此文件由fix-all-fabric-components.js创建
 * 用于在禁用Fabric架构时提供兼容性
 */
#import <React/RCTDefines.h>
#import <React/RCTViewComponentView.h>

#if !RCT_NEW_ARCH_ENABLED
@implementation RCTViewComponentView {
  NSString *_nativeId;
  UIView *_contentView;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _nativeId = nil;
    _contentView = nil;
  }
  return self;
}

- (void)updateProps:(id)props oldProps:(id)oldProps
{
  // 空实现
}

- (void)prepareForRecycle
{
  // 空实现
}

- (void)setContentView:(UIView *)contentView
{
  if (_contentView != contentView) {
    [_contentView removeFromSuperview];
    _contentView = contentView;
    if (_contentView) {
      [self addSubview:_contentView];
    }
  }
}

@end
#endif
`;

  fs.writeFileSync(viewCompImplPath, viewCompImplContent);
  console.log(`创建了RCTViewComponentView.mm文件: ${viewCompImplPath}`);
}

// 处理指定组件
function processComponentFile(componentPath, componentName) {
  if (!fs.existsSync(componentPath)) {
    console.log(`文件不存在，跳过: ${componentPath}`);
    return;
  }

  // 备份原文件
  const backupPath = `${componentPath}.original`;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(componentPath, backupPath);
  }

  // 读取文件内容
  const originalContent = fs.readFileSync(componentPath, 'utf8');
  
  // 如果文件已经包含条件编译，则跳过
  if (originalContent.includes('#if RCT_NEW_ARCH_ENABLED')) {
    console.log(`文件已包含条件编译，跳过: ${componentPath}`);
    return;
  }

  // 判断文件类型
  const isHeader = componentPath.endsWith('.h');
  const isImplementation = componentPath.endsWith('.mm') || componentPath.endsWith('.m');

  if (isHeader) {
    // 添加条件编译到头文件
    const newContent = `/*
 * 由fix-all-fabric-components.js修改，添加条件编译
 * 原始文件已备份为${path.basename(componentPath)}.original
 */
#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED
${originalContent}
#else
#import <UIKit/UIKit.h>
#import <React/RCTViewComponentView.h>

@interface RCT${componentName}ComponentView : RCTViewComponentView
@end
#endif
`;

    fs.writeFileSync(componentPath, newContent);
    console.log(`已添加条件编译到头文件: ${componentPath}`);
  } else if (isImplementation) {
    // 添加条件编译到实现文件
    const newContent = `/*
 * 由fix-all-fabric-components.js修改，添加条件编译
 * 原始文件已备份为${path.basename(componentPath)}.original
 */
#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED
${originalContent}
#else
#import <React/RCTViewComponentView.h>
#import "RCT${componentName}ComponentView.h"

@implementation RCT${componentName}ComponentView

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    // 简化实现
  }
  return self;
}

- (void)updateProps:(id)props oldProps:(id)oldProps
{
  [super updateProps:props oldProps:oldProps];
}

@end
#endif
`;

    fs.writeFileSync(componentPath, newContent);
    console.log(`已添加条件编译到实现文件: ${componentPath}`);
  }
}

// 处理所有已知的Fabric组件
const components = [
  'ActivityIndicator',
  'Image',
  'Modal',
  'ScrollView',
  'Switch',
  'Text',
  'TextInput',
  'View',
  'RefreshControl',
  'Slider',
  'Unimplemented'
];

// 遍历所有组件
components.forEach(componentName => {
  const componentDirPath = path.join(reactNativePath, 'React/Fabric/Mounting/ComponentViews', componentName);
  const alternativeDirPath = path.join(reactNativePath, 'React/Fabric/Mounting/ComponentViews', `${componentName}View`);
  
  // 检查目录是否存在
  let baseDirPath = '';
  if (fs.existsSync(componentDirPath)) {
    baseDirPath = componentDirPath;
  } else if (fs.existsSync(alternativeDirPath)) {
    baseDirPath = alternativeDirPath;
  } else {
    console.log(`未找到组件目录: ${componentName}`);
    
    // 特殊情况：直接检查特定路径
    const specialCases = {
      'Text': path.join(reactNativePath, 'React/Fabric/Mounting/ComponentViews/Text'),
      'ScrollView': path.join(reactNativePath, 'React/Fabric/Mounting/ComponentViews/ScrollView'),
      'Unimplemented': path.join(reactNativePath, 'React/Fabric/Mounting/ComponentViews/UnimplementedComponent')
    };
    
    if (specialCases[componentName] && fs.existsSync(specialCases[componentName])) {
      baseDirPath = specialCases[componentName];
    } else {
      return; // 跳过不存在的组件
    }
  }
  
  console.log(`处理组件: ${componentName} (${baseDirPath})`);
  
  // 特殊处理一些组件名称差异
  let filePrefix = 'RCT';
  let fileSuffix = 'ComponentView';
  
  // 特殊情况：Unimplemented组件
  if (componentName === 'Unimplemented') {
    fileSuffix = 'NativeComponentView';
  }
  
  // 处理头文件和实现文件
  const headerPath = path.join(baseDirPath, `${filePrefix}${componentName}${fileSuffix}.h`);
  const implPath = path.join(baseDirPath, `${filePrefix}${componentName}${fileSuffix}.mm`);
  
  processComponentFile(headerPath, componentName);
  processComponentFile(implPath, componentName);
});

// 修复RCTViewFinder.mm文件
const viewFinderPath = path.join(reactNativePath, 'React/Fabric/Utils/RCTViewFinder.mm');
if (fs.existsSync(viewFinderPath)) {
  console.log(`修复RCTViewFinder.mm文件...`);
  
  // 创建备份
  const backupPath = `${viewFinderPath}.original`;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(viewFinderPath, backupPath);
  }
  
  // 完全重写文件内容，确保引入正确
  const newContent = `/*
 * 由fix-all-fabric-components.js完全重写
 * 原始文件已备份为RCTViewFinder.mm.original
 */
#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED
/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTViewFinder.h"
// 确保导入RCTViewComponentView.h
#import <React/RCTViewComponentView.h>

@implementation RCTViewFinder

+ (UIView *)findView:(UIView *)root withNativeId:(NSString *)nativeId
{
  if (!nativeId) {
    return nil;
  }

  if ([root isKindOfClass:[RCTViewComponentView class]] &&
      [nativeId isEqualToString:((RCTViewComponentView *)root).nativeId]) {
    return root;
  }

  for (UIView *subview in root.subviews) {
    UIView *result = [RCTViewFinder findView:subview withNativeId:nativeId];
    if (result) {
      return result;
    }
  }

  return nil;
}

@end

#else
// 旧架构兼容代码
#import <UIKit/UIKit.h>
// 确保导入RCTViewComponentView.h
#import <React/RCTViewComponentView.h>

UIView *RCTFindComponentViewWithName(UIView *view, NSString *nativeId) {
  if (!nativeId) {
    return nil;
  }

  // 简化实现，在非Fabric架构下提供基本功能
  if ([view isKindOfClass:[RCTViewComponentView class]]) {
    if ([nativeId isEqualToString:((RCTViewComponentView *)view).nativeId]) {
      return view;
    }
  }
  
  for (UIView *subview in view.subviews) {
    UIView *result = RCTFindComponentViewWithName(subview, nativeId);
    if (result != nil) {
      return result;
    }
  }
  
  return nil;
}
#endif
`;
  
  fs.writeFileSync(viewFinderPath, newContent);
  console.log(`已完全重写RCTViewFinder.mm文件，确保正确导入RCTViewComponentView.h`);
}

// 递归处理目录中所有.h和.mm文件
function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  entries.forEach(entry => {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && (fullPath.endsWith('.h') || fullPath.endsWith('.mm'))) {
      // 检查文件内容是否包含RCTViewComponentView
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('RCTViewComponentView') && !content.includes('#if RCT_NEW_ARCH_ENABLED')) {
        console.log(`发现使用RCTViewComponentView但没有条件编译的文件: ${fullPath}`);
        
        // 从文件名提取组件名
        const fileName = path.basename(fullPath, path.extname(fullPath));
        const match = fileName.match(/RCT(.+?)ComponentView/);
        
        if (match) {
          const componentName = match[1];
          console.log(`  提取到组件名: ${componentName}`);
          processComponentFile(fullPath, componentName);
        }
      }
    }
  });
}

// 处理所有Fabric组件目录
const fabricComponentsDir = path.join(reactNativePath, 'React/Fabric/Mounting/ComponentViews');
processDirectory(fabricComponentsDir);

console.log('\n修复完成！已修复所有React Native Fabric组件的编译问题。'); 