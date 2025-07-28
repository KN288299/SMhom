const fs = require('fs');
const path = require('path');

console.log('开始修复React Native Fabric组件的编译问题...');

const reactNativePath = path.join(__dirname, 'node_modules/react-native');

// 1. 查找和修复现有的RCTViewComponentView文件，而非创建新文件
console.log('寻找并修复RCTViewComponentView文件...');

// 可能的RCTViewComponentView.h位置
const possibleViewComponentPaths = [
  path.join(reactNativePath, 'React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.h'),
  path.join(reactNativePath, 'React/Fabric/Mounting/RCTViewComponentView.h')
];

let viewComponentFound = false;

// 检查和修改现有文件
for (const filePath of possibleViewComponentPaths) {
  if (fs.existsSync(filePath)) {
    console.log(`找到RCTViewComponentView.h文件: ${filePath}`);
    
    // 创建备份
    const backupPath = `${filePath}.original`;
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log(`创建了备份: ${backupPath}`);
    }
    
    // 读取文件内容
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否已有条件编译
    if (!content.includes('#if RCT_NEW_ARCH_ENABLED')) {
      // 添加条件编译包装
      content = `
#if RCT_NEW_ARCH_ENABLED

${content}

#endif // RCT_NEW_ARCH_ENABLED

#if !RCT_NEW_ARCH_ENABLED
// 旧架构兼容的简化实现
#import <UIKit/UIKit.h>

@interface RCTViewComponentView : UIView
@property (nonatomic, strong) UIView *contentView;
@property (nonatomic, copy) NSString *nativeId;
- (void)updateProps:(void *)props oldProps:(void *)oldProps;
@end
#endif // !RCT_NEW_ARCH_ENABLED
`;
      fs.writeFileSync(filePath, content);
      console.log(`已修改文件，添加条件编译: ${filePath}`);
    } else {
      console.log(`文件已包含条件编译，无需修改: ${filePath}`);
    }
    
    viewComponentFound = true;
  }
}

