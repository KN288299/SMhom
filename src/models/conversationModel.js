const mongoose = require('mongoose');

const conversationSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerServiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerService',
      required: true,
    },
    lastMessage: {
      type: String,
      default: '',
    },
    lastMessageTime: {
      type: Date,
      default: Date.now,
    },
    unreadCountUser: {
      type: Number,
      default: 0,
    },
    unreadCountCS: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// 创建索引以便快速查询
conversationSchema.index({ userId: 1, customerServiceId: 1 }, { unique: true });
conversationSchema.index({ userId: 1 });
conversationSchema.index({ customerServiceId: 1 });
conversationSchema.index({ lastMessageTime: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation; 