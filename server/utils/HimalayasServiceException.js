const AppError = require('./AppError');

class HimalayasServiceException extends AppError {
  constructor(message, status = 503) {
    super(message, status);
    this.name = 'HimalayasServiceException';
  }
}

module.exports = HimalayasServiceException;
