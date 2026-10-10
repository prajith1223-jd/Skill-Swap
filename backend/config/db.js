const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// Force Google DNS (8.8.8.8) to resolve SRV records
// This bypasses the corporate/ISP DNS that blocks MongoDB SRV lookups
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
