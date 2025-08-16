const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const customerServiceSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    inviteCode: {
      type: String,
      default: '1332',
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'busy'],
      default: 'offline',
    },
    lastActiveTime: {
      type: Date,
      default: Date.now,
    },
    serviceStats: {
      totalSessions: {
        type: Number,
        default: 0,
      },
      totalMessages: {
        type: Number,
        default: 0,
      },
      rating: {
        type: Number,
        default: 5.0,
      }
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

// 添加密码验证方法
customerServiceSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 保存前加密密码
customerServiceSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// 🚀 性能优化：添加关键索引
customerServiceSchema.index({ status: 1 }); // 按状态过滤（online/offline/busy）
customerServiceSchema.index({ isActive: 1 }); // 按活跃状态过滤
customerServiceSchema.index({ lastActiveTime: -1 }); // 按最后活跃时间排序
customerServiceSchema.index({ isActive: 1, status: 1 }); // 复合索引：常用查询组合
customerServiceSchema.index({ createdAt: -1 }); // 按创建时间排序

const CustomerService = mongoose.model('CustomerService', customerServiceSchema);

module.exports = CustomerService; 