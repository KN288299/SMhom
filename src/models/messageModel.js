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
    // 视频缩略图字段
    videoThumbnailUrl: {
      type: String,
      default: '',
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
    // 软删除标记与信息
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // 撤回标记与信息
    isRecalled: {
      type: Boolean,
      default: false,
    },
    recalledAt: {
      type: Date,
    },
    recalledBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
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
messageSchema.index({ conversationId: 1, isDeleted: 1 });
messageSchema.index({ conversationId: 1, isRecalled: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 