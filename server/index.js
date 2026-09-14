const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const corsOptions = require('./config/cors');
const apiRouter = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api', apiRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`PathForge API listening on port ${env.port}`);
});
