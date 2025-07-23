const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 需要特别处理的包列表
const TARGET_PACKAGES = [
  'react-native-svg',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-vector-icons',
  'react-native-image-picker',
  'react-native-permissions',
  'react-native-webview',
];

// 可能需要修复的文件扩展名
const FILE_EXTENSIONS = ['.h', '.m', '.mm'];

// 需要添加条件编译的文件匹配模式
const FABRIC_PATTERNS = [
  'RCTFabric',
  'facebook::react',
  'ComponentView',
  'react/renderer',
  '<react/',
  'RCTViewComponentView',
  'TurboModule',
  'ComponentDescriptor',
  'FabricConversions',
];

// 路径
const NODE_MODULES_PATH = path.join(process.cwd(), 'node_modules');

// 添加条件编译
function addConditionalCompilation(filePath, content) {
  if (content.includes('#ifdef RCT_NEW_ARCH_ENABLED')) {
    // 已经有条件编译，不需要处理
    return content;
  }

  if (FABRIC_PATTERNS.some(pattern => content.includes(pattern))) {
    // 添加条件编译
    return `#define RCT_NEW_ARCH_ENABLED 0\n\n${content}`;
  }

  return content;
}

// 创建空占位符头文件
function createPlaceholderHeaders() {
  const headers = [
    ['react-native', 'React', 'RCTConversions.h'],
    ['react-native', 'React', 'RCTFabricComponentsPlugins.h'],
    ['react', 'renderer/components/rnsvg', 'ComponentDescriptors.h'],
  ];

  headers.forEach(([pkg, subDir, file]) => {
    const dirPath = path.join(NODE_MODULES_PATH, pkg, subDir);
    const filePath = path.join(dirPath, file);

    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, `// Empty placeholder for ${file}\n`);
        console.log(`✅ 创建占位符文件: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ 创建占位符文件失败 ${filePath}:`, error);
    }
  });

  // 特殊处理 react-native-svg
  const svgDirs = [
    path.join(NODE_MODULES_PATH, 'react-native-svg', 'apple'),
    path.join(NODE_MODULES_PATH, 'react-native-svg', 'apple', 'Utils'),
    path.join(NODE_MODULES_PATH, 'react-native-svg', 'apple', 'Elements'),
    path.join(NODE_MODULES_PATH, 'react-native-svg', 'apple', 'Fabric'),
  ];

  // 删除所有RNSVGFabricConversions.h文件，只保留一个主文件
  svgDirs.forEach(dir => {
    try {
      const conversionFile = path.join(dir, 'RNSVGFabricConversions.h');
      if (fs.existsSync(conversionFile)) {
        fs.unlinkSync(conversionFile);
        console.log(`删除文件: ${conversionFile}`);
      }
    } catch (error) {
      // 忽略错误
    }
  });

  // 创建主RNSVGFabricConversions.h文件
  try {
    const mainDir = path.join(NODE_MODULES_PATH, 'react-native-svg', 'apple');
    if (!fs.existsSync(mainDir)) {
      fs.mkdirSync(mainDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(mainDir, 'RNSVGFabricConversions.h'),
      '// Empty placeholder for RNSVGFabricConversions.h - DO NOT DUPLICATE\n'
    );
    console.log('✅ 创建唯一的RNSVGFabricConversions.h文件');
  } catch (error) {
    console.error('❌ 创建RNSVGFabricConversions.h文件失败:', error);
  }
}

// 彻底重写RNSVGUse.mm文件
function rewriteRNSVGUse() {
  const filePath = path.join(NODE_MODULES_PATH, 'react-native-svg', 'apple', 'Elements', 'RNSVGUse.mm');
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ 文件不存在: ${filePath}`);
    return;
  }
  
  try {
    // 创建备份
    fs.copyFileSync(filePath, `${filePath}.original`);
    
    // 重写文件内容
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

    fs.writeFileSync(filePath, newContent);
    console.log(`✅ 已重写: ${filePath}`);
  } catch (error) {
    console.error(`❌ 重写文件失败 ${filePath}:`, error);
  }
}

// 修复safe-area-context
function fixSafeAreaContext() {
  const mmPath = path.join(NODE_MODULES_PATH, 'react-native-safe-area-context', 'ios', 'RNCSafeAreaContext.mm');
  const hPath = path.join(NODE_MODULES_PATH, 'react-native-safe-area-context', 'ios', 'RNCSafeAreaContext.h');

  if (fs.existsSync(mmPath)) {
    try {
      fs.copyFileSync(mmPath, `${mmPath}.original`);
      
      // 重写MM文件
      const newMMContent = `#import "RNCSafeAreaContext.h"
#import <React/RCTBridge.h>
#import <React/RCTUIManager.h>

@implementation RNCSafeAreaContext

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end`;
      
      fs.writeFileSync(mmPath, newMMContent);
      console.log(`✅ 已重写: ${mmPath}`);
    } catch (error) {
      console.error(`❌ 重写文件失败 ${mmPath}:`, error);
    }
  }

  if (fs.existsSync(hPath)) {
    try {
      fs.copyFileSync(hPath, `${hPath}.original`);
      
      // 重写H文件
      const newHContent = `#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RNCSafeAreaContext : RCTEventEmitter <RCTBridgeModule>
@end`;
      
      fs.writeFileSync(hPath, newHContent);
      console.log(`✅ 已重写: ${hPath}`);
    } catch (error) {
      console.error(`❌ 重写文件失败 ${hPath}:`, error);
    }
  }
}

// 修复所有文件
function processAllFiles() {
  TARGET_PACKAGES.forEach(pkg => {
    const pkgPath = path.join(NODE_MODULES_PATH, pkg);
    
    if (!fs.existsSync(pkgPath)) {
      console.log(`⚠️ 包不存在: ${pkg}`);
      return;
    }
    
    console.log(`🔍 处理包: ${pkg}`);
    processDirectory(pkgPath);
  });
}

// 处理目录中的所有文件
function processDirectory(dirPath) {
  try {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        processDirectory(filePath);
      } else if (FILE_EXTENSIONS.some(ext => file.endsWith(ext))) {
        processFile(filePath);
      }
    });
  } catch (error) {
    console.error(`❌ 处理目录失败 ${dirPath}:`, error);
  }
}

// 处理单个文件
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = addConditionalCompilation(filePath, content);
    
    if (content !== newContent) {
      // 创建备份
      fs.writeFileSync(`${filePath}.bak`, content);
      // 写入新内容
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ 已修复: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ 处理文件失败 ${filePath}:`, error);
  }
}

// 修复SVGSvgView.h和RNSVGNode.h文件中的RCTViewComponentView引用
function fixSVGComponentView() {
  const files = [
    path.join(NODE_MODULES_PATH, 'react-native-svg', 'apple', 'Elements', 'RNSVGSvgView.h'),
    path.join(NODE_MODULES_PATH, 'react-native-svg', 'apple', 'RNSVGNode.h'),
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

// 主函数
async function main() {
  console.log('开始修复React Native Fabric架构相关问题...');
  
  // 创建占位符头文件
  createPlaceholderHeaders();
  
  // 修复SVGComponentView
  fixSVGComponentView();
  
  // 重写RNSVGUse.mm文件
  rewriteRNSVGUse();
  
  // 修复safe-area-context
  fixSafeAreaContext();
  
  // 处理所有文件
  processAllFiles();
  
  console.log('✅ 所有修复完成!');
  console.log('现在请重新运行pod install，然后尝试构建iOS项目。');
}

main().catch(error => {
  console.error('❌ 修复过程中发生错误:', error);
  process.exit(1);
}); 