const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    job: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: 'https://via.placeholder.com/150',
    },
    province: {
      type: String,
      default: '北京市',
    },
    height: {
      type: Number,
      default: 165,
    },
    weight: {
      type: Number,
      default: 50,
    },
    description: {
      type: String,
      default: '',
    },
    photos: [{
      type: String,
    }],
    tag: {
      type: String,
      default: '可预约',
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

const Staff = mongoose.model('Staff', staffSchema);

module.exports = Staff; 