// 如果未找到任何现有的文件，创建占位符
if (!viewComponentFound) {
  // 创建RCTViewComponentView.h（如果不存在）
  const viewCompHeaderPath = path.join(reactNativePath, 'React/RCTViewComponentView.h');
  if (!fs.existsSync(viewCompHeaderPath)) {
    const viewCompHeaderContent = `/*
 * 此文件由fix-fabric-components.js创建
 * 用于在禁用Fabric架构时提供兼容性
 */
#import <React/RCTDefines.h>
#import <UIKit/UIKit.h>

#ifndef RCT_NEW_ARCH_ENABLED
#define RCT_NEW_ARCH_ENABLED 0
#endif

#if !RCT_NEW_ARCH_ENABLED
@interface RCTViewComponentView : UIView

@property (nonatomic, copy, nullable) NSString *nativeId;
@property (nonatomic, strong) UIView *contentView;

- (void)updateProps:(id)props oldProps:(id)oldProps;
- (void)prepareForRecycle;

@end
#endif
`;

    // 创建目录
    const dir = path.dirname(viewCompHeaderPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(viewCompHeaderPath, viewCompHeaderContent);
    console.log(`创建了RCTViewComponentView.h文件: ${viewCompHeaderPath}`);
  }

  // 创建RCTViewComponentView.mm（如果不存在）
  const viewCompImplPath = path.join(reactNativePath, 'React/RCTViewComponentView.mm');
  if (!fs.existsSync(viewCompImplPath)) {
    const viewCompImplContent = `/*
 * 此文件由fix-fabric-components.js创建
 * 用于在禁用Fabric架构时提供兼容性
 */
#import <React/RCTDefines.h>
#import <React/RCTViewComponentView.h>

#ifndef RCT_NEW_ARCH_ENABLED
#define RCT_NEW_ARCH_ENABLED 0
#endif

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
  // 空实现
}

- (void)prepareForRecycle
{
  // 空实现
}

- (NSString *)nativeId {
  return _nativeId;
}

- (void)setNativeId:(NSString *)nativeId {
  _nativeId = [nativeId copy];
}

- (UIView *)contentView {
  return _contentView;
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
    console.log(`创建了RCTViewComponentView.mm文件: ${viewCompImplPath}`);
  }
}

// 2. 添加条件编译到UnimplementedComponent文件
const unimplementedComponentFiles = [
  'React/Fabric/Mounting/ComponentViews/UnimplementedComponent/RCTUnimplementedNativeComponentView.h',
  'React/Fabric/Mounting/ComponentViews/UnimplementedComponent/RCTUnimplementedNativeComponentView.mm'
];

unimplementedComponentFiles.forEach(relativePath => {
  const filePath = path.join(reactNativePath, relativePath);
  
  if (fs.existsSync(filePath)) {
    // 创建备份
    const backupPath = `${filePath}.original`;
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log(`创建了备份: ${backupPath}`);
    }
    
    // 读取文件内容
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否已经有条件编译
    if (!content.includes('#if RCT_NEW_ARCH_ENABLED')) {
      // 在文件开头添加条件编译
      content = `
#if RCT_NEW_ARCH_ENABLED

${content}

#endif // RCT_NEW_ARCH_ENABLED
`;
      
      fs.writeFileSync(filePath, content);
      console.log(`添加了条件编译到: ${filePath}`);
    } else {
      console.log(`文件已包含条件编译: ${filePath}`);
    }
  } else {
    console.log(`文件不存在: ${filePath}`);
  }
});

// 3. 修复所有可能引用RCTViewComponentView的文件
const fabricComponentsDir = path.join(reactNativePath, 'React/Fabric/Mounting/ComponentViews');

// 3.1 直接修复RCTViewFinder.mm文件
  const viewFinderPath = path.join(reactNativePath, 'React/Fabric/Utils/RCTViewFinder.mm');
  if (fs.existsSync(viewFinderPath)) {
    console.log(`修复RCTViewFinder.mm文件...`);
    
    // 创建备份
    const backupPath = `${viewFinderPath}.original`;
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(viewFinderPath, backupPath);
      console.log(`创建了备份: ${backupPath}`);
    }
    
    // 完全重写文件内容，确保引入正确
    const newContent = `/*
 * 由fix-fabric-components.js完全重写
 * 原始文件已备份为RCTViewFinder.mm.original
 */
#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED
/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTViewFinder.h"
// 确保导入RCTViewComponentView.h
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
// 旧架构兼容代码
#import <UIKit/UIKit.h>
// 确保导入RCTViewComponentView.h
#import <React/RCTViewComponentView.h>

UIView *RCTFindComponentViewWithName(UIView *view, NSString *nativeId) {
  if (!nativeId) {
    return nil;
  }

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
    
    fs.writeFileSync(viewFinderPath, newContent);
    console.log(`已完全重写RCTViewFinder.mm文件，确保正确导入RCTViewComponentView.h`);
  }

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  entries.forEach(entry => {
    const entryPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // 递归处理子目录
      processDirectory(entryPath);
    } else if (entry.isFile() && 
               (entry.name.endsWith('.h') || entry.name.endsWith('.mm')) &&
               !entry.name.includes('.original')) {
      
      // 检查文件内容是否引用了RCTViewComponentView
      const content = fs.readFileSync(entryPath, 'utf8');
      
      if (content.includes('RCTViewComponentView') && !content.includes('#if RCT_NEW_ARCH_ENABLED')) {
        // 创建备份
        const backupPath = `${entryPath}.original`;
        if (!fs.existsSync(backupPath)) {
          fs.copyFileSync(entryPath, backupPath);
        }
        
        // 添加条件编译
        const updatedContent = `
#if RCT_NEW_ARCH_ENABLED

${content}

#endif // RCT_NEW_ARCH_ENABLED
`;
        
        fs.writeFileSync(entryPath, updatedContent);
        console.log(`添加了条件编译到: ${entryPath}`);
      }
    }
  });
}

// 处理所有Fabric组件目录
processDirectory(fabricComponentsDir);

// 3.2 修复RCTSwitchComponentView文件
const switchComponentDir = path.join(reactNativePath, 'React/Fabric/Mounting/ComponentViews/Switch');
const switchHeaderPath = path.join(switchComponentDir, 'RCTSwitchComponentView.h');
const switchImplPath = path.join(switchComponentDir, 'RCTSwitchComponentView.mm');

// 确保Switch目录存在
if (fs.existsSync(switchComponentDir)) {
  console.log('处理Switch组件文件...');
  
  // 创建或修改Switch组件的头文件
  if (fs.existsSync(switchHeaderPath)) {
    // 创建备份
    const backupPath = `${switchHeaderPath}.original`;
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(switchHeaderPath, backupPath);
      console.log(`创建了备份: ${backupPath}`);
    }
    
    // 读取文件内容
    let content = fs.readFileSync(switchHeaderPath, 'utf8');
    
    // 检查是否已有条件编译
    if (!content.includes('#if RCT_NEW_ARCH_ENABLED')) {
      // 添加条件编译
      content = `
#if RCT_NEW_ARCH_ENABLED

${content}

#endif // RCT_NEW_ARCH_ENABLED

#if !RCT_NEW_ARCH_ENABLED
// 旧架构兼容的简化实现
#import <UIKit/UIKit.h>
#import <React/RCTDefines.h>
#import <React/RCTViewComponentView.h>

// 定义协议，避免编译错误
@protocol RCTSwitchViewProtocol
@required
- (void)setValue:(BOOL)value;
@end

// 定义组件视图
@interface RCTSwitchComponentView : RCTViewComponentView <RCTSwitchViewProtocol>
@end
#endif // !RCT_NEW_ARCH_ENABLED
`;
      fs.writeFileSync(switchHeaderPath, content);
      console.log(`已修改文件，添加条件编译: ${switchHeaderPath}`);
    } else {
      console.log(`文件已包含条件编译，无需修改: ${switchHeaderPath}`);
    }
  } else {
    console.log(`创建Switch组件的头文件: ${switchHeaderPath}`);
    // 创建目录（如果需要）
    if (!fs.existsSync(switchComponentDir)) {
      fs.mkdirSync(switchComponentDir, { recursive: true });
    }
    
    // 创建头文件
    const headerContent = `
#if RCT_NEW_ARCH_ENABLED
// 新架构实现在构建时会被引入
#else
// 旧架构兼容的简化实现
#import <UIKit/UIKit.h>
#import <React/RCTDefines.h>
#import <React/RCTViewComponentView.h>

// 定义协议，避免编译错误
@protocol RCTSwitchViewProtocol
@required
- (void)setValue:(BOOL)value;
@end

// 定义组件视图
@interface RCTSwitchComponentView : RCTViewComponentView <RCTSwitchViewProtocol>
@end
#endif // RCT_NEW_ARCH_ENABLED
`;
    fs.writeFileSync(switchHeaderPath, headerContent);
    console.log(`创建了Switch组件头文件: ${switchHeaderPath}`);
  }
  
  // 创建或修改Switch组件的实现文件
  if (fs.existsSync(switchImplPath)) {
    // 创建备份
    const backupPath = `${switchImplPath}.original`;
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(switchImplPath, backupPath);
      console.log(`创建了备份: ${backupPath}`);
    }
    
    // 读取文件内容
    let content = fs.readFileSync(switchImplPath, 'utf8');
    
    // 检查是否已有条件编译
    if (!content.includes('#if RCT_NEW_ARCH_ENABLED')) {
      // 添加条件编译
      content = `
#if RCT_NEW_ARCH_ENABLED

${content}

#endif // RCT_NEW_ARCH_ENABLED

#if !RCT_NEW_ARCH_ENABLED
// 旧架构兼容的简化实现
#import "RCTSwitchComponentView.h"

@implementation RCTSwitchComponentView {
  UISwitch *_switchView;
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _switchView = [[UISwitch alloc] initWithFrame:self.bounds];
    [_switchView addTarget:self
                   action:@selector(onChange:)
         forControlEvents:UIControlEventValueChanged];
    self.contentView = _switchView;
  }
  return self;
}

- (void)setValue:(BOOL)value {
  _switchView.on = value;
}

- (void)onChange:(UISwitch *)sender {
  // 简化版本，只提供基本功能
  if ([self.superview respondsToSelector:@selector(onSwitchValueChange:)]) {
    [self.superview performSelector:@selector(onSwitchValueChange:) withObject:@(sender.on)];
  }
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  _switchView.on = NO;
}

+ (Class)ComponentViewClass {
  return RCTSwitchComponentView.class;
}

@end
#endif // !RCT_NEW_ARCH_ENABLED
`;
      fs.writeFileSync(switchImplPath, content);
      console.log(`已修改文件，添加条件编译: ${switchImplPath}`);
    } else {
      console.log(`文件已包含条件编译，无需修改: ${switchImplPath}`);
    }
  } else {
    console.log(`创建Switch组件的实现文件: ${switchImplPath}`);
    // 创建实现文件
    const implContent = `
#if RCT_NEW_ARCH_ENABLED
// 新架构实现在构建时会被引入
#else
// 旧架构兼容的简化实现
#import "RCTSwitchComponentView.h"

@implementation RCTSwitchComponentView {
  UISwitch *_switchView;
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _switchView = [[UISwitch alloc] initWithFrame:self.bounds];
    [_switchView addTarget:self
                   action:@selector(onChange:)
         forControlEvents:UIControlEventValueChanged];
    self.contentView = _switchView;
  }
  return self;
}

- (void)setValue:(BOOL)value {
  _switchView.on = value;
}

- (void)onChange:(UISwitch *)sender {
  // 简化版本，只提供基本功能
  if ([self.superview respondsToSelector:@selector(onSwitchValueChange:)]) {
    [self.superview performSelector:@selector(onSwitchValueChange:) withObject:@(sender.on)];
  }
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  _switchView.on = NO;
}

+ (Class)ComponentViewClass {
  return RCTSwitchComponentView.class;
}

@end
#endif // !RCT_NEW_ARCH_ENABLED
`;
    fs.writeFileSync(switchImplPath, implContent);
    console.log(`创建了Switch组件实现文件: ${switchImplPath}`);
  }
} else {
  console.log(`Switch组件目录不存在: ${switchComponentDir}`);
}

