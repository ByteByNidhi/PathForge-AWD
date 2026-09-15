const mongoose = require('mongoose');

const STEP_SORT = { stepNo: 1, _id: 1 };

const roadmapStepSchema = new mongoose.Schema(
  {
    pathId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningPath',
      required: true,
    },
    stepNo: {
      type: Number,
      required: true,
      min: 1,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    xpReward: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    skills: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
      },
    ],
  },
  { timestamps: true, collection: 'roadmapsteps' }
);

roadmapStepSchema.index({ pathId: 1, stepNo: 1 }, { unique: true });
roadmapStepSchema.index({ pathId: 1, isPublished: 1, stepNo: 1, _id: 1 });

roadmapStepSchema.statics.stepSort = function stepSort() {
  return STEP_SORT;
};

module.exports = mongoose.model('RoadmapStep', roadmapStepSchema);
module.exports.STEP_SORT = STEP_SORT;
