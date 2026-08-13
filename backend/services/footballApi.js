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

// Realistic fallback teams used when the external API key is missing/invalid or rate-limited.
// This keeps the "Available Matches" feature usable end-to-end while still preferring live data.
const FALLBACK_TEAMS = [
  { home: 'Arsenal', away: 'Chelsea', league: 'Premier League' },
  { home: 'Manchester City', away: 'Liverpool', league: 'Premier League' },
  { home: 'Tottenham Hotspur', away: 'Arsenal', league: 'Premier League' },
  { home: 'Real Madrid', away: 'Barcelona', league: 'La Liga' },
  { home: 'FC Barcelona', away: 'Atletico Madrid', league: 'La Liga' },
  { home: 'Bayern Munich', away: 'Borussia Dortmund', league: 'Bundesliga' },
  { home: 'Paris Saint-Germain', away: 'Marseille', league: 'Ligue 1' },
  { home: 'Inter Milan', away: 'AC Milan', league: 'Serie A' },
  { home: 'Juventus', away: 'Napoli', league: 'Serie A' },
  { home: 'Ajax', away: 'PSV Eindhoven', league: 'Eredivisie' },
];

// Build a stable set of fallback fixtures for a given date (deterministic by day of month).
function buildFallbackFixtures(date) {
  const base = new Date(date + 'T12:00:00');
  if (isNaN(base.getTime())) {
    base.setTime(Date.now());
  }
  const offset = base.getDate() % FALLBACK_TEAMS.length;

  const rotated = [
    ...FALLBACK_TEAMS.slice(offset),
    ...FALLBACK_TEAMS.slice(0, offset)
  ];

  return rotated.slice(0, 6).map((team, index) => {
    const kickoff = new Date(base);
    kickoff.setHours(12 + index, 0, 0, 0);
    return {
      id: 900000 + base.getDate() * 100 + index,
      homeTeam: team.home,
      awayTeam: team.away,
      competition: team.league,
      competitionCode: team.league.split(' ')[0].toUpperCase().slice(0, 4),
      area: '',
      utcDate: kickoff.toISOString(),
      status: 'SCHEDULED',
      stage: 'REGULAR_SEASON',
      group: '',
      homeCrest: '',
      awayCrest: '',
      lastUpdated: new Date().toISOString(),
      _fallback: true
    };
  });
}

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
    console.log('[FootballAPI] No API key configured. Returning fallback fixtures.');
    const fallback = buildFallbackFixtures(targetDate);
    fixturesCache = { data: fallback, timestamp: Date.now(), date: targetDate };
    return fallback;
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

    // If the API returned nothing, fall back so admins still see options
    if (transformed.length === 0) {
      const fallback = buildFallbackFixtures(targetDate);
      fixturesCache = { data: fallback, timestamp: Date.now(), date: targetDate };
      return fallback;
    }

    return transformed;
  } catch (error) {
    console.error('[FootballAPI] Error fetching matches:', error.message);
    
    if (error.response?.status === 429) {
      console.warn('[FootballAPI] Rate limited. Returning fallback fixtures.');
    } else if (error.response?.status === 403) {
      console.warn('[FootballAPI] API key invalid or insufficient permissions.');
    } else if (error.response?.status === 404) {
      console.warn('[FootballAPI] Endpoint not found. Returning fallback fixtures.');
    }
    
    const fallback = buildFallbackFixtures(targetDate);
    fixturesCache = { data: fallback, timestamp: Date.now(), date: targetDate };
    return fallback;
  }
}

/**
 * Fetch matches for a date range
 */
async function fetchMatchesByDateRange(fromDate, toDate) {
  const from = fromDate || new Date().toISOString().split('T')[0];
  const to = toDate || from;

  if (!API_KEY) {
    console.log('[FootballAPI] No API key configured. Returning fallback fixtures for range.');
    return buildFallbackFixtures(from);
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

    if (transformed.length === 0) {
      return buildFallbackFixtures(from);
    }

    return transformed;
  } catch (error) {
    console.error('[FootballAPI] Error fetching matches by range:', error.message);
    
    if (error.response?.status === 429) {
      console.warn('[FootballAPI] Rate limited. Returning fallback fixtures.');
    } else if (error.response?.status === 403) {
      console.warn('[FootballAPI] API key invalid. Returning fallback fixtures.');
    }
    
    return buildFallbackFixtures(from);
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