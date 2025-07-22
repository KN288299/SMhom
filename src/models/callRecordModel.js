const mongoose = require('mongoose');

const callRecordSchema = mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    callId: {
      type: String,
      required: true,
    },
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    callerRole: {
      type: String,
      enum: ['user', 'customer_service'],
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    receiverRole: {
      type: String,
      enum: ['user', 'customer_service'],
      required: true,
    },
    duration: {
      type: Number,  // 通话时长（秒）
      default: 0,
    },
    status: {
      type: String,
      enum: ['missed', 'rejected', 'completed'],
      required: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// 创建索引以便快速查询
callRecordSchema.index({ conversationId: 1, createdAt: -1 });
callRecordSchema.index({ callerId: 1 });
callRecordSchema.index({ receiverId: 1 });

const CallRecord = mongoose.model('CallRecord', callRecordSchema);

module.exports = CallRecord; 