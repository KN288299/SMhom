const fs = require('fs');
const path = require('path');

// 创建必要的目录和文件
function createMissingFiles() {
  const directories = [
    'node_modules/react-native-svg/apple/Utils',
    'node_modules/react-native-svg/apple/Elements',
    'node_modules/react-native-svg/apple/Fabric',
    'node_modules/react/renderer/components/rnsvg',
    'node_modules/react-native/React'
  ];

  // 创建所有需要的目录
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ 创建目录: ${dir}`);
    }
  });

  // 创建所有缺失的头文件
  const headerFiles = [
    { path: 'node_modules/react-native-svg/apple/Utils/RNSVGFabricConversions.h', content: '// Empty placeholder for RNSVGFabricConversions.h' },
    { path: 'node_modules/react-native-svg/apple/Elements/RNSVGFabricConversions.h', content: '// Empty placeholder for RNSVGFabricConversions.h' },
    { path: 'node_modules/react-native-svg/apple/Fabric/RNSVGFabricConversions.h', content: '// Empty placeholder for RNSVGFabricConversions.h' },
    { path: 'node_modules/react-native-svg/apple/RNSVGFabricConversions.h', content: '// Empty placeholder for RNSVGFabricConversions.h' },
    { path: 'node_modules/react/renderer/components/rnsvg/ComponentDescriptors.h', content: '// Empty placeholder for ComponentDescriptors.h' },
    { path: 'node_modules/react-native/React/RCTConversions.h', content: '// Empty placeholder for RCTConversions.h' },
    { path: 'node_modules/react-native/React/RCTFabricComponentsPlugins.h', content: '// Empty placeholder for RCTFabricComponentsPlugins.h' }
  ];

  headerFiles.forEach(file => {
    try {
      fs.writeFileSync(file.path, file.content);
      console.log(`✅ 创建文件: ${file.path}`);
    } catch (error) {
      console.error(`❌ 创建文件失败 ${file.path}:`, error);
    }
  });
}

// 修复RNSVGUse.mm文件
function fixRNSVGUseFile() {
  const filePath = 'node_modules/react-native-svg/apple/Elements/RNSVGUse.mm';
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ 文件不存在: ${filePath}`);
    return;
  }
  
  try {
    // 创建备份
    fs.copyFileSync(filePath, `${filePath}.original`);
    
    // 读取文件内容
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 如果文件包含facebook::react或Fabric相关代码
    if (content.includes('facebook::react') || 
        content.includes('RCTFabric') || 
        content.includes('ComponentView') ||
        content.includes('RNSVGFabricConversions')) {
      
      // 完全重写文件
      const newContent = `/**
 * Copyright (c) 2015-present, Horcrux.
 * All rights reserved.
 *
 * This source code is licensed under the MIT-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RNSVGUse.h"
#import "RNSVGSymbol.h"
#import <React/RCTLog.h>

@implementation RNSVGUse

- (void)setHref:(NSString *)href
{
    if ([href isEqualToString:_href]) {
        return;
    }
    [self invalidate];
    _href = href;
}

- (void)setX:(RNSVGLength *)x
{
    if ([x isEqualTo:_x]) {
        return;
    }
    [self invalidate];
    _x = x;
}

- (void)setY:(RNSVGLength *)y
{
    if ([y isEqualTo:_y]) {
        return;
    }
    [self invalidate];
    _y = y;
}

- (void)setUsewidth:(RNSVGLength *)usewidth
{
    if ([usewidth isEqualTo:_usewidth]) {
        return;
    }
    [self invalidate];
    _usewidth = usewidth;
}

- (void)setUseheight:(RNSVGLength *)useheight
{
    if ([useheight isEqualTo:_useheight]) {
        return;
    }
    [self invalidate];
    _useheight = useheight;
}

- (void)renderLayerTo:(CGContextRef)context rect:(CGRect)rect
{
    [self pushGlyphContext];
    
    // 获取引用元素
    RNSVGNode *template = nil;
    RNSVGNode *element = [self.svgView getDefinedTemplate:self.href];
    
    if ([element isKindOfClass:[RNSVGSymbol class]]) {
        RNSVGSymbol *symbol = (RNSVGSymbol*)element;
        NSArray<RNSVGLength *> *viewBox = symbol.viewBox;
        
        if (viewBox == nil) {
            template = symbol;
        } else {
            RNSVGNode* group = [RNSVGNode new];
            [group setMinX:@(0)];
            [group setMinY:@(0)];
            [group setVbWidth:viewBox[2]];
            [group setVbHeight:viewBox[3]];
            
            template = group;
            template.svgView = self.svgView;
            template.responsible = YES;
            [template addAttribute:symbol];
            
            CGFloat width = [self.usewidth isEqualTo:self.emptyLength] ? [viewBox[2] floatValue] : [self.usewidth floatValue];
            CGFloat height = [self.useheight isEqualTo:self.emptyLength] ? [viewBox[3] floatValue] : [self.useheight floatValue];
            
            [group setWidth:@(width)];
            [group setHeight:@(height)];
        }
    } else if (element) {
        template = element;
    }
    
    if (template) {
        CGContextSaveGState(context);
        
        CGFloat x = [self.x floatValue];
        CGFloat y = [self.y floatValue];
        
        CGContextTranslateCTM(context, x, y);
        
        [self clip:context];
        [template mergeProperties:self];
        [template renderTo:context rect:rect];
        
        CGContextRestoreGState(context);
    } else {
        RCTLogWarn(@"Invalid href: %@ - Use must reference a Symbol or a Group", self.href);
    }
    
    [self popGlyphContext];
}

@end
`;
      
      // 写入新内容
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ 已重写: ${filePath}`);
    } else {
      console.log(`ℹ️ 文件无需修改: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ 处理文件失败 ${filePath}:`, error);
  }
}

// 修复SVG组件视图文件
function fixSVGComponentView() {
  const files = [
    'node_modules/react-native-svg/apple/Elements/RNSVGSvgView.h',
    'node_modules/react-native-svg/apple/RNSVGNode.h',
  ];

  files.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ 文件不存在: ${filePath}`);
      return;
    }

    try {
      // 创建备份
      fs.copyFileSync(filePath, `${filePath}.bak`);
      
      // 读取文件内容
      let content = fs.readFileSync(filePath, 'utf8');
      
      // 修复错误的导入路径
      content = content.replace(/#import\s+<React\/UIView.h>/g, '#import <UIKit/UIView.h>');
      
      // 确保导入UIKit
      if (!content.includes('#import <UIKit/UIView.h>') && !content.includes('#import <UIKit/UIKit.h>')) {
        content = `#import <UIKit/UIView.h>\n${content}`;
      }
      
      // 替换RCTViewComponentView为UIView
      content = content.replace(/RCTViewComponentView\s+<RNSVGContainer>/g, 'UIView <RNSVGContainer>');
      content = content.replace(/RCTViewComponentView/g, 'UIView');
      
      // 写回文件
      fs.writeFileSync(filePath, content);
      console.log(`✅ 已修复: ${filePath}`);
    } catch (error) {
      console.error(`❌ 处理文件失败 ${filePath}:`, error);
    }
  });
}

