const mongoose = require('mongoose');

// 记录某个触发事件对某个用户是否已触发过
// 用于防止自动消息在同一账号上重复发送
const autoMessageTriggerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // 触发点：如 user_enter_home
    trigger: {
      type: String,
      required: true,
    },
    // 可选：规则ID，若未来需要按规则维度控制可启用
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AutoMessageRule',
      default: null,
    },
    // 额外信息（设备、渠道等）
    meta: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// 针对 userId + trigger 建立唯一索引，确保每个用户每个触发点只会插入一次
autoMessageTriggerSchema.index({ userId: 1, trigger: 1 }, { unique: true });

const AutoMessageTrigger = mongoose.model('AutoMessageTrigger', autoMessageTriggerSchema);

module.exports = AutoMessageTrigger;


