const axios = require('axios');

// Football-data.org API v4
const API_BASE_URL = 'https://api.football-data.org/v4';
const API_KEY = process.env.FOOTBALL_API_KEY || '';

// Cache for fetched fixtures to avoid repeated API calls
let fixturesCache = {
  data: null,
  timestamp: null,
  date: null
};

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch matches from football-data.org API for a specific date
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

    const matches = response.data.matches || [];
    console.log(`[FootballAPI] Found ${matches.length} matches for ${targetDate}`);

    // Transform to a simplified format
    const transformed = matches.map(match => ({
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
    }));

    // Update cache
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
    }
    
    // Return empty array on error - no mock data
    return [];
  }
}

/**
 * Fetch matches for a date range
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

    const matches = response.data.matches || [];
    console.log(`[FootballAPI] Found ${matches.length} matches`);

    return matches.map(match => ({
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
    }));
  } catch (error) {
    console.error('[FootballAPI] Error fetching matches by range:', error.message);
    
    if (error.response?.status === 429) {
      console.warn('[FootballAPI] Rate limited.');
    } else if (error.response?.status === 403) {
      console.warn('[FootballAPI] API key invalid.');
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
  return API_KEY && API_KEY.length > 0;
}

module.exports = {
  fetchMatchesByDate,
  fetchMatchesByDateRange,
  clearFixturesCache,
  isApiConfigured
};