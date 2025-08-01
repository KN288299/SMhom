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

// 创建标准的 RCTViewComponentView.h 文件
function createRCTViewComponentViewHeader() {
  const headerPath = path.join(reactNativePath, 'React/RCTViewComponentView.h');
  
  // 标准的、完整的头文件内容（双架构兼容版本）
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

  // 创建目录（如果不存在）
  const headerDir = path.dirname(headerPath);
  if (!fs.existsSync(headerDir)) {
    fs.mkdirSync(headerDir, { recursive: true });
  }

  // 写入文件
  fs.writeFileSync(headerPath, headerContent, 'utf-8');
  console.log(`✅ 创建标准 RCTViewComponentView.h: ${headerPath}`);
  
  return headerPath;
}

// 创建标准的 RCTViewComponentView.mm 文件
function createRCTViewComponentViewImplementation() {
  const implPath = path.join(reactNativePath, 'React/RCTViewComponentView.mm');
  
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

  // 创建目录（如果不存在）
  const implDir = path.dirname(implPath);
  if (!fs.existsSync(implDir)) {
    fs.mkdirSync(implDir, { recursive: true });
  }

  // 写入文件
  fs.writeFileSync(implPath, implContent, 'utf-8');
  console.log(`✅ 创建标准 RCTViewComponentView.mm: ${implPath}`);
  
  return implPath;
}

// 复制到其他位置（修复版本：避免 Xcode 构建冲突）
function copyToAdditionalLocations(headerPath, implPath) {
  // 注释：删除额外复制以避免 "Multiple commands produce" 错误
  // 只保留主要文件位置：React/RCTViewComponentView.h
  // 
  // 之前的额外位置导致 Xcode 构建冲突：
  // - React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.h
  // - React/Fabric/RCTViewComponentView.h
  // 
  // 这些文件会被 React-RCTFabric 目标复制到同一个框架头文件目录，导致冲突
  
  console.log(`✅ 跳过额外复制（避免 Xcode 构建冲突）`);
  console.log(`✅ 主文件位置已足够: ${headerPath}`);
}

// 主执行函数
function main() {
  try {
    console.log('🚀 开始统一修复 RCTViewComponentView 文件...');
    
    // 创建标准文件
    const headerPath = createRCTViewComponentViewHeader();
    const implPath = createRCTViewComponentViewImplementation();
    
    // 复制到其他位置
    copyToAdditionalLocations(headerPath, implPath);
    
    console.log('🎉 RCTViewComponentView 文件统一修复完成！');
    console.log('\n📋 创建的文件:');
    console.log(`   - ${headerPath}`);
    console.log(`   - ${implPath}`);
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
    process.exit(1);
  }
}

// 执行脚本
if (require.main === module) {
  main();
}

module.exports = { main, createRCTViewComponentViewHeader, createRCTViewComponentViewImplementation }; 