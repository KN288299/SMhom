const fs = require('fs');
const path = require('path');

console.log('🔧 统一修复 RCTViewComponentView 文件...');

// 获取项目根目录和 node_modules 路径
const projectRoot = process.cwd();
const nodeModulesPath = path.join(projectRoot, 'node_modules');
const reactNativePath = path.join(nodeModulesPath, 'react-native');

// 确保 React Native 目录存在
if (!fs.existsSync(reactNativePath)) {
  console.error(`❌ React Native 路径不存在: ${reactNativePath}`);
  process.exit(1);
}

// 标准的 RCTViewComponentView.h 文件内容（完全兼容版本）
  const headerContent = `/*
 * 此文件由 fix-rct-viewcomponent-unified.js 创建
 * 统一解决 React Native Fabric 组件兼容性问题
 * 支持新旧双架构兼容
 * 
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * This source code is licensed under the MIT license.
 */

#import <React/RCTDefines.h>
#import <UIKit/UIKit.h>

// 确保 RCT_NEW_ARCH_ENABLED 有默认值
#ifndef RCT_NEW_ARCH_ENABLED
#define RCT_NEW_ARCH_ENABLED 0
#endif

#if RCT_NEW_ARCH_ENABLED
// 新架构（Fabric）下的兼容性定义
#import <React/RCTComponentViewProtocol.h>

NS_ASSUME_NONNULL_BEGIN

@interface RCTViewComponentView : UIView <RCTComponentViewProtocol>

@property (nonatomic, copy, nullable) NSString *nativeId;

@end

NS_ASSUME_NONNULL_END

#else
// 旧架构下的完整定义
@interface RCTViewComponentView : UIView

@property (nonatomic, copy, nullable) NSString *nativeId;
@property (nonatomic, strong, nullable) UIView *contentView;

- (void)updateProps:(id _Nonnull)props oldProps:(id _Nonnull)oldProps;
- (void)prepareForRecycle;

@end

#endif // RCT_NEW_ARCH_ENABLED
`;

// 标准的 RCTViewComponentView.mm 文件内容
  const implContent = `/*
 * 此文件由 fix-rct-viewcomponent-unified.js 创建
 * 统一解决 React Native Fabric 组件兼容性问题
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * This source code is licensed under the MIT license.
 */

#import <React/RCTDefines.h>
#import <React/RCTViewComponentView.h>

// 只在非 Fabric 架构下实现这个类
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
  // 空实现 - 子类可以重写
}

- (void)prepareForRecycle
{
  // 空实现 - 子类可以重写
  _nativeId = nil;
  [_contentView removeFromSuperview];
  _contentView = nil;
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

- (NSString *)nativeId
{
  return _nativeId;
}

- (void)setNativeId:(NSString *)nativeId
{
  _nativeId = [nativeId copy];
}

@end

#endif // !RCT_NEW_ARCH_ENABLED
`;

// 只创建主要位置的文件，避免"Multiple commands produce"错误
const headerLocations = [
  // 只保留主要位置，避免Xcode构建冲突
  'React/RCTViewComponentView.h'
  // 注释掉会导致冲突的位置：
  // 'React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.h',
  // 'React/Fabric/RCTViewComponentView.h',
  // 'ReactCommon/react/renderer/components/view/RCTViewComponentView.h'
];

const implLocations = [
  // 只保留主要位置
  'React/RCTViewComponentView.mm'
  // 注释掉会导致冲突的位置：
  // 'React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm',
  // 'React/Fabric/RCTViewComponentView.mm'
];

// 创建文件的函数
function createFileAtLocation(relativePath, content, description) {
  const fullPath = path.join(reactNativePath, relativePath);
  const dir = path.dirname(fullPath);

  // 创建目录（如果不存在）
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 写入文件
  fs.writeFileSync(fullPath, content, 'utf-8');
  console.log(`✅ 创建 ${description}: ${relativePath}`);
  
  return fullPath;
}

// 删除可能导致冲突的文件
function removeConflictingFiles() {
  const conflictingFiles = [
    'React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.h',
    'React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm',
    'React/Fabric/RCTViewComponentView.h',
    'React/Fabric/RCTViewComponentView.mm',
    'ReactCommon/react/renderer/components/view/RCTViewComponentView.h'
  ];
  
  console.log('\n🗑️ 删除可能导致冲突的文件...');
  conflictingFiles.forEach(relativePath => {
    const fullPath = path.join(reactNativePath, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`✅ 删除冲突文件: ${relativePath}`);
    }
  });
}

