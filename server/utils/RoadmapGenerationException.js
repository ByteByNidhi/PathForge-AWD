const AppError = require('./AppError');

class RoadmapGenerationException extends AppError {
  constructor(message, status = 422) {
    super(message, status);
    this.name = 'RoadmapGenerationException';
  }
}

module.exports = RoadmapGenerationException;
