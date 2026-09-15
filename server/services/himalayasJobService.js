const env = require('../config/env');
const HimalayasServiceException = require('../utils/HimalayasServiceException');

const SOURCE = 'himalayas';
const ATTRIBUTION_URL = 'https://himalayas.app';
const DEFAULT_BASE_URL = 'https://himalayas.app/jobs/api/search';
const DEFAULT_TIMEOUT_SECONDS = 15;
const DEFAULT_MAX_RESULTS = 10;

const MESSAGES = {
  connection: 'Unable to connect to Himalayas right now.',
  rateLimit: 'Himalayas rate limit reached. Please try again later.',
  server: 'Himalayas is temporarily unavailable.',
  invalid: 'Unexpected response from Himalayas.',
};

function config() {
  const timeout = Number(
    process.env.HIMALAYAS_API_TIMEOUT || process.env.HIMALAYAS_TIMEOUT || env.himalayasApiTimeout
  );
  const maxResults = Number(
    process.env.HIMALAYAS_API_MAX_RESULTS ||
      process.env.HIMALAYAS_MAX_RESULTS ||
      env.himalayasApiMaxResults
  );

  return {
    baseUrl:
      process.env.HIMALAYAS_API_BASE_URL ||
      process.env.HIMALAYAS_API_URL ||
      env.himalayasApiBaseUrl ||
      DEFAULT_BASE_URL,
    timeoutSeconds: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_SECONDS,
    maxResults: Number.isFinite(maxResults) && maxResults > 0 ? maxResults : DEFAULT_MAX_RESULTS,
  };
}

function getFetch() {
  return module.exports.fetchImpl || globalThis.fetch.bind(globalThis);
}

function stringFilter(filters, key) {
  if (filters[key] == null) {
    return null;
  }
  const value = String(filters[key]).trim();
  return value !== '' ? value : null;
}

function boolFilter(filters, key) {
  if (!Object.prototype.hasOwnProperty.call(filters, key) || filters[key] == null || filters[key] === '') {
    return null;
  }
  const value = filters[key];
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

function limitFromFilters(filters) {
  const configured = config().maxResults;
  const requested = Object.prototype.hasOwnProperty.call(filters, 'limit')
    ? Number(filters.limit)
    : configured;
  const value = Number.isFinite(requested) ? requested : configured;
  return Math.max(1, Math.min(20, value));
}

function clip(value, max) {
  return String(value).slice(0, max);
}

function stripTags(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const items = [];
  for (const item of value) {
    if (typeof item !== 'string' && typeof item !== 'number') {
      continue;
    }
    const text = String(item).trim();
    if (text) {
      items.push(text);
    }
  }
  return items;
}

function normalizeUrl(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) {
    return '';
  }

  let parts;
  try {
    parts = new URL(trimmed);
  } catch (_error) {
    return trimmed.toLowerCase().replace(/\/+$/, '');
  }

  if (!parts.hostname) {
    return trimmed.toLowerCase().replace(/\/+$/, '');
  }

  const host = parts.hostname.toLowerCase();
  const path = (parts.pathname || '').replace(/\/+$/, '');
  const query = parts.search || '';
  return `${host}${path}${query}`;
}

function fallbackExternalId(applicationUrl) {
  return normalizeUrl(applicationUrl);
}

function mapEmploymentType(employmentType) {
  const value = String(employmentType || '')
    .trim()
    .toLowerCase();

  if (!value) {
    return 'Internship';
  }
  if (value.includes('intern')) {
    return 'Internship';
  }
  if (value.includes('scholarship')) {
    return 'Scholarship';
  }
  if (value.includes('research')) {
    return 'Research';
  }
  if (value.includes('hackathon')) {
    return 'Hackathon';
  }

  return clip(String(employmentType).trim(), 255);
}

function formatLocation(restrictions) {
  const places = stringList(restrictions);
  if (!places.length) {
    return 'Remote (worldwide)';
  }
  if (places.length <= 3) {
    return `Remote · ${places.join(', ')}`;
  }
  return `Remote · ${places.length} locations`;
}

function formatSalary(job) {
  const min = job.minSalary;
  const max = job.maxSalary;
  const currency = String(job.currency || '').trim();
  const period = String(job.salaryPeriod || '').trim();

  if (min == null && max == null) {
    return null;
  }

  const range = min != null && max != null ? `${min}–${max}` : String(min ?? max);
  let label = `Salary: ${`${currency} ${range}`.trim()}`;
  if (period) {
    label += ` ${period}`;
  }
  return label;
}

function formatEligibility(job) {
  const parts = [];
  const salary = formatSalary(job);
  if (salary) {
    parts.push(salary);
  }

  const seniority = stringList(job.seniority);
  if (seniority.length) {
    parts.push(`Seniority: ${seniority.join(', ')}`);
  }

  const employment = String(job.employmentType || '').trim();
  if (employment) {
    parts.push(`Employment: ${employment}`);
  }

  return parts.length ? `${parts.join('. ')}.` : '';
}