// 3.3 自动处理常见的Fabric组件
const commonFabricComponents = [
  'ActivityIndicator',
  'Image',
  'ScrollView',
  'Modal',
  'TextInput',
  'Text',
  'View',
  'RefreshControl',
  'Slider',
  'Switch'
];

// 自动处理多个组件
commonFabricComponents.forEach(componentName => {
  // 确定该组件的路径
  const componentDir = path.join(reactNativePath, `React/Fabric/Mounting/ComponentViews/${componentName}`);
  const headerPath = path.join(componentDir, `RCT${componentName}ComponentView.h`);
  const implPath = path.join(componentDir, `RCT${componentName}ComponentView.mm`);
  
  // 确保组件目录存在
  if (!fs.existsSync(componentDir)) {
    fs.mkdirSync(componentDir, { recursive: true });
    console.log(`创建了组件目录: ${componentDir}`);
  }
  
  console.log(`处理${componentName}组件文件...`);
  
  // 创建或修改头文件
  let headerContent;
  if (fs.existsSync(headerPath)) {
    // 创建备份
    const backupPath = `${headerPath}.original`;
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(headerPath, backupPath);
      console.log(`创建了备份: ${backupPath}`);
    }
    
    // 读取已有的头文件内容
    const originalContent = fs.readFileSync(headerPath, 'utf8');
    
    // 检查是否已有条件编译
    if (!originalContent.includes('#if RCT_NEW_ARCH_ENABLED')) {
      // 添加条件编译
      headerContent = `/*
 * 由fix-fabric-components.js修改，添加条件编译
 * 原始文件已备份为${path.basename(headerPath)}.original
 */
#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED
// 原始新架构实现
${originalContent}
#else // !RCT_NEW_ARCH_ENABLED
// 旧架构兼容的简化实现
#import <UIKit/UIKit.h>
#import <React/RCTViewComponentView.h>

@interface RCT${componentName}ComponentView : RCTViewComponentView
@end
#endif // RCT_NEW_ARCH_ENABLED
`;
    } else {
      console.log(`文件已包含条件编译，无需修改: ${headerPath}`);
      headerContent = originalContent;
    }
  } else {
    // 创建新的头文件
    headerContent = `/*
 * 由fix-fabric-components.js创建的占位符文件
 * 用于解决Fabric相关编译错误
 */
#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED
// 新架构实现应在构建时被正确包含
#else // !RCT_NEW_ARCH_ENABLED
// 旧架构兼容的简化实现
#import <UIKit/UIKit.h>
#import <React/RCTViewComponentView.h>

@interface RCT${componentName}ComponentView : RCTViewComponentView
@end
#endif // RCT_NEW_ARCH_ENABLED
`;
  }
  
  // 写入头文件
  fs.writeFileSync(headerPath, headerContent);
  console.log(`${fs.existsSync(headerPath) ? '更新' : '创建'}了组件头文件: ${headerPath}`);
  
  // 创建或修改实现文件
  let implContent;
  if (fs.existsSync(implPath)) {
    // 创建备份
    const backupPath = `${implPath}.original`;
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(implPath, backupPath);
      console.log(`创建了备份: ${backupPath}`);
    }
    
    // 读取已有的实现文件内容
    const originalContent = fs.readFileSync(implPath, 'utf8');
    
    // 检查是否已有条件编译
    if (!originalContent.includes('#if RCT_NEW_ARCH_ENABLED')) {
      // 添加条件编译
      implContent = `/*
 * 由fix-fabric-components.js修改，添加条件编译
 * 原始文件已备份为${path.basename(implPath)}.original
 */
#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED
// 原始新架构实现
${originalContent}
#else // !RCT_NEW_ARCH_ENABLED
// 旧架构兼容的简化实现
#import "RCT${componentName}ComponentView.h"

@implementation RCT${componentName}ComponentView

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    // 基本初始化
  }
  return self;
}

- (void)updateProps:(void *)props oldProps:(void *)oldProps {
  // 空实现
  [super updateProps:props oldProps:oldProps];
}

@end
#endif // RCT_NEW_ARCH_ENABLED
`;
    } else {
      console.log(`文件已包含条件编译，无需修改: ${implPath}`);
      implContent = originalContent;
    }
  } else {
    // 创建新的实现文件
    implContent = `/*
 * 由fix-fabric-components.js创建的占位符文件
 * 用于解决Fabric相关编译错误
 */
#import <React/RCTDefines.h>

#if RCT_NEW_ARCH_ENABLED
// 新架构实现应在构建时被正确包含
#else // !RCT_NEW_ARCH_ENABLED
// 旧架构兼容的简化实现
#import "RCT${componentName}ComponentView.h"

@implementation RCT${componentName}ComponentView

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    // 基本初始化
  }
  return self;
}

- (void)updateProps:(void *)props oldProps:(void *)oldProps {
  // 空实现
  [super updateProps:props oldProps:oldProps];
}

@end
#endif // RCT_NEW_ARCH_ENABLED
`;
  }
  
  // 写入实现文件
  fs.writeFileSync(implPath, implContent);
  console.log(`${fs.existsSync(implPath) ? '更新' : '创建'}了组件实现文件: ${implPath}`);
});

