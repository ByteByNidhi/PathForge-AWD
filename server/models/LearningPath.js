const mongoose = require('mongoose');

const learningPathSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
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

module.exports = mongoose.model('LearningPath', learningPathSchema);