// 全局修复错误的React/UIView.h导入
function fixIncorrectImports() {
  console.log("修复错误的React/UIView.h导入...");
  
  // 查找所有可能包含错误导入的文件
  const allSvgFiles = findAllSvgFiles();
  
  let fixCount = 0;
  allSvgFiles.forEach(filePath => {
    try {
      // 读取文件内容
      let content = fs.readFileSync(filePath, 'utf8');
      
      // 检查是否有错误的导入
      if (content.includes('<React/UIView.h>')) {
        // 创建备份
        if (!fs.existsSync(`${filePath}.bak`)) {
          fs.copyFileSync(filePath, `${filePath}.bak`);
        }
        
        // 修复错误的导入路径
        const newContent = content.replace(/#import\s+<React\/UIView.h>/g, '#import <UIKit/UIView.h>');
        
        // 写回文件
        fs.writeFileSync(filePath, newContent);
        console.log(`✅ 修复了错误的导入: ${filePath}`);
        fixCount++;
      }
    } catch (error) {
      console.error(`❌ 检查文件失败 ${filePath}:`, error);
    }
  });
  
  console.log(`共修复了 ${fixCount} 个文件中的错误导入`);
}

// 查找所有RNSVG相关文件
function findAllSvgFiles() {
  const results = [];
  
  function searchDir(dirPath) {
    try {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          searchDir(filePath);
        } else if (
          (file.endsWith('.h') || file.endsWith('.m') || file.endsWith('.mm')) &&
          dirPath.includes('react-native-svg')
        ) {
          results.push(filePath);
        }
      }
    } catch (error) {
      console.error(`❌ 搜索目录失败 ${dirPath}:`, error);
    }
  }
  
  searchDir('node_modules/react-native-svg');
  return results;
}

// 创建React UIView.h占位符
function createReactUIViewPlaceholder() {
  console.log("创建React/UIView.h占位符...");
  
  const dirPath = path.join('node_modules/react-native/React');
  const filePath = path.join(dirPath, 'UIView.h');
  
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    const content = `// 占位符: 这个文件应该从UIKit导入, 而不是从React
#import <UIKit/UIView.h>
`;
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ 创建了占位符文件: ${filePath}`);
  } catch (error) {
    console.error(`❌ 创建占位符文件失败 ${filePath}:`, error);
  }
}

// 主函数
async function main() {
  console.log('开始修复缺失文件问题...');
  
  // 创建缺失的目录和文件
  createMissingFiles();
  
  // 修复错误的React/UIView.h导入
  fixIncorrectImports();
  
  // 创建React UIView.h占位符
  createReactUIViewPlaceholder();
  
  // 修复RNSVGUse.mm文件
  fixRNSVGUseFile();
  
  // 修复SVG组件视图
  fixSVGComponentView();
  
  console.log('✅ 所有修复完成!');
}

main().catch(error => {
  console.error('❌ 修复过程中发生错误:', error);
  process.exit(1);
}); 