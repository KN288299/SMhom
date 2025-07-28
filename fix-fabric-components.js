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
  const viewComponentViewHeaderPath = path.join(reactNativePath, 'React/Fabric/Mounting/RCTViewComponentView.h');
  const viewComponentViewHeaderDir = path.dirname(viewComponentViewHeaderPath);
  
  // 确保目录存在
  if (!fs.existsSync(viewComponentViewHeaderDir)) {
    fs.mkdirSync(viewComponentViewHeaderDir, { recursive: true });
    console.log(`创建了目录: ${viewComponentViewHeaderDir}`);
  }
  
  // 创建包含条件编译的RCTViewComponentView.h文件
  const viewComponentViewHeader = `
/**
 * 占位符文件用于修复Fabric编译问题
 * 这个文件只应在未启用新架构时使用
 */
#pragma once

#if RCT_NEW_ARCH_ENABLED
// 在启用新架构时，应该使用真正的实现
#else
// 旧架构兼容的简化实现
#import <UIKit/UIKit.h>

@interface RCTViewComponentView : UIView
@property (nonatomic, strong) UIView *contentView;
- (void)updateProps:(void *)props oldProps:(void *)oldProps;
@end
#endif // RCT_NEW_ARCH_ENABLED
`;
  fs.writeFileSync(viewComponentViewHeaderPath, viewComponentViewHeader);
  console.log(`创建了占位符文件: ${viewComponentViewHeaderPath}`);
  
  // 创建实现文件
  const viewComponentViewImplPath = path.join(reactNativePath, 'React/Fabric/Mounting/RCTViewComponentView.mm');
  const viewComponentViewImpl = `
/**
 * 占位符实现用于修复Fabric编译问题
 * 这个文件只应在未启用新架构时使用
 */
#if !RCT_NEW_ARCH_ENABLED
#import "RCTViewComponentView.h"

@implementation RCTViewComponentView {
  UIView *_contentView;
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _contentView = nil;
  }
  return self;
}

- (void)updateProps:(void *)props oldProps:(void *)oldProps {
  // 空实现
}

- (void)setContentView:(UIView *)contentView {
  if (_contentView != contentView) {
    [_contentView removeFromSuperview];
    _contentView = contentView;
    if (_contentView) {
      [self addSubview:_contentView];
    }
  }
}

- (UIView *)contentView {
  return _contentView;
}

@end
#endif // !RCT_NEW_ARCH_ENABLED
`;
  fs.writeFileSync(viewComponentViewImplPath, viewComponentViewImpl);
  console.log(`创建了占位符实现: ${viewComponentViewImplPath}`);
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

console.log('\n修复完成！已修复React Native Fabric组件的编译问题和文件冲突。'); 