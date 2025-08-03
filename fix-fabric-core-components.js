const fs = require('fs');
const path = require('path');

console.log('🔧 修复 React Native Fabric 核心组件缺失问题...');

// 获取项目根目录和 node_modules 路径
const projectRoot = process.cwd();
const nodeModulesPath = path.join(projectRoot, 'node_modules');
const reactNativePath = path.join(nodeModulesPath, 'react-native');

// 确保 React Native 目录存在
if (!fs.existsSync(reactNativePath)) {
  console.error(`❌ React Native 路径不存在: ${reactNativePath}`);
  process.exit(1);
}

// 创建 RCTComponentViewProtocol.h
function createComponentViewProtocol() {
  const protocolPath = path.join(reactNativePath, 'React', 'RCTComponentViewProtocol.h');
  
  const protocolContent = `/*
 * RCTComponentViewProtocol.h
 * 由 fix-fabric-core-components.js 创建
 * 修复缺失的组件视图协议
 */

#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

/*
 * Fabric 组件视图协议
 * 定义所有 Fabric 组件必须实现的基本接口
 */
@protocol RCTComponentViewProtocol <NSObject>

@optional

/*
 * 组件视图的基本方法
 */
- (void)prepareForRecycle;
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index;
- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index;
- (void)updateProps:(id)props oldProps:(id)oldProps;
- (void)updateEventEmitter:(id)eventEmitter;
- (void)updateState:(id)state oldState:(id)oldState;
- (void)updateLayoutMetrics:(id)layoutMetrics oldLayoutMetrics:(id)oldLayoutMetrics;
- (void)finalizeUpdates:(id)updateMask;

@end

NS_ASSUME_NONNULL_END

#endif // RCT_NEW_ARCH_ENABLED
`;

  // 确保目录存在
  const dir = path.dirname(protocolPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(protocolPath, protocolContent, 'utf-8');
  console.log(`✅ 创建组件视图协议: ${path.relative(reactNativePath, protocolPath)}`);
}

// 创建 Fabric 功能函数的头文件
function createFabricFunctions() {
  const functionsPath = path.join(reactNativePath, 'React', 'RCTFabricFunctions.h');
  
  const functionsContent = `/*
 * RCTFabricFunctions.h
 * 由 fix-fabric-core-components.js 创建
 * 修复缺失的 Fabric 功能函数
 */

#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/*
 * Fabric 相关功能函数声明
 */

// W3C 指针事件分发功能
BOOL RCTGetDispatchW3CPointerEvents(void);
void RCTSetDispatchW3CPointerEvents(BOOL enabled);

// 其他 Fabric 功能函数
BOOL RCTGetFabricEnabled(void);
void RCTSetFabricEnabled(BOOL enabled);

NS_ASSUME_NONNULL_END

#endif // RCT_NEW_ARCH_ENABLED
`;

  fs.writeFileSync(functionsPath, functionsContent, 'utf-8');
  console.log(`✅ 创建 Fabric 功能函数头文件: ${path.relative(reactNativePath, functionsPath)}`);
}

// 创建 Fabric 功能函数的实现文件
function createFabricFunctionsImpl() {
  const functionsImplPath = path.join(reactNativePath, 'React', 'RCTFabricFunctions.mm');
  
  const functionsImplContent = `/*
 * RCTFabricFunctions.mm
 * 由 fix-fabric-core-components.js 创建
 * 修复缺失的 Fabric 功能函数实现
 */

#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED

#import "RCTFabricFunctions.h"

// 全局变量存储功能开关状态
static BOOL gDispatchW3CPointerEvents = NO;
static BOOL gFabricEnabled = YES;

BOOL RCTGetDispatchW3CPointerEvents(void) {
  return gDispatchW3CPointerEvents;
}

void RCTSetDispatchW3CPointerEvents(BOOL enabled) {
  gDispatchW3CPointerEvents = enabled;
}

BOOL RCTGetFabricEnabled(void) {
  return gFabricEnabled;
}

void RCTSetFabricEnabled(BOOL enabled) {
  gFabricEnabled = enabled;
}

#endif // RCT_NEW_ARCH_ENABLED
`;

  fs.writeFileSync(functionsImplPath, functionsImplContent, 'utf-8');
  console.log(`✅ 创建 Fabric 功能函数实现文件: ${path.relative(reactNativePath, functionsImplPath)}`);
}

// 修复 RCTSurfaceTouchHandler.mm
function fixSurfaceTouchHandler() {
  const touchHandlerPath = path.join(reactNativePath, 'React/Fabric/RCTSurfaceTouchHandler.mm');
  
  if (!fs.existsSync(touchHandlerPath)) {
    console.log(`⚠️ RCTSurfaceTouchHandler.mm 不存在，跳过修复`);
    return;
  }

  // 备份原文件
  const backupPath = touchHandlerPath + '.backup';
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(touchHandlerPath, backupPath);
  }

  let content = fs.readFileSync(touchHandlerPath, 'utf-8');
  let modified = false;

  // 检查是否需要添加导入
  if (!content.includes('#import <React/RCTComponentViewProtocol.h>')) {
    // 在现有导入之后添加新的导入
    const importRegex = /#import\s+<React\/.*?>\s*\n/g;
    const imports = content.match(importRegex) || [];
    
    if (imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const insertIndex = content.indexOf(lastImport) + lastImport.length;
      
      const newImports = `#import <React/RCTComponentViewProtocol.h>
#import <React/RCTFabricFunctions.h>

`;
      
      content = content.substring(0, insertIndex) + newImports + content.substring(insertIndex);
      modified = true;
    }
  }

  // 如果需要添加条件编译保护
  if (!content.includes('#if RCT_NEW_ARCH_ENABLED')) {
    // 添加条件编译包装
    const wrappedContent = `/*
 * 修复版本的 RCTSurfaceTouchHandler.mm
 * 由 fix-fabric-core-components.js 修复
 */

#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED

${content}

#endif // RCT_NEW_ARCH_ENABLED
`;
    content = wrappedContent;
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(touchHandlerPath, content, 'utf-8');
    console.log(`✅ 修复 RCTSurfaceTouchHandler.mm 文件`);
  } else {
    console.log(`ℹ️ RCTSurfaceTouchHandler.mm 无需修改`);
  }
}

function main() {
  try {
    console.log('🚀 开始修复 Fabric 核心组件缺失问题...');
    
    // 创建缺失的协议文件
    console.log('\n📄 创建缺失的协议文件...');
    createComponentViewProtocol();
    
    // 创建缺失的功能函数文件
    console.log('\n⚙️ 创建缺失的功能函数文件...');
    createFabricFunctions();
    createFabricFunctionsImpl();
    
    // 修复 TouchHandler
    console.log('\n🔧 修复 RCTSurfaceTouchHandler...');
    fixSurfaceTouchHandler();
    
    console.log('\n🎉 Fabric 核心组件修复完成！');
    
    console.log('\n📋 已创建/修复的文件:');
    console.log('   - React/RCTComponentViewProtocol.h (协议定义)');
    console.log('   - React/RCTFabricFunctions.h (功能函数声明)');
    console.log('   - React/RCTFabricFunctions.mm (功能函数实现)');
    console.log('   - React/Fabric/RCTSurfaceTouchHandler.mm (修复导入)');
    
    console.log('\n✅ 应该解决以下编译错误:');
    console.log('   - no type or protocol named \'RCTComponentViewProtocol\'');
    console.log('   - use of undeclared identifier \'RCTGetDispatchW3CPointerEvents\'');
    
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