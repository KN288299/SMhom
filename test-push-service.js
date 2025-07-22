const { firebasePushV1 } = require('./firebase-push-v1');
const serviceAccount = require('./serviceAccountKey.json');

async function testPushNotification() {
  console.log('🔔 测试Firebase推送服务');
  console.log('=' + '='.repeat(30));

  try {
    // 初始化Firebase推送服务
    console.log('\n📱 初始化Firebase推送服务...');
    await firebasePushV1.initialize(serviceAccount, 'homeservicechat');
    console.log('✅ Firebase推送服务初始化成功');

    // 注意：需要真实的FCM Token进行测试
    const testFCMToken = 'YOUR_TEST_FCM_TOKEN_HERE';
    
    console.log('\n⚠️  测试说明:');
    console.log('1. 请将上面的 YOUR_TEST_FCM_TOKEN_HERE 替换为真实的FCM Token');
    console.log('2. FCM Token可以从移动端应用获取');
    console.log('3. 运行移动端应用并登录后，在控制台查看FCM Token');
    
    if (testFCMToken === 'YOUR_TEST_FCM_TOKEN_HERE') {
      console.log('\n⚠️  跳过实际测试，请先设置FCM Token');
      return;
    }

    // 测试消息推送
    console.log('\n📨 测试消息推送...');
    await firebasePushV1.sendMessagePush(
      testFCMToken,
      '测试用户',
      '这是一条测试消息，用于验证推送服务是否正常工作',
      'test_conversation_123'
    );
    console.log('✅ 消息推送测试完成');

    // 测试来电推送
    console.log('\n📞 测试来电推送...');
    await firebasePushV1.sendCallPush(
      testFCMToken,
      '测试来电者',
      'test_call_456',
      'test_conversation_789'
    );
    console.log('✅ 来电推送测试完成');

    console.log('\n🎉 所有推送测试完成！');
    console.log('请检查移动设备是否收到推送通知');

  } catch (error) {
    console.error('❌ 推送测试失败:', error);
  }
}

// 运行测试
testPushNotification().catch(console.error);
