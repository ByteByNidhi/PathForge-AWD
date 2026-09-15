const express = require('express');
const cors = require('cors');
const corsOptions = require('./config/cors');
const apiRouter = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', apiRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
