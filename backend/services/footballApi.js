const axios = require('axios');

// Football-data.org API v4
const API_BASE_URL = 'https://api.football-data.org/v4';
const API_KEY = process.env.FOOTBALL_API_KEY || '';

// Paid tier allows ~30 calls/minute. We leave headroom below the limit so
// concurrent or spiky traffic never trips a 429.
const RATE_LIMIT_PER_MINUTE = Math.max(1, parseInt(process.env.FOOTBALL_RATE_LIMIT_PER_MINUTE || '26', 10));
const MAX_CONCURRENT = 3;

// In-memory cache keyed by endpoint+params. TTLs vary with how often data changes.
const cache = new Map();
const TTL = {
  live: 30 * 1000,
  fixtures: 5 * 60 * 1000,
  finished: 15 * 60 * 1000,
  stats: 6 * 60 * 60 * 1000
};

// Sliding window for rate limiting plus a simple concurrency cap.
let callWindow = [];
let inFlight = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const throttle = async () => {
  const now = Date.now();
  callWindow = callWindow.filter((ts) => now - ts < 60 * 1000);

  while (callWindow.length >= RATE_LIMIT_PER_MINUTE) {
    const waitMs = 60 * 1000 - (now - callWindow[0]) + 100;
    await sleep(waitMs);
    callWindow = callWindow.filter((ts) => Date.now() - ts < 60 * 1000);
  }

  while (inFlight >= MAX_CONCURRENT) {
    await sleep(120);
  }
};

const logRateLimit = (response) => {
  const used = response?.headers?.['x-requestcounter-used'];
  if (used !== undefined) console.log(`[FootballAPI] API call ${used}/${RATE_LIMIT_PER_MINUTE}`);
};

const handleApiError = (path, error) => {
  const status = error.response?.status;
  if (status === 429) console.warn('[FootballAPI] Rate limited (429).');
  else if (status === 403) console.warn('[FootballAPI] Forbidden (403): key invalid or resource not in current plan.');
  else if (status === 404) console.warn(`[FootballAPI] Not found (404): ${path}`);
  else console.warn(`[FootballAPI] Request failed for ${path}:`, error.message);
};

// Core GET helper with cache + throttling. Returns null on failure.
const apiGet = async (path, params = {}, { cacheKey, ttl, fallback } = {}) => {
  const key = cacheKey || `${path}|${JSON.stringify(params)}`;

  if (ttl && cache.has(key)) {
    const entry = cache.get(key);
    if (Date.now() - entry.timestamp < ttl) return entry.data;
  }

  if (!API_KEY) {
    console.log('[FootballAPI] No API key configured. Returning empty results.');
    return fallback !== undefined ? fallback : null;
  }

  await throttle();
  inFlight += 1;
  try {
    const response = await axios.get(`${API_BASE_URL}${path}`, {
      params,
      headers: { 'X-Auth-Token': API_KEY },
      timeout: 15000
    });
    callWindow.push(Date.now());
    logRateLimit(response);
    if (ttl) cache.set(key, { data: response.data, timestamp: Date.now() });
    return response.data;
  } catch (error) {
    callWindow.push(Date.now());
    handleApiError(path, error);
    return fallback !== undefined ? fallback : null;
  } finally {
    inFlight -= 1;
  }
};

const transformMatch = (match) => ({
  id: match.id,
  homeTeam: match.homeTeam?.name || 'Unknown Home',
  awayTeam: match.awayTeam?.name || 'Unknown Away',
  homeTeamId: match.homeTeam?.id ?? null,
  awayTeamId: match.awayTeam?.id ?? null,
  homeCrest: match.homeTeam?.crest || '',
  awayCrest: match.awayTeam?.crest || '',
  competition: match.competition?.name || 'Unknown League',
  competitionCode: match.competition?.code || '',
  competitionId: match.competition?.id ?? null,
  area: match.area?.name || '',
  utcDate: match.utcDate,
  status: match.status,
  stage: match.stage,
  group: match.group,
  matchday: match.matchday,
  venue: match.venue,
  minute: match.minute,
  score: match.score
    ? {
        winner: match.score.winner || null,
        duration: match.score.duration || null,
        fullTime: {
          home: match.score.fullTime?.home ?? null,
          away: match.score.fullTime?.away ?? null
        },
        halfTime: {
          home: match.score.halfTime?.home ?? null,
          away: match.score.halfTime?.away ?? null
        }
      }
    : null,
  lastUpdated: match.lastUpdated
});

