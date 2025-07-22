const fs = require('fs');

console.log('🔍 检查推送服务集成状态...\n');

const checks = [
  {
    file: 'src/services/PushNotificationManager.js',
    name: '推送通知管理器'
  },
  {
    file: 'serviceAccountKey.json',
    name: 'Firebase服务账号密钥'
  },
  {
    file: 'google-services.json',
    name: 'Google服务配置'
  },
  {
    file: 'src/services/AndroidPushService.ts',
    name: 'Android推送服务'
  },
  {
    file: 'src/services/PushNotificationService.ts',
    name: '推送通知服务'
  }
];

let passed = 0;
let total = checks.length;

for (const check of checks) {
  if (fs.existsSync(check.file)) {
    console.log(`✅ ${check.name}: ${check.file}`);
    passed++;
  } else {
    console.log(`❌ ${check.name}: ${check.file}`);
  }
}

// 检查server.js集成
console.log('\n🔧 检查server.js集成...');
try {
  const serverContent = fs.readFileSync('server.js', 'utf8');
  
  if (serverContent.includes('const PushNotificationManager = require')) {
    console.log('✅ 推送管理器导入');
    passed++;
  } else {
    console.log('❌ 推送管理器导入');
  }
  
  if (serverContent.includes('PushNotificationManager.sendMessageNotification')) {
    console.log('✅ 消息推送集成');
    passed++;
  } else {
    console.log('❌ 消息推送集成');
  }
  
  if (serverContent.includes('PushNotificationManager.sendCallNotification')) {
    console.log('✅ 来电推送集成');
    passed++;
  } else {
    console.log('❌ 来电推送集成');
  }
  
  total += 3;
} catch (error) {
  console.log('❌ 无法读取server.js文件');
  total += 3;
}

// 检查移动端集成
console.log('\n📱 检查移动端集成...');
try {
  const authContent = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');
  
  if (authContent.includes('AndroidPushService.updateFCMTokenAfterLogin')) {
    console.log('✅ FCM Token上传');
    passed++;
  } else {
    console.log('❌ FCM Token上传');
  }
  
  total += 1;
} catch (error) {
  console.log('❌ 无法读取AuthContext.tsx文件');
  total += 1;
}

console.log('\n📊 集成状态总结:');
console.log(`✅ 通过检查: ${passed}/${total}`);
console.log(`📈 完成度: ${Math.round((passed / total) * 100)}%`);

if (passed === total) {
  console.log('\n🎉 推送服务集成完成！');
} else {
  console.log('\n⚠️ 推送服务集成不完整，请检查以上失败项目');
} 