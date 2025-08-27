const mongoose = require('mongoose');

const autoMessageItemSchema = new mongoose.Schema(
  {
    // text | image | voice | video
    contentType: {
      type: String,
      enum: ['text', 'image', 'voice', 'video'],
      required: true,
    },
    // 文本内容（文本消息必填）
    content: {
      type: String,
      default: '',
    },
    // 通用文件URL（图片/语音/视频）
    fileUrl: {
      type: String,
      default: '',
    },
    // 语音扩展字段
    voiceUrl: {
      type: String,
      default: '',
    },
    voiceDuration: {
      type: String,
      default: '00:00',
    },
    // 图片扩展字段
    imageUrl: {
      type: String,
      default: '',
    },
    // 视频扩展字段
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
  },
  { _id: false }
);

const autoMessageRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    // 触发事件（当前仅支持 user_enter_home）
    trigger: {
      type: String,
      enum: ['user_enter_home'],
      default: 'user_enter_home',
    },
    // 首次发送延迟（秒）
    initialDelaySeconds: {
      type: Number,
      default: 10,
    },
    // 发送消息的客服账号
    customerServiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerService',
      required: true,
    },
    // 消息序列（按顺序发送）
    messages: {
      type: [autoMessageItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

autoMessageRuleSchema.index({ enabled: 1, trigger: 1 });
autoMessageRuleSchema.index({ customerServiceId: 1 });

const AutoMessageRule = mongoose.model('AutoMessageRule', autoMessageRuleSchema);

module.exports = AutoMessageRule;


