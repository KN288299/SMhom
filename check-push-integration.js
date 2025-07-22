const fs = require('fs');
const path = require('path');

console.log('🔍 检查推送服务集成状态...\n');

// 检查文件是否存在
function checkFileExists(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`);
  return exists;
}

// 检查文件内容
function checkFileContent(filePath, pattern, description) {
  try {
    const fullPath = path.join(__dirname, filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasPattern = pattern.test(content);
    console.log(`${hasPattern ? '✅' : '❌'} ${description}`);
    return hasPattern;
  } catch (error) {
    console.log(`❌ ${description}: 文件读取失败`);
    return false;
  }
}

let totalChecks = 0;
let passedChecks = 0;

function check(result) {
  totalChecks++;
  if (result) passedChecks++;
  return result;
}

console.log('📁 检查服务器端文件...');
check(checkFileExists('src/services/PushNotificationManager.js', '推送通知管理器'));
check(checkFileExists('serviceAccountKey.json', 'Firebase服务账号密钥'));
check(checkFileExists('google-services.json', 'Google服务配置'));

console.log('\n🔧 检查服务器端集成...');
check(checkFileContent('server.js', /const PushNotificationManager = require/, '推送管理器导入'));
check(checkFileContent('server.js', /PushNotificationManager\.sendMessageNotification/, '消息推送集成'));
check(checkFileContent('server.js', /PushNotificationManager\.sendCallNotification/, '来电推送集成'));
check(checkFileContent('server.js', /app\.set\('trust proxy', 1\)/, '信任代理设置'));

console.log('\n📱 检查移动端文件...');
check(checkFileExists('src/services/AndroidPushService.ts', 'Android推送服务'));
check(checkFileExists('src/services/PushNotificationService.ts', '推送通知服务'));

console.log('\n🔧 检查移动端集成...');
check(checkFileContent('src/App.tsx', /AndroidPushService\.initialize/, 'Android推送服务初始化'));
check(checkFileContent('src/context/AuthContext.tsx', /AndroidPushService\.updateFCMTokenAfterLogin/, 'FCM Token上传'));
check(checkFileContent('src/services/AndroidPushService.ts', /updateFCMTokenAfterLogin/, 'FCM Token更新方法'));

console.log('\n🛣️ 检查API路由...');
check(checkFileContent('src/routes/userRoutes.js', /update-fcm-token/, 'FCM Token更新路由'));
check(checkFileContent('src/controllers/userController.js', /updateFCMToken/, 'FCM Token更新控制器'));

console.log('\n📊 集成状态总结:');
console.log(`✅ 通过检查: ${passedChecks}/${totalChecks}`);
console.log(`📈 完成度: ${Math.round((passedChecks / totalChecks) * 100)}%`);

if (passedChecks === totalChecks) {
  console.log('\n🎉 推送服务集成完成！');
  console.log('📝 下一步：');
  console.log('1. 重启服务器：pm2 restart homeservice-chat');
  console.log('2. 重新构建移动端应用');
  console.log('3. 运行测试脚本：node test-push-integration.js');
} else {
  console.log('\n⚠️ 推送服务集成不完整，请检查以上失败项目');
} 