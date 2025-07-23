const fs = require('fs');
const path = require('path');

// 路径到paper目录
const paperDir = path.join(__dirname, 'node_modules', 'react-native-svg', 'android', 'src', 'paper');

if (fs.existsSync(paperDir)) {
  console.log('禁用react-native-svg的paper目录（Fabric相关代码）...');
  
  // 重命名paper目录为paper_disabled
  fs.renameSync(paperDir, paperDir + '_disabled');
  
  console.log('已成功禁用paper目录');
} else {
  console.log('Paper目录不存在或已被禁用');
}

// 修复VirtualView.java中的setPointerEvents访问修饰符
const virtualViewPath = path.join(__dirname, 'node_modules', 'react-native-svg', 'android', 'src', 'main', 'java', 'com', 'horcrux', 'svg', 'VirtualView.java');

if (fs.existsSync(virtualViewPath)) {
  let content = fs.readFileSync(virtualViewPath, 'utf8');
  
  // 将setPointerEvents的访问修饰符从默认改为public
  if (content.includes('void setPointerEvents(PointerEvents pointerEvents)')) {
    content = content.replace('void setPointerEvents(PointerEvents pointerEvents)', 'public void setPointerEvents(PointerEvents pointerEvents)');
    
    fs.writeFileSync(virtualViewPath, content);
    console.log('已修复VirtualView.java访问修饰符问题');
  } else {
    console.log('VirtualView.java中没有找到需要修复的setPointerEvents方法');
  }
} else {
  console.log('找不到VirtualView.java文件');
}

console.log('React Native SVG Android修复完成'); 