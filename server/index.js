const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const connectDb = require('./config/db');
const corsOptions = require('./config/cors');
const apiRouter = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

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

  const app = express();

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  app.listen(env.port, () => {
    console.log(`PathForge API listening on port ${env.port}`);
  });
}

start();
