const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDb = require('../config/db');
const { seedDatabase } = require('./seedLib');

async function seed() {
  await connectDb();
  const result = await seedDatabase();
  console.log(
    `Seed complete: ${result.skillCount} skills, ${result.pathCount} learning paths, ${result.stepCount} roadmap steps, ${result.achievementCount} achievements, ${result.opportunityCount} opportunities, ${result.opportunitySkillCount} opportunity skills, ${result.organizationCount} organizations, ${result.organizationUserCount} organization users`
  );
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
