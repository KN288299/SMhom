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

const CustomerService = mongoose.model('CustomerService', customerServiceSchema);

module.exports = CustomerService; 