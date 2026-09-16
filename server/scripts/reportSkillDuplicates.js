require('../config/env');
const mongoose = require('mongoose');
const connectDb = require('../config/db');
const Skill = require('../models/Skill');
const { reportDuplicateSkillGroups } = require('../services/skillCatalogService');

async function main() {
  await connectDb();
  const groups = await reportDuplicateSkillGroups();
  const total = await Skill.countDocuments();
  if (!groups.length) {
    console.log(`No case-insensitive duplicate skill names among ${total} Skill documents.`);
  } else {
    console.log(`Found ${groups.length} duplicate skill-name group(s) among ${total} Skill documents:`);
    for (const group of groups) {
      console.log(JSON.stringify(group, null, 2));
    }
  }
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
