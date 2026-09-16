const mongoose = require('mongoose');
const env = require('./env');
const { ensureRoadmapIndexes } = require('./roadmapIndexes');

async function connectDb() {
  if (!env.mongodbUri) {
    throw new Error('MONGODB_URI is not set. Add your MongoDB Atlas connection string to server/.env');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(env.mongodbUri);
  const { dropped } = await ensureRoadmapIndexes();
  if (dropped.length) {
    console.log(`Dropped legacy roadmap index: ${dropped.join(', ')}`);
  }

  console.log('MongoDB connected');
}

module.exports = connectDb;
