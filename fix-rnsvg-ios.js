const fs = require('fs');
const path = require('path');

console.log('正在修复react-native-svg iOS的构建问题...');

// 修复RNSVGUIKit.h中的RNSVGView定义
const uikitPath = path.resolve(process.cwd(), 'node_modules/react-native-svg/apple/RNSVGUIKit.h');
if (fs.existsSync(uikitPath)) {
  console.log(`修改文件: ${uikitPath}`);
  let content = fs.readFileSync(uikitPath, 'utf8');
  
  // 替换 RCTViewComponentView 为 UIView
  content = content.replace(/#define RNSVGView RCTViewComponentView/g, '#define RNSVGView UIView');
  
  fs.writeFileSync(uikitPath, content, 'utf8');
  console.log('✅ 成功修复 RNSVGUIKit.h');
} else {
  console.log(`❌ 找不到文件: ${uikitPath}`);
}

// 创建必要的头文件来避免编译错误
const reactDir = path.resolve(process.cwd(), 'node_modules/react-native/React');
if (!fs.existsSync(reactDir)) {
  fs.mkdirSync(reactDir, { recursive: true });
  console.log(`创建目录: ${reactDir}`);
}

// 创建UIView.h占位符
const uiviewPath = path.join(reactDir, 'UIView.h');
const uiviewContent = `// 占位文件: 引入UIKit的UIView
#import <UIKit/UIView.h>
`;
fs.writeFileSync(uiviewPath, uiviewContent, 'utf8');
console.log(`✅ 创建UIView.h占位符: ${uiviewPath}`);

// 创建RCTViewComponentView.h占位符
const componentViewPath = path.join(reactDir, 'RCTViewComponentView.h');
const componentViewContent = `// 占位文件: 定义RCTViewComponentView为UIView的子类
#import <UIKit/UIKit.h>

@interface RCTViewComponentView : UIView
@end
`;
fs.writeFileSync(componentViewPath, componentViewContent, 'utf8');
console.log(`✅ 创建RCTViewComponentView.h占位符: ${componentViewPath}`);

console.log('修复完成!'); 