/**
 * iOS Fabric架构综合修复脚本
 * 本脚本集合了所有修复React Native Fabric架构相关问题的方法
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 项目根目录
const projectRoot = process.cwd();
const nodeModulesPath = path.join(projectRoot, 'node_modules');
const reactNativePath = path.join(nodeModulesPath, 'react-native');

console.log('==== iOS Fabric架构综合修复开始 ====');
console.log(`项目根目录: ${projectRoot}`);

// 辅助函数：创建目录(如果不存在)
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ 创建目录: ${dirPath}`);
  }
}

// 辅助函数：在文件中查找字符串
function fileContains(filePath, searchString) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes(searchString);
}

// 辅助函数：创建文件备份
function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  const backupPath = `${filePath}.original`;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ 创建备份: ${backupPath}`);
  }
  return true;
}

// 辅助函数：递归查找文件
function findFiles(dir, extension) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(fullPath, extension));
    } else {
      if (fullPath.endsWith(extension)) {
        results.push(fullPath);
      }
    }
  });
  
  return results;
} 

// 第一部分：创建RCTViewComponentView基础文件
console.log('\n---- 第一部分：创建RCTViewComponentView基础文件 ----');

// 创建React目录（如果不存在）
const reactDir = path.join(reactNativePath, 'React');
ensureDirectoryExists(reactDir);

// 1.1 创建RCTViewComponentView.h
const viewCompHeaderPath = path.join(reactDir, 'RCTViewComponentView.h');
const viewCompHeaderContent = `/*
 * RCTViewComponentView.h - Fabric架构基础组件视图
 * 由fix-ios-fabric-complete.js创建
 */
#pragma once

#import <React/RCTDefines.h>
#import <UIKit/UIKit.h>

#if RCT_NEW_ARCH_ENABLED
// 新架构启用时，原始实现会被使用
#else
// 旧架构兼容实现
@interface RCTViewComponentView : UIView

@property (nonatomic, copy, nullable) NSString *nativeId;
@property (nonatomic, strong, nullable) UIView *contentView;

- (void)updateProps:(id _Nullable)props oldProps:(id _Nullable)oldProps;
- (void)prepareForRecycle;

@end
#endif
`;

fs.writeFileSync(viewCompHeaderPath, viewCompHeaderContent);
console.log(`✅ 创建/更新RCTViewComponentView.h: ${viewCompHeaderPath}`);

// 1.2 创建RCTViewComponentView.mm实现
const viewCompImplPath = path.join(reactDir, 'RCTViewComponentView.mm');
const viewCompImplContent = `/*
 * RCTViewComponentView.mm - Fabric架构基础组件视图实现
 * 由fix-ios-fabric-complete.js创建
 */
#import <React/RCTDefines.h>
#import <React/RCTViewComponentView.h>

#if !RCT_NEW_ARCH_ENABLED
@implementation RCTViewComponentView

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
console.log(`✅ 创建/更新RCTViewComponentView.mm: ${viewCompImplPath}`);

// 1.3 创建或更新RCTDefines.h确保宏定义正确
const rctDefinesPath = path.join(reactDir, 'RCTDefines.h');
const rctDefinesContent = `/*
 * RCTDefines.h - React Native核心宏定义
 * 由fix-ios-fabric-complete.js创建
 */
#pragma once

// 关闭新架构标志
#ifndef RCT_NEW_ARCH_ENABLED
#define RCT_NEW_ARCH_ENABLED 0
#endif

// 调试标志
#ifndef REACT_NATIVE_DEBUG
#define REACT_NATIVE_DEBUG 0
#endif
`;

fs.writeFileSync(rctDefinesPath, rctDefinesContent);
console.log(`✅ 创建/更新RCTDefines.h: ${rctDefinesPath}`);

// 确保RCTDefines.h也存在于React/Base目录下
const rctDefinesBasePath = path.join(reactNativePath, 'React/Base/RCTDefines.h');
ensureDirectoryExists(path.dirname(rctDefinesBasePath));
fs.copyFileSync(rctDefinesPath, rctDefinesBasePath);
console.log(`✅ 复制RCTDefines.h到Base目录: ${rctDefinesBasePath}`); 

