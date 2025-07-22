const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    // 默认连接本地MongoDB，如果有.env文件中的MONGODB_URI则使用该URI
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homeservicechat';
    
    const conn = await mongoose.connect(mongoURI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB; 