const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  mongodbUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  geminiApiBase:
    process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta',
  geminiTimeout: (() => {
    const parsed = Number(process.env.GEMINI_TIMEOUT || process.env.GEMINI_API_TIMEOUT);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 60;
    }
    return Math.max(45, parsed);
  })(),
  himalayasApiUrl: process.env.HIMALAYAS_API_URL || '',
  himalayasApiBaseUrl:
    process.env.HIMALAYAS_API_BASE_URL ||
    process.env.HIMALAYAS_API_URL ||
    'https://himalayas.app/jobs/api/search',
  himalayasApiTimeout: Number(process.env.HIMALAYAS_API_TIMEOUT || process.env.HIMALAYAS_TIMEOUT) || 15,
  himalayasApiMaxResults:
    Number(process.env.HIMALAYAS_API_MAX_RESULTS || process.env.HIMALAYAS_MAX_RESULTS) || 10,
};

module.exports = env;