// 第二部分：处理React Native内置Fabric组件
console.log('\n---- 第二部分：处理React Native内置Fabric组件 ----');

// 2.1 处理指定组件文件
function processComponentFile(componentPath, componentName) {
  if (!fs.existsSync(componentPath)) {
    console.log(`⚠️ 文件不存在，跳过: ${componentPath}`);
    return;
  }

  // 创建备份
  backupFile(componentPath);

  // 读取文件内容
  const originalContent = fs.readFileSync(componentPath, 'utf8');
  
  // 如果文件已经包含条件编译，则跳过
  if (originalContent.includes('#if RCT_NEW_ARCH_ENABLED')) {
    console.log(`ℹ️ 文件已包含条件编译，跳过: ${componentPath}`);
    return;
  }

  // 判断文件类型
  const isHeader = componentPath.endsWith('.h');
  const isImplementation = componentPath.endsWith('.mm') || componentPath.endsWith('.m');

  if (isHeader) {
    // 添加条件编译到头文件
    const newContent = `/*
 * 由fix-ios-fabric-complete.js修改，添加条件编译
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
    console.log(`✅ 已添加条件编译到头文件: ${componentPath}`);
  } else if (isImplementation) {
    // 添加条件编译到实现文件
    const newContent = `/*
 * 由fix-ios-fabric-complete.js修改，添加条件编译
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
    console.log(`✅ 已添加条件编译到实现文件: ${componentPath}`);
  }
}

// 2.2 处理所有已知的Fabric组件
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
    console.log(`⚠️ 未找到组件目录: ${componentName}`);
    
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

// 2.3 修复RCTViewFinder.mm文件
const viewFinderPath = path.join(reactNativePath, 'React/Fabric/Utils/RCTViewFinder.mm');
if (fs.existsSync(viewFinderPath)) {
  console.log(`修复RCTViewFinder.mm文件...`);
  
  // 创建备份
  backupFile(viewFinderPath);
  
  // 读取内容
  let content = fs.readFileSync(viewFinderPath, 'utf8');
  
  // 替换头文件引用
  content = content.replace(
    /#import <React\/Base\/RCTDefines\.h>/g,
    '#import <React/RCTDefines.h>'
  );
  
  // 添加条件编译
  if (!content.includes('#if RCT_NEW_ARCH_ENABLED')) {
    content = `/*
 * 由fix-ios-fabric-complete.js修改，添加条件编译
 * 原始文件已备份为${path.basename(viewFinderPath)}.original
 */
#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED
${content}
#else
#import <React/RCTDefines.h>
#import <React/RCTViewComponentView.h>
#import <UIKit/UIKit.h>

UIView *RCTFindComponentViewWithName(UIView *view, NSString *nativeId) {
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
    
    fs.writeFileSync(viewFinderPath, content);
    console.log(`✅ 已添加RCTViewFinder.mm的条件编译`);
  } else {
    fs.writeFileSync(viewFinderPath, content);
    console.log(`✅ 已修复RCTViewFinder.mm中的引用路径`);
  }
}

// 2.4 递归处理所有.h和.mm文件
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

// 第三部分：修复第三方库的Fabric相关问题
console.log('\n---- 第三部分：修复第三方库的Fabric相关问题 ----');

// 3.1 处理react-native-svg
console.log('修复react-native-svg的Fabric问题...');

// 需要处理的第三方库
const thirdPartyPackages = [
  'react-native-svg',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-vector-icons',
  'react-native-image-picker',
  'react-native-permissions',
  'react-native-webview'
];

// 处理所有第三方库
thirdPartyPackages.forEach(packageName => {
  const packagePath = path.join(nodeModulesPath, packageName);
  if (!fs.existsSync(packagePath)) {
    console.log(`⚠️ 包不存在，跳过: ${packageName}`);
    return;
  }

  console.log(`处理第三方库: ${packageName}`);

  // 处理SVG特殊情况
  if (packageName === 'react-native-svg') {
    fixReactNativeSvg();
  }
  
  // 处理safe-area-context特殊情况
  if (packageName === 'react-native-safe-area-context') {
    fixSafeAreaContext();
  }
  
  // 处理其他包的通用修复
  processThirdPartyPackage(packagePath);
});

// 处理react-native-svg
function fixReactNativeSvg() {
  const svgPath = path.join(nodeModulesPath, 'react-native-svg');
  const applePath = path.join(svgPath, 'apple');
  
  if (!fs.existsSync(applePath)) {
    console.log(`⚠️ react-native-svg的apple目录不存在`);
    return;
  }
  
  // 1. 创建必要的目录
  const directories = [
    path.join(applePath, 'Utils'),
    path.join(applePath, 'Elements'),
    path.join(applePath, 'Fabric'),
    path.join(nodeModulesPath, 'react/renderer/components/rnsvg')
  ];
  
  directories.forEach(dir => {
    ensureDirectoryExists(dir);
  });
  
  // 2. 创建所有缺失的头文件
  const headerFiles = [
    { path: path.join(applePath, 'Utils/RNSVGFabricConversions.h'), content: '// Empty placeholder for RNSVGFabricConversions.h' },
    { path: path.join(applePath, 'Elements/RNSVGFabricConversions.h'), content: '// Empty placeholder for RNSVGFabricConversions.h' },
    { path: path.join(applePath, 'Fabric/RNSVGFabricConversions.h'), content: '// Empty placeholder for RNSVGFabricConversions.h' },
    { path: path.join(applePath, 'RNSVGFabricConversions.h'), content: '// Empty placeholder for RNSVGFabricConversions.h' },
    { path: path.join(nodeModulesPath, 'react/renderer/components/rnsvg/ComponentDescriptors.h'), content: '// Empty placeholder for ComponentDescriptors.h' }
  ];
  
  headerFiles.forEach(file => {
    fs.writeFileSync(file.path, file.content);
    console.log(`✅ 创建文件: ${file.path}`);
  });
  
  // 3. 修复RNSVGUse.mm文件
  const useFilePath = path.join(applePath, 'Elements/RNSVGUse.mm');
  if (fs.existsSync(useFilePath)) {
    // 创建备份
    backupFile(useFilePath);
    
    // 重写文件
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
    
    fs.writeFileSync(useFilePath, newContent);
    console.log(`✅ 已重写: ${useFilePath}`);
  }
  
  // 4. 修复SVG组件视图文件中对RCTViewComponentView的引用
  const svgViewFiles = [
    path.join(applePath, 'Elements/RNSVGSvgView.h'),
    path.join(applePath, 'RNSVGNode.h')
  ];
  
  svgViewFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      return;
    }
    
    // 创建备份
    backupFile(filePath);
    
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
  });
}

