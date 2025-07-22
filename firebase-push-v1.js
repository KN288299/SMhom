const admin = require('firebase-admin');
const { GoogleAuth } = require('google-auth-library');

// 新版Firebase Cloud Messaging HTTP v1 API实现
class FirebasePushV1 {
  constructor() {
    this.initialized = false;
    this.projectId = null;
    this.accessToken = null;
  }

  /**
   * 初始化Firebase Admin SDK
   * @param {object} serviceAccount - 服务账号密钥JSON对象
   * @param {string} projectId - Firebase项目ID
   */
  async initialize(serviceAccount, projectId) {
    if (this.initialized) return;

    try {
      // 初始化Firebase Admin SDK
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }

      this.projectId = projectId;
      this.initialized = true;
      console.log('✅ Firebase Admin SDK初始化成功');
    } catch (error) {
      console.error('❌ Firebase Admin SDK初始化失败:', error);
      throw error;
    }
  }

  /**
   * 使用服务账号密钥获取访问令牌（HTTP v1方式）
   * @param {object} serviceAccount - 服务账号密钥
   */
  async getAccessToken(serviceAccount) {
    try {
      const auth = new GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
      });

      const accessToken = await auth.getAccessToken();
      this.accessToken = accessToken;
      console.log('✅ 访问令牌获取成功');
      return accessToken;
    } catch (error) {
      console.error('❌ 获取访问令牌失败:', error);
      throw error;
    }
  }

  /**
   * 使用HTTP v1 API发送推送通知
   * @param {string} fcmToken - 设备FCM Token
   * @param {object} message - 消息对象
   */
  async sendMessageV1(fcmToken, message) {
    if (!this.projectId) {
      throw new Error('Firebase项目未初始化');
    }

    const url = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;
    
    const payload = {
      message: {
        token: fcmToken,
        notification: message.notification,
        data: message.data || {},
        android: {
          priority: 'high',
          notification: {
            channel_id: 'default_channel',
            sound: 'default',
            ...message.android?.notification,
          },
          ...message.android,
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              ...message.apns?.payload?.aps,
            },
            ...message.apns?.payload,
          },
          ...message.apns,
        },
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ HTTP v1推送发送成功:', result);
        return result;
      } else {
        console.error('❌ HTTP v1推送发送失败:', result);
        throw new Error(result.error?.message || 'HTTP v1推送失败');
      }
    } catch (error) {
      console.error('❌ HTTP v1推送请求失败:', error);
      throw error;
    }
  }

  /**
   * 使用Admin SDK发送推送通知（推荐方式）
   * @param {string} fcmToken - 设备FCM Token
   * @param {object} messageData - 消息数据
   */
  async sendWithAdminSDK(fcmToken, messageData) {
    try {
      const message = {
        notification: messageData.notification,
        data: this.stringifyData(messageData.data || {}),
        token: fcmToken,
        android: {
          priority: 'high',
          notification: {
            channelId: 'default_channel',
            sound: 'default',
            ...messageData.android?.notification,
          },
          ...messageData.android,
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              ...messageData.apns?.payload?.aps,
            },
            ...messageData.apns?.payload,
          },
          ...messageData.apns,
        },
      };

      const response = await admin.messaging().send(message);
      console.log('✅ Admin SDK推送发送成功:', response);
      return response;
    } catch (error) {
      console.error('❌ Admin SDK推送发送失败:', error);
      throw error;
    }
  }

  /**
   * 确保所有data字段都是字符串类型
   * @param {object} data - 数据对象
   */
  stringifyData(data) {
    const stringifiedData = {};
    for (const [key, value] of Object.entries(data)) {
      stringifiedData[key] = String(value);
    }
    return stringifiedData;
  }

  /**
   * 发送消息推送通知
   * @param {string} fcmToken - 设备Token
   * @param {string} senderName - 发送者姓名
   * @param {string} messageContent - 消息内容
   * @param {string} conversationId - 会话ID
   */
  async sendMessagePush(fcmToken, senderName, messageContent, conversationId) {
    const messageData = {
      notification: {
        title: `来自 ${senderName} 的消息`,
        body: messageContent.length > 100 ? messageContent.substring(0, 100) + '...' : messageContent,
      },
      data: {
        type: 'message',
        conversationId: conversationId,
        senderName: senderName,
        messageId: `msg_${Date.now()}`,
        timestamp: Date.now().toString(),
      },
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#FF6B81',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
    };

    return await this.sendWithAdminSDK(fcmToken, messageData);
  }

  /**
   * 发送来电推送通知
   * @param {string} fcmToken - 设备Token
   * @param {string} callerName - 来电者姓名
   * @param {string} callId - 通话ID
   * @param {string} conversationId - 会话ID
   */
  async sendCallPush(fcmToken, callerName, callId, conversationId) {
    const messageData = {
      notification: {
        title: '来电',
        body: `${callerName} 正在呼叫您`,
      },
      data: {
        type: 'voice_call',
        conversationId: conversationId,
        callId: callId,
        senderName: callerName,
        timestamp: Date.now().toString(),
      },
      android: {
        priority: 'high',
        notification: {
          icon: 'ic_call',
          color: '#FF3B30',
          defaultSound: true,
          defaultVibrateTimings: true,
          category: 'call',
          visibility: 'public',
        },
      },
      apns: {
        payload: {
          aps: {
            category: 'CALL_CATEGORY',
            sound: 'call_sound.wav',
          },
        },
      },
    };

    return await this.sendWithAdminSDK(fcmToken, messageData);
  }

  /**
   * 发送系统推送通知
   * @param {string} fcmToken - 设备Token
   * @param {string} title - 标题
   * @param {string} body - 内容
   * @param {object} customData - 自定义数据
   */
  async sendSystemPush(fcmToken, title, body, customData = {}) {
    const messageData = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        type: 'system',
        timestamp: Date.now().toString(),
        ...customData,
      },
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#007AFF',
          defaultSound: true,
        },
      },
    };

    return await this.sendWithAdminSDK(fcmToken, messageData);
  }
}

// 创建单例实例
const firebasePushV1 = new FirebasePushV1();

// 导出类和实例
module.exports = {
  FirebasePushV1,
  firebasePushV1,
};

// 使用示例
if (require.main === module) {
  console.log('🚀 Firebase Cloud Messaging HTTP v1 API');
  console.log('📋 使用步骤:');
  console.log('1. 从Firebase控制台下载serviceAccountKey.json');
  console.log('2. 调用initialize()方法初始化');
  console.log('3. 使用sendMessagePush()等方法发送推送');
  console.log('\n示例代码:');
  console.log(`
const { firebasePushV1 } = require('./firebase-push-v1');
const serviceAccount = require('./serviceAccountKey.json');

async function example() {
  // 初始化
  await firebasePushV1.initialize(serviceAccount, 'your-project-id');
  
  // 发送消息推送
  await firebasePushV1.sendMessagePush(
    'device_fcm_token',
    '张三',
    '你好，有什么可以帮助您的吗？',
    'conv_123'
  );
  
  // 发送来电推送
  await firebasePushV1.sendCallPush(
    'device_fcm_token',
    '李四',
    'call_456',
    'conv_789'
  );
}
  `);
} 