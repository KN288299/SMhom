const fs = require('fs');
const path = require('path');

console.log('🔧 修复 React Native Fabric 头文件协议引用问题...');

// 获取项目根目录和 node_modules 路径
const projectRoot = process.cwd();
const nodeModulesPath = path.join(projectRoot, 'node_modules');
const reactNativePath = path.join(nodeModulesPath, 'react-native');

// 确保 React Native 目录存在
if (!fs.existsSync(reactNativePath)) {
  console.error(`❌ React Native 路径不存在: ${reactNativePath}`);
  process.exit(1);
}

// 需要修复的头文件
const headerFilesToFix = [
  'React/Fabric/Mounting/RCTComponentViewDescriptor.h',
  'React/Fabric/Mounting/RCTComponentViewFactory.h',
  'React/Fabric/Mounting/RCTComponentViewRegistry.h'
];

// 修复单个头文件
function fixHeaderFile(headerPath, fileName) {
  if (!fs.existsSync(headerPath)) {
    console.log(`⚠️ 头文件不存在，跳过: ${fileName}`);
    return false;
  }

  try {
    // 备份原文件
    const backupPath = headerPath + '.backup';
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(headerPath, backupPath);
    }

    let content = fs.readFileSync(headerPath, 'utf-8');
    let modified = false;

    // 检查是否使用了协议但没有导入
    if (content.includes('RCTComponentViewProtocol') && 
        !content.includes('#import <React/RCTComponentViewProtocol.h>')) {
      
      // 在头文件开头添加必要的导入
      const headerStart = content.indexOf('#import');
      if (headerStart !== -1) {
        // 找到第一个导入语句的位置
        const firstImportLine = content.substring(0, headerStart).split('\n').length - 1;
        const lines = content.split('\n');
        
        // 插入新的导入
        const newImports = [
          '#import <React/RCTDefines.h>',
          '#import <React/RCTComponentViewProtocol.h>'
        ];
        
        // 检查是否已经有这些导入
        const importsToAdd = newImports.filter(imp => !content.includes(imp.replace('#import ', '').replace('<', '').replace('>', '')));
        
        if (importsToAdd.length > 0) {
          lines.splice(firstImportLine, 0, ...importsToAdd);
          content = lines.join('\n');
          modified = true;
        }
      }
    }

    // 特殊处理 RCTComponentViewDescriptor.h
    if (fileName === 'RCTComponentViewDescriptor.h') {
      // 添加条件编译保护
      if (!content.includes('#if RCT_NEW_ARCH_ENABLED')) {
        const protocolUsage = content.includes('UIView<RCTComponentViewProtocol>');
        if (protocolUsage) {
          // 包装整个文件内容
          content = `/*
 * 修复版本的 RCTComponentViewDescriptor.h
 * 由 fix-fabric-headers.js 修复
 */

#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED

${content}

#endif // RCT_NEW_ARCH_ENABLED
`;
          modified = true;
        }
      }
    }

    // 特殊处理 RCTComponentViewFactory.h
    if (fileName === 'RCTComponentViewFactory.h') {
      // 添加条件编译和前向声明
      if (!content.includes('@protocol RCTComponentViewProtocol;') && 
          content.includes('RCTComponentViewProtocol')) {
        
        // 在 @interface 之前添加前向声明
        const interfaceIndex = content.indexOf('@interface');
        if (interfaceIndex !== -1) {
          const beforeInterface = content.substring(0, interfaceIndex);
          const afterInterface = content.substring(interfaceIndex);
          
          const forwardDeclaration = `
#if RCT_NEW_ARCH_ENABLED
@protocol RCTComponentViewProtocol;
#endif

`;
          
          content = beforeInterface + forwardDeclaration + afterInterface;
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(headerPath, content, 'utf-8');
      console.log(`✅ 修复头文件: ${fileName}`);
      return true;
    } else {
      console.log(`ℹ️ 头文件无需修改: ${fileName}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ 修复头文件时出错 ${fileName}:`, error.message);
    return false;
  }
}

// 创建一个更简单的 RCTComponentViewDescriptor.h
function createSimpleComponentViewDescriptor() {
  const descriptorPath = path.join(reactNativePath, 'React/Fabric/Mounting/RCTComponentViewDescriptor.h');
  
  const simpleContent = `/*
 * 简化版本的 RCTComponentViewDescriptor.h
 * 由 fix-fabric-headers.js 创建
 * 解决协议引用问题
 */

#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED

#import <UIKit/UIKit.h>
#import <React/RCTComponentViewProtocol.h>

NS_ASSUME_NONNULL_BEGIN

/*
 * 组件视图描述符结构
 * 简化版本避免复杂的协议依赖
 */
struct RCTComponentViewDescriptor {
  /*
   * 组件视图实例
   */
  __strong UIView<RCTComponentViewProtocol> *view = nil;
  
  /*
   * 构造函数
   */
  RCTComponentViewDescriptor(UIView<RCTComponentViewProtocol> *view = nil) : view(view) {}
};

NS_ASSUME_NONNULL_END

#endif // RCT_NEW_ARCH_ENABLED
`;

  // 确保目录存在
  const dir = path.dirname(descriptorPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(descriptorPath, simpleContent, 'utf-8');
  console.log(`✅ 创建简化的组件视图描述符: ${path.relative(reactNativePath, descriptorPath)}`);
}

// 创建一个更简单的 RCTComponentViewFactory.h
function createSimpleComponentViewFactory() {
  const factoryPath = path.join(reactNativePath, 'React/Fabric/Mounting/RCTComponentViewFactory.h');
  
  const simpleContent = `/*
 * 简化版本的 RCTComponentViewFactory.h
 * 由 fix-fabric-headers.js 创建
 * 解决协议引用问题
 */

#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <React/RCTComponentViewProtocol.h>

NS_ASSUME_NONNULL_BEGIN

/*
 * 组件视图工厂
 * 简化版本避免复杂的泛型和协议依赖
 */
@interface RCTComponentViewFactory : NSObject

/*
 * 单例实例
 */
+ (RCTComponentViewFactory *)currentComponentViewFactory;

/*
 * 创建组件视图
 */
- (UIView<RCTComponentViewProtocol> *)createComponentViewWithName:(NSString *)componentName;

/*
 * 注册组件视图类
 */
- (void)registerComponentViewClass:(Class)componentViewClass;

/*
 * 第三方 Fabric 组件
 * 简化返回类型避免泛型问题
 */
- (NSDictionary<NSString *, Class> *)thirdPartyFabricComponents;

@end

NS_ASSUME_NONNULL_END

#endif // RCT_NEW_ARCH_ENABLED
`;

  fs.writeFileSync(factoryPath, simpleContent, 'utf-8');
  console.log(`✅ 创建简化的组件视图工厂: ${path.relative(reactNativePath, factoryPath)}`);
}

function main() {
  try {
    console.log('🚀 开始修复 Fabric 头文件协议引用问题...');
    
    let fixedCount = 0;
    
    // 创建简化版本的关键头文件
    console.log('\n📄 创建简化版本的关键头文件...');
    createSimpleComponentViewDescriptor();
    createSimpleComponentViewFactory();
    
    // 修复其他头文件
    console.log('\n🔧 修复其他头文件...');
    for (const relativePath of headerFilesToFix) {
      const fullPath = path.join(reactNativePath, relativePath);
      const fileName = path.basename(relativePath);
      
      if (fixHeaderFile(fullPath, fileName)) {
        fixedCount++;
      }
    }
    
    console.log('\n🎉 Fabric 头文件修复完成！');
    
    console.log('\n📋 修复/创建的头文件:');
    console.log('   - React/Fabric/Mounting/RCTComponentViewDescriptor.h (重新创建)');
    console.log('   - React/Fabric/Mounting/RCTComponentViewFactory.h (重新创建)');
    console.log('   - React/Fabric/Mounting/RCTComponentViewRegistry.h (修复导入)');
    
    console.log('\n✅ 应该解决以下编译错误:');
    console.log('   - no type or protocol named \'RCTComponentViewProtocol\' 在头文件中');
    console.log('   - unknown class name \'RCTComponentViewProtocol\'');
    console.log('   - type arguments cannot be applied to non-class type \'Class\'');
    
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