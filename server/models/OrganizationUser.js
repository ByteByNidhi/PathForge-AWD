const mongoose = require('mongoose');
const { ROLES } = require('./Organization');

const organizationUserSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'member',
    },
  },
  { timestamps: true, collection: 'organizationusers' }
);

organizationUserSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('OrganizationUser', organizationUserSchema);
