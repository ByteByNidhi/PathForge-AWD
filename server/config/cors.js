const env = require('./env');

const corsOptions = {
  origin: env.clientOrigin,
  credentials: true,
};

module.exports = corsOptions;
