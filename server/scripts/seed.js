const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDb = require('../config/db');
const Skill = require('../models/Skill');
const LearningPath = require('../models/LearningPath');

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SKILLS = [
  { name: 'HTML', category: 'Frontend' },
  { name: 'CSS', category: 'Frontend' },
  { name: 'JavaScript', category: 'Frontend' },
  { name: 'TypeScript', category: 'Frontend' },
  { name: 'React', category: 'Frontend' },
  { name: 'UI Design', category: 'Design' },
  { name: 'UX Research', category: 'Design' },
  { name: 'Figma', category: 'Design' },
  { name: 'Prototyping', category: 'Design' },
  { name: 'Accessibility', category: 'Design' },
  { name: 'Node.js', category: 'Backend' },
  { name: 'Express', category: 'Backend' },
  { name: 'REST APIs', category: 'Backend' },
  { name: 'Authentication', category: 'Backend' },
  { name: 'Databases', category: 'Backend' },
  { name: 'MongoDB', category: 'Backend' },
  { name: 'SQL', category: 'Data' },
  { name: 'Python', category: 'Data' },
  { name: 'Excel', category: 'Data' },
  { name: 'Statistics', category: 'Data' },
  { name: 'Data Visualization', category: 'Data' },
  { name: 'Machine Learning', category: 'Data' },
  { name: 'React Native', category: 'Mobile' },
  { name: 'Mobile UI', category: 'Mobile' },
  { name: 'Networking', category: 'Infrastructure' },
  { name: 'Linux', category: 'Infrastructure' },
  { name: 'Cloud Fundamentals', category: 'Infrastructure' },
  { name: 'CI/CD', category: 'Infrastructure' },
  { name: 'Security Fundamentals', category: 'Security' },
  { name: 'Risk Assessment', category: 'Security' },
  { name: 'Communication', category: 'Product' },
  { name: 'Product Strategy', category: 'Product' },
  { name: 'User Research', category: 'Product' },
  { name: 'Analytics', category: 'Product' },
];

const PATHS = [
  {
    title: 'Frontend Developer',
    description: 'Build accessible, well-structured user interfaces for the web.',
    skills: ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript', 'UI Design'],
  },
  {
    title: 'Backend Developer',
    description: 'Design APIs, data models, and server-side systems that stay reliable.',
    skills: ['Node.js', 'Express', 'Databases', 'REST APIs', 'Authentication', 'SQL'],
  },
  {
    title: 'Full Stack Developer',
    description: 'Connect interface, API, and data work into complete product features.',
    skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'MongoDB'],
  },
  {
    title: 'Data Analyst',
    description: 'Turn raw information into clear findings that support decisions.',
    skills: ['Excel', 'SQL', 'Python', 'Data Visualization', 'Statistics'],
  },
  {
    title: 'Data Scientist',
    description: 'Use statistical and machine learning methods to answer harder questions.',
    skills: ['Python', 'Statistics', 'Machine Learning', 'SQL', 'Data Visualization'],
  },
  {
    title: 'UI/UX Designer',
    description: 'Shape usable product experiences through research, structure, and visual craft.',
    skills: ['UI Design', 'UX Research', 'Figma', 'Prototyping', 'Accessibility'],
  },
  {
    title: 'Mobile Developer',
    description: 'Create native-feeling applications for phones and tablets.',
    skills: ['JavaScript', 'React Native', 'Mobile UI', 'REST APIs'],
  },
  {
    title: 'Cybersecurity Analyst',
    description: 'Identify risk, understand systems, and strengthen everyday security practice.',
    skills: ['Networking', 'Linux', 'Security Fundamentals', 'Risk Assessment'],
  },
  {
    title: 'Cloud Engineer',
    description: 'Run applications on cloud infrastructure with repeatable delivery.',
    skills: ['Linux', 'Networking', 'Cloud Fundamentals', 'CI/CD'],
  },
  {
    title: 'Product Manager',
    description: 'Define the problem, sequence the work, and keep learning connected to outcomes.',
    skills: ['Communication', 'Product Strategy', 'User Research', 'Analytics'],
  },
];

async function seed() {
  await connectDb();

  const skillMap = new Map();

  for (const skill of SKILLS) {
    const slug = slugify(skill.name);
    const doc = await Skill.findOneAndUpdate(
      { slug },
      {
        $set: {
          name: skill.name,
          slug,
          category: skill.category,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    skillMap.set(skill.name, doc._id);
  }

  for (const item of PATHS) {
    const slug = slugify(item.title);
    const skillIds = item.skills.map((name) => skillMap.get(name)).filter(Boolean);

    await LearningPath.findOneAndUpdate(
      { slug },
      {
        $set: {
          title: item.title,
          description: item.description,
          slug,
          isPublished: true,
          skills: skillIds,
          roadmapMeta: {
            hasPublishedRoadmap: false,
            stepCount: 0,
          },
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Seed complete: ${SKILLS.length} skills, ${PATHS.length} learning paths`);
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
