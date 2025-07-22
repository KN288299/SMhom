const { firebasePushV1 } = require('../../firebase-push-v1');
const User = require('../models/userModel');

class PushNotificationManager {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      const serviceAccount = require('../../serviceAccountKey.json');
      await firebasePushV1.initialize(serviceAccount, 'homeservicechat');
      this.initialized = true;
      console.log('✅ 推送通知管理器初始化成功');
    } catch (error) {
      console.error('❌ 推送通知管理器初始化失败:', error);
    }
  }

  async sendMessageNotification(receiverId, senderName, messageContent, conversationId) {
    if (!this.initialized) return false;

    try {
      const receiver = await User.findById(receiverId);
      if (!receiver || !receiver.fcmToken) {
        console.log('⚠️  接收者无FCM Token，跳过推送');
        return false;
      }

      await firebasePushV1.sendMessagePush(
        receiver.fcmToken,
        senderName,
        messageContent,
        conversationId
      );
      console.log('✅ 消息推送发送成功');
      return true;
    } catch (error) {
      console.error('❌ 消息推送发送失败:', error);
      return false;
    }
  }

  async sendCallNotification(receiverId, callerName, callId, conversationId) {
    if (!this.initialized) return false;

    try {
      const receiver = await User.findById(receiverId);
      if (!receiver || !receiver.fcmToken) {
        console.log('⚠️  接收者无FCM Token，跳过推送');
        return false;
      }

      await firebasePushV1.sendCallPush(
        receiver.fcmToken,
        callerName,
        callId,
        conversationId
      );
      console.log('✅ 来电推送发送成功');
      return true;
    } catch (error) {
      console.error('❌ 来电推送发送失败:', error);
      return false;
    }
  }
}

module.exports = new PushNotificationManager();
