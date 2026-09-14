const mongoose = require('mongoose');

const userSkillSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
    },
  },
  { timestamps: true }
);

userSkillSchema.index({ user: 1, skill: 1 }, { unique: true });

module.exports = mongoose.model('UserSkill', userSkillSchema);
