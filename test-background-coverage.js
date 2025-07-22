const fs = require('fs');
const path = require('path');

// 测试背景覆盖修复
function testBackgroundCoverage() {
  console.log('🎨 开始测试登录页面背景覆盖修复...\n');
  
  const filesToCheck = [
    'src/screens/PhoneLoginScreen.tsx',
    'src/screens/AuthScreen.tsx', 
    'src/screens/PermissionsScreen.android.tsx',
    'src/screens/DataUploadScreen.tsx'
  ];
  
  let allPassed = true;
  
  filesToCheck.forEach(filePath => {
    console.log(`📁 检查文件: ${filePath}`);
    
    try {
      const fullPath = path.join(__dirname, filePath);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // 检查是否移除了多余的 View 容器
      const hasUnnecessaryView = content.includes('<View style={styles.container}>') && 
                                content.includes('</View>') &&
                                content.includes('<ImageBackground');
      
      // 检查 ImageBackground 是否在最外层
      const imageBackgroundAtRoot = content.includes('<ImageBackground') && 
                                   !content.match(/<View[^>]*>\s*<ImageBackground/);
      
      // 检查样式是否正确
      const hasCorrectStyles = content.includes('width: \'100%\'') && 
                              content.includes('height: \'100%\'') &&
                              !content.includes('position: \'absolute\'');
      
      if (hasUnnecessaryView) {
        console.log('❌ 发现多余的 View 容器');
        allPassed = false;
      } else {
        console.log('✅ 已移除多余的 View 容器');
      }
      
      if (imageBackgroundAtRoot) {
        console.log('✅ ImageBackground 位于最外层');
      } else {
        console.log('❌ ImageBackground 不在最外层');
        allPassed = false;
      }
      
      if (hasCorrectStyles) {
        console.log('✅ 样式设置正确');
      } else {
        console.log('❌ 样式设置不正确');
        allPassed = false;
      }
      
      console.log(''); // 空行分隔
      
    } catch (error) {
      console.log(`❌ 无法读取文件 ${filePath}:`, error.message);
      allPassed = false;
    }
  });
  
  if (allPassed) {
    console.log('🎉 所有背景覆盖修复检查通过！');
    console.log('✅ 登录页面背景应该能够完全覆盖屏幕');
  } else {
    console.log('⚠️ 部分修复检查未通过，请检查相关文件');
  }
  
  return allPassed;
}

// 检查背景图片是否存在
function checkBackgroundImages() {
  console.log('\n🖼️ 检查背景图片文件...\n');
  
  const imagesToCheck = [
    'src/assets/images/bg.png',
    'src/assets/images/quanxian.png', 
    'src/assets/images/jiazai.png'
  ];
  
  let allImagesExist = true;
  
  imagesToCheck.forEach(imagePath => {
    const fullPath = path.join(__dirname, imagePath);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      console.log(`✅ ${imagePath} 存在 (${(stats.size / 1024).toFixed(1)}KB)`);
    } else {
      console.log(`❌ ${imagePath} 不存在`);
      allImagesExist = false;
    }
  });
  
  return allImagesExist;
}

// 生成修复建议
function generateFixSuggestions() {
  console.log('\n🔧 背景覆盖修复建议:\n');
  
  console.log('1. 确保 ImageBackground 是最外层组件:');
  console.log('   ✅ 正确: <ImageBackground>...</ImageBackground>');
  console.log('   ❌ 错误: <View><ImageBackground>...</ImageBackground></View>');
  
  console.log('\n2. 使用正确的样式设置:');
  console.log('   backgroundImage: {');
  console.log('     flex: 1,');
  console.log('     width: \'100%\',');
  console.log('     height: \'100%\',');
  console.log('   }');
  
  console.log('\n3. 移除不必要的样式:');
  console.log('   ❌ 移除: position: \'absolute\', top: 0, left: 0 等');
  console.log('   ❌ 移除: width: width, height: height (使用 Dimensions)');
  
  console.log('\n4. 确保 resizeMode="cover" 设置正确');
}

// 运行测试
if (require.main === module) {
  const imagesExist = checkBackgroundImages();
  const coverageFixed = testBackgroundCoverage();
  
  console.log('\n📊 测试结果总结:');
  console.log(`背景图片存在: ${imagesExist ? '✅' : '❌'}`);
  console.log(`背景覆盖修复: ${coverageFixed ? '✅' : '❌'}`);
  
  if (!imagesExist || !coverageFixed) {
    generateFixSuggestions();
  }
}

module.exports = {
  testBackgroundCoverage,
  checkBackgroundImages,
  generateFixSuggestions
}; 