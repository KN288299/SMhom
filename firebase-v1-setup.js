const fs = require('fs');
const path = require('path');

/**
 * Firebase Cloud Messaging HTTP v1 API 设置脚本
 * 这个脚本帮助你配置新版Firebase推送API
 */

console.log('🚀 Firebase Cloud Messaging HTTP v1 API 设置向导');
console.log('================================================\n');

// 检查必要文件
function checkFiles() {
  console.log('📋 检查必要文件...\n');
  
  const requiredFiles = [
    { file: 'google-services.json', desc: 'Android Firebase配置文件' },
    { file: 'serviceAccountKey.json', desc: 'Firebase服务账号密钥（需要下载）' },
  ];
  
  const missingFiles = [];
  
  requiredFiles.forEach(({ file, desc }) => {
    if (fs.existsSync(path.join(__dirname, file))) {
      console.log(`✅ ${file} - ${desc}`);
    } else {
      console.log(`❌ ${file} - ${desc} (缺失)`);
      missingFiles.push({ file, desc });
    }
  });
  
  return missingFiles;
}

// 检查package.json依赖
function checkDependencies() {
  console.log('\n📦 检查依赖包...\n');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = packageJson.dependencies || {};
  
  const requiredDeps = [
    'firebase-admin',
    'google-auth-library',
  ];
  
  const missingDeps = [];
  
  requiredDeps.forEach(dep => {
    if (dependencies[dep]) {
      console.log(`✅ ${dep} - 已安装`);
    } else {
      console.log(`❌ ${dep} - 未安装`);
      missingDeps.push(dep);
    }
  });
  
  return missingDeps;
}

// 生成配置文件
function generateConfig() {
  console.log('\n⚙️ 生成配置文件...\n');
  
  const configTemplate = `{
  "firebase": {
    "projectId": "your-project-id",
    "serviceAccountKeyPath": "./serviceAccountKey.json"
  },
  "push": {
    "enabled": true,
    "version": "v1",
    "useAdminSDK": true
  }
}`;
  
  const configPath = 'firebase-config.json';
  
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, configTemplate, 'utf8');
    console.log(`✅ 已生成配置文件: ${configPath}`);
    console.log('📝 请编辑此文件并填入你的Firebase项目ID');
  } else {
    console.log(`ℹ️ 配置文件已存在: ${configPath}`);
  }
}

// 显示下载服务账号密钥的步骤
function showServiceAccountSteps() {
  console.log('\n🔑 获取Firebase服务账号密钥步骤:');
  console.log('==================================');
  console.log('1. 访问 Firebase 控制台: https://console.firebase.google.com/');
  console.log('2. 选择你的项目');
  console.log('3. 点击 ⚙️ (设置) → 项目设置');
  console.log('4. 选择"服务账号"标签页');
  console.log('5. 选择"Node.js"');
  console.log('6. 点击"生成新的私钥"');
  console.log('7. 下载JSON文件并重命名为 serviceAccountKey.json');
  console.log('8. 将文件放在项目根目录下');
}

// 显示升级步骤
function showUpgradeSteps() {
  console.log('\n🔄 从旧版API升级到新版API:');
  console.log('==============================');
  console.log('1. 新版API使用服务账号密钥替代服务器密钥');
  console.log('2. 新版API支持更丰富的推送配置');
  console.log('3. 更好的错误处理和安全性');
  console.log('4. 支持Firebase Admin SDK（推荐）');
  console.log('5. 支持HTTP v1 REST API');
}

// 显示测试命令
function showTestCommands() {
  console.log('\n🧪 测试命令:');
  console.log('===========');
  console.log('# 测试新版推送API');
  console.log('node test-firebase-push-v1.js');
  console.log('');
  console.log('# 测试旧版推送API（对比）');
  console.log('node test-firebase-push.js');
}

// 主函数
async function main() {
  try {
    // 检查文件
    const missingFiles = checkFiles();
    
    // 检查依赖
    const missingDeps = checkDependencies();
    
    // 生成配置
    generateConfig();
    
    // 显示说明
    if (missingFiles.length > 0) {
      console.log('\n❌ 缺失文件:');
      missingFiles.forEach(({ file, desc }) => {
        console.log(`   - ${file}: ${desc}`);
      });
      
      if (missingFiles.some(f => f.file === 'serviceAccountKey.json')) {
        showServiceAccountSteps();
      }
    }
    
    if (missingDeps.length > 0) {
      console.log('\n📦 需要安装的依赖:');
      console.log(`npm install ${missingDeps.join(' ')}`);
    }
    
    showUpgradeSteps();
    showTestCommands();
    
    console.log('\n✨ 设置完成！');
    console.log('📖 查看 firebase-push-v1.js 了解具体使用方法');
    
  } catch (error) {
    console.error('❌ 设置过程中出现错误:', error);
  }
}

// 运行设置
if (require.main === module) {
  main();
}

module.exports = {
  checkFiles,
  checkDependencies,
  generateConfig,
  showServiceAccountSteps,
  showUpgradeSteps,
  showTestCommands,
}; 