const mongoose = require('mongoose');

const STATUSES = ['pending', 'reviewed', 'implemented'];

const careerPathRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestedPath: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CareerPathRequest', careerPathRequestSchema);
module.exports.STATUSES = STATUSES;
