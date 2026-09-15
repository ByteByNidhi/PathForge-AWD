const Opportunity = require('../models/Opportunity');
const SavedOpportunity = require('../models/SavedOpportunity');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { isValidId } = require('../utils/ids');
const { isVisibleToStudents } = require('../services/opportunityVisibility');
const opportunityService = require('../services/opportunityService');

async function loadVisibleOpportunity(id) {
  if (!isValidId(id)) {
    throw new AppError('Opportunity not found', 404);
  }
  const opportunity = await Opportunity.findById(id);
  if (!opportunity || !isVisibleToStudents(opportunity)) {
    throw new AppError('Opportunity not found', 404);
  }
  return opportunity;
}

const listOpportunities = asyncHandler(async (req, res) => {
  const payload = await opportunityService.listForStudent(req.user, req.query);
  res.status(200).json({
    success: true,
    ...payload,
  });
});

const listSavedOpportunities = asyncHandler(async (req, res) => {
  const opportunities = await opportunityService.listSavedForStudent(req.user);
  res.status(200).json({
    success: true,
    opportunities,
  });
});

const getOpportunity = asyncHandler(async (req, res) => {
  const opportunity = await opportunityService.getVisibleForStudent(req.user, req.params.id);
  if (!opportunity) {
    throw new AppError('Opportunity not found', 404);
  }
  res.status(200).json({
    success: true,
    opportunity,
  });
});

const saveOpportunity = asyncHandler(async (req, res) => {
  const opportunity = await loadVisibleOpportunity(req.params.id);

  try {
    const saved = await SavedOpportunity.findOneAndUpdate(
      { userId: req.user.id, opportunityId: opportunity._id },
      {
        $setOnInsert: {
          userId: req.user.id,
          opportunityId: opportunity._id,
          savedAt: new Date(),
        },
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Opportunity saved.',
      saved: true,
      savedOpportunity: {
        userId: saved.userId,
        opportunityId: saved.opportunityId,
        savedAt: saved.savedAt,
      },
    });
  } catch (error) {
    if (error && error.code === 11000) {
      const existing = await SavedOpportunity.findOne({
        userId: req.user.id,
        opportunityId: opportunity._id,
      });
      return res.status(200).json({
        success: true,
        message: 'Opportunity saved.',
        saved: true,
        savedOpportunity: existing
          ? {
              userId: existing.userId,
              opportunityId: existing.opportunityId,
              savedAt: existing.savedAt,
            }
          : null,
      });
    }
    throw error;
  }
});

const unsaveOpportunity = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) {
    throw new AppError('Opportunity not found', 404);
  }

  await SavedOpportunity.findOneAndDelete({
    userId: req.user.id,
    opportunityId: req.params.id,
  });

  res.status(200).json({
    success: true,
    message: 'Opportunity removed from saved.',
    saved: false,
  });
});

module.exports = {
  listOpportunities,
  listSavedOpportunities,
  getOpportunity,
  saveOpportunity,
  unsaveOpportunity,
};
