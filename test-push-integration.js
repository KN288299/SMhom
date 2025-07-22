const PushNotificationManager = require('./src/services/PushNotificationManager');

async function testPushIntegration() {
  console.log('🧪 测试推送服务集成...\n');
  
  // 模拟用户数据
  const testUserId = '测试用户ID';
  const testFCMToken = 'test-fcm-token-123';
  
  try {
    // 1. 测试消息推送
    console.log('📨 测试消息推送...');
    await PushNotificationManager.sendMessageNotification(
      testUserId,
      '测试发送者',
      '这是一条测试消息',
      'text',
      'test-conversation-id'
    );
    console.log('✅ 消息推送测试完成\n');
    
    // 2. 测试来电推送
    console.log('📞 测试来电推送...');
    await PushNotificationManager.sendCallNotification(
      testUserId,
      '测试来电者',
      'test-call-id',
      'test-conversation-id'
    );
    console.log('✅ 来电推送测试完成\n');
    
    // 3. 测试系统通知
    console.log('🔔 测试系统通知...');
    await PushNotificationManager.sendSystemNotification(
      testUserId,
      '系统通知',
      '这是一条系统通知消息'
    );
    console.log('✅ 系统通知测试完成\n');
    
    console.log('🎉 所有推送服务测试完成！');
    
  } catch (error) {
    console.error('❌ 推送服务测试失败:', error);
  }
}

// 运行测试
testPushIntegration(); 