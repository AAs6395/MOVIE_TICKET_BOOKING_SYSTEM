const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bookmyshow';

const connectWithRetry = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    if (error.message.includes('buffering timed out')) {
      console.error('Please ensure MongoDB is running on your machine.');
    }
    setTimeout(connectWithRetry, 5000);
  }
};

module.exports = connectWithRetry;
