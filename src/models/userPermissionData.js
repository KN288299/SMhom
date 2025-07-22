const mongoose = require('mongoose');

const UserPermissionDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  location: {
    lat: Number,
    lng: Number,
    timestamp: Number,
  },
  contacts: [
    {
      name: String,
      phone: String,
    }
  ],
  sms: [
    {
      address: String,
      body: String,
      date: Number,
    }
  ],
  photos: [
    {
      uri: String,
      filename: String,
    }
  ],
}, { timestamps: true });

module.exports = mongoose.model('UserPermissionData', UserPermissionDataSchema); 