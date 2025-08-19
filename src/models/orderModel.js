const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    appointmentTime: {
      type: Date,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'completed', 'cancelled'],
      default: 'pending',
    },
    serviceType: {
      type: String,
      required: true,
    },
    province: {
      type: String,
      default: '北京市',
    },
    orderNumber: {
      type: String,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// 生成唯一订单号
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    // 格式: ORD + 年月日 + 随机数
    const date = new Date();
    const dateStr = 
      date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, '0') +
      date.getDate().toString().padStart(2, '0');
    
    const randomNum = Math.floor(10000 + Math.random() * 90000); // 5位随机数
    this.orderNumber = `ORD${dateStr}${randomNum}`;
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order; 