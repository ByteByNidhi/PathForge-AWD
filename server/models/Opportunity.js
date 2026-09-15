const mongoose = require('mongoose');

const TYPES = ['Hackathon', 'Internship', 'Scholarship', 'Research'];
const APPROVAL_STATUSES = ['draft', 'pending', 'approved', 'rejected'];
const SOURCES = ['himalayas', 'organization'];

const opportunitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    organization: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    requiredSkills: {
      type: String,
      default: null,
      trim: true,
    },
    eligibility: {
      type: String,
      default: null,
      trim: true,
    },
    deadline: {
      type: Date,
      default: null,
    },
    applicationUrl: {
      type: String,
      default: null,
      trim: true,
    },
    location: {
      type: String,
      default: null,
      trim: true,
    },
    source: {
      type: String,
      default: null,
      trim: true,
    },
    externalId: {
      type: String,
      default: null,
      trim: true,
    },
    sourceUrl: {
      type: String,
      default: null,
      trim: true,
    },
    approvalStatus: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: 'approved',
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    submittedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true, collection: 'opportunities' }
);

opportunitySchema.index({ approvalStatus: 1 });
opportunitySchema.index({ organizationId: 1 });
opportunitySchema.index({ deadline: 1 });
opportunitySchema.index({ type: 1 });
opportunitySchema.index({ location: 1 });
opportunitySchema.index(
  { source: 1, externalId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      source: { $type: 'string' },
      externalId: { $type: 'string' },
    },
  }
);

module.exports = mongoose.model('Opportunity', opportunitySchema);
module.exports.TYPES = TYPES;
module.exports.APPROVAL_STATUSES = APPROVAL_STATUSES;
module.exports.SOURCES = SOURCES;
module.exports.APPROVAL_APPROVED = 'approved';
module.exports.APPROVAL_PENDING = 'pending';
module.exports.APPROVAL_DRAFT = 'draft';
module.exports.APPROVAL_REJECTED = 'rejected';
module.exports.SOURCE_HIMALAYAS = 'himalayas';
module.exports.SOURCE_ORGANIZATION = 'organization';
