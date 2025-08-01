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

// RCTViewFinder 文件路径
const viewFinderPath = path.join(reactNativePath, 'React/Fabric/Utils/RCTViewFinder.mm');

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

@property (nonatomic, copy, nullable) NSString *nativeId;

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
    console.log('✅ 未发现问题的原始 .mm 文件');
  }
}

function fixRCTViewFinder() {
  console.log('📁 检查 RCTViewFinder.mm 文件...');
  
  if (fs.existsSync(viewFinderPath)) {
    console.log(`⚠️  发现 RCTViewFinder.mm: ${viewFinderPath}`);
    
    // 读取文件内容
    let content = fs.readFileSync(viewFinderPath, 'utf-8');
    
    // 检查是否需要修复
    if (content.includes('RCTViewComponentView') && !content.includes('#import <React/RCTViewComponentView.h>')) {
      console.log('❌ RCTViewFinder.mm 缺少必要的导入，正在修复...');
      
      // 备份原始文件
      const backupPath = `${viewFinderPath}.backup`;
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(viewFinderPath, backupPath);
        console.log(`📋 备份原始文件: ${backupPath}`);
      }
      
      // 在文件开头添加必要的导入
      const importStatement = '#import <React/RCTViewComponentView.h>\n';
      
      // 查找一个合适的位置插入导入语句
      const lines = content.split('\n');
      let insertIndex = -1;
      
      // 找到第一个 #import 语句之后插入
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#import') && lines[i].includes('React/')) {
          insertIndex = i + 1;
          break;
        }
      }
      
      if (insertIndex !== -1) {
        lines.splice(insertIndex, 0, importStatement.trim());
        const newContent = lines.join('\n');
        
        fs.writeFileSync(viewFinderPath, newContent, 'utf-8');
        console.log(`✅ 修复 RCTViewFinder.mm，添加了必要的导入`);
      } else {
        console.log('⚠️  无法找到合适的插入位置，跳过修复');
      }
    } else {
      console.log('✅ RCTViewFinder.mm 无需修复');
    }
  } else {
    console.log('✅ 未发现 RCTViewFinder.mm 文件');
  }
}

function fixFabricImports() {
  console.log('📁 检查其他可能需要修复的 Fabric 文件...');
  
  const fabricUtilsDir = path.join(reactNativePath, 'React/Fabric/Utils');
  const fabricMountingDir = path.join(reactNativePath, 'React/Fabric/Mounting');
  
  const dirsToCheck = [fabricUtilsDir, fabricMountingDir];
  
  dirsToCheck.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir, { recursive: true });
        files.forEach(file => {
          if (typeof file === 'string' && file.endsWith('.mm')) {
            const filePath = path.join(dir, file);
            try {
              const content = fs.readFileSync(filePath, 'utf-8');
              
              // 检查是否引用了 RCTViewComponentView 但没有正确导入
              if (content.includes('RCTViewComponentView') && 
                  !content.includes('#import <React/RCTViewComponentView.h>') &&
                  !content.includes('#import "RCTViewComponentView.h"')) {
                
                console.log(`⚠️  文件 ${filePath} 可能需要修复`);
                
                // 可以在这里添加更多具体的修复逻辑
                // 但为了安全起见，现在只记录而不自动修改
              }
            } catch (error) {
              // 忽略读取错误
            }
          }
        });
      } catch (error) {
        // 忽略目录读取错误
      }
    }
  });
}

// 主执行函数
function main() {
  try {
    console.log('🚀 开始修复原始 React Native Fabric 文件...');
    
    fixOriginalFabricFiles();
    fixRCTViewFinder();
    fixFabricImports();
    
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

module.exports = { main, fixOriginalFabricFiles, fixRCTViewFinder }; 