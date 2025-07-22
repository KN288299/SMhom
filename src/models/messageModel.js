const mongoose = require('mongoose');

const messageSchema = mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['user', 'customer_service'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    contentType: {
      type: String,
      enum: ['text', 'image', 'file', 'voice', 'video', 'location'],
      default: 'text',
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'voice', 'video', 'location'],
      default: 'text',
    },
    fileUrl: {
      type: String,
      default: '',
    },
    voiceUrl: {
      type: String,
      default: '',
    },
    voiceDuration: {
      type: String,
      default: '00:00',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    videoUrl: {
      type: String,
      default: '',
    },
    videoDuration: {
      type: String,
      default: '00:00',
    },
    videoWidth: {
      type: Number,
      default: 0,
    },
    videoHeight: {
      type: Number,
      default: 0,
    },
    aspectRatio: {
      type: Number,
      default: 1.78,
    },
    // 位置信息字段
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    locationName: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// 创建索引以便快速查询
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ conversationId: 1, isRead: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 