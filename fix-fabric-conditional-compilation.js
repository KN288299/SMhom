const fs = require('fs');
const path = require('path');

console.log('🔧 修复 React Native Fabric 条件编译指令问题...');

// 获取项目根目录和 node_modules 路径
const projectRoot = process.cwd();
const nodeModulesPath = path.join(projectRoot, 'node_modules');
const reactNativePath = path.join(nodeModulesPath, 'react-native');

// 确保 React Native 目录存在
if (!fs.existsSync(reactNativePath)) {
  console.error(`❌ React Native 路径不存在: ${reactNativePath}`);
  process.exit(1);
}

// 需要修复的文件列表
const problematicFiles = [
  'React/Fabric/Mounting/ComponentViews/UnimplementedComponent/RCTUnimplementedNativeComponentView.h',
  'React/Fabric/Mounting/ComponentViews/UnimplementedComponent/RCTUnimplementedNativeComponentView.mm',
  'React/Fabric/Mounting/ComponentViews/TextInput/RCTTextInputComponentView.h',
  'React/Fabric/Mounting/ComponentViews/TextInput/RCTTextInputComponentView.mm',
  'React/Fabric/Mounting/ComponentViews/UnimplementedView/RCTUnimplementedViewComponentView.h',
  'React/Fabric/Mounting/ComponentViews/UnimplementedView/RCTUnimplementedViewComponentView.mm'
];

function fixConditionalCompilation(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ 文件不存在，跳过: ${filePath}`);
    return false;
  }

  // 备份原始文件
  const backupPath = filePath + '.backup';
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // 检查是否有未终止的 #if RCT_NEW_ARCH_ENABLED
  const ifCount = (content.match(/#if\s+RCT_NEW_ARCH_ENABLED/g) || []).length;
  const endifCount = (content.match(/#endif/g) || []).length;

  if (ifCount > endifCount) {
    console.log(`🔧 修复未终止的条件编译指令: ${path.relative(reactNativePath, filePath)}`);
    
    // 如果文件末尾没有 #endif，添加一个
    if (!content.trim().endsWith('#endif') && !content.includes('#endif // RCT_NEW_ARCH_ENABLED')) {
      // 确保文件末尾有换行符
      if (!content.endsWith('\n')) {
        content += '\n';
      }
      content += '#endif // RCT_NEW_ARCH_ENABLED\n';
      modified = true;
    }
  }

  // 检查是否有孤立的条件编译指令在文件开头
  const lines = content.split('\n');
  
  // 如果第一行或第二行是 #if RCT_NEW_ARCH_ENABLED，但没有适当的头部信息
  if (lines.length > 0 && (lines[0].includes('#if RCT_NEW_ARCH_ENABLED') || 
      (lines.length > 1 && lines[1].includes('#if RCT_NEW_ARCH_ENABLED')))) {
    
    // 重新构建文件内容，确保正确的条件编译结构
    const className = path.basename(filePath, path.extname(filePath));
    const isHeader = filePath.endsWith('.h');
    
    if (isHeader) {
      // 为头文件创建正确的结构
      content = `/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED

#import <React/RCTViewComponentView.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface ${className} : RCTViewComponentView

@end

NS_ASSUME_NONNULL_END

#endif // RCT_NEW_ARCH_ENABLED
`;
    } else {
      // 为实现文件创建正确的结构
      content = `/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED

#import "${className}.h"

@implementation ${className}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    // 初始化代码
  }
  return self;
}

@end

#endif // RCT_NEW_ARCH_ENABLED
`;
    }
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ 已修复: ${path.relative(reactNativePath, filePath)}`);
    return true;
  }

  return false;
}

function main() {
  try {
    console.log('🚀 开始修复 React Native Fabric 条件编译指令...');
    
    let fixedCount = 0;
    
    for (const relativePath of problematicFiles) {
      const fullPath = path.join(reactNativePath, relativePath);
      if (fixConditionalCompilation(fullPath)) {
        fixedCount++;
      }
    }
    
    // 查找其他可能有问题的文件
    console.log('\n🔍 搜索其他可能有问题的Fabric组件文件...');
    const fabricDir = path.join(reactNativePath, 'React/Fabric/Mounting/ComponentViews');
    
    if (fs.existsSync(fabricDir)) {
      function searchDirectory(dir) {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            searchDirectory(fullPath);
          } else if (item.endsWith('.h') || item.endsWith('.mm')) {
            // 检查是否包含问题的条件编译
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const ifCount = (content.match(/#if\s+RCT_NEW_ARCH_ENABLED/g) || []).length;
              const endifCount = (content.match(/#endif/g) || []).length;
              
              if (ifCount > endifCount) {
                const relativePath = path.relative(reactNativePath, fullPath);
                if (!problematicFiles.includes(relativePath)) {
                  console.log(`🔧 发现额外的问题文件: ${relativePath}`);
                  if (fixConditionalCompilation(fullPath)) {
                    fixedCount++;
                  }
                }
              }
            } catch (error) {
              // 忽略读取错误
            }
          }
        }
      }
      
      searchDirectory(fabricDir);
    }
    
    console.log(`\n🎉 修复完成！共修复了 ${fixedCount} 个文件`);
    
    if (fixedCount === 0) {
      console.log('✅ 所有文件的条件编译指令都是正确的');
    }
    
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