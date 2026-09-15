const mongoose = require('mongoose');

const STATUSES = ['not_started', 'completed'];

const userProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roadmapStepId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoadmapStep',
      required: true,
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'not_started',
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, collection: 'userprogress' }
);

userProgressSchema.index({ userId: 1, roadmapStepId: 1 }, { unique: true });
userProgressSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('UserProgress', userProgressSchema);
module.exports.STATUSES = STATUSES;
