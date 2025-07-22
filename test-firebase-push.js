const admin = require('firebase-admin');

// Firebase Admin SDK配置
// 你需要从Firebase控制台下载serviceAccountKey.json文件
// 放到项目根目录，然后取消下面的注释
/*
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
*/

// 临时使用服务器密钥的方式（旧版API）
// 服务器密钥: 6DQtIA9hbipfz8X7ykP7TTQrfsjYWa8BbUN31NDjufM

/**
 * 发送推送通知到指定设备
 * @param {string} fcmToken - 设备的FCM Token
 * @param {string} title - 通知标题
 * @param {string} body - 通知内容
 * @param {object} data - 自定义数据
 */
async function sendPushNotification(fcmToken, title, body, data = {}) {
  try {
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        ...data,
        // 确保所有数据都是字符串类型
        timestamp: Date.now().toString(),
      },
      token: fcmToken,
      // Android特定配置
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default_channel',
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('✅ 推送发送成功:', response);
    return response;
  } catch (error) {
    console.error('❌ 推送发送失败:', error);
    throw error;
  }
}

/**
 * 发送消息推送通知
 */
async function sendMessagePush(fcmToken, senderName, messageContent, conversationId) {
  return await sendPushNotification(
    fcmToken,
    `来自 ${senderName} 的消息`,
    messageContent,
    {
      type: 'message',
      conversationId: conversationId,
      senderName: senderName,
      messageId: `msg_${Date.now()}`,
    }
  );
}

/**
 * 发送来电推送通知
 */
async function sendCallPush(fcmToken, callerName, callId, conversationId) {
  return await sendPushNotification(
    fcmToken,
    '来电',
    `${callerName} 正在呼叫您`,
    {
      type: 'voice_call',
      conversationId: conversationId,
      callId: callId,
      senderName: callerName,
    }
  );
}

/**
 * 使用HTTP方式发送推送（旧版API）
 */
async function sendPushWithHTTP(fcmToken, title, body, data = {}) {
  const serverKey = '6DQtIA9hbipfz8X7ykP7TTQrfsjYWa8BbUN31NDjufM';
  
  const payload = {
    to: fcmToken,
    notification: {
      title: title,
      body: body,
      sound: 'default',
    },
    data: {
      ...data,
      timestamp: Date.now().toString(),
    },
    priority: 'high',
  };

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${serverKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    
    if (response.ok && result.success === 1) {
      console.log('✅ HTTP推送发送成功:', result);
      return result;
    } else {
      console.error('❌ HTTP推送发送失败:', result);
      throw new Error(result.results?.[0]?.error || 'HTTP推送失败');
    }
  } catch (error) {
    console.error('❌ HTTP推送请求失败:', error);
    throw error;
  }
}

// 测试函数
async function testPushNotifications() {
  // 替换为实际的FCM Token
  const testFCMToken = 'YOUR_DEVICE_FCM_TOKEN_HERE';
  
  console.log('🧪 开始测试推送通知...\n');
  
  try {
    // 测试消息推送
    console.log('📱 测试消息推送...');
    await sendPushWithHTTP(
      testFCMToken,
      '新消息',
      '您收到了一条来自张三的消息：你好，有什么可以帮助您的吗？',
      {
        type: 'message',
        conversationId: 'conv_test_123',
        senderName: '张三',
        messageId: 'msg_test_456',
      }
    );
    
    // 等待2秒
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 测试来电推送
    console.log('📞 测试来电推送...');
    await sendPushWithHTTP(
      testFCMToken,
      '来电',
      '李四正在呼叫您',
      {
        type: 'voice_call',
        conversationId: 'conv_test_789',
        callId: 'call_test_123',
        senderName: '李四',
      }
    );
    
    console.log('\n✅ 所有测试推送发送完成！');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  }
}

// 导出函数供其他模块使用
module.exports = {
  sendPushNotification,
  sendMessagePush,
  sendCallPush,
  sendPushWithHTTP,
  testPushNotifications,
};

// 如果直接运行此脚本，执行测试
if (require.main === module) {
  console.log('🚀 Firebase推送通知测试脚本');
  console.log('请确保:\n1. 已安装firebase-admin: npm install firebase-admin');
  console.log('2. 已设置正确的FCM Token');
  console.log('3. 设备已安装并运行应用\n');
  
  // 取消注释下面这行来运行测试
  // testPushNotifications();
} 