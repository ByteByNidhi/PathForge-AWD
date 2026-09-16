const fs = require('fs');
const path = require('path');

const Skill = require('../models/Skill');
const LearningPath = require('../models/LearningPath');
const RoadmapStep = require('../models/RoadmapStep');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const Organization = require('../models/Organization');
const OrganizationUser = require('../models/OrganizationUser');
const Opportunity = require('../models/Opportunity');
const OpportunitySkill = require('../models/OpportunitySkill');
const { PATH_SKILLS } = require('../data/pathSkills');
const { ACHIEVEMENT_CATALOG } = require('../data/achievements');
const { WFS_OPPORTUNITIES } = require('../data/opportunities');
const { matchCatalogSkills } = require('../services/opportunitySkillMatcher');

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((item) => item.some((value) => String(value).trim() !== ''));
}

function parseSkillList(raw) {
  return String(raw || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

async function upsertSkill(skillMap, name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    return null;
  }
  if (skillMap.has(trimmed)) {
    return skillMap.get(trimmed);
  }

  const slug = slugify(trimmed);
  const doc = await Skill.findOneAndUpdate(
    { slug },
    {
      $set: {
        name: trimmed,
        slug,
      },
      $setOnInsert: {
        category: '',
      },
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
  );

  skillMap.set(trimmed, doc._id);
  return doc._id;
}

async function seedAchievements() {
  for (const row of ACHIEVEMENT_CATALOG) {
    await Achievement.findOneAndUpdate(
      { slug: row.slug },
      { $set: row },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );
  }

  return Achievement.countDocuments();
}

async function seedDatabase() {
  const { ensureRoadmapIndexes } = require('../config/roadmapIndexes');
  await ensureRoadmapIndexes();
  const csvPath = path.join(__dirname, '..', 'data', 'master-roadmaps.csv');
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(csvText);
  const header = rows[0].map((column) => String(column).trim());
  const records = rows.slice(1);

  const skillMap = new Map();
  const pathIds = new Map();
  const pathDescriptions = new Map();

  for (const names of Object.values(PATH_SKILLS)) {
    for (const name of names) {
      await upsertSkill(skillMap, name);
    }
  }

  for (const row of records) {
    const record = {};
    header.forEach((column, index) => {
      record[column] = row[index] != null ? String(row[index]) : '';
    });

    const pathName = String(record['Path Name'] || '').trim();
    const description = String(record.Description || '').trim();
    const stepNo = Number(record['Step No'] || 0);
    const stepTitle = String(record['Step Title'] || '').trim();
    const xpReward = Number(record['XP Reward'] || 0);
    const skillNames = parseSkillList(record.Skills || '');

    if (!pathName || !stepTitle || stepNo < 1) {
      continue;
    }

    if (description) {
      pathDescriptions.set(pathName, description);
    }

    if (!pathIds.has(pathName)) {
      const slug = slugify(pathName);
      const pathDoc = await LearningPath.findOneAndUpdate(
        { slug },
        {
          $set: {
            title: pathName,
            pathName,
            description: pathDescriptions.get(pathName) || description || null,
            slug,
            isPublished: true,
            icon: null,
            roadmapSource: 'curated',
          },
        },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
      );
      pathIds.set(pathName, pathDoc._id);
    }

    const skillIds = [];
    for (const name of skillNames) {
      const skillId = await upsertSkill(skillMap, name);
      if (skillId) {
        skillIds.push(skillId);
      }
    }

    await RoadmapStep.findOneAndUpdate(
      { pathId: pathIds.get(pathName), stepNo },
      {
        $set: {
          pathId: pathIds.get(pathName),
          stepNo,
          title: stepTitle,
          xpReward,
          isPublished: true,
          skills: skillIds,
        },
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );
  }

  for (const [pathName, pathId] of pathIds.entries()) {
    const names = PATH_SKILLS[pathName] || [];
    const skillIds = [];
    for (const name of names) {
      const skillId = await upsertSkill(skillMap, name);
      if (skillId) {
        skillIds.push(skillId);
      }
    }

    const publishedCount = await RoadmapStep.countDocuments({
      pathId,
      isPublished: true,
    });

    await LearningPath.findByIdAndUpdate(pathId, {
      $set: {
        title: pathName,
        pathName,
        description: pathDescriptions.get(pathName) || null,
        skills: skillIds,
        roadmapMeta: {
          hasPublishedRoadmap: publishedCount > 0,
          stepCount: publishedCount,
        },
      },
    });
  }

  const keepIds = [...pathIds.values()];
  const extras = await LearningPath.find({ _id: { $nin: keepIds } });
  for (const extra of extras) {
    const inUse = await User.countDocuments({ learningPath: extra._id });
    if (inUse > 0) {
      continue;
    }
    await RoadmapStep.deleteMany({ pathId: extra._id });
    await extra.deleteOne();
  }

  const achievementCount = await seedAchievements();
  await seedAdmin();
  const opportunitySeed = await seedOpportunities();

  return {
    skillCount: skillMap.size,
    pathCount: pathIds.size,
    stepCount: await RoadmapStep.countDocuments({
      pathId: { $in: [...pathIds.values()] },
    }),
    achievementCount,
    ...opportunitySeed,
  };
}

function parseSeedDate(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, month - 1, day);
}

async function seedAdmin() {
  let admin = await User.findOne({ email: 'admin@pathforge.test' });
  if (!admin) {
    admin = await User.create({
      name: 'PathForge Admin',
      email: 'admin@pathforge.test',
      password: 'password12',
      role: 'admin',
      onboardingCompleted: true,
    });
  } else if (admin.role !== 'admin') {
    admin.role = 'admin';
    admin.onboardingCompleted = true;
    await admin.save();
  }

  return { adminCount: await User.countDocuments({ role: 'admin' }) };
}

async function seedOrganizations() {
  const organization = await Organization.findOneAndUpdate(
    { slug: 'pathforge-demo-org' },
    {
      $set: {
        name: 'PathForge Demo Org',
        slug: 'pathforge-demo-org',
        email: 'org@pathforge.test',
        website: 'https://example.com',
        description: 'Demo organization for the PathForge college project.',
        status: 'active',
      },
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
  );

  let owner = await User.findOne({ email: 'org@pathforge.test' });
  if (!owner) {
    owner = await User.create({
      name: 'Demo Organization',
      email: 'org@pathforge.test',
      password: 'password12',
      role: 'organization',
      onboardingCompleted: true,
    });
  } else if (owner.role !== 'organization') {
    owner.role = 'organization';
    owner.onboardingCompleted = true;
    await owner.save();
  }

  await OrganizationUser.findOneAndUpdate(
    { organizationId: organization._id, userId: owner._id },
    {
      $set: {
        organizationId: organization._id,
        userId: owner._id,
        role: 'owner',
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  return {
    organizationCount: await Organization.countDocuments(),
    organizationUserCount: await OrganizationUser.countDocuments(),
    adminCount: await User.countDocuments({ role: 'admin' }),
  };
}

async function seedOpportunities() {
  const orgSeed = await seedOrganizations();
  const catalog = await Skill.find().sort({ name: 1 });

  for (const row of WFS_OPPORTUNITIES) {
    const doc = await Opportunity.findOneAndUpdate(
      { title: row.title },
      {
        $set: {
          title: row.title,
          organization: row.organization,
          type: row.type,
          description: row.description,
          requiredSkills: row.requiredSkills,
          eligibility: row.eligibility,
          deadline: parseSeedDate(row.deadline),
          applicationUrl: row.applicationUrl,
          location: row.location,
          approvalStatus: Opportunity.APPROVAL_APPROVED,
          source: null,
          externalId: null,
          sourceUrl: null,
          organizationId: null,
          submittedByUserId: null,
          rejectionReason: null,
        },
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    const matched = matchCatalogSkills(row.requiredSkills || '', catalog);
    const keepIds = [];
    for (const skill of matched) {
      keepIds.push(skill._id);
      await OpportunitySkill.findOneAndUpdate(
        { opportunityId: doc._id, skillId: skill._id },
        {
          $setOnInsert: {
            opportunityId: doc._id,
            skillId: skill._id,
          },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    await OpportunitySkill.deleteMany({
      opportunityId: doc._id,
      skillId: { $nin: keepIds },
    });
  }

  return {
    opportunityCount: await Opportunity.countDocuments({
      title: { $in: WFS_OPPORTUNITIES.map((item) => item.title) },
    }),
    opportunitySkillCount: await OpportunitySkill.countDocuments(),
    ...orgSeed,
  };
}

module.exports = {
  slugify,
  seedDatabase,
  seedAchievements,
  seedOpportunities,
  seedOrganizations,
  seedAdmin,
};