// 4. 修改Podfile以禁用React-RCTFabric和修复文件冲突
const podfilePath = path.join(__dirname, 'ios/Podfile');
if (fs.existsSync(podfilePath)) {
  console.log('修改Podfile以禁用React-RCTFabric...');
  
  let podfileContent = fs.readFileSync(podfilePath, 'utf8');
  const podfileBackup = `${podfilePath}.fabric-fix`;
  
  // 创建备份
  if (!fs.existsSync(podfileBackup)) {
    fs.writeFileSync(podfileBackup, podfileContent);
  }
  
  // 添加处理React-RCTFabric的代码
  if (!podfileContent.includes('disable_react_fabric_target')) {
    // 在post_install中添加禁用React-RCTFabric的代码
    const postInstallMatch = podfileContent.match(/post_install\s+do\s+\|installer\|/);
    
    if (postInstallMatch) {
      // 添加辅助函数
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
      
      // 检查是否已有这个函数
      if (!podfileContent.includes('def disable_react_fabric_target')) {
        // 找到适当位置添加辅助函数 - 在fix_duplicate_headers函数后
        const fixDuplicateHeadersPos = podfileContent.indexOf("def fix_duplicate_headers");
        if (fixDuplicateHeadersPos !== -1) {
          // 找到函数末尾
          const endDefPos = podfileContent.indexOf("end", fixDuplicateHeadersPos);
          if (endDefPos !== -1) {
            // 在函数后添加我们的新函数
            const insertPos = podfileContent.indexOf("\n", endDefPos) + 1;
            podfileContent = 
              podfileContent.slice(0, insertPos) + 
              helperFunctionCode + 
              podfileContent.slice(insertPos);
          } else {
            // 如果找不到end，添加到文件开头
            podfileContent = helperFunctionCode + podfileContent;
          }
        } else {
          // 如果找不到fix_duplicate_headers函数，添加到文件开头
          podfileContent = helperFunctionCode + podfileContent;
        }
      }
      
      // 在post_install中添加调用 - 在fix_duplicate_headers调用之后
      const fixDuplicateCallPos = podfileContent.indexOf("fix_duplicate_headers(installer)");
      if (fixDuplicateCallPos !== -1) {
        const afterFixCall = podfileContent.indexOf("\n", fixDuplicateCallPos) + 1;
        const disableReactFabricCode = `    # 禁用React-RCTFabric目标
    disable_react_fabric_target(installer)
`;
        podfileContent = 
          podfileContent.slice(0, afterFixCall) + 
          disableReactFabricCode + 
          podfileContent.slice(afterFixCall);
      } else {
        // 在post_install块内添加代码
        const insertPosition = postInstallMatch.index + postInstallMatch[0].length;
        const disableReactFabricCode = `
    # 禁用React-RCTFabric目标
    disable_react_fabric_target(installer)
`;
        podfileContent = 
          podfileContent.slice(0, insertPosition) + 
          disableReactFabricCode + 
          podfileContent.slice(insertPosition);
      }
      
      fs.writeFileSync(podfilePath, podfileContent);
      console.log('已修改Podfile，添加禁用React-RCTFabric的代码');
    } else {
      console.log('未找到post_install块，无法添加禁用React-RCTFabric的代码');
    }
  } else {
    console.log('Podfile已包含禁用React-RCTFabric的代码，无需修改');
  }
} else {
  console.log('未找到Podfile');
}

