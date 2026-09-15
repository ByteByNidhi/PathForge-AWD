const mongoose = require('mongoose');

const savedOpportunitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    opportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: true,
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true, collection: 'savedopportunities' }
);

savedOpportunitySchema.index({ userId: 1, opportunityId: 1 }, { unique: true });
savedOpportunitySchema.index({ userId: 1, savedAt: -1 });

module.exports = mongoose.model('SavedOpportunity', savedOpportunitySchema);
