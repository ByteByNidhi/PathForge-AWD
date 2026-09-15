const mongoose = require('mongoose');

const CONDITION_TYPES = ['completed_steps', 'roadmap_percent', 'skills_count', 'xp', 'level'];

const achievementSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      default: '',
      trim: true,
    },
    rarity: {
      type: String,
      default: 'common',
      trim: true,
    },
    conditionType: {
      type: String,
      required: true,
      enum: CONDITION_TYPES,
    },
    conditionValue: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Achievement', achievementSchema);
module.exports.CONDITION_TYPES = CONDITION_TYPES;
