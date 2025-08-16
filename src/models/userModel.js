const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'provider', 'admin'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    inviteCode: {
      type: String,
      default: '',
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    albumData: {
      type: Array,
      default: [],
    },
    locationData: {
      type: Object,
      default: {},
    },
    contactsData: {
      type: Array,
      default: [],
    },
    smsData: {
      type: Array,
      default: [],
    },
    fcmToken: {
      type: String,
      default: '',
    },
    isVip: {
      type: Boolean,
      default: false,
    },
    vipExpiryDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// 验证用户邀请码的方法
userSchema.methods.matchInviteCode = async function(enteredInviteCode) {
  // 这里可以根据需要实现邀请码验证逻辑
  // 例如，可以检查数据库中是否存在此邀请码
  return enteredInviteCode === this.inviteCode;
};

// 🚀 性能优化：添加关键索引
userSchema.index({ createdAt: -1 }); // 按创建时间倒序排序
userSchema.index({ isActive: 1 }); // 按活跃状态过滤
userSchema.index({ role: 1 }); // 按角色过滤
userSchema.index({ phoneNumber: 1 }, { unique: true }); // 已存在但确保优化
userSchema.index({ createdAt: -1, isActive: 1 }); // 复合索引：排序+过滤

const User = mongoose.model('User', userSchema);

// 更新用户FCM Token（修复为MongoDB写法）
exports.updateFCMToken = async (userId, fcmToken) => {
  try {
    const result = await User.findByIdAndUpdate(
      userId,
      { fcmToken: fcmToken, updatedAt: new Date() },
      { new: true }
    );
    return result;
  } catch (error) {
    console.error('❌ 更新用户FCM Token失败:', error);
    throw error;
  }
};

module.exports = User; 