/**
 * Fetch matches from football-data.org API for a specific date.
 * Returns only live API data. If the API key is missing or the provider errors,
 * an empty array is returned so fake/fallback fixtures are never shown.
 * @param {string} date - Date in YYYY-MM-DD format (defaults to today)
 * @returns {Promise<Array>} List of fixtures
 */
async function fetchMatchesByDate(date) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const data = await apiGet('/matches', { dateFrom: targetDate, dateTo: targetDate }, {
    cacheKey: `matches:${targetDate}`,
    ttl: TTL.fixtures,
    fallback: { matches: [] }
  });
  const transformed = (data?.matches || []).map(transformMatch);
  console.log(`[FootballAPI] Found ${transformed.length} total matches for ${targetDate}`);
  return transformed;
}

/**
 * Fetch matches for a date range. Returns only live API data.
 */
async function fetchMatchesByDateRange(fromDate, toDate) {
  const from = fromDate || new Date().toISOString().split('T')[0];
  const to = toDate || from;
  const data = await apiGet('/matches', { dateFrom: from, dateTo: to }, {
    cacheKey: `matches:${from}:${to}`,
    ttl: TTL.fixtures,
    fallback: { matches: [] }
  });
  const transformed = (data?.matches || []).map(transformMatch);
  console.log(`[FootballAPI] Found ${transformed.length} total matches from ${from} to ${to}`);
  return transformed;
}

/**
 * Fetch currently live matches (IN_PLAY + PAUSED).
 */
async function fetchLiveMatches() {
  const data = await apiGet('/matches', { status: 'LIVE' }, {
    cacheKey: 'matches:live',
    ttl: TTL.live,
    fallback: { matches: [] }
  });
  return (data?.matches || []).map(transformMatch);
}

/**
 * Fetch the full detail of a single match (lineups, goals, bookings, subs, odds...).
 */
async function fetchMatchById(id) {
  return apiGet(`/matches/${id}`, {}, {
    cacheKey: `match:${id}`,
    ttl: TTL.live,
    fallback: null
  });
}

/**
 * Fetch head-to-head history for a fixture.
 */
async function fetchHeadToHead(id, limit = 10) {
  return apiGet(`/matches/${id}/head2head`, { limit }, {
    cacheKey: `h2h:${id}:${limit}`,
    ttl: TTL.stats,
    fallback: { matches: [], aggregates: {} }
  });
}

/**
 * Fetch a team's most recent finished matches (used for form + history).
 */
async function fetchTeamRecent(teamId, limit = 5) {
  return apiGet(`/teams/${teamId}/matches`, { status: 'FINISHED', limit }, {
    cacheKey: `team:${teamId}:finished:${limit}`,
    ttl: TTL.finished,
    fallback: { matches: [] }
  });
}

/**
 * Fetch a team profile including its squad.
 */
async function fetchTeamSquad(teamId) {
  return apiGet(`/teams/${teamId}`, {}, {
    cacheKey: `team:${teamId}:squad`,
    ttl: TTL.stats,
    fallback: null
  });
}

/**
 * Fetch league standings for a competition code.
 */
async function fetchStandings(code) {
  return apiGet(`/competitions/${code}/standings`, {}, {
    cacheKey: `standings:${code}`,
    ttl: TTL.stats,
    fallback: null
  });
}

/**
 * Fetch top scorers for a competition.
 */
async function fetchScorers(code, limit = 10) {
  return apiGet(`/competitions/${code}/scorers`, { limit }, {
    cacheKey: `scorers:${code}:${limit}`,
    ttl: TTL.stats,
    fallback: null
  });
}

/**
 * Clear the fixtures cache
 */
function clearFixturesCache() {
  cache.clear();
  console.log('[FootballAPI] Cache cleared');
}

/**
 * Check if API key is configured
 */
function isApiConfigured() {
  return Boolean(API_KEY && API_KEY.length > 0);
}

module.exports = {
  fetchMatchesByDate,
  fetchMatchesByDateRange,
  fetchLiveMatches,
  fetchMatchById,
  fetchHeadToHead,
  fetchTeamRecent,
  fetchTeamSquad,
  fetchStandings,
  fetchScorers,
  clearFixturesCache,
  isApiConfigured
};