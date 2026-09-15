const env = require('./config/env');
const connectDb = require('./config/db');
const createApp = require('./app');

async function start() {
  if (!env.jwtSecret) {
    console.error('JWT_SECRET is not set. Add it to server/.env');
    process.exit(1);
  }

  try {
    await connectDb();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`PathForge API listening on port ${env.port}`);
  });
}

start();
