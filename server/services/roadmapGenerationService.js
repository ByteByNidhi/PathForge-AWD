const LearningPath = require('../models/LearningPath');
const RoadmapStep = require('../models/RoadmapStep');
const Skill = require('../models/Skill');
const User = require('../models/User');
const UserProgress = require('../models/UserProgress');
const geminiService = require('./geminiService');
const GeminiServiceException = require('../utils/GeminiServiceException');
const RoadmapGenerationException = require('../utils/RoadmapGenerationException');

const MIN_STEPS = 8;
const MAX_STEPS = 20;

function responseSchema() {
  return {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING' },
      description: { type: 'STRING' },
      steps: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            description: { type: 'STRING' },
            xp_reward: { type: 'INTEGER' },
            skills: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
          },
          required: ['title', 'description', 'xp_reward', 'skills'],
        },
      },
    },
    required: ['title', 'description', 'steps'],
  };
}

function firstValidationError(errors) {
  return errors[0]?.message || 'Invalid roadmap payload.';
}

function decodeJson(raw) {
  let text = String(raw || '').trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '');
    text = text.replace(/\s*```$/, '');
    text = text.trim();
  }

  let decoded;
  try {
    decoded = JSON.parse(text);
  } catch {
    throw new RoadmapGenerationException(
      'Gemini did not return valid JSON for this roadmap. Nothing was saved.'
    );
  }

  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
    throw new RoadmapGenerationException(
      'Gemini did not return valid JSON for this roadmap. Nothing was saved.'
    );
  }

  return decoded;
}

function validatePayload(payload, catalog) {
  const errors = [];
  const title = String(payload.title || '').trim();
  const description = String(payload.description || '').trim();
  const steps = Array.isArray(payload.steps) ? payload.steps : null;

  if (title.length < 3 || title.length > 255) {
    errors.push({ field: 'title', message: 'The title field is invalid.' });
  }
  if (description.length < 10 || description.length > 5000) {
    errors.push({ field: 'description', message: 'The description field is invalid.' });
  }
  if (!steps || steps.length < MIN_STEPS || steps.length > MAX_STEPS) {
    errors.push({
      field: 'steps',
      message: `The steps field must contain between ${MIN_STEPS} and ${MAX_STEPS} items.`,
    });
  }

  if (errors.length) {
    throw new RoadmapGenerationException(
      `Gemini returned a roadmap that failed validation. Nothing was saved. ${firstValidationError(errors)}`
    );
  }

  const skillsByName = new Map();
  for (const skill of catalog) {
    skillsByName.set(String(skill.name).trim().toLowerCase(), skill);
  }

  const validatedSteps = [];

  for (const [index, step] of steps.entries()) {
    const stepTitle = String(step?.title || '').trim();
    const stepDescription = String(step?.description || '').trim();
    const xpReward = Number(step?.xp_reward);
    const skillNames = Array.isArray(step?.skills) ? step.skills : null;

    if (stepTitle.length < 3 || stepTitle.length > 255) {
      throw new RoadmapGenerationException(
        `Gemini returned a roadmap that failed validation. Nothing was saved. The steps.${index}.title field is invalid.`
      );
    }
    if (stepDescription.length < 10 || stepDescription.length > 2000) {
      throw new RoadmapGenerationException(
        `Gemini returned a roadmap that failed validation. Nothing was saved. The steps.${index}.description field is invalid.`
      );
    }
    if (!Number.isInteger(xpReward) || xpReward < 5 || xpReward > 50) {
      throw new RoadmapGenerationException(
        `Gemini returned a roadmap that failed validation. Nothing was saved. The steps.${index}.xp_reward field is invalid.`
      );
    }
    if (!skillNames || skillNames.length < 1 || skillNames.length > 8) {
      throw new RoadmapGenerationException(
        `Gemini returned a roadmap that failed validation. Nothing was saved. The steps.${index}.skills field is invalid.`
      );
    }

    const skillIds = [];
    const seen = new Set();
    for (const name of skillNames) {
      const key = String(name || '').trim().toLowerCase();
      const skill = skillsByName.get(key);
      if (!skill) {
        throw new RoadmapGenerationException(
          `Gemini returned a skill that is not in the PathForge catalog: ${name}. Fake or unknown skills are not saved.`
        );
      }
      const id = String(skill._id);
      if (!seen.has(id)) {
        seen.add(id);
        skillIds.push(skill._id);
      }
    }

    validatedSteps.push({
      title: stepTitle,
      description: stepDescription,
      xpReward,
      skillIds,
    });
  }

  return {
    title,
    description,
    steps: validatedSteps,
  };
}

async function promptContext(path, catalog, isBeginner) {
  const pathSkills = (path.skills || []).map((skill) => skill.name).filter(Boolean);
  const students = await User.find({ learningPath: path._id, role: { $ne: 'admin' } }).select(
    'level'
  );
  const studentCount = students.length;
  const averageLevel =
    studentCount > 0
      ? students.reduce((sum, user) => sum + (Number(user.level) || 1), 0) / studentCount
      : null;

  return {
    pathSkills,
    catalogSkills: catalog.map((skill) => skill.name),
    studentCount,
    averageLevel,
    isBeginner,
  };
}

function systemPrompt(catalog, isBeginner) {
  const skillList = catalog.map((skill) => skill.name).join(', ');
  const foundation = isBeginner
    ? 'The audience is a beginner with little or no prior skill. Generate a complete foundational roadmap from first principles. Do not return an empty or very short roadmap. Cover orientation, core tools, practice projects, and a first portfolio milestone.'
    : 'Match step difficulty to the path skills and typical student level. Still produce a complete, sequenced roadmap rather than a short outline.';

  return `You generate learning roadmaps for PathForge career paths.

Return STRICT JSON only that matches the required schema. Do not include markdown, commentary, or extra keys.

Rules:
- Use only skill names from this catalog, copied exactly: ${skillList}
- Never invent skills, employers, courses, or tools outside that catalog.
- Every step must include at least one catalog skill.
- Produce between 8 and 20 steps.
- Each step needs a clear title, a practical description, an integer XP reward between 5 and 50, and skills.
- ${foundation}`;
}

function userPrompt(path, context, isBeginner) {
  const pathSkills =
    context.pathSkills.length === 0
      ? 'None recorded for this path (treat as beginner / no skills).'
      : context.pathSkills.join(', ');
  const levelLine =
    context.averageLevel === null
      ? 'No enrolled students yet; assume an introductory starting level.'
      : `Enrolled students: ${context.studentCount}; average PathForge level: ${Math.round(context.averageLevel * 10) / 10}.`;
  const beginnerLine = isBeginner
    ? 'BEGINNER / NO-SKILLS CASE: Generate a complete foundation roadmap with at least 10 practical steps. Do not skip fundamentals.'
    : 'Use the path skills as the relevant skill set. Do not assume expertise the catalog does not support.';
  const description = String(path.description || '').trim() || 'No description provided.';
  const pathName = path.pathName || path.title;

  return `Create a learning roadmap for this PathForge career path.

Career path: ${pathName}
Path description: ${description}
Relevant path skills: ${pathSkills}
Level context: ${levelLine}
${beginnerLine}

JSON shape:
{
  "title": "short roadmap title",
  "description": "1-3 sentence overview",
  "steps": [
    {
      "title": "step title",
      "description": "what the student should do",
      "xp_reward": 10,
      "skills": ["Exact Catalog Skill"]
    }
  ]
}`;
}

async function generateDraft(path, beginner = false) {
  await path.populate('skills');
  const catalog = await Skill.find().sort({ name: 1 });

  if (!catalog.length) {
    throw new RoadmapGenerationException(
      'Roadmap generation needs skills in the catalog before Gemini can run.'
    );
  }

  const isBeginner = Boolean(beginner) || !(path.skills && path.skills.length);
  const context = await promptContext(path, catalog, isBeginner);

  let raw;
  try {
    raw = await geminiService.generateJson(
      systemPrompt(catalog, isBeginner),
      userPrompt(path, context, isBeginner),
      { responseSchema: responseSchema() }
    );
  } catch (error) {
    if (error instanceof GeminiServiceException) {
      throw new RoadmapGenerationException(error.message, 503);
    }
    throw error;
  }

  const validated = validatePayload(decodeJson(raw), catalog);
  const drafts = await RoadmapStep.find({ pathId: path._id, isPublished: false });
  const draftIds = drafts.map((step) => step._id);
  if (draftIds.length) {
    await UserProgress.deleteMany({ roadmapStepId: { $in: draftIds } });
    await RoadmapStep.deleteMany({ _id: { $in: draftIds } });
  }

  for (const [index, stepData] of validated.steps.entries()) {
    await RoadmapStep.create({
      pathId: path._id,
      stepNo: index + 1,
      title: stepData.title,
      description: stepData.description,
      xpReward: stepData.xpReward,
      isPublished: false,
      skills: stepData.skillIds,
    });
  }

  path.roadmapDraftTitle = validated.title;
  path.roadmapDraftDescription = validated.description;
  path.roadmapGeneratedAt = new Date();
  await path.save();
  return path;
}

async function publishDraft(path) {
  await path.populate('skills');
  const drafts = await RoadmapStep.find({ pathId: path._id, isPublished: false }).sort(
    RoadmapStep.STEP_SORT
  );

  if (!drafts.length) {
    throw new RoadmapGenerationException(
      'There is no AI draft to publish. Generate a roadmap first.'
    );
  }

  if (await path.hasLiveStudentProgress()) {
    throw new RoadmapGenerationException(
      'This career path already has user progress. Publishing would replace the live roadmap and is blocked. Existing progress has not been changed.',
      409
    );
  }

  const published = await RoadmapStep.find({ pathId: path._id, isPublished: true });
  const publishedIds = published.map((step) => step._id);
  if (publishedIds.length) {
    await UserProgress.deleteMany({ roadmapStepId: { $in: publishedIds } });
    await RoadmapStep.deleteMany({ _id: { $in: publishedIds } });
  }

  for (const step of drafts) {
    step.isPublished = true;
    await step.save();
  }

  const description = String(path.roadmapDraftDescription || '').trim();
  if (description) {
    path.description = description;
  }
  path.roadmapSource = LearningPath.SOURCE_AI;
  path.roadmapGeneratedAt = new Date();
  path.roadmapDraftTitle = null;
  path.roadmapDraftDescription = null;
  path.roadmapMeta = {
    hasPublishedRoadmap: true,
    stepCount: drafts.length,
  };
  await path.save();
  return path;
}

module.exports = {
  MIN_STEPS,
  MAX_STEPS,
  generateDraft,
  publishDraft,
};
