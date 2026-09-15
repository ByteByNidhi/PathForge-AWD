const mongoose = require('mongoose');

const learningPathSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    pathName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    icon: {
      type: String,
      default: null,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    roadmapSource: {
      type: String,
      default: 'curated',
      trim: true,
    },
    roadmapGeneratedAt: {
      type: Date,
      default: null,
    },
    roadmapDraftTitle: {
      type: String,
      default: null,
      trim: true,
    },
    roadmapDraftDescription: {
      type: String,
      default: null,
      trim: true,
    },
    skills: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
      },
    ],
    roadmapMeta: {
      hasPublishedRoadmap: {
        type: Boolean,
        default: false,
      },
      stepCount: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true }
);

learningPathSchema.index({ pathName: 1 });

learningPathSchema.pre('validate', function syncPathName() {
  if (this.pathName && !this.title) {
    this.title = this.pathName;
  }
  if (this.title && !this.pathName) {
    this.pathName = this.title;
  }
});

learningPathSchema.virtual('roadmapSteps', {
  ref: 'RoadmapStep',
  localField: '_id',
  foreignField: 'pathId',
});

learningPathSchema.methods.allRoadmapSteps = function allRoadmapSteps() {
  const RoadmapStep = require('./RoadmapStep');
  return RoadmapStep.find({ pathId: this._id }).sort(RoadmapStep.STEP_SORT);
};

learningPathSchema.methods.publishedRoadmapSteps = function publishedRoadmapSteps() {
  const RoadmapStep = require('./RoadmapStep');
  return RoadmapStep.find({ pathId: this._id, isPublished: true }).sort(RoadmapStep.STEP_SORT);
};

learningPathSchema.methods.draftRoadmapSteps = function draftRoadmapSteps() {
  const RoadmapStep = require('./RoadmapStep');
  return RoadmapStep.find({ pathId: this._id, isPublished: false }).sort(RoadmapStep.STEP_SORT);
};

learningPathSchema.methods.relatedPathSkills = function relatedPathSkills() {
  return this.populate('skills');
};

module.exports = mongoose.model('LearningPath', learningPathSchema);
