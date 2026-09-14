const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signToken(userId) {
  return jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: '7d' });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = {
  signToken,
  verifyToken,
};
