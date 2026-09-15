const mongoose = require('mongoose');

const STATUSES = ['active', 'inactive'];
const ROLES = ['owner', 'member'];

const organizationSchema = new mongoose.Schema(
  {
    name: {
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
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    website: {
      type: String,
      default: null,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    logoUrl: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'active',
    },
  },
  { timestamps: true, collection: 'organizations' }
);

module.exports = mongoose.model('Organization', organizationSchema);
module.exports.STATUSES = STATUSES;
module.exports.ROLES = ROLES;
