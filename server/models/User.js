const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { calculateLevel, xpIntoLevel } = require('../utils/level');

const ROLES = ['student', 'organization', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'student',
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    isBeginner: {
      type: Boolean,
      default: false,
    },
    learningPath: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningPath',
      default: null,
    },
    careerPathRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CareerPathRequest',
      default: null,
    },
    profile: {
      location: {
        type: String,
        default: '',
        trim: true,
      },
      bio: {
        type: String,
        default: '',
        trim: true,
      },
    },
    xp: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('xp')) {
    this.level = calculateLevel(this.xp);
  }

  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.virtual('pathId').get(function pathId() {
  return this.learningPath;
});

userSchema.virtual('xpIntoLevel').get(function xpIntoLevelVirtual() {
  return xpIntoLevel(this.xp);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.addXp = async function addXp(amount) {
  const reward = Number(amount) || 0;
  this.xp = (Number(this.xp) || 0) + reward;
  this.level = calculateLevel(this.xp);
  await this.save();
  const achievementService = require('../services/achievementService');
  await achievementService.checkAndUnlock(this);
  return this;
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const user = this.toObject({ virtuals: true });
  delete user.password;
  delete user.__v;
  user.xpIntoLevel = xpIntoLevel(user.xp);
  return user;
};

userSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.password;
    delete ret.__v;
    ret.xpIntoLevel = xpIntoLevel(ret.xp);
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
