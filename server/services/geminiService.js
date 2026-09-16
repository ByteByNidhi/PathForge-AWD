const env = require('../config/env');
const GeminiServiceException = require('../utils/GeminiServiceException');
const UserProgress = require('../models/UserProgress');
const UserSkill = require('../models/UserSkill');

const MAX_HISTORY = 8;

let fetchImpl = globalThis.fetch.bind(globalThis);

function setFetchImpl(fn) {
  fetchImpl = fn || globalThis.fetch.bind(globalThis);
}

function resetFetchImpl() {
  fetchImpl = globalThis.fetch.bind(globalThis);
}

function extractText(payload) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const parts = payload.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return '';
  }

  const chunks = [];
  for (const part of parts) {
    if (!part || part.thought === true) {
      continue;
    }
    if (typeof part.text === 'string' && part.text.trim()) {
      chunks.push(part.text);
    }
  }

  return chunks.join('\n').trim();
}

function isAbortError(error) {
  return error?.name === 'TimeoutError' || error?.name === 'AbortError';
}

async function postGemini(url, apiKey, payload, timeoutSec) {
  return fetchImpl(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutSec * 1000),
  });
}

async function generateFromContents(systemPrompt, contents, generationConfig = {}) {
  const apiKey = String(env.geminiApiKey || '');
  const model = String(env.geminiModel || 'gemini-3.6-flash');
  const baseUrl = String(env.geminiApiBase || '').replace(/\/$/, '');
  const timeoutSec = Number(env.geminiTimeout) || 60;

  if (!apiKey) {
    throw new GeminiServiceException(
      'The career assistant is not available right now. Please try again later.'
    );
  }

  const url = `${baseUrl}/models/${model}:generateContent`;
  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
      ...generationConfig,
    },
  };

  let response;
  try {
    try {
      response = await postGemini(url, apiKey, payload, timeoutSec);
    } catch (error) {
      if (!isAbortError(error)) {
        throw error;
      }
      response = await postGemini(url, apiKey, payload, timeoutSec);
    }
  } catch (error) {
    const timedOut = isAbortError(error);
    console.error('[gemini] request failed', {
      model,
      timedOut,
      name: error?.name || 'Error',
    });
    throw new GeminiServiceException(
      'The career assistant could not be reached. Please try again in a moment.'
    );
  }

  if (!response.ok) {
    throw new GeminiServiceException(
      'The career assistant is busy or unavailable. Please try again shortly.'
    );
  }

  let json;
  try {
    json = await response.json();
  } catch {
    throw new GeminiServiceException(
      'The career assistant returned an empty reply. Please try asking in a different way.'
    );
  }

  const text = extractText(json);
  if (!text) {
    throw new GeminiServiceException(
      'The career assistant returned an empty reply. Please try asking in a different way.'
    );
  }

  return text;
}

function buildContents(history, message) {
  const contents = [];
  const turns = Array.isArray(history) ? history.slice(-MAX_HISTORY) : [];

  for (const turn of turns) {
    const role = turn?.role === 'model' ? 'model' : 'user';
    const text = String(turn?.text || '').trim();
    if (!text) {
      continue;
    }
    contents.push({
      role,
      parts: [{ text }],
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  return contents;
}

async function systemPrompt(user) {
  await user.populate({
    path: 'learningPath',
    populate: { path: 'skills' },
  });

  const path = user.learningPath;
  const pathName = path?.pathName || path?.title || 'None selected yet';
  const pathDescription = path?.description ? String(path.description).trim() : 'No description available.';

  const skillRecords = await UserSkill.find({ user: user._id }).populate('skill');
  const skills = skillRecords
    .map((record) => record.skill?.name)
    .filter(Boolean);
  const skillList = skills.length ? skills.join(', ') : 'No skills recorded yet';

  const completed = [];
  const upcoming = [];

  if (path) {
    const RoadmapStep = require('../models/RoadmapStep');
    const published = await RoadmapStep.find({ pathId: path._id, isPublished: true }).sort(
      RoadmapStep.STEP_SORT
    );
    const completedIds = new Set(
      (
        await UserProgress.find({
          userId: user._id,
          status: 'completed',
          roadmapStepId: { $in: published.map((step) => step._id) },
        }).select('roadmapStepId')
      ).map((row) => String(row.roadmapStepId))
    );

    for (const step of published) {
      const label = `Step ${step.stepNo}: ${step.title}`;
      if (completedIds.has(String(step._id))) {
        completed.push(label);
      } else {
        upcoming.push(label);
      }
    }
  }

  const completedText = completed.length ? completed.join('; ') : 'None yet';
  const upcomingText = upcoming.length
    ? upcoming.slice(0, 8).join('; ')
    : 'None remaining or no roadmap selected';

  return `You are PathForge AI Studio, a practical career assistant for students using the PathForge learning platform.

Give concise, encouraging, career-focused advice. Prefer concrete next steps, project ideas, and skill-building plans over generic motivation. If information is missing, say so and suggest what the student can add in PathForge (skills, roadmap, or completed steps). Do not invent internships, employers, or credentials the student has not mentioned. Do not ask for or reveal API keys or passwords.

Student context from PathForge (trusted server data):
- Name: ${user.name}
- Career path: ${pathName}
- Path notes: ${pathDescription}
- Level: ${user.level}
- XP: ${user.xp}
- Skills: ${skillList}
- Completed roadmap steps: ${completedText}
- Upcoming roadmap steps: ${upcomingText}`;
}

async function generateReply(user, message, history = []) {
  return generateFromContents(await systemPrompt(user), buildContents(history, message), {
    temperature: 0.7,
    maxOutputTokens: 4096,
  });
}

async function generateText(prompt, userMessage, generationConfig = {}) {
  return generateFromContents(
    prompt,
    [
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ],
    generationConfig
  );
}

async function generateJson(prompt, userMessage, generationConfig = {}) {
  return generateFromContents(
    prompt,
    [
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ],
    {
      temperature: 0.2,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      ...generationConfig,
    }
  );
}

module.exports = {
  MAX_HISTORY,
  generateReply,
  generateText,
  generateJson,
  setFetchImpl,
  resetFetchImpl,
};
