const fs = require('fs');
const path = require('path');

console.log('🔧 修复原始 React Native Fabric 文件...');

// 获取项目根目录和 node_modules 路径
const projectRoot = process.cwd();
const nodeModulesPath = path.join(projectRoot, 'node_modules');
const reactNativePath = path.join(nodeModulesPath, 'react-native');

// 原始 Fabric 文件路径
const originalFabricDir = path.join(reactNativePath, 'React/Fabric/Mounting/ComponentViews/View');
const originalMmPath = path.join(originalFabricDir, 'RCTViewComponentView.mm');
const originalHPath = path.join(originalFabricDir, 'RCTViewComponentView.h');

function fixOriginalFabricFiles() {
  console.log('📁 检查原始 Fabric 文件...');
  
  // 检查是否存在原始的 .mm 文件
  if (fs.existsSync(originalMmPath)) {
    console.log(`⚠️  发现原始文件: ${originalMmPath}`);
    
    // 检查是否有对应的头文件
    if (!fs.existsSync(originalHPath)) {
      console.log('❌ 缺少对应的头文件，创建兼容头文件...');
      
      // 创建一个兼容的头文件，确保编译通过
      const compatibleHeader = `/*
 * 兼容头文件，由 fix-fabric-original-files.js 创建
 * 用于解决原始 Fabric 文件的编译问题
 */

#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED

#import <UIKit/UIKit.h>
#import <React/RCTComponentViewProtocol.h>
#import <React/RCTTouchHandler.h>
#import <react/renderer/components/view/ViewEventEmitter.h>
#import <react/renderer/components/view/ViewProps.h>
#import <react/renderer/components/view/ViewShadowNode.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * UIView class for <View> component.
 */
@interface RCTViewComponentView : UIView <RCTComponentViewProtocol>

@end

NS_ASSUME_NONNULL_END

#endif // RCT_NEW_ARCH_ENABLED
`;

      // 创建目录（如果不存在）
      if (!fs.existsSync(originalFabricDir)) {
        fs.mkdirSync(originalFabricDir, { recursive: true });
      }
      
      fs.writeFileSync(originalHPath, compatibleHeader, 'utf-8');
      console.log(`✅ 创建兼容头文件: ${originalHPath}`);
    } else {
      console.log('✅ 头文件已存在');
    }
  } else {
    console.log('✅ 未发现问题的原始文件');
  }
}

// 主执行函数
function main() {
  try {
    console.log('🚀 开始修复原始 React Native Fabric 文件...');
    
    fixOriginalFabricFiles();
    
    console.log('🎉 原始 Fabric 文件修复完成！');
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
    process.exit(1);
  }
}

// 执行脚本
if (require.main === module) {
  main();
}

module.exports = { main, fixOriginalFabricFiles }; 