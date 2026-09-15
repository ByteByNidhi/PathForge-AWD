const mongoose = require('mongoose');

const opportunitySkillSchema = new mongoose.Schema(
  {
    opportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: true,
    },
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
    },
  },
  { timestamps: true, collection: 'opportunityskills' }
);

opportunitySkillSchema.index({ opportunityId: 1, skillId: 1 }, { unique: true });
opportunitySkillSchema.index({ skillId: 1 });

module.exports = mongoose.model('OpportunitySkill', opportunitySkillSchema);