// 创建或修改RCTDefines.h确保包含正确的宏定义
const rctDefinesBasePath = path.join(reactNativePath, 'React/Base/RCTDefines.h');
const rctDefinesPath = path.join(reactNativePath, 'React/RCTDefines.h');

// 检查哪个路径存在
let actualDefinesPath;
let originalContent = '';

if (fs.existsSync(rctDefinesBasePath)) {
  actualDefinesPath = rctDefinesBasePath;
  console.log(`找到Base目录中的RCTDefines.h文件: ${actualDefinesPath}`);
  originalContent = fs.readFileSync(actualDefinesPath, 'utf8');
} else if (fs.existsSync(rctDefinesPath)) {
  actualDefinesPath = rctDefinesPath;
  console.log(`找到React目录中的RCTDefines.h文件: ${actualDefinesPath}`);
  originalContent = fs.readFileSync(actualDefinesPath, 'utf8');
} else {
  actualDefinesPath = rctDefinesBasePath; // 默认使用Base路径
  console.log(`未找到RCTDefines.h文件，将创建在: ${actualDefinesPath}`);
  
  // 创建必要的目录
  const baseDir = path.dirname(actualDefinesPath);
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
    console.log(`创建了目录: ${baseDir}`);
  }
}

// 确保RCTDefines.h文件存在并包含我们需要的定义
if (originalContent) {
  console.log(`修改现有的RCTDefines.h文件以确保正确定义宏...`);
  
  // 创建备份
  const backupPath = `${actualDefinesPath}.original`;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(actualDefinesPath, backupPath);
    console.log(`创建了备份: ${backupPath}`);
  }
  
  // 检查是否已经包含我们的定义
  if (!originalContent.includes('// FABRIC_DISABLE_PATCH')) {
    // 在文件末尾添加我们的定义
    originalContent += `
// FABRIC_DISABLE_PATCH - Added by fix-fabric-components.js
#ifndef RCT_NEW_ARCH_ENABLED
#define RCT_NEW_ARCH_ENABLED 0
#endif

#ifndef REACT_NATIVE_DEBUG
#define REACT_NATIVE_DEBUG 0
#endif

`;
    
    fs.writeFileSync(actualDefinesPath, originalContent);
    console.log(`已修改RCTDefines.h，添加RCT_NEW_ARCH_ENABLED宏定义`);
  } else {
    console.log(`RCTDefines.h已包含我们的宏定义，无需修改`);
  }
} else {
  // 创建基本的RCTDefines.h文件
  const content = `/**
 * 由fix-fabric-components.js创建的占位符文件
 * 定义了关闭Fabric架构的必要宏
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
  
  fs.writeFileSync(actualDefinesPath, content);
  console.log(`创建了RCTDefines.h文件: ${actualDefinesPath}`);
}

// 确保同时存在React/RCTDefines.h和React/Base/RCTDefines.h以应对不同的引用方式
const otherPath = actualDefinesPath === rctDefinesPath ? rctDefinesBasePath : rctDefinesPath;
if (!fs.existsSync(path.dirname(otherPath))) {
  fs.mkdirSync(path.dirname(otherPath), { recursive: true });
}

if (!fs.existsSync(otherPath)) {
  fs.copyFileSync(actualDefinesPath, otherPath);
  console.log(`复制RCTDefines.h到备用位置: ${otherPath}`);
}

// 确保组件文件导入正确的RCTDefines.h
const correctInclude = '#import <React/RCTDefines.h>';
const incorrectInclude = '#import <React/Base/RCTDefines.h>';

function updateIncludesInDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  entries.forEach(entry => {
    const entryPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      updateIncludesInDirectory(entryPath);
    } else if (entry.isFile() && 
              (entry.name.endsWith('.h') || entry.name.endsWith('.m') || entry.name.endsWith('.mm'))) {
      
      let content = fs.readFileSync(entryPath, 'utf8');
      
      if (content.includes(incorrectInclude)) {
        content = content.replace(new RegExp(incorrectInclude, 'g'), correctInclude);
        fs.writeFileSync(entryPath, content);
        console.log(`更新了文件中的头文件引用: ${entryPath}`);
      }
    }
  });
}

// 更新我们创建或修改的所有文件中的包含路径
updateIncludesInDirectory(path.join(reactNativePath, 'React/Fabric'));

console.log('\n修复完成！已修复React Native Fabric组件的编译问题和文件冲突。'); 