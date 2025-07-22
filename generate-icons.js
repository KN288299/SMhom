const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 确保输出目录存在
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Android图标尺寸
const androidSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

// iOS图标尺寸
const iosSizes = [
  { name: '20x20@2x', size: 40 },
  { name: '20x20@3x', size: 60 },
  { name: '29x29@2x', size: 58 },
  { name: '29x29@3x', size: 87 },
  { name: '40x40@2x', size: 80 },
  { name: '40x40@3x', size: 120 },
  { name: '60x60@2x', size: 120 },
  { name: '60x60@3x', size: 180 },
  { name: '1024x1024', size: 1024 }
];

async function generateIcons(inputImagePath) {
  if (!fs.existsSync(inputImagePath)) {
    console.error('❌ 输入图片文件不存在:', inputImagePath);
    console.log('请将您的logo图片重命名为 "logo.png" 并放在项目根目录');
    return;
  }

  console.log('🎨 开始生成图标...');

  // 生成Android图标
  console.log('📱 生成Android图标...');
  for (const [folder, size] of Object.entries(androidSizes)) {
    const outputDir = path.join(__dirname, 'android/app/src/main/res', folder);
    ensureDir(outputDir);
    
    const outputPath = path.join(outputDir, 'ic_launcher.png');
    
    try {
      await sharp(inputImagePath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ ${folder}/ic_launcher.png (${size}x${size})`);
    } catch (error) {
      console.error(`❌ 生成 ${folder}/ic_launcher.png 失败:`, error);
    }
  }

  // 生成iOS图标
  console.log('🍎 生成iOS图标...');
  const iosOutputDir = path.join(__dirname, 'ios/HomeServiceChat/Images.xcassets/AppIcon.appiconset');
  ensureDir(iosOutputDir);

  for (const icon of iosSizes) {
    const outputPath = path.join(iosOutputDir, `${icon.name}.png`);
    
    try {
      await sharp(inputImagePath)
        .resize(icon.size, icon.size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ ${icon.name}.png (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`❌ 生成 ${icon.name}.png 失败:`, error);
    }
  }

  console.log('🎉 图标生成完成！');
  console.log('\n📋 下一步操作：');
  console.log('1. 检查生成的图标文件');
  console.log('2. 运行 npm run android 或 npm run ios 测试');
  console.log('3. 运行打包命令生成APK/IPA');
}

// 检查是否有logo.png文件
const logoPath = path.join(__dirname, 'logo.png');
if (fs.existsSync(logoPath)) {
  generateIcons(logoPath);
} else {
  console.log('📝 使用说明：');
  console.log('1. 将您的logo图片重命名为 "logo.png"');
  console.log('2. 将logo.png文件放在项目根目录');
  console.log('3. 运行此脚本: node generate-icons.js');
  console.log('\n💡 建议：使用1024x1024像素的PNG图片作为源文件');
} 