// db.js
const mongoose = require('mongoose');

mongoose.set('debug', true);

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/sh', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Could not connect to MongoDB:', err);
    process.exit(1);
  }
};

module.exports = { connectDB };
