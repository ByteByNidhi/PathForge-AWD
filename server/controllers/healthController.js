const mongoose = require('mongoose');

function getHealth(_req, res) {
  const dbState = mongoose.connection.readyState;
  const database =
    dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

  res.status(200).json({
    success: true,
    message: 'PathForge API is running',
    database,
  });
}

module.exports = {
  getHealth,
};