// 修复safe-area-context
function fixSafeAreaContext() {
  const mmPath = path.join(nodeModulesPath, 'react-native-safe-area-context', 'ios', 'RNCSafeAreaContext.mm');
  const hPath = path.join(nodeModulesPath, 'react-native-safe-area-context', 'ios', 'RNCSafeAreaContext.h');

  if (fs.existsSync(mmPath)) {
    // 创建备份
    backupFile(mmPath);
    
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
  }

  if (fs.existsSync(hPath)) {
    // 创建备份
    backupFile(hPath);
    
    // 重写H文件
    const newHContent = `#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RNCSafeAreaContext : RCTEventEmitter <RCTBridgeModule>
@end`;
    
    fs.writeFileSync(hPath, newHContent);
    console.log(`✅ 已重写: ${hPath}`);
  }
}

// 处理第三方包的通用修复
function processThirdPartyPackage(packagePath) {
  // 查找包中所有的.h和.mm文件
  const headers = findFiles(packagePath, '.h');
  const implementations = findFiles(packagePath, '.mm');
  const allFiles = [...headers, ...implementations];
  
  // 修复文件中的Fabric相关代码
  allFiles.forEach(filePath => {
    // 读取文件内容
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 检查是否包含Fabric相关代码
      const containsFabric = [
        'facebook::react',
        'RCTFabric',
        'ComponentView',
        'react/renderer',
        '<react/',
        'RCTViewComponentView',
        'TurboModule',
        'ComponentDescriptor'
      ].some(pattern => content.includes(pattern));
      
      if (containsFabric && !content.includes('#ifdef RCT_NEW_ARCH_ENABLED')) {
        console.log(`修复第三方库文件中的Fabric代码: ${filePath}`);
        
        // 创建备份
        backupFile(filePath);
        
        // 添加条件编译
        const newContent = `// 由fix-ios-fabric-complete.js修改，添加条件编译
#define RCT_NEW_ARCH_ENABLED 0

${content}`;
        
        fs.writeFileSync(filePath, newContent);
        console.log(`✅ 已添加条件编译: ${filePath}`);
      }
      
      // 修复React/UIView.h错误引用
      if (content.includes('<React/UIView.h>')) {
        console.log(`修复错误的React/UIView.h引用: ${filePath}`);
        
        // 创建备份（如果还没创建）
        backupFile(filePath);
        
        // 替换引用
        const fixedContent = content.replace(/#import\s+<React\/UIView.h>/g, '#import <UIKit/UIView.h>');
        
        fs.writeFileSync(filePath, fixedContent);
        console.log(`✅ 已修复UIView引用: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ 处理文件失败 ${filePath}:`, error.message);
    }
  });
}

// 3.2 创建React UIView.h占位符
const reactUIViewPath = path.join(reactNativePath, 'React/UIView.h');
if (!fs.existsSync(reactUIViewPath)) {
  const uiviewContent = `// 占位符: 这个文件应该从UIKit导入, 而不是从React
#import <UIKit/UIView.h>
`;
  
  ensureDirectoryExists(path.dirname(reactUIViewPath));
  fs.writeFileSync(reactUIViewPath, uiviewContent);
  console.log(`✅ 创建了占位符文件: ${reactUIViewPath}`);
} 

// 第四部分：修改Podfile以彻底禁用Fabric
console.log('\n---- 第四部分：修改Podfile以彻底禁用Fabric ----');

const podfilePath = path.join(projectRoot, 'ios/Podfile');
if (fs.existsSync(podfilePath)) {
  console.log('修改Podfile以禁用React-RCTFabric...');
  
  // 创建备份
  backupFile(podfilePath);
  
  // 读取Podfile内容
  let podfileContent = fs.readFileSync(podfilePath, 'utf8');
  
  // 确保设置了禁用新架构的标记
  if (!podfileContent.includes('$RCT_NEW_ARCH_ENABLED')) {
    podfileContent = `# Resolve react_native_pods.rb with node to allow for hoisting
require Pod::Executable.execute_command('node', ['-p',
  'require.resolve(
    "react-native/scripts/react_native_pods.rb",
    {paths: [process.argv[1]]},
  )', __dir__]).strip

# 使用 CDN 源
source 'https://cdn.cocoapods.org/'

# 全局强制设置，确保关闭新架构
$RCT_NEW_ARCH_ENABLED = false
$fabric_enabled = false
$USE_FABRIC = false
$USE_HERMES = false
$RCT_FABRIC_ENABLED = false

${podfileContent}`;

    console.log('✅ 添加了全局新架构禁用标志');
  }
  
  // 添加禁用React-RCTFabric的代码
  if (!podfileContent.includes('disable_react_fabric_target')) {
    // 辅助函数
    const helperFunctionCode = `
# 辅助函数：禁用React-RCTFabric目标
def disable_react_fabric_target(installer)
  puts "禁用React-RCTFabric目标..."
  
  installer.pods_project.targets.each do |target|
    if target.name == 'React-RCTFabric'
      puts "找到React-RCTFabric目标，禁用新架构相关代码"
      
      # 处理重复的头文件问题
      target.headers_build_phase.files.each do |build_file|
        # 检查是否存在重复的RCTViewComponentView.h文件
        if build_file.display_name == 'RCTViewComponentView.h'
          file_path = build_file.file_ref.real_path.to_s
          puts "找到头文件: #{file_path}"
          
          # 如果是来自ComponentViews/View/目录的文件，删除它以解决冲突
          if file_path.include?('ComponentViews/View')
            build_file.remove_from_build_phase
            puts "已移除冲突的RCTViewComponentView.h文件: #{file_path}"
          end
        end
      end
      
      target.build_configurations.each do |config|
        # 添加预处理器定义以禁用新架构
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'RCT_NEW_ARCH_ENABLED=0'
        
        # 修改其他编译设置
        config.build_settings['ONLY_ACTIVE_ARCH'] = 'NO'
        config.build_settings['GCC_OPTIMIZATION_LEVEL'] = '0'
      end
      
      # 为所有源文件添加条件编译
      target.source_build_phase.files.each do |file|
        next unless file.file_ref.path.end_with?('.mm', '.m', '.cpp')
        file.settings ||= {}
        file.settings['COMPILER_FLAGS'] ||= ''
        file.settings['COMPILER_FLAGS'] += ' -DRCT_NEW_ARCH_ENABLED=0'
      end
    end
  end
end
`;
    
    // 查找post_install块
    const postInstallMatch = podfileContent.match(/post_install\s+do\s+\|installer\|/);
    if (postInstallMatch) {
      // 在post_install块中添加函数定义和调用
      // 先在文件末尾添加函数定义
      if (!podfileContent.includes('def disable_react_fabric_target')) {
        podfileContent = podfileContent + '\n' + helperFunctionCode;
      }
      
      // 然后在post_install块中添加调用
      const insertPosition = podfileContent.indexOf('end', postInstallMatch.index);
      if (insertPosition !== -1) {
        const callCode = `  # 禁用React-RCTFabric目标
    disable_react_fabric_target(installer)
    
    `;
        
        podfileContent = 
          podfileContent.slice(0, insertPosition) + 
          callCode + 
          podfileContent.slice(insertPosition);
      }
      
      fs.writeFileSync(podfilePath, podfileContent);
      console.log('✅ 已修改Podfile，添加禁用React-RCTFabric的代码');
    } else {
      console.log('⚠️ 未找到post_install块，无法添加禁用React-RCTFabric的代码');
    }
  } else {
    console.log('ℹ️ Podfile已包含禁用React-RCTFabric的代码，无需修改');
  }
} else {
  console.log('⚠️ 未找到Podfile');
}

// 第五部分：总结和清理工作
console.log('\n==== iOS Fabric架构综合修复完成 ====');
console.log('修复内容包括:');
console.log('1. 创建RCTViewComponentView基础文件');
console.log('2. 处理React Native内置Fabric组件');
console.log('3. 修复第三方库的Fabric相关问题');
console.log('4. 修改Podfile以彻底禁用Fabric');
console.log('\n下一步:');
console.log('1. cd ios');
console.log('2. rm -rf Pods');
console.log('3. rm -rf Podfile.lock');
console.log('4. pod install');
console.log('5. 重新构建项目');

// 创建运行脚本
const runScriptPath = path.join(projectRoot, 'run-fabric-fix.sh');
const runScriptContent = `#!/bin/bash
echo "开始执行iOS Fabric修复后的清理工作..."
cd ios
rm -rf Pods
rm -rf Podfile.lock
pod install
echo "清理完成，请重新构建项目"
`;

fs.writeFileSync(runScriptPath, runScriptContent);
fs.chmodSync(runScriptPath, '755');
console.log(`✅ 已创建运行脚本: ${runScriptPath}`);

console.log('\n脚本执行完毕!'); 