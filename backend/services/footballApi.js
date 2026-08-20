const axios = require('axios');

// Football-data.org API v4
const API_BASE_URL = 'https://api.football-data.org/v4';
const API_KEY = process.env.FOOTBALL_API_KEY || '';
const PRIORITY_COMPETITIONS = (process.env.FOOTBALL_PRIORITY_COMPETITIONS || 'PL,DED,PD,SA,BL1,FL1,ELC,CL')
  .split(',')
  .map(code => code.trim())
  .filter(Boolean);

// Cache for fetched fixtures to avoid repeated API calls
let fixturesCache = {
  data: null,
  timestamp: null,
  date: null
};

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const transformMatch = (match) => ({
  id: match.id,
  homeTeam: match.homeTeam?.name || 'Unknown Home',
  awayTeam: match.awayTeam?.name || 'Unknown Away',
  competition: match.competition?.name || 'Unknown League',
  competitionCode: match.competition?.code || '',
  area: match.area?.name || '',
  utcDate: match.utcDate,
  status: match.status,
  stage: match.stage,
  group: match.group,
  homeCrest: match.homeTeam?.crest || '',
  awayCrest: match.awayTeam?.crest || '',
  lastUpdated: match.lastUpdated
});

const getFixtureKey = (fixture) => [
  fixture.utcDate,
  fixture.homeTeam,
  fixture.awayTeam,
  fixture.competitionCode || fixture.competition
].map(value => String(value || '').trim().toLowerCase()).join('|');

const mergeFixtures = (...fixtureGroups) => {
  const fixturesByKey = new Map();

  fixtureGroups.flat().forEach(fixture => {
    const key = getFixtureKey(fixture);
    if (!fixturesByKey.has(key)) fixturesByKey.set(key, fixture);
  });

  return Array.from(fixturesByKey.values())
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
};

const fetchCompetitionMatches = async (competitionCode, from, to) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/competitions/${competitionCode}/matches`, {
      params: {
        dateFrom: from,
        dateTo: to
      },
      headers: {
        'X-Auth-Token': API_KEY
      },
      timeout: 10000
    });

    const transformed = (response.data.matches || []).map(transformMatch);
    console.log(`[FootballAPI] Found ${transformed.length} ${competitionCode} matches from ${from} to ${to}`);
    return transformed;
  } catch (error) {
    console.warn(`[FootballAPI] Could not fetch ${competitionCode} matches:`, error.response?.status || error.message);
    return [];
  }
};

/**
 * Fetch matches from football-data.org API for a specific date.
 * Returns only live API data. If the API key is missing or the provider errors,
 * an empty array is returned so fake/fallback fixtures are never shown.
 * @param {string} date - Date in YYYY-MM-DD format (defaults to today)
 * @returns {Promise<Array>} List of fixtures
 */
async function fetchMatchesByDate(date) {
  const targetDate = date || new Date().toISOString().split('T')[0];

  // Check cache first
  if (fixturesCache.data && fixturesCache.date === targetDate &&
      fixturesCache.timestamp && (Date.now() - fixturesCache.timestamp < CACHE_DURATION_MS)) {
    console.log(`[FootballAPI] Returning cached fixtures for ${targetDate}`);
    return fixturesCache.data;
  }

  if (!API_KEY) {
    console.log('[FootballAPI] No API key configured. Returning empty results.');
    return [];
  }

  try {
    console.log(`[FootballAPI] Fetching matches for ${targetDate}...`);

    const response = await axios.get(`${API_BASE_URL}/matches`, {
      params: {
        dateFrom: targetDate,
        dateTo: targetDate
      },
      headers: {
        'X-Auth-Token': API_KEY
      },
      timeout: 10000
    });

    const generalMatches = (response.data.matches || []).map(transformMatch);
    const competitionMatches = (await Promise.all(
      PRIORITY_COMPETITIONS.map(code => fetchCompetitionMatches(code, targetDate, targetDate))
    )).flat();
    const transformed = mergeFixtures(generalMatches, competitionMatches);
    console.log(`[FootballAPI] Found ${transformed.length} total matches for ${targetDate}`);

    fixturesCache = {
      data: transformed,
      timestamp: Date.now(),
      date: targetDate
    };

    return transformed;
  } catch (error) {
    console.error('[FootballAPI] Error fetching matches:', error.message);

    if (error.response?.status === 429) {
      console.warn('[FootballAPI] Rate limited. Returning empty results.');
    } else if (error.response?.status === 403) {
      console.warn('[FootballAPI] API key invalid or insufficient permissions.');
    } else if (error.response?.status === 404) {
      console.warn('[FootballAPI] Endpoint not found. Returning empty results.');
    }

    return [];
  }
}

/**
 * Fetch matches for a date range. Returns only live API data.
 */
async function fetchMatchesByDateRange(fromDate, toDate) {
  const from = fromDate || new Date().toISOString().split('T')[0];
  const to = toDate || from;

  if (!API_KEY) {
    console.log('[FootballAPI] No API key configured. Returning empty results.');
    return [];
  }

  try {
    console.log(`[FootballAPI] Fetching matches from ${from} to ${to}...`);

    const response = await axios.get(`${API_BASE_URL}/matches`, {
      params: {
        dateFrom: from,
        dateTo: to
      },
      headers: {
        'X-Auth-Token': API_KEY
      },
      timeout: 10000
    });

    const generalMatches = (response.data.matches || []).map(transformMatch);
    const competitionMatches = (await Promise.all(
      PRIORITY_COMPETITIONS.map(code => fetchCompetitionMatches(code, from, to))
    )).flat();
    const transformed = mergeFixtures(generalMatches, competitionMatches);
    console.log(`[FootballAPI] Found ${transformed.length} total matches from ${from} to ${to}`);

    return transformed;
  } catch (error) {
    console.error('[FootballAPI] Error fetching matches by range:', error.message);

    if (error.response?.status === 429) {
      console.warn('[FootballAPI] Rate limited. Returning empty results.');
    } else if (error.response?.status === 403) {
      console.warn('[FootballAPI] API key invalid. Returning empty results.');
    }

    return [];
  }
}

/**
 * Clear the fixtures cache
 */
function clearFixturesCache() {
  fixturesCache = { data: null, timestamp: null, date: null };
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
  clearFixturesCache,
  isApiConfigured
};