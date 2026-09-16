const mongoose = require('mongoose');
const RoadmapStep = require('../models/RoadmapStep');

const LEGACY_UNIQUE_NAME = 'pathId_1_stepNo_1';

function isLegacyPathStepIndex(index) {
  if (!index || !index.unique) {
    return false;
  }
  if (index.name === LEGACY_UNIQUE_NAME) {
    return true;
  }
  const keys = Object.keys(index.key || {});
  return (
    keys.length === 2 &&
    index.key.pathId === 1 &&
    index.key.stepNo === 1 &&
    index.key.isPublished == null
  );
}

async function ensureRoadmapIndexes() {
  const collection = mongoose.connection.collection('roadmapsteps');
  const indexes = await collection.indexes();
  const dropped = [];

  for (const index of indexes) {
    if (!isLegacyPathStepIndex(index)) {
      continue;
    }
    await collection.dropIndex(index.name);
    dropped.push(index.name);
  }

  await RoadmapStep.syncIndexes();
  return { dropped };
}

module.exports = {
  LEGACY_UNIQUE_NAME,
  isLegacyPathStepIndex,
  ensureRoadmapIndexes,
};
