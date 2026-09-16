const AppError = require('./AppError');

class GeminiServiceException extends AppError {
  constructor(message) {
    super(message, 503);
    this.name = 'GeminiServiceException';
  }
}

module.exports = GeminiServiceException;
