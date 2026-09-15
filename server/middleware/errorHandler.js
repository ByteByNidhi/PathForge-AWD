const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

function errorHandler(err, _req, res, _next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || null;

  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors || {}).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }

  if (err.code === 11000) {
    status = 409;
    const key = Object.keys(err.keyPattern || {})[0];
    if (key === 'email') {
      message = 'An account with this email already exists';
      errors = [{ field: 'email', message }];
    } else if (key === 'name' || key === 'slug') {
      message = 'This record already exists';
    } else {
      message = 'A duplicate record already exists';
    }
  }

  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    status = 400;
    message = 'Invalid identifier';
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Authentication required';
  }

  if (process.env.NODE_ENV !== 'production' && status >= 500) {
    console.error(err);
  }

  if (status >= 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal server error';
    errors = null;
  }

  res.status(status).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
    ...(mongoose.connection.readyState === 0 && status >= 500
      ? { code: 'DATABASE_UNAVAILABLE' }
      : {}),
  });
}

module.exports = errorHandler;