// 主执行函数
function main() {
  try {
    console.log('🚀 开始统一修复 RCTViewComponentView 文件...');
    
    // 首先删除可能导致冲突的文件
    removeConflictingFiles();
    
    // 创建主要位置的头文件
    console.log('\n📄 创建头文件（避免冲突）...');
    headerLocations.forEach(location => {
      createFileAtLocation(location, headerContent, 'RCTViewComponentView.h');
    });
    
    // 创建主要位置的实现文件
    console.log('\n📄 创建实现文件（避免冲突）...');
    implLocations.forEach(location => {
      createFileAtLocation(location, implContent, 'RCTViewComponentView.mm');
    });
    
    // 特别修复 RCTViewFinder.mm 文件，确保它能正确导入 RCTViewComponentView
    console.log('\n🔧 修复 RCTViewFinder.mm 文件...');
    const viewFinderPath = path.join(reactNativePath, 'React/Fabric/Utils/RCTViewFinder.mm');
    const viewFinderDir = path.dirname(viewFinderPath);
    
    if (!fs.existsSync(viewFinderDir)) {
      fs.mkdirSync(viewFinderDir, { recursive: true });
    }
    
    const fixedViewFinderContent = `/*
 * 修复版本的 RCTViewFinder.mm
 * 由 fix-rct-viewcomponent-unified.js 创建
 * 解决 RCTViewComponentView 未声明的错误
 */

#import <React/RCTDefines.h>

// 确保 RCT_NEW_ARCH_ENABLED 有默认值
#ifndef RCT_NEW_ARCH_ENABLED
#define RCT_NEW_ARCH_ENABLED 0
#endif

#if RCT_NEW_ARCH_ENABLED

#import "RCTViewFinder.h"
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

// 旧架构下的简化实现
#import <UIKit/UIKit.h>
#import <React/RCTViewComponentView.h>

UIView *RCTFindComponentViewWithName(UIView *view, NSString *nativeId) {
  if (!nativeId) {
    return nil;
  }

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

#endif // RCT_NEW_ARCH_ENABLED
`;

    fs.writeFileSync(viewFinderPath, fixedViewFinderContent, 'utf-8');
    console.log(`✅ 修复 RCTViewFinder.mm: React/Fabric/Utils/RCTViewFinder.mm`);
    
    // 创建对应的头文件
    const viewFinderHeaderPath = path.join(reactNativePath, 'React/Fabric/Utils/RCTViewFinder.h');
    const viewFinderHeaderContent = `/*
 * RCTViewFinder.h
 * 由 fix-rct-viewcomponent-unified.js 创建
 */

#import <React/RCTDefines.h>
#import <UIKit/UIKit.h>

#ifndef RCT_NEW_ARCH_ENABLED
#define RCT_NEW_ARCH_ENABLED 0
#endif

#if RCT_NEW_ARCH_ENABLED

@interface RCTViewFinder : NSObject

+ (UIView *)findView:(UIView *)root withNativeId:(NSString *)nativeId;

@end

#else

// 旧架构下的函数声明
UIView *RCTFindComponentViewWithName(UIView *view, NSString *nativeId);

#endif // RCT_NEW_ARCH_ENABLED
`;

    fs.writeFileSync(viewFinderHeaderPath, viewFinderHeaderContent, 'utf-8');
    console.log(`✅ 创建 RCTViewFinder.h: React/Fabric/Utils/RCTViewFinder.h`);
    
    console.log('\n🎉 RCTViewComponentView 文件统一修复完成！');
    console.log('\n📋 创建的文件位置（避免冲突版本）:');
    
    console.log('\n头文件:');
    headerLocations.forEach(location => {
      console.log(`   - ${location}`);
    });
    
    console.log('\n实现文件:');
    implLocations.forEach(location => {
      console.log(`   - ${location}`);
    });
    
    console.log('\n修复文件:');
    console.log('   - React/Fabric/Utils/RCTViewFinder.mm');
    console.log('   - React/Fabric/Utils/RCTViewFinder.h');
    
    console.log('\n⚠️ 已删除会导致Xcode构建冲突的重复文件');
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
    process.exit(1);
  }
}

// 执行脚本
if (require.main === module) {
  main();
}

module.exports = { main }; 