function formatYmd(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timestampToDate(value) {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return null;
    }
    const millis = timestamp < 1e12 ? timestamp * 1000 : timestamp;
    const date = new Date(millis);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return formatYmd(date);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return formatYmd(parsed);
}

function matchText(title, excerpt, description, categories, parentCategories) {
  return [title, excerpt, description, categories.join(' '), parentCategories.join(' ')]
    .join(' ')
    .trim();
}

function normalizeJob(job) {
  const title = String(job.title || '').trim();
  const applicationUrl = String(job.applicationLink || '').trim();
  const guid = String(job.guid || '').trim();
  const externalId = guid || fallbackExternalId(applicationUrl);

  if (!title || !externalId) {
    return null;
  }

  const excerpt = stripTags(job.excerpt);
  const description = stripTags(job.description);
  const storedDescription = description || excerpt;
  const categories = stringList(job.categories);
  const parentCategories = stringList(job.parentCategories);

  return {
    externalId: clip(externalId, 512),
    source: SOURCE,
    sourceUrl: applicationUrl || ATTRIBUTION_URL,
    title: clip(title, 255),
    organization: clip(String(job.companyName || 'Unknown company').trim() || 'Unknown company', 255),
    description: storedDescription || title,
    excerpt,
    type: mapEmploymentType(job.employmentType),
    location: formatLocation(job.locationRestrictions),
    applicationUrl: applicationUrl || ATTRIBUTION_URL,
    deadline: timestampToDate(job.expiryDate),
    publishedAt: timestampToDate(job.pubDate),
    eligibility: formatEligibility(job),
    categories,
    parentCategories,
    matchText: matchText(title, excerpt, storedDescription, categories, parentCategories),
  };
}

function isAbortError(error) {
  return Boolean(error && (error.name === 'AbortError' || error.code === 20));
}

function buildSearchParams(query, filters = {}) {
  const limit = limitFromFilters(filters);
  const params = {
    q: String(query || '').trim() || null,
    country: stringFilter(filters, 'country'),
    worldwide: boolFilter(filters, 'worldwide'),
    exclude_worldwide: boolFilter(filters, 'exclude_worldwide'),
    seniority: stringFilter(filters, 'seniority'),
    employment_type: stringFilter(filters, 'employment_type'),
    company: stringFilter(filters, 'company'),
    timezone: stringFilter(filters, 'timezone'),
    sort: stringFilter(filters, 'sort'),
    page: Object.prototype.hasOwnProperty.call(filters, 'page') ? Number(filters.page) || 1 : 1,
    limit,
  };

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value != null && value !== '')
  );
}

async function requestPayload(query, filters = {}) {
  const { baseUrl, timeoutSeconds } = config();
  const searchParams = buildSearchParams(query, filters);
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
  let response;

  try {
    response = await getFetch()(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new HimalayasServiceException(MESSAGES.connection, 503);
    }
    throw new HimalayasServiceException(MESSAGES.connection, 503);
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 429) {
    throw new HimalayasServiceException(MESSAGES.rateLimit, 429);
  }
  if (response.status >= 500) {
    throw new HimalayasServiceException(MESSAGES.server, 503);
  }
  if (!response.ok) {
    throw new HimalayasServiceException(MESSAGES.connection, 503);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (_error) {
    throw new HimalayasServiceException(MESSAGES.invalid, 502);
  }

  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.jobs)) {
    throw new HimalayasServiceException(MESSAGES.invalid, 502);
  }

  return payload;
}

async function fetchJobs(query, filters = {}) {
  const payload = await requestPayload(query, filters);
  const limit = limitFromFilters(filters);
  const jobs = [];
  let skippedInvalid = 0;

  for (const job of payload.jobs) {
    if (!job || typeof job !== 'object' || Array.isArray(job)) {
      skippedInvalid += 1;
      continue;
    }

    const normalized = normalizeJob(job);
    if (!normalized) {
      skippedInvalid += 1;
      continue;
    }

    jobs.push(normalized);
    if (jobs.length >= limit) {
      break;
    }
  }

  return {
    jobs,
    fetched: payload.jobs.length,
    skippedInvalid,
    query: String(query || '').trim(),
  };
}

async function search(query, filters = {}) {
  const result = await fetchJobs(query, filters);
  return result.jobs;
}

module.exports = {
  SOURCE,
  ATTRIBUTION_URL,
  DEFAULT_BASE_URL,
  MESSAGES,
  config,
  normalizeUrl,
  normalizeJob,
  mapEmploymentType,
  buildSearchParams,
  fetchJobs,
  search,
  fetchImpl: null,
};
